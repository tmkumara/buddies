import { requireAuth } from "@/lib/auth-guards";
import prisma from "@/lib/prisma";
import AppShell from "@/components/layout/AppShell";
import TopBar from "@/components/layout/TopBar";
import { Package, TrendingUp, CheckCircle2, Users, MoreHorizontal, FileText } from "lucide-react";

type OrderStatusKey = "DRAFT" | "CONFIRMED" | "IN_PRODUCTION" | "READY" | "DELIVERED" | "CANCELLED";

const STATUS_LABEL: Record<OrderStatusKey, string> = {
  DRAFT:         "Draft",
  CONFIRMED:     "Confirmed",
  IN_PRODUCTION: "In Production",
  READY:         "Ready",
  DELIVERED:     "Delivered",
  CANCELLED:     "Cancelled",
};

const STATUS_CSS: Record<OrderStatusKey, string> = {
  DRAFT:         "status-pending",
  CONFIRMED:     "status-processing",
  IN_PRODUCTION: "status-processing",
  READY:         "status-fulfilled",
  DELIVERED:     "status-fulfilled",
  CANCELLED:     "status-cancelled",
};

export default async function DashboardPage() {
  await requireAuth();

  const [totalOrders, totalCustomers, statusCounts, recentOrders] = await Promise.all([
    prisma.order.count(),
    prisma.customer.count({ where: { active: true } }),
    prisma.order.groupBy({ by: ["status"], _count: { id: true } }),
    prisma.order.findMany({
      take: 5,
      orderBy: [{ orderDate: "desc" }, { id: "desc" }],
      include: {
        customer: { select: { name: true } },
        items: { select: { id: true } },
      },
    }),
  ]);

  const byStatus = Object.fromEntries(statusCounts.map((s) => [s.status, s._count.id]));
  const activeOrders =
    (byStatus["DRAFT"] ?? 0) +
    (byStatus["CONFIRMED"] ?? 0) +
    (byStatus["IN_PRODUCTION"] ?? 0) +
    (byStatus["READY"] ?? 0);
  const deliveredCount = byStatus["DELIVERED"] ?? 0;
  const fulfillmentRate = totalOrders > 0
    ? Math.round((deliveredCount / totalOrders) * 100)
    : 0;

  const stats = [
    { label: "Total Orders",     value: totalOrders.toString(),    icon: Package,      iconColor: "#F5B61E" },
    { label: "Active Orders",    value: activeOrders.toString(),   icon: TrendingUp,   iconColor: "#FFD960" },
    { label: "Fulfillment Rate", value: `${fulfillmentRate}%`,     icon: CheckCircle2, iconColor: "#4ADE80" },
    { label: "Customers",        value: totalCustomers.toString(), icon: Users,        iconColor: "#A78BFA" },
  ];

  const statusBreakdown = [
    { label: "Draft",         count: byStatus["DRAFT"] ?? 0,         color: "rgba(240,237,230,0.3)" },
    { label: "Confirmed",     count: byStatus["CONFIRMED"] ?? 0,     color: "#F5B61E" },
    { label: "In Production", count: byStatus["IN_PRODUCTION"] ?? 0, color: "#FFD960" },
    { label: "Ready",         count: byStatus["READY"] ?? 0,         color: "#4ADE80" },
    { label: "Delivered",     count: byStatus["DELIVERED"] ?? 0,     color: "#4ADE80" },
    { label: "Cancelled",     count: byStatus["CANCELLED"] ?? 0,     color: "#F87171" },
  ];

  return (
    <AppShell>
      <TopBar title="Dashboard" />

      <div className="dash-body">
        <main className="dash-main">

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
            {stats.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="stat-mini" style={{ animation: `fade-in-up 0.5s ${i * 0.08}s ease both` }}>
                  <div style={{
                    width: "42px", height: "42px", borderRadius: "0.65rem",
                    background: "rgba(245,182,30,0.07)", border: "1px solid rgba(245,182,30,0.14)",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    <Icon size={18} strokeWidth={1.5} style={{ color: stat.iconColor }} />
                  </div>
                  <div>
                    <div style={{ fontSize: "0.58rem", letterSpacing: "0.12em", color: "rgba(240,237,230,0.3)", marginBottom: "0.3rem" }}>
                      {stat.label.toUpperCase()}
                    </div>
                    <div style={{ fontSize: "1.55rem", fontWeight: 800, color: "#F5B61E", lineHeight: 1, marginBottom: "0.25rem" }}>
                      {stat.value}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Recent Orders */}
          <div className="content-card" style={{ animation: "fade-in-up 0.5s 0.38s ease both" }}>
            <div className="flex items-center justify-between mb-4">
              <h2 style={{ fontSize: "1.1rem", fontWeight: 600, color: "#F5B61E", letterSpacing: "0.04em" }}>
                Recent Orders
              </h2>
              <a href="/orders" className="nav-link" style={{ fontSize: "0.6rem" }}>VIEW ALL →</a>
            </div>

            {recentOrders.length === 0 ? (
              <div style={{ padding: "2rem 0", textAlign: "center", fontSize: "0.75rem", color: "rgba(240,237,230,0.25)" }}>
                No orders yet.{" "}
                <a href="/orders/new" className="nav-link">Create the first order →</a>
              </div>
            ) : (
              <table className="orders-table">
                <thead>
                  <tr>
                    <th>ORDER NO</th>
                    <th>CUSTOMER</th>
                    <th>ITEMS</th>
                    <th>STATUS</th>
                    <th style={{ textAlign: "right" }}>NET AMOUNT</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => (
                    <tr key={order.id}>
                      <td style={{ color: "#F5B61E", fontWeight: 600, fontSize: "0.72rem" }}>{order.orderNo}</td>
                      <td>{order.customer.name}</td>
                      <td style={{ color: "rgba(240,237,230,0.4)" }}>
                        {order.items.length} {order.items.length === 1 ? "item" : "items"}
                      </td>
                      <td>
                        <span className={`status-pill ${STATUS_CSS[order.status]}`}>
                          {STATUS_LABEL[order.status].toUpperCase()}
                        </span>
                      </td>
                      <td style={{ textAlign: "right", color: "rgba(240,237,230,0.7)" }}>
                        {Number(order.netAmount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <a href={`/orders/${order.id}`}>
                          <button style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(240,237,230,0.25)", padding: "0.2rem" }}>
                            <MoreHorizontal size={14} />
                          </button>
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </main>

        {/* Right panel */}
        <aside className="dash-right">

          {/* Order Status Breakdown */}
          <div className="right-card" style={{ animation: "fade-in-up 0.5s 0.15s ease both" }}>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 600, color: "#F0EDE6", letterSpacing: "0.03em", marginBottom: "1rem" }}>
              Order Status
            </h3>
            {statusBreakdown.map((item) => (
              <div
                key={item.label}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "0.65rem 0.85rem", borderRadius: "0.5rem",
                  background: "rgba(255,255,255,0.02)", marginBottom: "0.5rem",
                  border: "1px solid rgba(245,182,30,0.06)",
                }}
              >
                <div style={{ fontSize: "0.7rem", color: "rgba(240,237,230,0.55)", letterSpacing: "0.04em" }}>
                  {item.label}
                </div>
                <span style={{
                  fontSize: "1rem", fontWeight: 700, color: item.color,
                  background: `${item.color}18`, padding: "0.15rem 0.55rem", borderRadius: "0.35rem",
                }}>
                  {item.count}
                </span>
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="right-card" style={{ animation: "fade-in-up 0.5s 0.28s ease both" }}>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 600, color: "#F0EDE6", letterSpacing: "0.03em", marginBottom: "0.85rem" }}>
              Quick Actions
            </h3>
            <div className="flex flex-col gap-2">
              {[
                { label: "New Order",    href: "/orders/new",    icon: Package },
                { label: "New Customer", href: "/customers/new", icon: Users },
                { label: "Export Report",href: "#",              icon: FileText },
              ].map(({ label, href, icon: Icon }) => (
                <a key={label} href={href} className="quick-action-btn" style={{ textDecoration: "none" }}>
                  <Icon size={14} strokeWidth={1.5} style={{ color: "#F5B61E", flexShrink: 0 }} />
                  {label}
                </a>
              ))}
            </div>
          </div>

        </aside>
      </div>

      <footer style={{
        padding: "0.75rem 1.75rem", borderTop: "1px solid rgba(245,182,30,0.06)",
        fontSize: "0.58rem", letterSpacing: "0.07em", color: "rgba(240,237,230,0.14)",
        display: "flex", justifyContent: "space-between",
      }}>
        <span>BUDDIES OMS v1.0</span>
        <span>© 2026 Buddies · Your Vision, Our Mission</span>
      </footer>
    </AppShell>
  );
}
