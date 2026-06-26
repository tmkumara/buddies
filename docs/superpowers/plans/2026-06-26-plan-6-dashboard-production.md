# Plan 6: Dashboard & Production Queue

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Overhaul the dashboard with charts (bar + pie), top customers, top designs, revenue stats, low-stock alert panel, and a new `/production` page that shows orders currently IN_PRODUCTION sorted by delivery date.

**Architecture:**
- Dashboard is a server component that fetches all stats server-side, then passes serialized data to a `DashboardCharts` client component (where `recharts` runs)
- Charts: (1) Revenue by month — bar chart, (2) Order status distribution — pie chart, (3) Top 5 customers by revenue, (4) Top 5 box designs by order count
- Production queue: simple server page at `/production`, orders in IN_PRODUCTION status sorted by deliveryDate ASC
- No new packages beyond `recharts` (already common, acceptable)

**Tech Stack:** `recharts`, Next.js 16 App Router, Prisma 7, Server Actions

## Global Constraints

- `searchParams` is a Promise — must be awaited
- Prisma Decimal → `Number()` before passing to Client Components
- `recharts` is a CLIENT component library — must be in `"use client"` files only
- **Prerequisite: Plan 1 must be complete (Order has discountPercent, netAmount etc.)**

---

### Task 1: Install recharts

**Files:**
- Modify: `package.json` (via npm install)

- [ ] **Step 1: Install**

```bash
npm install recharts
```

- [ ] **Step 2: Verify import compiles**

Create `src/lib/recharts-test.ts`:
```typescript
// @ts-expect-error recharts has its own types
import "recharts";
export {};
```

```bash
npx tsc --noEmit
```

