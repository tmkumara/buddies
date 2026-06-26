import { requireAuth } from "@/lib/auth-guards";
import prisma from "@/lib/prisma";
import TopBar from "@/components/layout/TopBar";
import ReportsClient from "./ReportsClient";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await requireAuth();
  const params = await searchParams;

  const from = params.from ?? "";
  const to   = params.to   ?? "";

  const dateFilter =
    from && to
      ? { orderDate: { gte: new Date(from), lte: new Date(to + "T23:59:59Z") } }
      : {};

  const [orderCount, revenueAgg, statusBreakdown] = await Promise.all([
    prisma.order.count({ where: { ...dateFilter, status: { not: "CANCELLED" } } }),
    prisma.order.aggregate({ where: { ...dateFilter, status: { not: "CANCELLED" } }, _sum: { netAmount: true } }),
    prisma.order.groupBy({ by: ["status"], where: dateFilter, _count: { _all: true } }),
  ]);

  const csvUrl = `/api/reports/orders-csv${from && to ? `?from=${from}&to=${to}` : ""}`;

  return (
    <>
      <TopBar title="Reports" />
      <div style={{ padding: "1.5rem 1.75rem" }}>
        <ReportsClient
          from={from}
          to={to}
          orderCount={orderCount}
          totalRevenue={Math.round(Number(revenueAgg._sum.netAmount ?? 0))}
          statusBreakdown={statusBreakdown.map((s) => ({ status: s.status, count: s._count._all }))}
          csvUrl={csvUrl}
        />
      </div>
    </>
  );
}
