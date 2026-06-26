"use server";

import { requireAuth } from "@/lib/auth-guards";
import prisma from "@/lib/prisma";
import { z } from "zod";

const quickMaterialSchema = z.object({
  code:          z.string().min(1, "Code is required").max(50),
  name:          z.string().min(1, "Name is required").max(100),
  gsm:           z.coerce.number().int().min(80).max(600),
  sheetLengthCm: z.coerce.number().positive("Sheet length required"),
  sheetWidthCm:  z.coerce.number().positive("Sheet width required"),
  costPerSheet:  z.coerce.number().nonnegative(),
  status:        z.enum(["ACTIVE", "PENDING"]).default("ACTIVE"),
});

const quickDesignSchema = z.object({
  code:          z.string().min(1, "Code is required").max(50),
  name:          z.string().min(1, "Name is required").max(150),
  designTypeId:  z.coerce.number().int().positive("Design type required"),
  materialId:    z.coerce.number().int().positive("Material required"),
  lengthCm:      z.coerce.number().positive("Length required"),
  widthCm:       z.coerce.number().positive("Width required"),
  heightCm:      z.coerce.number().positive("Height required"),
  cutLengthCm:   z.coerce.number().positive("Cut length required"),
  cutWidthCm:    z.coerce.number().positive("Cut width required"),
  unitPrice:     z.coerce.number().nonnegative("Unit price required"),
  custom:        z.boolean().default(false),
});

export async function quickCreateMaterial(formData: FormData) {
  await requireAuth();

  const raw = {
    code:          formData.get("code") as string,
    name:          formData.get("name") as string,
    gsm:           formData.get("gsm"),
    sheetLengthCm: formData.get("sheetLengthCm"),
    sheetWidthCm:  formData.get("sheetWidthCm"),
    costPerSheet:  formData.get("costPerSheet"),
    status:        formData.get("isPending") === "true" ? "PENDING" : "ACTIVE",
  };

  const parsed = quickMaterialSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Validation error" };

  try {
    const m = await prisma.material.create({
      data: { ...parsed.data, minStockLevel: 0, currentStockLevel: 0 },
      select: { id: true, code: true, name: true, status: true },
    });
    return { data: m };
  } catch (e: unknown) {
    if ((e as { code?: string }).code === "P2002") return { error: "A material with this code already exists." };
    throw e;
  }
}

export async function quickCreateBoxDesign(formData: FormData) {
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
  };

  const parsed = quickDesignSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Validation error" };

  const rawArea = Math.round(parsed.data.cutLengthCm * parsed.data.cutWidthCm * 100) / 100;

  try {
    const bd = await prisma.boxDesign.create({
      data: { ...parsed.data, rawAreaSqCm: rawArea },
      select: {
        id: true, code: true, name: true, unitPrice: true,
        designType: { select: { name: true } },
      },
    });
    return {
      data: {
        id:             bd.id,
        code:           bd.code,
        name:           bd.name,
        unitPrice:      Number(bd.unitPrice),
        designTypeName: bd.designType.name,
      },
    };
  } catch (e: unknown) {
    if ((e as { code?: string }).code === "P2002") return { error: "A box design with this code already exists." };
    throw e;
  }
}
