"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth-guards";
import prisma from "@/lib/prisma";
import { customerSchema } from "@/lib/validations/customer";

export async function createCustomer(formData: FormData) {
  await requireAuth();

  const raw = {
    name:        formData.get("name") as string,
    phone:       formData.get("phone") as string,
    email:       formData.get("email") as string || undefined,
    addressLine: formData.get("addressLine") as string || undefined,
    notes:       formData.get("notes") as string || undefined,
    active:      true,
  };

  const parsed = customerSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Validation error" };
  }

  await prisma.customer.create({
    data: {
      name:        parsed.data.name,
      phone:       parsed.data.phone,
      email:       parsed.data.email || null,
      addressLine: parsed.data.addressLine || null,
      notes:       parsed.data.notes || null,
      active:      true,
    },
  });

  revalidatePath("/customers");
  return { success: true };
}

export async function updateCustomer(id: number, formData: FormData) {
  await requireAuth();

  const raw = {
    name:        formData.get("name") as string,
    phone:       formData.get("phone") as string,
    email:       formData.get("email") as string || undefined,
    addressLine: formData.get("addressLine") as string || undefined,
    notes:       formData.get("notes") as string || undefined,
    active:      formData.get("active") === "true",
  };

  const parsed = customerSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Validation error" };
  }

  await prisma.customer.update({
    where: { id },
    data: {
      name:        parsed.data.name,
      phone:       parsed.data.phone,
      email:       parsed.data.email || null,
      addressLine: parsed.data.addressLine || null,
      notes:       parsed.data.notes || null,
      active:      parsed.data.active,
    },
  });

  revalidatePath("/customers");
  revalidatePath(`/customers/${id}/edit`);
  return { success: true };
}

export async function toggleCustomerActive(id: number, active: boolean) {
  await requireAuth();
  await prisma.customer.update({ where: { id }, data: { active } });
  revalidatePath("/customers");
  return { success: true };
}
