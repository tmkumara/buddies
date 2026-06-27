"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guards";

const stockItemSchema = z.object({
  code:        z.string().min(1).max(50),
  name:        z.string().min(1).max(150),
  description: z.string().max(255).optional(),
  stockUnit:   z.string().min(1).max(50),
  unitPrice:   z.coerce.number().min(0),
  minStock:    z.coerce.number().min(0).default(0),
});

const purchaseSchema = z.object({
  stockItemId:  z.coerce.number().int().positive(),
  quantity:     z.coerce.number().positive(),
  note:         z.string().max(255).optional(),
});

export async function createStockItem(formData: FormData) {
  await requireAuth();
  const parsed = stockItemSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Validation error" };

  const existing = await prisma.stockItem.findUnique({ where: { code: parsed.data.code } });
  if (existing) return { error: "A stock item with this code already exists" };

  await prisma.stockItem.create({
    data: {
      code:        parsed.data.code,
      name:        parsed.data.name,
      description: parsed.data.description ?? null,
      stockUnit:   parsed.data.stockUnit,
      unitPrice:   parsed.data.unitPrice,
      minStock:    parsed.data.minStock,
    },
  });
  revalidatePath("/stock-items");
  return { success: true as const };
}

export async function updateStockItem(id: number, formData: FormData) {
  await requireAuth();
  const parsed = stockItemSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Validation error" };

  const conflict = await prisma.stockItem.findFirst({ where: { code: parsed.data.code, NOT: { id } } });
  if (conflict) return { error: "Another stock item uses this code" };

  await prisma.stockItem.update({
    where: { id },
    data: {
      code:        parsed.data.code,
      name:        parsed.data.name,
      description: parsed.data.description ?? null,
      stockUnit:   parsed.data.stockUnit,
      unitPrice:   parsed.data.unitPrice,
      minStock:    parsed.data.minStock,
    },
  });
  revalidatePath("/stock-items");
  return { success: true as const };
}

export async function toggleStockItemActive(id: number, active: boolean) {
  await requireAuth();
  await prisma.stockItem.update({ where: { id }, data: { active } });
  revalidatePath("/stock-items");
  return { success: true as const };
}

export async function recordPurchase(formData: FormData) {
  const session = await requireAuth();
  const parsed = purchaseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Validation error" };

  const { stockItemId, quantity, note } = parsed.data;

  await prisma.$transaction([
    prisma.stockItem.update({
      where: { id: stockItemId },
      data:  { currentStock: { increment: quantity } },
    }),
    prisma.stockItemEntry.create({
      data: {
        stockItemId,
        quantityChange: quantity,
        type:           "PURCHASE",
        note:           note ?? null,
        changedById:    Number(session.user.id),
      },
    }),
  ]);
  revalidatePath("/stock-items");
  return { success: true as const };
}

export async function deductStockItemsForOrder(orderId: number, userId: number): Promise<{ warnings: string[] }> {
  const order = await prisma.order.findUnique({
    where:   { id: orderId },
    include: { items: { include: { stockItem: true } } },
  });
  if (!order) return { warnings: [] };

  const warnings: string[] = [];

  for (const item of order.items) {
    if (!item.stockItem) continue;

    const newStock = Number(item.stockItem.currentStock) - item.quantity;
    if (newStock < 0) {
      warnings.push(`${item.stockItem.name}: stock will go negative (${newStock.toFixed(2)} ${item.stockItem.stockUnit})`);
    }

    await prisma.$transaction([
      prisma.stockItem.update({
        where: { id: item.stockItem.id },
        data:  { currentStock: { decrement: item.quantity } },
      }),
      prisma.stockItemEntry.create({
        data: {
          stockItemId:    item.stockItem.id,
          quantityChange: -item.quantity,
          type:           "SOLD",
          orderId,
          note:           `Order #${order.orderNo}`,
          changedById:    userId,
        },
      }),
    ]);
  }

  return { warnings };
}

export async function restoreStockItemsForOrder(orderId: number, userId: number): Promise<void> {
  const entries = await prisma.stockItemEntry.findMany({
    where: { orderId, type: "SOLD" },
  });
  if (entries.length === 0) return;

  for (const entry of entries) {
    const qty = Math.abs(Number(entry.quantityChange));
    await prisma.$transaction([
      prisma.stockItem.update({
        where: { id: entry.stockItemId },
        data:  { currentStock: { increment: qty } },
      }),
      prisma.stockItemEntry.create({
        data: {
          stockItemId:    entry.stockItemId,
          quantityChange: qty,
          type:           "ADJUSTMENT",
          orderId,
          note:           `Restored — Order cancelled`,
          changedById:    userId,
        },
      }),
    ]);
  }
}