Delete `src/lib/recharts-test.ts`.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "deps: add recharts for dashboard charts"
```

---

### Task 2: Dashboard data aggregation server utility

**Files:**
- Create: `src/lib/dashboard-stats.ts`

- [ ] **Step 1: Create the stats aggregator**

Create `src/lib/dashboard-stats.ts`:

```typescript
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
  lowStockMaterials: { id: number; code: string; name: string; stockQty: number }[];
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
    prisma.material.findMany({ select: { id: true, code: true, name: true, stockQty: true }, orderBy: { stockQty: "asc" }, take: 5 }),
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
    const cur = designMap.get(item.boxDesignId) ?? { name: item.designName, code: item.designCode, totalQty: 0, totalRevenue: 0 };
    designMap.set(item.boxDesignId, {
      ...cur, totalQty: cur.totalQty + item.quantity, totalRevenue: cur.totalRevenue + Number(item.lineTotal),
    });
  });
  const topDesigns = [...designMap.values()]
    .sort((a, b) => b.totalQty - a.totalQty)
    .slice(0, 5)
    .map((d) => ({ ...d, totalRevenue: Math.round(d.totalRevenue) }));

  // Low stock (threshold ≤ 20)
  const lowStockMaterials = materials
    .filter((m) => Number(m.stockQty) <= 20)
    .map((m) => ({ ...m, stockQty: Number(m.stockQty) }));

  return {
    totalOrders,
    totalRevenue:     Math.round(Number(revenueAgg._sum.netAmount) ?? 0),
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/dashboard-stats.ts
git commit -m "feat: dashboard stats aggregation utility with revenue, status, top customers/designs, low stock"
```

---

### Task 3: DashboardCharts client component

**Files:**
- Create: `src/components/dashboard/DashboardCharts.tsx`

- [ ] **Step 1: Create the charts component**

Create `src/components/dashboard/DashboardCharts.tsx`:

```typescript
"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

interface RevenueMonth { month: string; revenue: number; }
interface StatusItem   { status: string; count: number; }

interface Props {
  revenueByMonth:     RevenueMonth[];
  statusDistribution: StatusItem[];
}

const STATUS_COLOR: Record<string, string> = {
  DRAFT: "#6b7280", CONFIRMED: "#3b82f6", IN_PRODUCTION: "#f59e0b",
  READY: "#8b5cf6", DELIVERED: "#10b981", CANCELLED: "#ef4444",
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft", CONFIRMED: "Confirmed", IN_PRODUCTION: "In Production",
  READY: "Ready", DELIVERED: "Delivered", CANCELLED: "Cancelled",
};

const GOLD = "#F5B61E";

export default function DashboardCharts({ revenueByMonth, statusDistribution }: Props) {
  const tooltipStyle = {
    backgroundColor: "#1a1a1a", border: "1px solid rgba(245,182,30,0.2)",
    borderRadius: "0.4rem", color: "#F0EDE6", fontSize: "0.78rem",
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
      {/* Revenue Bar Chart */}
      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(245,182,30,0.08)", borderRadius: "0.6rem", padding: "1rem 1.25rem" }}>
        <p style={{ fontSize: "0.65rem", letterSpacing: "0.1em", color: "rgba(240,237,230,0.35)", marginBottom: "0.75rem" }}>MONTHLY REVENUE (RS.)</p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={revenueByMonth} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(245,182,30,0.06)" />
            <XAxis dataKey="month" tick={{ fontSize: 9, fill: "rgba(240,237,230,0.35)" }} />
            <YAxis tick={{ fontSize: 9, fill: "rgba(240,237,230,0.35)" }} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`Rs. ${v.toLocaleString()}`, "Revenue"]} />
            <Bar dataKey="revenue" fill={GOLD} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Status Pie Chart */}
      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(245,182,30,0.08)", borderRadius: "0.6rem", padding: "1rem 1.25rem" }}>
        <p style={{ fontSize: "0.65rem", letterSpacing: "0.1em", color: "rgba(240,237,230,0.35)", marginBottom: "0.75rem" }}>ORDER STATUS DISTRIBUTION</p>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={statusDistribution}
              cx="50%" cy="50%"
              innerRadius={50} outerRadius={75}
              dataKey="count"
              nameKey="status"
              paddingAngle={2}
            >
              {statusDistribution.map((entry) => (
                <Cell key={entry.status} fill={STATUS_COLOR[entry.status] ?? "#6b7280"} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(v: number, _: string, props: { payload?: { status: string } }) => [v, STATUS_LABEL[props.payload?.status ?? ""] ?? props.payload?.status]}
            />
            <Legend
              formatter={(value) => <span style={{ fontSize: "0.7rem", color: "rgba(240,237,230,0.55)" }}>{STATUS_LABEL[value] ?? value}</span>}
              iconSize={8}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/DashboardCharts.tsx
git commit -m "feat: DashboardCharts — monthly revenue bar chart + order status pie chart using recharts"
```

---

### Task 4: Overhaul dashboard page

**Files:**
- Modify: `src/app/dashboard/page.tsx`

- [ ] **Step 1: Replace the dashboard page**

Replace `src/app/dashboard/page.tsx` with:

```typescript
import Link from "next/link";
import { requireAuth } from "@/lib/auth-guards";
import TopBar from "@/components/layout/TopBar";
import DashboardCharts from "@/components/dashboard/DashboardCharts";
import { getDashboardStats } from "@/lib/dashboard-stats";
import { AlertTriangle, Package, Users, ShoppingCart, TrendingUp } from "lucide-react";

const STATUS_COLOR: Record<string, string> = {
  DRAFT: "#6b7280", CONFIRMED: "#3b82f6", IN_PRODUCTION: "#f59e0b",
  READY: "#8b5cf6", DELIVERED: "#10b981", CANCELLED: "#ef4444",
};

export default async function DashboardPage() {
  await requireAuth();
  const stats = await getDashboardStats();

  const statCards = [
    { label: "Total Orders",      value: stats.totalOrders,      icon: ShoppingCart, color: GOLD },
    { label: "Total Revenue",     value: `Rs. ${stats.totalRevenue.toLocaleString()}`, icon: TrendingUp, color: "#4ADE80" },
    { label: "Active Customers",  value: stats.totalCustomers,   icon: Users,        color: "#818CF8" },
    { label: "In Production",     value: stats.ordersInProgress, icon: Package,      color: "#FBBF24" },
  ];

  const GOLD = "#F5B61E";

  const card: React.CSSProperties = {
    background: "rgba(255,255,255,0.02)", border: "1px solid rgba(245,182,30,0.08)",
    borderRadius: "0.6rem", padding: "1.1rem 1.25rem",
  };
  const th: React.CSSProperties = {
    padding: "0.45rem 0.6rem", fontSize: "0.58rem", letterSpacing: "0.1em",
    color: "rgba(240,237,230,0.3)", fontWeight: 600, borderBottom: "1px solid rgba(245,182,30,0.08)",
  };
  const td: React.CSSProperties = {
    padding: "0.5rem 0.6rem", fontSize: "0.78rem", borderBottom: "1px solid rgba(245,182,30,0.04)", verticalAlign: "middle",
  };

  return (
    <>
      <TopBar title="Dashboard" />
      <div style={{ padding: "1.5rem 1.75rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>

        {/* Stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem" }}>
          {statCards.map((s) => (
            <div key={s.label} style={card}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.5rem" }}>
                <s.icon size={16} color={s.color} />
                <span style={{ fontSize: "0.62rem", letterSpacing: "0.1em", color: "rgba(240,237,230,0.35)" }}>{s.label.toUpperCase()}</span>
              </div>
              <p style={{ fontSize: "1.55rem", fontWeight: 800, color: "#F0EDE6", letterSpacing: "-0.02em" }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Charts */}
        <DashboardCharts
          revenueByMonth={stats.revenueByMonth}
          statusDistribution={stats.statusDistribution}
        />

        {/* Low stock alert */}
        {stats.lowStockMaterials.length > 0 && (
          <div style={{ ...card, border: "1px solid rgba(248,113,113,0.2)", background: "rgba(248,113,113,0.03)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
              <AlertTriangle size={15} color="#F87171" />
              <span style={{ fontSize: "0.65rem", letterSpacing: "0.1em", color: "#F87171" }}>LOW STOCK MATERIALS</span>
            </div>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              {stats.lowStockMaterials.map((m) => (
                <Link key={m.id} href="/materials" style={{ textDecoration: "none" }}>
                  <div style={{ padding: "0.4rem 0.75rem", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: "0.4rem" }}>
                    <span style={{ fontSize: "0.72rem", color: "#F0EDE6", fontWeight: 600 }}>{m.code}</span>
                    <span style={{ fontSize: "0.65rem", color: "rgba(240,237,230,0.45)", marginLeft: "0.4rem" }}>{m.stockQty} sheets</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Top Customers + Top Designs side by side */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
          {/* Top Customers */}
          <div style={card}>
            <p style={{ fontSize: "0.65rem", letterSpacing: "0.1em", color: "rgba(240,237,230,0.35)", marginBottom: "0.75rem" }}>TOP CUSTOMERS</p>
            {stats.topCustomers.length === 0
              ? <p style={{ fontSize: "0.72rem", color: "rgba(240,237,230,0.2)" }}>No data</p>
              : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><tr>
                    <th style={{ ...th, textAlign: "left" }}>CUSTOMER</th>
                    <th style={{ ...th, textAlign: "right" }}>ORDERS</th>
                    <th style={{ ...th, textAlign: "right" }}>REVENUE</th>
                  </tr></thead>
                  <tbody>
                    {stats.topCustomers.map((c, i) => (
                      <tr key={i}>
                        <td style={{ ...td, color: "#F0EDE6", fontWeight: 500 }}>{c.name}</td>
                        <td style={{ ...td, textAlign: "right", color: "rgba(240,237,230,0.5)" }}>{c.orders}</td>
                        <td style={{ ...td, textAlign: "right", color: GOLD, fontWeight: 600 }}>Rs. {c.revenue.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
          </div>

          {/* Top Designs */}
          <div style={card}>
            <p style={{ fontSize: "0.65rem", letterSpacing: "0.1em", color: "rgba(240,237,230,0.35)", marginBottom: "0.75rem" }}>TOP BOX DESIGNS</p>
            {stats.topDesigns.length === 0
              ? <p style={{ fontSize: "0.72rem", color: "rgba(240,237,230,0.2)" }}>No data</p>
              : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><tr>
                    <th style={{ ...th, textAlign: "left" }}>DESIGN</th>
                    <th style={{ ...th, textAlign: "right" }}>QTY</th>
                    <th style={{ ...th, textAlign: "right" }}>REVENUE</th>
                  </tr></thead>
                  <tbody>
                    {stats.topDesigns.map((d, i) => (
                      <tr key={i}>
                        <td style={{ ...td, color: "#F0EDE6" }}>
                          <span style={{ fontSize: "0.65rem", color: "rgba(240,237,230,0.4)", marginRight: "0.3rem" }}>{d.code}</span>
                          {d.name}
                        </td>
                        <td style={{ ...td, textAlign: "right", color: "rgba(240,237,230,0.5)" }}>{d.totalQty}</td>
                        <td style={{ ...td, textAlign: "right", color: GOLD, fontWeight: 600 }}>Rs. {d.totalRevenue.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
          </div>
        </div>

        {/* Recent Orders */}
        <div style={card}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
            <p style={{ fontSize: "0.65rem", letterSpacing: "0.1em", color: "rgba(240,237,230,0.35)" }}>RECENT ORDERS</p>
            <Link href="/orders" style={{ fontSize: "0.65rem", color: GOLD, textDecoration: "none" }}>View all →</Link>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <th style={{ ...th, textAlign: "left" }}>ORDER</th>
              <th style={{ ...th, textAlign: "left" }}>CUSTOMER</th>
              <th style={{ ...th, textAlign: "left" }}>STATUS</th>
              <th style={{ ...th, textAlign: "right" }}>AMOUNT</th>
              <th style={{ ...th, textAlign: "right" }}>DATE</th>
            </tr></thead>
            <tbody>
              {stats.recentOrders.map((o) => (
                <tr key={o.id}>
                  <td style={td}><Link href={`/orders/${o.id}`} style={{ color: GOLD, fontWeight: 600, textDecoration: "none" }}>{o.orderNo}</Link></td>
                  <td style={{ ...td, color: "#F0EDE6" }}>{o.customerName}</td>
                  <td style={td}>
                    <span style={{ fontSize: "0.62rem", fontWeight: 700, color: STATUS_COLOR[o.status] ?? "#6b7280", background: `${STATUS_COLOR[o.status] ?? "#6b7280"}18`, padding: "0.1rem 0.45rem", borderRadius: "0.3rem" }}>
                      {o.status.replace("_", " ")}
                    </span>
                  </td>
                  <td style={{ ...td, textAlign: "right", color: GOLD, fontWeight: 600 }}>Rs. {o.netAmount.toLocaleString()}</td>
                  <td style={{ ...td, textAlign: "right", color: "rgba(240,237,230,0.4)", fontSize: "0.72rem" }}>{o.orderDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Manual test**

```bash
npm run dev
```

1. Navigate to `/dashboard`
2. Stat cards show total orders, revenue, customers, in-production count
3. Monthly revenue bar chart visible (12 months of bars)
4. Status distribution pie chart visible with legend
5. Low stock panel shows if any material has stockQty ≤ 20
6. Top customers and top designs tables populated
7. Recent orders table visible, order numbers link to /orders/[id]

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/page.tsx src/components/dashboard/
git commit -m "feat: dashboard overhaul — stat cards, revenue bar chart, status pie, top customers/designs, low stock alert"
```

---

### Task 5: Production Queue page

**Files:**
- Create: `src/app/(app)/production/page.tsx`
- Modify: `src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Create the production queue page**

Create `src/app/(app)/production/page.tsx`:

```typescript
import Link from "next/link";
import { requireAuth } from "@/lib/auth-guards";
import prisma from "@/lib/prisma";
import TopBar from "@/components/layout/TopBar";

const STATUS_COLOR: Record<string, string> = { IN_PRODUCTION: "#f59e0b" };

export default async function ProductionQueuePage() {
  await requireAuth();

  const orders = await prisma.order.findMany({
    where:   { status: "IN_PRODUCTION" },
    orderBy: [{ deliveryDate: "asc" }, { orderDate: "asc" }],
    include: {
      customer: { select: { name: true, phone: true } },
      items: {
        select: { designCode: true, designName: true, quantity: true },
        orderBy: { id: "asc" },
      },
    },
  });

  const today = new Date(); today.setHours(0, 0, 0, 0);

  const th: React.CSSProperties = {
    padding: "0.55rem 0.75rem", fontSize: "0.62rem", letterSpacing: "0.1em",
    color: "rgba(240,237,230,0.3)", fontWeight: 600,
    borderBottom: "1px solid rgba(245,182,30,0.1)", textAlign: "left",
  };
  const td: React.CSSProperties = {
    padding: "0.65rem 0.75rem", borderBottom: "1px solid rgba(245,182,30,0.05)", verticalAlign: "top",
  };

  return (
    <>
      <TopBar title="Production Queue" />
      <div style={{ padding: "1.5rem 1.75rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
          <p style={{ fontSize: "0.75rem", color: "rgba(240,237,230,0.35)" }}>
            {orders.length} order{orders.length !== 1 ? "s" : ""} in production · sorted by delivery date
          </p>
        </div>

        {orders.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem", fontSize: "0.82rem", color: "rgba(240,237,230,0.2)" }}>
            No orders currently in production.
          </div>
        ) : (
          <div className="content-card" style={{ overflow: "clip", borderRadius: "0.7rem" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ position: "sticky", top: "4.5rem", background: "#0d0d0d", zIndex: 2 }}>
                <tr>
                  <th style={th}>ORDER</th>
                  <th style={th}>CUSTOMER</th>
                  <th style={th}>ITEMS</th>
                  <th style={th}>DELIVERY</th>
                  <th style={th}>DAYS LEFT</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const deliveryDate = order.deliveryDate ? new Date(order.deliveryDate) : null;
                  const daysLeft = deliveryDate
                    ? Math.ceil((deliveryDate.getTime() - today.getTime()) / 86400000)
                    : null;
                  const urgentColor = daysLeft !== null && daysLeft <= 2 ? "#F87171" : daysLeft !== null && daysLeft <= 5 ? "#FBBF24" : "#4ADE80";

                  return (
                    <tr key={order.id}>
                      <td style={td}>
                        <Link href={`/orders/${order.id}`} style={{ color: "#F5B61E", fontWeight: 700, textDecoration: "none", fontSize: "0.85rem" }}>
                          {order.orderNo}
                        </Link>
                      </td>
                      <td style={td}>
                        <div style={{ fontSize: "0.82rem", color: "#F0EDE6", fontWeight: 500 }}>{order.customer.name}</div>
                        <div style={{ fontSize: "0.65rem", color: "rgba(240,237,230,0.4)" }}>{order.customer.phone}</div>
                      </td>
                      <td style={td}>
                        {order.items.map((item, i) => (
                          <div key={i} style={{ fontSize: "0.72rem", color: "rgba(240,237,230,0.6)", marginBottom: "0.15rem" }}>
                            <span style={{ color: "#F0EDE6", fontWeight: 500 }}>{item.quantity}×</span> {item.designCode} {item.designName}
                          </div>
                        ))}
                      </td>
                      <td style={{ ...td, whiteSpace: "nowrap" }}>
                        {deliveryDate
                          ? <span style={{ fontSize: "0.8rem", color: "#F0EDE6" }}>{deliveryDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</span>
                          : <span style={{ fontSize: "0.72rem", color: "rgba(240,237,230,0.3)" }}>—</span>
                        }
                      </td>
                      <td style={td}>
                        {daysLeft !== null ? (
                          <span style={{ fontSize: "0.72rem", fontWeight: 700, color: urgentColor, background: `${urgentColor}18`, padding: "0.15rem 0.55rem", borderRadius: "0.3rem", border: `1px solid ${urgentColor}35` }}>
                            {daysLeft === 0 ? "TODAY" : daysLeft < 0 ? `${Math.abs(daysLeft)}d OVERDUE` : `${daysLeft}d`}
                          </span>
                        ) : (
                          <span style={{ fontSize: "0.65rem", color: "rgba(240,237,230,0.2)" }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
```

- [ ] **Step 2: Add Production Queue to sidebar navigation**

In `src/components/layout/Sidebar.tsx`, add a production link to the main nav:

```typescript
// In the mainNav array or equivalent navigation config, add:
{ href: "/production", label: "Production Queue", icon: Factory },
```

Also import `Factory` from `lucide-react` if not already imported.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Manual test**

```bash
npm run dev
```

1. Navigate to `/production`
2. Orders with status IN_PRODUCTION appear sorted by delivery date
3. Days left badge: green for >5 days, amber for ≤5 days, red for ≤2 days, shows "OVERDUE" for past
4. Click order number → navigates to order detail
5. "Production Queue" appears in sidebar

- [ ] **Step 5: Commit**

```bash
git add src/app/(app)/production/ src/components/layout/Sidebar.tsx
git commit -m "feat: production queue page at /production — in-production orders sorted by delivery, days-left urgency badge"
```
