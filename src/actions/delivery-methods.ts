"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth-guards";
import prisma from "@/lib/prisma";

export async function createDeliveryMethod(formData: FormData) {
  const session = await requireAuth();
  if (session.user.role !== "ADMIN") return { error: "Admin only" };

  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "Name is required" };
  if (name.length > 100) return { error: "Name must be 100 characters or less" };

  await prisma.deliveryMethod.create({ data: { name } });
  revalidatePath("/settings");
  return { success: true as const };
}

export async function updateDeliveryMethod(formData: FormData) {
  const session = await requireAuth();
  if (session.user.role !== "ADMIN") return { error: "Admin only" };

  const id     = parseInt(formData.get("id") as string);
  const name   = (formData.get("name") as string)?.trim();
  const active = formData.get("active") !== "false";

  if (!id || isNaN(id)) return { error: "Invalid delivery method ID" };
  if (!name) return { error: "Name is required" };

  await prisma.deliveryMethod.update({ where: { id }, data: { name, active } });
  revalidatePath("/settings");
  return { success: true as const };
}
