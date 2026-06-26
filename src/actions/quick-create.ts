"use server";

import { requireAuth } from "@/lib/auth-guards";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { calculateRawArea } from "@/lib/utils/calculations";

const optDim = z.coerce.number().positive().optional().nullable();

const quickMaterialSchema = z.object({
  code:          z.string().min(1, "Code is required").max(50),
  name:          z.string().min(1, "Name is required").max(100),
  gsm:           z.coerce.number().int().min(80).max(600),
  sheetLengthCm: optDim,
  sheetWidthCm:  optDim,
  sheetLengthIn: optDim,
  sheetWidthIn:  optDim,
  costPerSheet:  z.coerce.number().nonnegative(),
  unitPrice:     z.coerce.number().nonnegative().default(0),
  status:        z.enum(["ACTIVE", "PENDING"]).default("ACTIVE"),
});

const quickDesignSchema = z.object({
  code:         z.string().min(1, "Code is required").max(50),
  name:         z.string().min(1, "Name is required").max(150),
  designTypeId: z.coerce.number().int().positive("Design type required"),
  materialId:   z.coerce.number().int().positive("Material required"),
  lengthCm:     optDim,
  widthCm:      optDim,
  heightCm:     optDim,
  lengthIn:     optDim,
  widthIn:      optDim,
  heightIn:     optDim,
  cutLengthCm:  optDim,
  cutWidthCm:   optDim,
  cutLengthIn:  optDim,
  cutWidthIn:   optDim,
  unitPrice:    z.coerce.number().nonnegative("Unit price required"),
  custom:       z.boolean().default(false),
});

export async function quickCreateMaterial(formData: FormData) {
  await requireAuth();

  const raw = {
    code:          formData.get("code") as string,
    name:          formData.get("name") as string,
    gsm:           formData.get("gsm"),
    sheetLengthCm: formData.get("sheetLengthCm") || undefined,
    sheetWidthCm:  formData.get("sheetWidthCm")  || undefined,
    sheetLengthIn: formData.get("sheetLengthIn") || undefined,
    sheetWidthIn:  formData.get("sheetWidthIn")  || undefined,
    costPerSheet:  formData.get("costPerSheet"),
    unitPrice:     formData.get("unitPrice") ?? "0",
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
  };

  const parsed = quickDesignSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Validation error" };

  const rawAreaSqCm = calculateRawArea(parsed.data.cutLengthCm, parsed.data.cutWidthCm);

  try {
    const bd = await prisma.boxDesign.create({
      data: { ...parsed.data, rawAreaSqCm },
      select: {
        id: true, code: true, name: true, unitPrice: true,
        designTypeId: true,
        designType: { select: { name: true } },
      },
    });
    return {
      data: {
        id:          bd.id,
        code:        bd.code,
        name:        bd.name,
        unitPrice:   Number(bd.unitPrice),
        boxTypeId:   bd.designTypeId,
        boxTypeName: bd.designType.name,
      },
    };
  } catch (e: unknown) {
    if ((e as { code?: string }).code === "P2002") return { error: "A box design with this code already exists." };
    throw e;
  }
}
