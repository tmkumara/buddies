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
    prisma.material.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, code: true, name: true } }),
  ]);

  if (!raw) notFound();

  const boxDesign = {
    ...raw,
    lengthCm:    Number(raw.lengthCm),
    widthCm:     Number(raw.widthCm),
    heightCm:    Number(raw.heightCm),
    cutLengthCm: Number(raw.cutLengthCm),
    cutWidthCm:  Number(raw.cutWidthCm),
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
