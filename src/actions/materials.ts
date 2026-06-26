"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth-guards";
import prisma from "@/lib/prisma";
import { materialSchema } from "@/lib/validations/material";
import { MaterialStatus } from "@prisma/client";

export async function createMaterial(formData: FormData) {
  await requireAuth();

  const raw = {
    code:              formData.get("code") as string,
    name:              formData.get("name") as string,
    gsm:               formData.get("gsm"),
    sheetLengthCm:     formData.get("sheetLengthCm"),
    sheetWidthCm:      formData.get("sheetWidthCm"),
    costPerSheet:      formData.get("costPerSheet"),
    minStockLevel:     formData.get("minStockLevel"),
    currentStockLevel: formData.get("currentStockLevel"),
    status:            formData.get("status") ?? "ACTIVE",
  };

  const parsed = materialSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Validation error" };

  try {
    await prisma.material.create({ data: parsed.data });
  } catch (e: unknown) {
    if ((e as { code?: string }).code === "P2002") return { error: "A material with this code already exists." };
    throw e;
  }

  revalidatePath("/materials");
  return { success: true };
}

export async function updateMaterial(id: number, formData: FormData) {
  await requireAuth();

  const raw = {
    code:              formData.get("code") as string,
    name:              formData.get("name") as string,
    gsm:               formData.get("gsm"),
    sheetLengthCm:     formData.get("sheetLengthCm"),
    sheetWidthCm:      formData.get("sheetWidthCm"),
    costPerSheet:      formData.get("costPerSheet"),
    minStockLevel:     formData.get("minStockLevel"),
    currentStockLevel: formData.get("currentStockLevel"),
    status:            formData.get("status") ?? "ACTIVE",
  };

  const parsed = materialSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Validation error" };

  await prisma.material.update({ where: { id }, data: parsed.data });
  revalidatePath("/materials");
  return { success: true };
}

export async function updateMaterialStatus(id: number, status: MaterialStatus) {
  await requireAuth();
  await prisma.material.update({ where: { id }, data: { status } });
  revalidatePath("/materials");
  return { success: true };
}
