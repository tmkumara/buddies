"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth-guards";
import prisma from "@/lib/prisma";
import { boxDesignSchema } from "@/lib/validations/box-design";
import { calculateRawArea } from "@/lib/utils/calculations";

function extractRaw(formData: FormData, includeActive: boolean) {
  return {
    code:         formData.get("code") as string,
    name:         formData.get("name") as string,
    designTypeId: formData.get("designTypeId"),
    materialId:   formData.get("materialId"),
    lengthCm:     formData.get("lengthCm")    || undefined,
    widthCm:      formData.get("widthCm")     || undefined,
    heightCm:     formData.get("heightCm")    || undefined,
    lengthIn:     formData.get("lengthIn")    || undefined,
    widthIn:      formData.get("widthIn")     || undefined,
    heightIn:     formData.get("heightIn")    || undefined,
    cutLengthCm:  formData.get("cutLengthCm") || undefined,
    cutWidthCm:   formData.get("cutWidthCm")  || undefined,
    cutLengthIn:  formData.get("cutLengthIn") || undefined,
    cutWidthIn:   formData.get("cutWidthIn")  || undefined,
    unitPrice:    formData.get("unitPrice"),
    custom:       formData.get("custom") === "true",
    ...(includeActive ? { active: formData.get("active") === "true" } : { active: true }),
  };
}

export async function createBoxDesign(formData: FormData) {
  await requireAuth();

  const parsed = boxDesignSchema.safeParse(extractRaw(formData, false));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Validation error" };

  const rawAreaSqCm = calculateRawArea(parsed.data.cutLengthCm, parsed.data.cutWidthCm);

  try {
    await prisma.boxDesign.create({ data: { ...parsed.data, rawAreaSqCm } });
  } catch (e: unknown) {
    if ((e as { code?: string }).code === "P2002") return { error: "A box design with this code already exists." };
    throw e;
  }

  revalidatePath("/box-designs");
  return { success: true };
}

export async function updateBoxDesign(id: number, formData: FormData) {
  await requireAuth();

  const parsed = boxDesignSchema.safeParse(extractRaw(formData, true));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Validation error" };

  const rawAreaSqCm = calculateRawArea(parsed.data.cutLengthCm, parsed.data.cutWidthCm);

  await prisma.boxDesign.update({ where: { id }, data: { ...parsed.data, rawAreaSqCm } });
  revalidatePath("/box-designs");
  return { success: true };
}

export async function toggleBoxDesignActive(id: number, active: boolean) {
  await requireAuth();
  await prisma.boxDesign.update({ where: { id }, data: { active } });
  revalidatePath("/box-designs");
  return { success: true };
}
