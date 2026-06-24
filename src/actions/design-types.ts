"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth-guards";
import prisma from "@/lib/prisma";
import { designTypeSchema } from "@/lib/validations/design-type";

export async function createDesignType(formData: FormData) {
  await requireAuth();

  const raw = {
    code:        (formData.get("code") as string ?? "").toUpperCase(),
    name:        formData.get("name") as string,
    description: formData.get("description") as string || undefined,
    imageUrl:    formData.get("imageUrl") as string || undefined,
    active:      true,
  };

  const parsed = designTypeSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Validation error" };

  try {
    await prisma.designType.create({
      data: {
        code:        parsed.data.code,
        name:        parsed.data.name,
        description: parsed.data.description || null,
        imageUrl:    parsed.data.imageUrl || null,
        active:      true,
      },
    });
  } catch (e: unknown) {
    if ((e as { code?: string }).code === "P2002") return { error: "A design type with this code already exists." };
    throw e;
  }

  revalidatePath("/design-types");
  return { success: true };
}

export async function updateDesignType(id: number, formData: FormData) {
  await requireAuth();

  const raw = {
    code:        (formData.get("code") as string ?? "").toUpperCase(),
    name:        formData.get("name") as string,
    description: formData.get("description") as string || undefined,
    imageUrl:    formData.get("imageUrl") as string || undefined,
    active:      formData.get("active") === "true",
  };

  const parsed = designTypeSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Validation error" };

  await prisma.designType.update({
    where: { id },
    data: {
      code:        parsed.data.code,
      name:        parsed.data.name,
      description: parsed.data.description || null,
      imageUrl:    parsed.data.imageUrl || null,
      active:      parsed.data.active,
    },
  });

  revalidatePath("/design-types");
  return { success: true };
}

export async function toggleDesignTypeActive(id: number, active: boolean) {
  await requireAuth();
  await prisma.designType.update({ where: { id }, data: { active } });
  revalidatePath("/design-types");
  return { success: true };
}
