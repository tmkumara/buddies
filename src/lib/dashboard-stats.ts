import prisma from "@/lib/prisma";

export interface DashboardStats {
  totalOrders:      number;
  totalRevenue:     number;
  totalCustomers:   number;
  ordersInProgress: number;
  revenueByMonth:   { month: string; revenue: number }[];
  statusDistribution: { status: string; count: number }[];
  topCustomers:     { name: string; revenue: number; orders: number }[];
  topDesigns:       { name: string; code: string; totalQty: number; totalRevenue: number }[];
  lowStockMaterials: { id: number; code: string; name: string; currentStockLevel: number }[];
  recentOrders:     { id: number; orderNo: string; customerName: string; status: string; netAmount: number; orderDate: string }[];
}

export async function getDashboardStats(dateFrom?: Date, dateTo?: Date): Promise<DashboardStats> {
  const dateFilter = dateFrom && dateTo
    ? { orderDate: { gte: dateFrom, lte: dateTo } }
    : {};

  const [
    totalOrders,
    revenueAgg,
    totalCustomers,
    ordersInProgress,
    orders,
    orderItems,
    materials,
    recentOrders,
  ] = await Promise.all([
    prisma.order.count({ where: { ...dateFilter, status: { not: "CANCELLED" } } }),
    prisma.order.aggregate({ where: { ...dateFilter, status: { not: "CANCELLED" } }, _sum: { netAmount: true } }),
    prisma.customer.count({ where: { active: true } }),
    prisma.order.count({ where: { status: "IN_PRODUCTION" } }),
    prisma.order.findMany({
      where: { ...dateFilter, status: { not: "CANCELLED" } },
      select: { status: true, netAmount: true, orderDate: true, customerId: true, customer: { select: { name: true } } },
    }),
    prisma.orderItem.findMany({
      where: { order: { ...dateFilter, status: { not: "CANCELLED" } } },
      select: { quantity: true, lineTotal: true, boxDesignId: true, designName: true, designCode: true },
    }),
    prisma.material.findMany({
      where: { currentStockLevel: { lte: 20 }, status: { not: "INACTIVE" } },
      select: { id: true, code: true, name: true, currentStockLevel: true },
      orderBy: { currentStockLevel: "asc" },
      take: 10,
    }),
    prisma.order.findMany({
      where: { status: { not: "CANCELLED" } },
      orderBy: { orderDate: "desc" },
      take: 8,
      select: { id: true, orderNo: true, status: true, netAmount: true, orderDate: true, customer: { select: { name: true } } },
    }),
  ]);

  // Revenue by month (last 12 months)
  const revenueByMonthMap = new Map<string, number>();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    revenueByMonthMap.set(key, 0);
  }
  orders.forEach((o) => {
    const key = `${o.orderDate.getFullYear()}-${String(o.orderDate.getMonth() + 1).padStart(2, "0")}`;
    if (revenueByMonthMap.has(key)) {
      revenueByMonthMap.set(key, (revenueByMonthMap.get(key) ?? 0) + Number(o.netAmount));
    }
  });
  const revenueByMonth = [...revenueByMonthMap.entries()].map(([month, revenue]) => ({
    month: new Date(month + "-01").toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
    revenue: Math.round(revenue),
  }));

  // Status distribution
  const statusMap = new Map<string, number>();
  orders.forEach((o) => statusMap.set(o.status, (statusMap.get(o.status) ?? 0) + 1));
  const statusDistribution = [...statusMap.entries()].map(([status, count]) => ({ status, count }));

  // Top customers
  const custMap = new Map<string, { revenue: number; orders: number }>();
  orders.forEach((o) => {
    const name = o.customer.name;
    const cur = custMap.get(name) ?? { revenue: 0, orders: 0 };
    custMap.set(name, { revenue: cur.revenue + Number(o.netAmount), orders: cur.orders + 1 });
  });
  const topCustomers = [...custMap.entries()]
    .map(([name, d]) => ({ name, ...d, revenue: Math.round(d.revenue) }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // Top designs
  const designMap = new Map<number, { name: string; code: string; totalQty: number; totalRevenue: number }>();
  orderItems.forEach((item) => {
    const cur = designMap.get(item.boxDesignId ?? 0) ?? { name: item.designName, code: item.designCode, totalQty: 0, totalRevenue: 0 };
    designMap.set(item.boxDesignId ?? 0, {
      ...cur, totalQty: cur.totalQty + item.quantity, totalRevenue: cur.totalRevenue + Number(item.lineTotal),
    });
  });
  const topDesigns = [...designMap.values()]
    .sort((a, b) => b.totalQty - a.totalQty)
    .slice(0, 5)
    .map((d) => ({ ...d, totalRevenue: Math.round(d.totalRevenue) }));

  // Low stock (threshold ≤ 20)
  const lowStockMaterials = materials.map((m) => ({ ...m, currentStockLevel: Number(m.currentStockLevel) }));

  return {
    totalOrders,
    totalRevenue:     Math.round(Number(revenueAgg._sum.netAmount ?? 0)),
    totalCustomers,
    ordersInProgress,
    revenueByMonth,
    statusDistribution,
    topCustomers,
    topDesigns,
    lowStockMaterials,
    recentOrders: recentOrders.map((o) => ({
      id:           o.id,
      orderNo:      o.orderNo,
      customerName: o.customer.name,
      status:       o.status,
      netAmount:    Number(o.netAmount),
      orderDate:    o.orderDate.toISOString().split("T")[0],
    })),
  };
}
