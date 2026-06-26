"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth-guards";
import prisma from "@/lib/prisma";
import { createPaymentSchema } from "@/lib/validations/payment";

export async function createPayment(orderId: number, formData: FormData) {
  const session = await requireAuth();

  const parsed = createPaymentSchema.safeParse({
    amount:      formData.get("amount"),
    paymentDate: formData.get("paymentDate"),
    method:      formData.get("method"),
    referenceNo: (formData.get("referenceNo") as string) || undefined,
    note:        (formData.get("note") as string) || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Validation error" };

  const order = await prisma.order.findUnique({
    where:  { id: orderId },
    select: { id: true },
  });
  if (!order) return { error: "Order not found" };

  await prisma.payment.create({
    data: {
      orderId,
      amount:      parsed.data.amount,
      paymentDate: new Date(parsed.data.paymentDate),
      method:      parsed.data.method,
      referenceNo: parsed.data.referenceNo ?? null,
      note:        parsed.data.note ?? null,
      createdById: Number(session.user.id),
    },
  });

  revalidatePath(`/orders/${orderId}`);
  return { success: true as const };
}

export async function deletePayment(paymentId: number, orderId: number) {
  await requireAuth();
  await prisma.payment.delete({ where: { id: paymentId } });
  revalidatePath(`/orders/${orderId}`);
  return { success: true as const };
}
