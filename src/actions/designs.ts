"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth-guards";
import prisma from "@/lib/prisma";
import { z } from "zod";

const boxTypeSchema = z.object({
  code:        z.string().min(1).max(50),
  name:        z.string().min(1).max(100),
  description: z.string().max(255).optional(),
  active:      z.boolean().default(true),
});

const optDim = z.coerce.number().positive().optional().nullable();

const boxDesignSchema = z.object({
  code:        z.string().min(1).max(50),
  name:        z.string().min(1).max(150),
  boxTypeId:   z.coerce.number().int().positive("Box type required"),
  materialId:  z.coerce.number().int().positive("Material required"),
  lengthIn:    optDim,
  widthIn:     optDim,
  heightIn:    optDim,
  cutLengthIn: optDim,
  cutWidthIn:  optDim,
  lengthCm:    optDim,
  widthCm:     optDim,
  heightCm:    optDim,
  cutLengthCm: optDim,
  cutWidthCm:  optDim,
  unitPrice:   z.coerce.number().nonnegative("Unit price required"),
  custom:      z.boolean().default(false),
  active:      z.boolean().default(true),
});

export async function createBoxType(formData: FormData) {
  await requireAuth();

  const parsed = boxTypeSchema.safeParse({
    code:        formData.get("code"),
    name:        formData.get("name"),
    description: (formData.get("description") as string) || undefined,
    active:      formData.get("active") !== "false",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Validation error" };

  try {
    const bt = await prisma.designType.create({
      data: parsed.data,
      select: { id: true, code: true, name: true, description: true, imageUrl: true, active: true },
    });
    revalidatePath("/designs");
    return { success: true as const, data: bt };
  } catch (e: unknown) {
    if ((e as { code?: string }).code === "P2002") return { error: "A box type with this code already exists." };
    throw e;
  }
}

export async function updateBoxType(id: number, formData: FormData) {
  await requireAuth();

  const parsed = boxTypeSchema.safeParse({
    code:        formData.get("code"),
    name:        formData.get("name"),
    description: (formData.get("description") as string) || undefined,
    active:      formData.get("active") !== "false",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Validation error" };

  try {
    await prisma.designType.update({ where: { id }, data: parsed.data });
    revalidatePath("/designs");
    return { success: true as const };
  } catch (e: unknown) {
    if ((e as { code?: string }).code === "P2002") return { error: "A box type with this code already exists." };
    throw e;
  }
}

export async function createBoxDesign(formData: FormData) {
  await requireAuth();

  const raw = {
    code:        formData.get("code") as string,
    name:        formData.get("name") as string,
    boxTypeId:   formData.get("boxTypeId"),
    materialId:  formData.get("materialId"),
    lengthIn:    formData.get("lengthIn")    || undefined,
    widthIn:     formData.get("widthIn")     || undefined,
    heightIn:    formData.get("heightIn")    || undefined,
    cutLengthIn: formData.get("cutLengthIn") || undefined,
    cutWidthIn:  formData.get("cutWidthIn")  || undefined,
    lengthCm:    formData.get("lengthCm")    || undefined,
    widthCm:     formData.get("widthCm")     || undefined,
    heightCm:    formData.get("heightCm")    || undefined,
    cutLengthCm: formData.get("cutLengthCm") || undefined,
    cutWidthCm:  formData.get("cutWidthCm")  || undefined,
    unitPrice:   formData.get("unitPrice"),
    custom:      formData.get("custom") === "true",
    active:      formData.get("active") !== "false",
  };

  const parsed = boxDesignSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Validation error" };

  const { boxTypeId, ...rest } = parsed.data;

  try {
    const bd = await prisma.boxDesign.create({
      data: {
        ...rest,
        designTypeId: boxTypeId,
        rawAreaSqCm: rest.cutLengthCm && rest.cutWidthCm
          ? rest.cutLengthCm * rest.cutWidthCm
          : null,
      },
      select: {
        id: true, code: true, name: true, unitPrice: true,
        designType: { select: { id: true, name: true } },
        material:   { select: { id: true, name: true } },
      },
    });
    revalidatePath("/designs");
    return {
      success: true as const,
      data: {
        id:          bd.id,
        code:        bd.code,
        name:        bd.name,
        unitPrice:   Number(bd.unitPrice),
        boxTypeId:   bd.designType.id,
        boxTypeName: bd.designType.name,
        materialId:  bd.material.id,
        materialName: bd.material.name,
      },
    };
  } catch (e: unknown) {
    if ((e as { code?: string }).code === "P2002") return { error: "A box design with this code already exists." };
    throw e;
  }
}

export async function updateBoxDesign(id: number, formData: FormData) {
  await requireAuth();

  const raw = {
    code:        formData.get("code") as string,
    name:        formData.get("name") as string,
    boxTypeId:   formData.get("boxTypeId"),
    materialId:  formData.get("materialId"),
    lengthIn:    formData.get("lengthIn")    || undefined,
    widthIn:     formData.get("widthIn")     || undefined,
    heightIn:    formData.get("heightIn")    || undefined,
    cutLengthIn: formData.get("cutLengthIn") || undefined,
    cutWidthIn:  formData.get("cutWidthIn")  || undefined,
    lengthCm:    formData.get("lengthCm")    || undefined,
    widthCm:     formData.get("widthCm")     || undefined,
    heightCm:    formData.get("heightCm")    || undefined,
    cutLengthCm: formData.get("cutLengthCm") || undefined,
    cutWidthCm:  formData.get("cutWidthCm")  || undefined,
    unitPrice:   formData.get("unitPrice"),
    custom:      formData.get("custom") === "true",
    active:      formData.get("active") !== "false",
  };

  const parsed = boxDesignSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Validation error" };

  const { boxTypeId, ...rest } = parsed.data;

  try {
    await prisma.boxDesign.update({
      where: { id },
      data: {
        ...rest,
        designTypeId: boxTypeId,
        rawAreaSqCm: rest.cutLengthCm && rest.cutWidthCm
          ? rest.cutLengthCm * rest.cutWidthCm
          : null,
      },
    });
    revalidatePath("/designs");
    return { success: true as const };
  } catch (e: unknown) {
    if ((e as { code?: string }).code === "P2002") return { error: "A box design with this code already exists." };
    throw e;
  }
}
