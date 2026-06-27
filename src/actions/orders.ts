"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth-guards";
import prisma from "@/lib/prisma";
import {
  createOrderSchema,
  orderItemInputSchema,
  updateOrderDetailsSchema,
} from "@/lib/validations/order";
import { generateOrderNo } from "@/lib/utils/order-no";
import { deductStockForOrder } from "@/actions/stock";
import { deductStockItemsForOrder, restoreStockItemsForOrder } from "@/actions/stock-items";
import { calculateOrderTotals, calculateLineTotal } from "@/lib/utils/calculations";
import { isValidTransition, type OrderStatusKey } from "@/lib/utils/status-transitions";
import { OrderStatus } from "@prisma/client";

export async function createOrder(formData: FormData) {
  const session = await requireAuth();

  const parsed = createOrderSchema.safeParse({
    customerId:      formData.get("customerId"),
    orderDate:       formData.get("orderDate"),
    deliveryDate:    (formData.get("deliveryDate") as string) || undefined,
    discountPercent: (formData.get("discountPercent") as string) || undefined,
    remarks:         (formData.get("remarks") as string) || undefined,
    leadSourceId:    (formData.get("leadSourceId") as string) || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Validation error" };

  // Parse items JSON
  let rawItems: unknown;
  try {
    rawItems = JSON.parse((formData.get("itemsJson") as string) ?? "[]");
  } catch {
    return { error: "Invalid order items data" };
  }

  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return { error: "At least one order item is required" };
  }

  type ValidatedItem = { boxDesignId?: number; stockItemId?: number; quantity: number; unitPrice: number };
  const items: ValidatedItem[] = [];
  for (const item of rawItems) {
    const p = orderItemInputSchema.safeParse(item);
    if (!p.success) return { error: p.error.issues[0]?.message ?? "Invalid item" };
    items.push(p.data);
  }

  if (parsed.data.deliveryDate && parsed.data.deliveryDate < parsed.data.orderDate) {
    return { error: "Delivery date cannot be before order date" };
  }

  // Load box designs for name/code snapshots (design items only)
  const designItems = items.filter((i): i is ValidatedItem & { boxDesignId: number } => !!i.boxDesignId);
  const boxDesignIds = [...new Set(designItems.map((i) => i.boxDesignId))];
  const boxDesigns = await prisma.boxDesign.findMany({
    where: { id: { in: boxDesignIds }, active: true },
    select: { id: true, name: true, code: true },
  });
  const bdMap = new Map(boxDesigns.map((bd) => [bd.id, bd]));

  for (const item of designItems) {
    if (!bdMap.has(item.boxDesignId)) {
      return { error: `Box design ID ${item.boxDesignId} is inactive or does not exist` };
    }
  }

  const stockItemRows = items.filter((i): i is ValidatedItem & { stockItemId: number } => !!i.stockItemId);
  const stockItemIds  = [...new Set(stockItemRows.map((i) => i.stockItemId))];
  const stockItemData = stockItemIds.length > 0
    ? await prisma.stockItem.findMany({ where: { id: { in: stockItemIds }, active: true }, select: { id: true, name: true, code: true } })
    : [];
  const siMap = new Map(stockItemData.map((si) => [si.id, si]));
  for (const item of stockItemRows) {
    if (!siMap.has(item.stockItemId)) return { error: `Stock item ID ${item.stockItemId} is inactive or does not exist` };
  }

  const totals = calculateOrderTotals(items, parsed.data.discountPercent ?? null);
  const publicToken = crypto.randomBytes(32).toString("hex");

  // Generate order number atomically before main transaction
  const orderNo = await generateOrderNo();

  let orderId: number;
  try {
    const order = await prisma.order.create({
      data: {
        orderNo,
        customerId:     parsed.data.customerId,
        orderDate:      new Date(parsed.data.orderDate),
        deliveryDate:   parsed.data.deliveryDate ? new Date(parsed.data.deliveryDate) : null,
        status:         OrderStatus.DRAFT,
        totalAmount:    totals.totalAmount,
        discountAmount: totals.discountAmount,
        netAmount:      totals.netAmount,
        remarks:        parsed.data.remarks ?? null,
        discountPercent: totals.discountPercent,
        leadSourceId:    parsed.data.leadSourceId ?? null,
        publicToken,
        items: {
          create: items.map((item) => {
            if (item.boxDesignId) {
              const bd = bdMap.get(item.boxDesignId)!;
              return {
                boxDesignId: item.boxDesignId,
                designName:  bd.name,
                designCode:  bd.code,
                quantity:    item.quantity,
                unitPrice:   item.unitPrice,
                lineTotal:   calculateLineTotal(item.unitPrice, item.quantity),
              };
            }
            const si = siMap.get(item.stockItemId!)!;
            return {
              stockItemId: item.stockItemId!,
              designName:  si.name,
              designCode:  si.code,
              quantity:    item.quantity,
              unitPrice:   item.unitPrice,
              lineTotal:   calculateLineTotal(item.unitPrice, item.quantity),
            };
          }),
        },
      },
    });
    orderId = order.id;
  } catch (e) {
    console.error("Order creation failed:", e);
    return { error: "Failed to create order. Please try again." };
  }

  revalidatePath("/orders");
  redirect(`/orders/${orderId}`);
}

export async function updateOrderStatus(
  orderId: number,
  newStatus: string,
  note?: string,
) {
  const session = await requireAuth();

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      status: true,
      netAmount: true,
      payments: { select: { amount: true } },
    },
  });
  if (!order) return { error: "Order not found" };

  if (!isValidTransition(order.status as OrderStatusKey, newStatus as OrderStatusKey)) {
    return { error: `Cannot transition from ${order.status} to ${newStatus}` };
  }

  // Payment gate: DRAFT → CONFIRMED requires at least one payment
  if (newStatus === "CONFIRMED" && order.payments.length === 0) {
    return { error: "At least one payment must be recorded before confirming the order." };
  }

  // Payment gate: READY → DELIVERED requires full payment
  if (newStatus === "DELIVERED") {
    const totalPaid = order.payments.reduce((s, p) => s + Number(p.amount), 0);
    const netAmount = Number(order.netAmount);
    if (totalPaid < netAmount - 0.01) {
      return { error: `Full payment required before delivery. Balance: Rs. ${(netAmount - totalPaid).toFixed(2)}` };
    }
  }

  await prisma.$transaction([
    prisma.order.update({
      where: { id: orderId },
      data:  { status: newStatus as OrderStatus },
    }),
    prisma.orderStatusHistory.create({
      data: {
        orderId,
        fromStatus:  order.status as OrderStatus,
        toStatus:    newStatus as OrderStatus,
        changedById: Number(session.user.id),
        note:        note?.trim() || null,
      },
    }),
  ]);

  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/orders");

  if (newStatus === "IN_PRODUCTION") {
    await deductStockForOrder(orderId, Number(session.user.id));
  }

  if (newStatus === "CONFIRMED") {
    const { warnings } = await deductStockItemsForOrder(orderId, Number(session.user.id));
    if (warnings.length > 0) {
      return { success: true as const, warnings };
    }
  }

  const cancelFromStatuses = ["CONFIRMED", "IN_PRODUCTION", "READY"];
  if (newStatus === "CANCELLED" && cancelFromStatuses.includes(order.status)) {
    await restoreStockItemsForOrder(orderId, Number(session.user.id));
  }

  return { success: true as const };
}

