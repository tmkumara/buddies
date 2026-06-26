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

  const items: { boxDesignId: number; quantity: number; unitPrice: number }[] = [];
  for (const item of rawItems) {
    const p = orderItemInputSchema.safeParse(item);
    if (!p.success) return { error: p.error.issues[0]?.message ?? "Invalid item" };
    items.push(p.data);
  }

  if (parsed.data.deliveryDate && parsed.data.deliveryDate < parsed.data.orderDate) {
    return { error: "Delivery date cannot be before order date" };
  }

  // Load box designs for name/code snapshots
  const boxDesignIds = [...new Set(items.map((i) => i.boxDesignId))];
  const boxDesigns = await prisma.boxDesign.findMany({
    where: { id: { in: boxDesignIds }, active: true },
    select: { id: true, name: true, code: true },
  });
  const bdMap = new Map(boxDesigns.map((bd) => [bd.id, bd]));

  for (const item of items) {
    if (!bdMap.has(item.boxDesignId)) {
      return { error: `Box design ID ${item.boxDesignId} is inactive or does not exist` };
    }
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
            const bd = bdMap.get(item.boxDesignId)!;
            return {
              boxDesignId: item.boxDesignId,
              designName:  bd.name,
              designCode:  bd.code,
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
    select: { status: true },
  });
  if (!order) return { error: "Order not found" };

  if (!isValidTransition(order.status as OrderStatusKey, newStatus as OrderStatusKey)) {
    return { error: `Cannot transition from ${order.status} to ${newStatus}` };
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

  if (newStatus === "IN_PRODUCTION") {
    await deductStockForOrder(orderId, Number(session.user.id));
  }

  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/orders");
  return { success: true };
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
