import { requireAuth } from "@/lib/auth-guards";
import prisma from "@/lib/prisma";
import TopBar from "@/components/layout/TopBar";
import NewOrderForm from "./NewOrderForm";

export default async function NewOrderPage() {
  await requireAuth();

  const [customers, boxTypes, boxDesigns, designTypes, materials, leadSources] = await Promise.all([
    prisma.customer.findMany({
      where:   { active: true },
      orderBy: { name: "asc" },
      select:  { id: true, name: true, phone: true, email: true },
    }),
    prisma.designType.findMany({
      where:   { active: true },
      orderBy: { code: "asc" },
      select:  { id: true, code: true, name: true },
    }),
    prisma.boxDesign.findMany({
      where:   { active: true },
      orderBy: { code: "asc" },
      select: {
        id: true, code: true, name: true, unitPrice: true,
        designTypeId: true,
        designType: { select: { name: true } },
      },
    }),
    prisma.designType.findMany({
      where:   { active: true },
      orderBy: { code: "asc" },
      select:  { id: true, code: true, name: true },
    }),
    prisma.material.findMany({
      where:   { status: { not: "INACTIVE" } },
      orderBy: { code: "asc" },
      select:  { id: true, code: true, name: true, status: true },
    }),
    prisma.leadSource.findMany({
      where:   { active: true },
      orderBy: { id: "asc" },
      select:  { id: true, name: true },
    }),
  ]);

  const serializedDesigns = boxDesigns.map((bd) => ({
    id:          bd.id,
    code:        bd.code,
    name:        bd.name,
    unitPrice:   Number(bd.unitPrice),
    boxTypeId:   bd.designTypeId,
    boxTypeName: bd.designType.name,
  }));

  return (
    <>
      <TopBar title="New Order" />
      <div style={{ padding: "1.5rem 1.75rem" }}>
        <NewOrderForm
          customers={customers}
          boxTypes={boxTypes}
          boxDesigns={serializedDesigns}
          designTypes={designTypes}
          materials={materials}
          leadSources={leadSources}
        />
      </div>
    </>
  );
}
