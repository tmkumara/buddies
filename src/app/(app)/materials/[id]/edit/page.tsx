import { requireAuth } from "@/lib/auth-guards";
import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import TopBar from "@/components/layout/TopBar";
import EditMaterialForm from "./EditMaterialForm";

export default async function EditMaterialPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAuth();
  const { id } = await params;
  const raw = await prisma.material.findUnique({ where: { id: Number(id) } });
  if (!raw) notFound();

  const material = {
    ...raw,
    sheetLengthCm:     Number(raw.sheetLengthCm),
    sheetWidthCm:      Number(raw.sheetWidthCm),
    costPerSheet:      Number(raw.costPerSheet),
    minStockLevel:     Number(raw.minStockLevel),
    currentStockLevel: Number(raw.currentStockLevel),
  };

  return (
    <>
      <TopBar title="Edit Material" />
      <div style={{ padding: "1.5rem 1.75rem", maxWidth: "600px" }}>
        <EditMaterialForm material={material} />
      </div>
    </>
  );
}
