import { requireAuth } from "@/lib/auth-guards";
import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import TopBar from "@/components/layout/TopBar";
import BoxDesignForm from "../../BoxDesignForm";

export default async function EditBoxDesignPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAuth();
  const { id } = await params;

  const [raw, designTypes, materials] = await Promise.all([
    prisma.boxDesign.findUnique({ where: { id: Number(id) } }),
    prisma.designType.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, code: true, name: true } }),
    prisma.material.findMany({ where: { status: { not: "INACTIVE" } }, orderBy: { name: "asc" }, select: { id: true, code: true, name: true } }),
  ]);

  if (!raw) notFound();

  const boxDesign = {
    ...raw,
    lengthIn:    raw.lengthIn    != null ? Number(raw.lengthIn)    : null,
    widthIn:     raw.widthIn     != null ? Number(raw.widthIn)     : null,
    heightIn:    raw.heightIn    != null ? Number(raw.heightIn)    : null,
    cutLengthIn: raw.cutLengthIn != null ? Number(raw.cutLengthIn) : null,
    cutWidthIn:  raw.cutWidthIn  != null ? Number(raw.cutWidthIn)  : null,
    lengthCm:    raw.lengthCm    != null ? Number(raw.lengthCm)    : null,
    widthCm:     raw.widthCm     != null ? Number(raw.widthCm)     : null,
    heightCm:    raw.heightCm    != null ? Number(raw.heightCm)    : null,
    cutLengthCm: raw.cutLengthCm != null ? Number(raw.cutLengthCm) : null,
    cutWidthCm:  raw.cutWidthCm  != null ? Number(raw.cutWidthCm)  : null,
    rawAreaSqCm: raw.rawAreaSqCm !== null ? Number(raw.rawAreaSqCm) : null,
    unitPrice:   Number(raw.unitPrice),
  };

  return (
    <>
      <TopBar title="Edit Box Design" />
      <div style={{ padding: "1.5rem 1.75rem", maxWidth: "680px" }}>
        <BoxDesignForm designTypes={designTypes} materials={materials} existing={boxDesign} />
      </div>
    </>
  );
}
