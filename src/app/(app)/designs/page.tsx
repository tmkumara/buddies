import { requireAuth } from "@/lib/auth-guards";
import prisma from "@/lib/prisma";
import TopBar from "@/components/layout/TopBar";
import DesignsClient from "./DesignsClient";

export default async function DesignsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireAuth();
  const { q } = await searchParams;

  const boxTypes = await prisma.designType.findMany({
    orderBy: { code: "asc" },
    include: {
      boxDesigns: {
        orderBy: { code: "asc" },
        include: { material: { select: { id: true, code: true, name: true } } },
      },
    },
  });

  // Serialize decimals
  const serialized = boxTypes.map((bt) => ({
    ...bt,
    boxDesigns: bt.boxDesigns.map((bd) => ({
      ...bd,
      unitPrice:   Number(bd.unitPrice),
      lengthIn:    bd.lengthIn    ? Number(bd.lengthIn)    : null,
      widthIn:     bd.widthIn     ? Number(bd.widthIn)     : null,
      heightIn:    bd.heightIn    ? Number(bd.heightIn)    : null,
      cutLengthIn: bd.cutLengthIn ? Number(bd.cutLengthIn) : null,
      cutWidthIn:  bd.cutWidthIn  ? Number(bd.cutWidthIn)  : null,
      lengthCm:    bd.lengthCm    ? Number(bd.lengthCm)    : null,
      widthCm:     bd.widthCm     ? Number(bd.widthCm)     : null,
      heightCm:    bd.heightCm    ? Number(bd.heightCm)    : null,
      cutLengthCm: bd.cutLengthCm ? Number(bd.cutLengthCm) : null,
      cutWidthCm:  bd.cutWidthCm  ? Number(bd.cutWidthCm)  : null,
      rawAreaSqCm: bd.rawAreaSqCm ? Number(bd.rawAreaSqCm) : null,
    })),
  }));

  // Fetch materials for slide-over dropdowns
  const materials = await prisma.material.findMany({
    where:   { status: { not: "INACTIVE" } },
    orderBy: { code: "asc" },
    select:  {
      id: true, code: true, name: true, status: true,
      unitPrice: true, costPerSheet: true,
      sheetLengthIn: true, sheetWidthIn: true,
      sheetLengthCm: true, sheetWidthCm: true,
    },
  });

  const serializedMaterials = materials.map((m) => ({
    ...m,
    unitPrice:     Number(m.unitPrice),
    costPerSheet:  Number(m.costPerSheet),
    sheetLengthIn: m.sheetLengthIn ? Number(m.sheetLengthIn) : null,
    sheetWidthIn:  m.sheetWidthIn  ? Number(m.sheetWidthIn)  : null,
    sheetLengthCm: m.sheetLengthCm ? Number(m.sheetLengthCm) : null,
    sheetWidthCm:  m.sheetWidthCm  ? Number(m.sheetWidthCm)  : null,
  }));

  return (
    <>
      <TopBar title="Designs" />
      <DesignsClient
        boxTypes={serialized}
        materials={serializedMaterials}
        initialSearch={q ?? ""}
      />
    </>
  );
}
