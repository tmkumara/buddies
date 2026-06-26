"use server";

import { requireAuth } from "@/lib/auth-guards";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { revalidatePath } from "next/cache";

const schema = z.object({
  materialId: z.coerce.number().int().positive(),
  quantityChange: z.coerce.number().refine((v) => v !== 0, "Quantity cannot be zero"),
  reason: z.string().min(1, "Reason is required").max(255),
  referenceId: z.coerce.number().int().optional(),
});

export async function createManualStockAdjustment(formData: FormData) {
  const session = await requireAuth();

  const parsed = schema.safeParse({
    materialId: formData.get("materialId"),
    quantityChange: formData.get("quantityChange"),
    reason: formData.get("reason"),
    referenceId: formData.get("referenceId") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Validation error" };

  const { materialId, quantityChange, reason, referenceId } = parsed.data;

  const material = await prisma.material.findUnique({
    where: { id: materialId },
    select: { id: true, currentStockLevel: true },
  });
  if (!material) return { error: "Material not found" };

  const newStock = Number(material.currentStockLevel) + quantityChange;
  if (newStock < 0) return { error: `Insufficient stock. Current: ${Number(material.currentStockLevel)}, Requested deduction: ${Math.abs(quantityChange)}` };

  await prisma.$transaction([
    prisma.material.update({
      where: { id: materialId },
      data: { currentStockLevel: { increment: quantityChange } },
    }),
    prisma.stockAdjustment.create({
      data: {
        materialId,
        quantityChange,
        reason,
        type: "MANUAL",
        changedById: Number(session.user.id),
        orderId: referenceId ?? null,
      },
    }),
  ]);

  revalidatePath(`/materials/${materialId}`);
  revalidatePath("/materials");
  return { success: true as const };
}

export async function getMaterialStockHistory(materialId: number, page = 1, pageSize = 20) {
  const [adjustments, total] = await Promise.all([
    prisma.stockAdjustment.findMany({
      where: { materialId },
      orderBy: { changedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        quantityChange: true,
        reason: true,
        changedAt: true,
        changedBy: { select: { username: true } },
        order: { select: { orderNo: true } },
      },
    }),
    prisma.stockAdjustment.count({ where: { materialId } }),
  ]);

  return {
    adjustments: adjustments.map((a) => ({
      ...a,
      quantityChange: Number(a.quantityChange),
      changedAt: a.changedAt.toISOString(),
    })),
    total,
    pages: Math.ceil(total / pageSize),
  };
}
