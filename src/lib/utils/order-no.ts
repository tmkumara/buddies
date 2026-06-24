import prisma from "@/lib/prisma";

export async function generateOrderNo(): Promise<string> {
  const today = new Date();
  const dateKey =
    String(today.getFullYear()) +
    String(today.getMonth() + 1).padStart(2, "0") +
    String(today.getDate()).padStart(2, "0");

  const seq = await prisma.$transaction(async (tx) => {
    await tx.orderSeq.upsert({
      where: { date: dateKey },
      create: { date: dateKey, lastSeq: 1 },
      update: { lastSeq: { increment: 1 } },
    });
    const row = await tx.orderSeq.findUnique({ where: { date: dateKey } });
    return row!.lastSeq;
  });

  return seq === 1 ? `ORD-${dateKey}` : `ORD-${dateKey}-${seq}`;
}
