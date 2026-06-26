import { requireAuth } from "@/lib/auth-guards";
import prisma from "@/lib/prisma";
import TopBar from "@/components/layout/TopBar";
import MaterialsClient from "@/components/materials/MaterialsClient";
import { MaterialStatus } from "@prisma/client";

export default async function MaterialsPage() {
  await requireAuth();

  const raw = await prisma.material.findMany({ orderBy: { code: "asc" } });
  const materials = raw.map((m) => ({
    id:                m.id,
    code:              m.code,
    name:              m.name,
    gsm:               m.gsm,
    sheetLengthCm:     m.sheetLengthCm != null ? Number(m.sheetLengthCm) : null,
    sheetWidthCm:      m.sheetWidthCm  != null ? Number(m.sheetWidthCm)  : null,
    sheetLengthIn:     m.sheetLengthIn != null ? Number(m.sheetLengthIn) : null,
    sheetWidthIn:      m.sheetWidthIn  != null ? Number(m.sheetWidthIn)  : null,
    costPerSheet:      Number(m.costPerSheet),
    unitPrice:         Number(m.unitPrice),
    minStockLevel:     Number(m.minStockLevel),
    currentStockLevel: Number(m.currentStockLevel),
    status:            m.status as MaterialStatus,
  }));

  return (
    <>
      <TopBar title="Materials" />
      <MaterialsClient materials={materials} />
    </>
  );
}
