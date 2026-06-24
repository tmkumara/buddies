import { requireAuth } from "@/lib/auth-guards";
import prisma from "@/lib/prisma";
import TopBar from "@/components/layout/TopBar";
import NewOrderForm from "./NewOrderForm";

export default async function NewOrderPage() {
  await requireAuth();

  const [customers, boxDesigns] = await Promise.all([
    prisma.customer.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, phone: true },
    }),
    prisma.boxDesign.findMany({
      where: { active: true },
      orderBy: { code: "asc" },
      select: {
        id: true, code: true, name: true, unitPrice: true,
        designType: { select: { name: true } },
      },
    }),
  ]);

  const serializedDesigns = boxDesigns.map((bd) => ({
    id:             bd.id,
    code:           bd.code,
    name:           bd.name,
    unitPrice:      Number(bd.unitPrice),
    designTypeName: bd.designType.name,
  }));

  return (
    <>
      <TopBar title="New Order" />
      <div style={{ padding: "1.5rem 1.75rem", maxWidth: "760px" }}>
        <NewOrderForm customers={customers} boxDesigns={serializedDesigns} />
      </div>
    </>
  );
}
