import { requireAuth } from "@/lib/auth-guards";
import prisma from "@/lib/prisma";
import TopBar from "@/components/layout/TopBar";
import NewOrderForm from "./NewOrderForm";

export default async function NewOrderPage() {
  const session = await requireAuth();
  const isAdmin = session.user.role === "ADMIN";

  const [customers, boxTypes, boxDesigns, materials] = await Promise.all([
    prisma.customer.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, phone: true },
    }),
    prisma.designType.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, code: true, name: true },
    }),
    prisma.boxDesign.findMany({
      where: { active: true },
      orderBy: { code: "asc" },
      select: {
        id: true, code: true, name: true, unitPrice: true,
        designTypeId: true,
        designType: { select: { name: true } },
      },
    }),
    prisma.material.findMany({
      where: { status: { not: "INACTIVE" } },
      orderBy: { name: "asc" },
      select: { id: true, code: true, name: true, status: true },
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
      <div style={{ padding: "1.5rem 1.75rem", maxWidth: "760px" }}>
        <NewOrderForm
          customers={customers}
          boxTypes={boxTypes}
          boxDesigns={serializedDesigns}
          designTypes={boxTypes}
          materials={materials}
          isAdmin={isAdmin}
        />
      </div>
    </>
  );
}
