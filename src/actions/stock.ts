"use server";

import prisma from "@/lib/prisma";
import { calculateBoxesPerSheet, calculateSheetsNeeded } from "@/lib/utils/pricing";

export async function deductStockForOrder(orderId: number, userId: number): Promise<void> {
  const order = await prisma.order.findUnique({
    where:   { id: orderId },
    include: {
      items: {
        include: {
          boxDesign: {
            include: { material: true },
          },
        },
      },
    },
  });
  if (!order) return;

  for (const item of order.items) {
    const bd  = item.boxDesign;
    const mat = bd.material;

    const boxesPerSheet = calculateBoxesPerSheet({
      sheetLengthIn: mat.sheetLengthIn ? Number(mat.sheetLengthIn) : null,
      sheetWidthIn:  mat.sheetWidthIn  ? Number(mat.sheetWidthIn)  : null,
      sheetLengthCm: mat.sheetLengthCm ? Number(mat.sheetLengthCm) : null,
      sheetWidthCm:  mat.sheetWidthCm  ? Number(mat.sheetWidthCm)  : null,
      cutLengthIn:   bd.cutLengthIn    ? Number(bd.cutLengthIn)    : null,
      cutWidthIn:    bd.cutWidthIn     ? Number(bd.cutWidthIn)     : null,
      cutLengthCm:   bd.cutLengthCm    ? Number(bd.cutLengthCm)    : null,
      cutWidthCm:    bd.cutWidthCm     ? Number(bd.cutWidthCm)     : null,
    });

    if (boxesPerSheet === 0) continue;

    const sheetsNeeded = calculateSheetsNeeded(item.quantity, boxesPerSheet);

    await prisma.$transaction([
      prisma.material.update({
        where: { id: mat.id },
        data:  { currentStockLevel: { decrement: sheetsNeeded } },
      }),
      prisma.stockAdjustment.create({
        data: {
          materialId:     mat.id,
          quantityChange: -sheetsNeeded,
          reason:         `Auto-deducted for Order #${order.orderNo}`,
          type:           "AUTO_PRODUCTION",
          orderId,
          changedById:    userId,
        },
      }),
    ]);
  }
}
