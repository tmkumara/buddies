import { requireAuth } from "@/lib/auth-guards";
import prisma from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import TopBar from "@/components/layout/TopBar";
import EditOrderForm from "./EditOrderForm";

export default async function EditOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth();
  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id: Number(id) },
    include: {
      items: { orderBy: { id: "asc" } },
    },
  });
  if (!order) notFound();

  const editableStatuses = ["DRAFT", "CONFIRMED", "IN_PRODUCTION"];
  if (!editableStatuses.includes(order.status)) redirect(`/orders/${id}`);

  const [boxTypes, boxDesigns, designTypes, materials, leadSources, stockItems, deliveryMethods] = await Promise.all([
    prisma.designType.findMany({ where: { active: true }, orderBy: { code: "asc" }, select: { id: true, code: true, name: true } }),
    prisma.boxDesign.findMany({
      where: { active: true }, orderBy: { code: "asc" },
      select: {
        id: true, code: true, name: true, unitPrice: true, designTypeId: true,
        designType: { select: { name: true } },
        lengthCm: true, widthCm: true, heightCm: true,
        lengthIn: true, widthIn: true, heightIn: true,
      },
    }),
    prisma.designType.findMany({ where: { active: true }, orderBy: { code: "asc" }, select: { id: true, code: true, name: true } }),
    prisma.material.findMany({ where: { status: { not: "INACTIVE" } }, orderBy: { code: "asc" }, select: { id: true, code: true, name: true, status: true } }),
    prisma.leadSource.findMany({ where: { active: true }, orderBy: { id: "asc" }, select: { id: true, name: true } }),
    prisma.stockItem.findMany({
      where:   { active: true },
      select:  { id: true, code: true, name: true, stockUnit: true, unitPrice: true, currentStock: true },
      orderBy: { name: "asc" },
    }),
    prisma.deliveryMethod.findMany({ where: { active: true }, orderBy: { id: "asc" }, select: { id: true, name: true } }),
  ]);

  const serializedOrder = {
    id:               order.id,
    status:           order.status,
    deliveryDate:     order.deliveryDate?.toISOString().split("T")[0] ?? null,
    remarks:          order.remarks,
    leadSourceId:     order.leadSourceId,
    discountPercent:  Number(order.discountPercent),
    deliveryCharge:   Number(order.deliveryCharge),
    deliveryMethodId: order.deliveryMethodId,
    items: order.items.map((item) => ({
      key:         `item-${item.id}`,
      boxDesignId: item.boxDesignId ?? 0,
      stockItemId: item.stockItemId ?? 0,
      designName:  item.designName,
      designCode:  item.designCode,
      quantity:    item.quantity,
      unitPrice:   Number(item.unitPrice),
      lineTotal:   Number(item.lineTotal),
    })),
  };

  const serializedDesigns = boxDesigns.map((bd) => {
    const inDims = [bd.lengthIn, bd.widthIn, bd.heightIn]
      .filter((v): v is NonNullable<typeof v> => v != null)
      .map((v) => Number(v).toFixed(1));
    const cmDims = [bd.lengthCm, bd.widthCm, bd.heightCm]
      .filter((v): v is NonNullable<typeof v> => v != null)
      .map((v) => Number(v).toFixed(0));
    const sizeStr = inDims.length > 0 ? inDims.join("×") + " in"
      : cmDims.length > 0 ? cmDims.join("×") + " cm" : undefined;
    return {
      id: bd.id, code: bd.code, name: bd.name,
      unitPrice: Number(bd.unitPrice),
      boxTypeId: bd.designTypeId, boxTypeName: bd.designType.name,
      sizeStr,
    };
  });

  const serialisedStockItems = stockItems.map((si) => ({
    ...si,
    unitPrice:    Number(si.unitPrice),
    currentStock: Number(si.currentStock),
  }));

  return (
    <>
      <TopBar title={`Edit Order`} />
      <div style={{ padding: "1.5rem 1.75rem" }}>
        <EditOrderForm
          order={serializedOrder}
          boxTypes={boxTypes}
          boxDesigns={serializedDesigns}
          designTypes={designTypes}
          materials={materials}
          leadSources={leadSources}
          stockItems={serialisedStockItems}
          deliveryMethods={deliveryMethods}
          isAdmin={session.user.role === "ADMIN"}
        />
      </div>
    </>
  );
}
