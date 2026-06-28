import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guards";
import TopBar from "@/components/layout/TopBar";
import StockItemsClient from "@/components/stock-items/StockItemsClient";

export const metadata = { title: "Stock Items — Buddies OMS" };

export default async function StockItemsPage() {
  await requireAuth();

  const items = await prisma.stockItem.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      stockEntries: {
        orderBy: { changedAt: "desc" },
        take: 30,
        include: { changedBy: { select: { username: true } } },
      },
    },
  });

  const serialised = items.map((item) => ({
    id:           item.id,
    code:         item.code,
    name:         item.name,
    description:  item.description,
    stockUnit:    item.stockUnit,
    unitPrice:    Number(item.unitPrice),
    currentStock: Number(item.currentStock),
    minStock:     Number(item.minStock),
    active:       item.active,
    stockEntries: item.stockEntries.map((e) => ({
      id:             e.id,
      quantityChange: Number(e.quantityChange),
      type:           e.type,
      note:           e.note,
      changedAt:      e.changedAt.toISOString(),
      changedBy:      e.changedBy?.username ?? null,
    })),
  }));

  const total    = items.length;
  const inStock  = items.filter((i) => Number(i.currentStock) > Number(i.minStock) && i.active).length;
  const lowStock = items.filter((i) => Number(i.currentStock) <= Number(i.minStock) && Number(i.currentStock) > 0 && i.active).length;
  const outStock = items.filter((i) => Number(i.currentStock) <= 0 && i.active).length;

  return (
    <>
      <TopBar title="Stock Items" />
      <StockItemsClient
        items={serialised}
        stats={{ total, inStock, lowStock, outStock }}
      />
    </>
  );
}
