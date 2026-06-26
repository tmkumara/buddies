import { requireAuth } from "@/lib/auth-guards";
import prisma from "@/lib/prisma";
import TopBar from "@/components/layout/TopBar";
import MaterialsClient from "@/components/materials/MaterialsClient";
import { MaterialStatus } from "@prisma/client";

const VALID_STATUSES: MaterialStatus[] = ["ACTIVE", "PENDING", "INACTIVE"];
const VALID_SIZES = [20, 50, 100];

export default async function MaterialsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string; size?: string }>;
}) {
  await requireAuth();
  const { q, status, page: pageParam, size: sizeParam } = await searchParams;

  const currentStatus = VALID_STATUSES.includes(status as MaterialStatus)
    ? (status as MaterialStatus)
    : undefined;
  const size = VALID_SIZES.includes(parseInt(sizeParam ?? "")) ? parseInt(sizeParam!) : 20;
  const page = Math.max(1, parseInt(pageParam ?? "1") || 1);
  const skip = (page - 1) * size;

  const where = {
    status: currentStatus,
    OR: q
      ? [{ code: { contains: q } }, { name: { contains: q } }]
      : undefined,
  };

  const [raw, filteredTotal, totalAll, totalActive, totalPending, lowStockResult] =
    await Promise.all([
      prisma.material.findMany({
        where,
        skip,
        take: size,
        orderBy: { code: "asc" },
        include: {
          stockAdjustments: {
            orderBy: { changedAt: "desc" },
            take: 20,
            select: {
              id: true,
              quantityChange: true,
              reason: true,
              changedAt: true,
              changedBy: { select: { username: true } },
              order: { select: { orderNo: true } },
            },
          },
        },
      }),
      prisma.material.count({ where }),
      prisma.material.count(),
      prisma.material.count({ where: { status: "ACTIVE" } }),
      prisma.material.count({ where: { status: "PENDING" } }),
      prisma.$queryRaw<{ cnt: bigint }[]>`
        SELECT COUNT(*) AS cnt FROM \`material\`
        WHERE \`status\` = 'ACTIVE'
          AND \`min_stock_level\` > 0
          AND \`current_stock_level\` <= \`min_stock_level\`
      `,
    ]);

  const materials = raw.map((m) => ({
    id:                m.id,
    code:              m.code,
    name:              m.name,
    gsm:               m.gsm,
    sheetLengthCm:     m.sheetLengthCm  != null ? Number(m.sheetLengthCm)  : null,
    sheetWidthCm:      m.sheetWidthCm   != null ? Number(m.sheetWidthCm)   : null,
    sheetLengthIn:     m.sheetLengthIn  != null ? Number(m.sheetLengthIn)  : null,
    sheetWidthIn:      m.sheetWidthIn   != null ? Number(m.sheetWidthIn)   : null,
    costPerSheet:      Number(m.costPerSheet),
    unitPrice:         Number(m.unitPrice),
    minStockLevel:     Number(m.minStockLevel),
    currentStockLevel: Number(m.currentStockLevel),
    status:            m.status as MaterialStatus,
    stockAdjustments:  m.stockAdjustments.map((a) => ({
      id:             a.id,
      quantityChange: Number(a.quantityChange),
      reason:         a.reason ?? "",
      changedAt:      a.changedAt.toISOString(),
      changedBy:      { username: a.changedBy?.username ?? "" },
      order:          a.order ? { orderNo: a.order.orderNo } : null,
    })),
  }));

  return (
    <>
      <TopBar title="Materials" />
      <MaterialsClient
        materials={materials}
        filteredTotal={filteredTotal}
        page={page}
        size={size}
        currentQ={q ?? ""}
        currentStatus={currentStatus ?? "ALL"}
        statTotals={{
          total:    totalAll,
          active:   totalActive,
          pending:  totalPending,
          lowStock: Number(lowStockResult[0]?.cnt ?? 0),
        }}
      />
    </>
  );
}
