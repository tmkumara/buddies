import Link from "next/link";
import { requireAuth } from "@/lib/auth-guards";
import AppShell from "@/components/layout/AppShell";
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
  const GOLD = "#F5B61E";
  const stats = await getDashboardStats();

  const statCards = [
    { label: "Total Orders",      value: stats.totalOrders,      icon: ShoppingCart, color: GOLD },
    { label: "Total Revenue",     value: `Rs. ${stats.totalRevenue.toLocaleString()}`, icon: TrendingUp, color: "#4ADE80" },
    { label: "Active Customers",  value: stats.totalCustomers,   icon: Users,        color: "#818CF8" },
    { label: "In Production",     value: stats.ordersInProgress, icon: Package,      color: "#FBBF24" },
  ];

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
    <AppShell>
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
                    <span style={{ fontSize: "0.65rem", color: "rgba(240,237,230,0.45)", marginLeft: "0.4rem" }}>{m.currentStockLevel} sheets</span>
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
    </AppShell>
  );
}
