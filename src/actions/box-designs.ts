"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth-guards";
import prisma from "@/lib/prisma";
import { boxDesignSchema } from "@/lib/validations/box-design";
import { calculateRawArea } from "@/lib/utils/calculations";

export async function createBoxDesign(formData: FormData) {
  await requireAuth();

  const raw = {
    code:         formData.get("code") as string,
    name:         formData.get("name") as string,
    designTypeId: formData.get("designTypeId"),
    materialId:   formData.get("materialId"),
    lengthCm:     formData.get("lengthCm"),
    widthCm:      formData.get("widthCm"),
    heightCm:     formData.get("heightCm"),
    cutLengthCm:  formData.get("cutLengthCm"),
    cutWidthCm:   formData.get("cutWidthCm"),
    unitPrice:    formData.get("unitPrice"),
    custom:       formData.get("custom") === "true",
    active:       true,
  };

  const parsed = boxDesignSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Validation error" };

  const rawAreaSqCm = calculateRawArea(parsed.data.cutLengthCm, parsed.data.cutWidthCm);

  try {
    await prisma.boxDesign.create({
      data: { ...parsed.data, rawAreaSqCm },
    });
  } catch (e: unknown) {
    if ((e as { code?: string }).code === "P2002") return { error: "A box design with this code already exists." };
    throw e;
  }

  revalidatePath("/box-designs");
  return { success: true };
}

export async function updateBoxDesign(id: number, formData: FormData) {
  await requireAuth();

  const raw = {
    code:         formData.get("code") as string,
    name:         formData.get("name") as string,
    designTypeId: formData.get("designTypeId"),
    materialId:   formData.get("materialId"),
    lengthCm:     formData.get("lengthCm"),
    widthCm:      formData.get("widthCm"),
    heightCm:     formData.get("heightCm"),
    cutLengthCm:  formData.get("cutLengthCm"),
    cutWidthCm:   formData.get("cutWidthCm"),
    unitPrice:    formData.get("unitPrice"),
    custom:       formData.get("custom") === "true",
    active:       formData.get("active") === "true",
  };

  const parsed = boxDesignSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Validation error" };

  const rawAreaSqCm = calculateRawArea(parsed.data.cutLengthCm, parsed.data.cutWidthCm);

  await prisma.boxDesign.update({
    where: { id },
    data: { ...parsed.data, rawAreaSqCm },
  });

  revalidatePath("/box-designs");
  return { success: true };
}

export async function toggleBoxDesignActive(id: number, active: boolean) {
  await requireAuth();
  await prisma.boxDesign.update({ where: { id }, data: { active } });
  revalidatePath("/box-designs");
  return { success: true };
}
