"use server";

import { requireAuth } from "@/lib/auth-guards";
import prisma from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  name:        z.string().min(1, "Name is required").max(150),
  phone:       z.string().min(1, "Phone is required").max(30),
  phone2:      z.string().max(30).optional(),
  email:       z.string().email().max(150).optional().or(z.literal("")),
  addressLine: z.string().max(255).optional(),
  notes:       z.string().max(255).optional(),
});

export async function quickCreateCustomer(formData: FormData) {
  await requireAuth();

  const parsed = schema.safeParse({
    name:        formData.get("name"),
    phone:       formData.get("phone"),
    phone2:      (formData.get("phone2") as string) || undefined,
    email:       (formData.get("email") as string)  || undefined,
    addressLine: (formData.get("addressLine") as string) || undefined,
    notes:       (formData.get("notes") as string) || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Validation error" };

  const customer = await prisma.customer.create({
    data: {
      name:        parsed.data.name,
      phone:       parsed.data.phone,
      phone2:      parsed.data.phone2 ?? null,
      email:       parsed.data.email  || null,
      addressLine: parsed.data.addressLine ?? null,
      notes:       parsed.data.notes ?? null,
      active:      true,
    },
    select: { id: true, name: true, phone: true, email: true },
  });

  return { success: true as const, data: customer };
}
