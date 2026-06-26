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
    sheetLengthCm:     formData.get("sheetLengthCm") || undefined,
    sheetWidthCm:      formData.get("sheetWidthCm")  || undefined,
    sheetLengthIn:     formData.get("sheetLengthIn") || undefined,
    sheetWidthIn:      formData.get("sheetWidthIn")  || undefined,
    costPerSheet:      formData.get("costPerSheet"),
    unitPrice:         formData.get("unitPrice"),
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
    sheetLengthCm:     formData.get("sheetLengthCm") || undefined,
    sheetWidthCm:      formData.get("sheetWidthCm")  || undefined,
    sheetLengthIn:     formData.get("sheetLengthIn") || undefined,
    sheetWidthIn:      formData.get("sheetWidthIn")  || undefined,
    costPerSheet:      formData.get("costPerSheet"),
    unitPrice:         formData.get("unitPrice"),
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

export async function updateMaterialStock(id: number, value: number) {
  await requireAuth();
  if (value < 0) return { error: "Stock level cannot be negative." };
  await prisma.material.update({ where: { id }, data: { currentStockLevel: value } });
  revalidatePath("/materials");
  return { success: true };
}