export async function updateOrderDetails(orderId: number, formData: FormData) {
  await requireAuth();

  const parsed = updateOrderDetailsSchema.safeParse({
    deliveryDate:    (formData.get("deliveryDate") as string) || undefined,
    remarks:         (formData.get("remarks") as string) || undefined,
    discountPercent: (formData.get("discountPercent") as string) || undefined,
    leadSourceId:    (formData.get("leadSourceId") as string) || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Validation error" };

  await prisma.order.update({
    where: { id: orderId },
    data: {
      deliveryDate:    parsed.data.deliveryDate ? new Date(parsed.data.deliveryDate) : null,
      remarks:         parsed.data.remarks ?? null,
      discountPercent: parsed.data.discountPercent ?? undefined,
      leadSourceId:    parsed.data.leadSourceId ?? undefined,
    },
  });

  revalidatePath(`/orders/${orderId}`);
  return { success: true };
}

export async function updateOrderItems(orderId: number, formData: FormData) {
  const session = await requireAuth();

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { status: true },
  });
  if (!order) return { error: "Order not found" };

  const editableStatuses = ["DRAFT", "CONFIRMED", "IN_PRODUCTION"];
  if (!editableStatuses.includes(order.status)) {
    return { error: "Order cannot be edited at this stage." };
  }

  let rawItems: unknown;
  try { rawItems = JSON.parse((formData.get("itemsJson") as string) ?? "[]"); }
  catch { return { error: "Invalid items data" }; }

  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return { error: "At least one order item is required" };
  }

  type ValidatedItem = { boxDesignId?: number; stockItemId?: number; quantity: number; unitPrice: number };
  const items: ValidatedItem[] = [];
  for (const item of rawItems) {
    const p = orderItemInputSchema.safeParse(item);
    if (!p.success) return { error: p.error.issues[0]?.message ?? "Invalid item" };
    items.push(p.data);
  }

  const designItems = items.filter((i): i is ValidatedItem & { boxDesignId: number } => !!i.boxDesignId);
  const boxDesignIds = [...new Set(designItems.map((i) => i.boxDesignId))];
  const boxDesigns = await prisma.boxDesign.findMany({
    where:  { id: { in: boxDesignIds }, active: true },
    select: { id: true, name: true, code: true },
  });
  const bdMap = new Map(boxDesigns.map((bd) => [bd.id, bd]));
  for (const item of designItems) {
    if (!bdMap.has(item.boxDesignId)) return { error: `Box design ID ${item.boxDesignId} not found` };
  }

  const stockItemRows = items.filter((i): i is ValidatedItem & { stockItemId: number } => !!i.stockItemId);
  const stockItemIds  = [...new Set(stockItemRows.map((i) => i.stockItemId))];
  const stockItemData = stockItemIds.length > 0
    ? await prisma.stockItem.findMany({ where: { id: { in: stockItemIds }, active: true }, select: { id: true, name: true, code: true } })
    : [];
  const siMap = new Map(stockItemData.map((si) => [si.id, si]));
  for (const item of stockItemRows) {
    if (!siMap.has(item.stockItemId)) return { error: `Stock item ID ${item.stockItemId} is inactive or does not exist` };
  }

  // Read optional discount override from formData
  const discountOverrideRaw = formData.get("discountPercent") as string | null;
  const discountOverride = discountOverrideRaw ? parseFloat(discountOverrideRaw) : null;

  const totals = calculateOrderTotals(items, discountOverride);

  await prisma.$transaction([
    prisma.orderItem.deleteMany({ where: { orderId } }),
    prisma.order.update({
      where: { id: orderId },
      data: {
        totalAmount:    totals.totalAmount,
        discountAmount: totals.discountAmount,
        netAmount:      totals.netAmount,
        discountPercent: totals.discountPercent,
        deliveryDate: formData.get("deliveryDate")
          ? new Date(formData.get("deliveryDate") as string)
          : null,
        remarks: (formData.get("remarks") as string) || null,
        leadSourceId: formData.get("leadSourceId")
          ? Number(formData.get("leadSourceId"))
          : null,
      },
    }),
    ...items.map((item) => {
      if (item.boxDesignId) {
        const bd = bdMap.get(item.boxDesignId)!;
        return prisma.orderItem.create({
          data: {
            orderId,
            boxDesignId: item.boxDesignId,
            designName:  bd.name,
            designCode:  bd.code,
            quantity:    item.quantity,
            unitPrice:   item.unitPrice,
            lineTotal:   calculateLineTotal(item.unitPrice, item.quantity),
          },
        });
      }
      const si = siMap.get(item.stockItemId!)!;
      return prisma.orderItem.create({
        data: {
          orderId,
          stockItemId: item.stockItemId!,
          designName:  si.name,
          designCode:  si.code,
          quantity:    item.quantity,
          unitPrice:   item.unitPrice,
          lineTotal:   calculateLineTotal(item.unitPrice, item.quantity),
        },
      });
    }),
  ]);

  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/orders");
  return { success: true as const };
}
