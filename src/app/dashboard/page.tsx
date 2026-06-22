import Image from "next/image";
import Link from "next/link";
import {
  LayoutDashboard, Package, Archive, CalendarDays, Settings2,
  BarChart2, Gift, Users, FileText, Bell, ChevronDown,
  TrendingUp, CheckCircle2, Clock, MoreHorizontal,
} from "lucide-react";
import SignOutButton from "./sign-out-button";

/* ── Static data ──────────────────────────────────── */

const sidebarMain = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard", active: true },
  { label: "Orders",    icon: Package,          href: "#" },
  { label: "Inventory", icon: Archive,          href: "#" },
  { label: "Calendar",  icon: CalendarDays,     href: "#" },
  { label: "Settings",  icon: Settings2,        href: "#" },
];

const sidebarOps = [
  { label: "Analytics",  icon: BarChart2, href: "#" },
  { label: "Gift Boxes", icon: Gift,      href: "#" },
  { label: "Customers",  icon: Users,     href: "#" },
  { label: "Reports",    icon: FileText,  href: "#" },
];

const statsData = [
  { label: "Total Orders",     value: "12,847", trend: "+12.4%", icon: Package,       iconColor: "#F5B61E" },
  { label: "Revenue MTD",      value: "$84.2K", trend: "+8.1%",  icon: TrendingUp,    iconColor: "#FFD960" },
  { label: "Fulfillment Rate", value: "98.4%",  trend: "+0.3%",  icon: CheckCircle2,  iconColor: "#4ADE80" },
];

const chartBars = [
  { month: "Feb", h: 58 },
  { month: "Mar", h: 76 },
  { month: "Apr", h: 64 },
  { month: "May", h: 93 },
  { month: "Jun", h: 79 },
  { month: "Jul", h: 100 },
];

const topProducts = [
  { name: "Classic Gold Box",    count: "3,142 orders" },
  { name: "Premium Gift Set",    count: "2,891 orders" },
  { name: "Birthday Collection", count: "2,456 orders" },
  { name: "Corporate Bundle",    count: "1,892 orders" },
];

type OrderStatus = "Processing" | "Fulfilled" | "Pending" | "Cancelled";

const recentOrders: Array<{
  id: string; customer: string; items: number; status: OrderStatus; amount: string;
}> = [
  { id: "#ORD-0892", customer: "Kayla M.",   items: 3, status: "Processing", amount: "$124.00" },
  { id: "#ORD-0891", customer: "Dilshan P.", items: 1, status: "Fulfilled",  amount: "$48.00"  },
  { id: "#ORD-0890", customer: "Nimali W.",  items: 5, status: "Pending",    amount: "$210.00" },
  { id: "#ORD-0889", customer: "Rohan S.",   items: 2, status: "Fulfilled",  amount: "$96.00"  },
  { id: "#ORD-0888", customer: "Amaya T.",   items: 4, status: "Cancelled",  amount: "$172.00" },
];

const statusClass: Record<OrderStatus, string> = {
  Processing: "status-processing",
  Fulfilled:  "status-fulfilled",
  Pending:    "status-pending",
  Cancelled:  "status-cancelled",
};

const deliveries = [
  { label: "Kayla M. · 3 boxes",     time: "Today 10:00 – 12:00" },
  { label: "Nimali W. · 5 boxes",    time: "Today 14:00 – 16:00" },
  { label: "Rohan S. · 2 boxes",     time: "Today 16:30 – 18:00" },
];

const fulfillment = [
  { label: "On-time", value: "10,814", pct: "87.2%", color: "#4ADE80" },
  { label: "Late",    value: "1,042",  pct: "8.4%",  color: "#F5B61E" },
  { label: "Failed",  value: "549",    pct: "4.4%",  color: "#F87171" },
];

/* ── Page ─────────────────────────────────────────── */

export default function DashboardPage() {
  return (
    <div className="dashboard-root">

      {/* ── Sidebar ───────────────────────────────── */}
      <aside className="sidebar">
        {/* Logo */}
        <div className="sidebar-logo">
          <Image src="/buddiesicon.png" alt="Buddies" width={28} height={28} className="object-contain" />
          <span style={{
            fontSize: "0.95rem",
            letterSpacing: "0.28em",
            color: "#F5B61E",
            fontWeight: 700,
          }}>
            BUDDIES
          </span>
        </div>

        {/* Main menu */}
        <div>
          <p className="sidebar-section-label">MAIN MENU</p>
          {sidebarMain.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`sidebar-item${item.active ? " sidebar-item-active" : ""}`}
              >
                <Icon size={15} strokeWidth={1.8} />
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Operations menu */}
        <div>
          <p className="sidebar-section-label">OPERATIONS</p>
          {sidebarOps.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.label} href={item.href} className="sidebar-item">
                <Icon size={15} strokeWidth={1.8} />
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Sidebar footer */}
        <div style={{ marginTop: "auto", padding: "0.75rem 1.1rem", borderTop: "1px solid rgba(245,182,30,0.07)" }}>
          <SignOutButton />
        </div>
      </aside>

      {/* ── Main content ─────────────────────────── */}
      <div className="dashboard-content">

        {/* Top bar */}
        <header className="dash-topbar">
          <h1 style={{
            fontSize: "1.6rem",
            fontWeight: 700,
            color: "#F0EDE6",
            letterSpacing: "0.02em",
          }}>
            Dashboard
          </h1>

          <div className="flex items-center gap-4">
            {/* Notification bell */}
            <button
              aria-label="Notifications"
              style={{
                position: "relative",
                background: "rgba(245,182,30,0.07)",
                border: "1px solid rgba(245,182,30,0.14)",
                borderRadius: "0.5rem",
                padding: "0.4rem",
                cursor: "pointer",
                color: "rgba(240,237,230,0.5)",
                display: "flex",
              }}
            >
              <Bell size={16} strokeWidth={1.5} />
              <span style={{
                position: "absolute",
                top: "-3px",
                right: "-3px",
                width: "8px",
                height: "8px",
                background: "#F5B61E",
                borderRadius: "50%",
              }} />
            </button>

            {/* User chip */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.6rem",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(245,182,30,0.14)",
                borderRadius: "2rem",
                padding: "0.35rem 0.75rem 0.35rem 0.35rem",
                cursor: "pointer",
              }}
            >
              <div style={{
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #D4920A, #F5B61E)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.7rem",
                fontWeight: 700,
                color: "#080808",
              }}>
                A
              </div>
              <span style={{ fontSize: "0.74rem", color: "rgba(240,237,230,0.6)" }}>Admin</span>
              <ChevronDown size={12} style={{ color: "rgba(240,237,230,0.35)" }} />
            </div>
          </div>
        </header>

        {/* Body */}
        <div className="dash-body">

          {/* ── Main content ───────────────────── */}
          <main className="dash-main">

            {/* Stats row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
              {statsData.map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={stat.label}
                    className="stat-mini"
                    style={{ animation: `fade-in-up 0.5s ${i * 0.08}s ease both` }}
                  >
                    {/* Icon box */}
                    <div style={{
                      width: "42px",
                      height: "42px",
                      borderRadius: "0.65rem",
                      background: "rgba(245,182,30,0.07)",
                      border: "1px solid rgba(245,182,30,0.14)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}>
                      <Icon size={18} strokeWidth={1.5} style={{ color: stat.iconColor }} />
                    </div>
                    <div>
                      <div style={{ fontSize: "0.58rem", letterSpacing: "0.12em", color: "rgba(240,237,230,0.3)", marginBottom: "0.3rem" }}>
                        {stat.label.toUpperCase()}
                      </div>
                      <div style={{
                        fontSize: "1.55rem",
                        fontWeight: 800,
                        color: "#F5B61E",
                        lineHeight: 1,
                        marginBottom: "0.25rem",
                      }}>
                        {stat.value}
                      </div>
                      <div style={{ fontSize: "0.6rem", color: "#4ADE80", letterSpacing: "0.04em" }}>
                        {stat.trend}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Chart + Top Products */}
            <div className="content-card mb-5" style={{ animation: "fade-in-up 0.5s 0.25s ease both" }}>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 style={{
                    fontSize: "1.1rem",
                    fontWeight: 600,
                    color: "#F5B61E",
                    letterSpacing: "0.04em",
                    marginBottom: "0.15rem",
                  }}>
                    Order Volume
                  </h2>
                  <p style={{ fontSize: "0.62rem", color: "rgba(240,237,230,0.3)", letterSpacing: "0.06em" }}>
                    PAST 6 MONTHS
                  </p>
                </div>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  background: "rgba(245,182,30,0.07)",
                  border: "1px solid rgba(245,182,30,0.14)",
                  borderRadius: "0.4rem",
                  padding: "0.35rem 0.75rem",
                  fontSize: "0.65rem",
                  color: "rgba(240,237,230,0.45)",
                  cursor: "pointer",
                }}>
                  Past 6 months <ChevronDown size={11} />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 220px", gap: "2rem", alignItems: "end" }}>

                {/* SVG Bar chart */}
                <div>
                  <svg viewBox="0 0 312 140" width="100%" height="140" xmlns="http://www.w3.org/2000/svg" aria-label="Order volume bar chart">
                    <defs>
                      <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#FFD960" stopOpacity="0.95" />
                        <stop offset="100%" stopColor="#D4920A" stopOpacity="0.75" />
                      </linearGradient>
                      <linearGradient id="barGradDim" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#F5B61E" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#D4920A" stopOpacity="0.15" />
                      </linearGradient>
                    </defs>

                    {/* Grid lines */}
                    {[25, 50, 75, 100].map((pct) => (
                      <line key={pct} x1="0" y1={110 - pct} x2="312" y2={110 - pct}
                        stroke="rgba(245,182,30,0.07)" strokeWidth="1" />
                    ))}

                    {/* Bars */}
                    {chartBars.map((bar, i) => {
                      const x = i * 52 + 11;
                      const barH = bar.h;
                      const y = 110 - barH;
                      return (
                        <g key={bar.month}>
                          <rect x={x} y={y} width="30" height={barH} rx="3" fill="url(#barGrad)" />
                          <text x={x + 15} y="128" textAnchor="middle" fontSize="9" fill="rgba(240,237,230,0.28)">
                            {bar.month}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>

                {/* Top Products */}
                <div>
                  <p style={{ fontSize: "0.62rem", letterSpacing: "0.1em", color: "rgba(240,237,230,0.3)", marginBottom: "0.75rem" }}>
                    TOP PRODUCTS
                  </p>
                  <div className="flex flex-col gap-3">
                    {topProducts.map((p, i) => (
                      <div key={p.name} className="flex items-center gap-2">
                        <div style={{
                          width: "24px",
                          height: "24px",
                          borderRadius: "50%",
                          background: "rgba(245,182,30,0.1)",
                          border: "1px solid rgba(245,182,30,0.2)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "0.6rem",
                          fontWeight: 700,
                          color: "#F5B61E",
                          flexShrink: 0,
                        }}>
                          {i + 1}
                        </div>
                        <div>
                          <div style={{ fontSize: "0.72rem", color: "rgba(240,237,230,0.7)", lineHeight: 1.3 }}>{p.name}</div>
                          <div style={{ fontSize: "0.6rem", color: "rgba(240,237,230,0.28)" }}>{p.count}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Orders table */}
            <div className="content-card" style={{ animation: "fade-in-up 0.5s 0.38s ease both" }}>
              <div className="flex items-center justify-between mb-4">
                <h2 style={{
                  fontSize: "1.1rem",
                  fontWeight: 600,
                  color: "#F5B61E",
                  letterSpacing: "0.04em",
                }}>
                  Recent Orders
                </h2>
                <a href="#" className="nav-link" style={{ fontSize: "0.6rem" }}>VIEW ALL →</a>
              </div>

              <table className="orders-table">
                <thead>
                  <tr>
                    <th>ORDER ID</th>
                    <th>CUSTOMER</th>
                    <th>ITEMS</th>
                    <th>STATUS</th>
                    <th style={{ textAlign: "right" }}>AMOUNT</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => (
                    <tr key={order.id}>
                      <td style={{ color: "#F5B61E", fontWeight: 600, fontSize: "0.72rem" }}>{order.id}</td>
                      <td>{order.customer}</td>
                      <td style={{ color: "rgba(240,237,230,0.4)" }}>{order.items} {order.items === 1 ? "item" : "items"}</td>
                      <td>
                        <span className={`status-pill ${statusClass[order.status]}`}>
                          {order.status.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ textAlign: "right", color: "rgba(240,237,230,0.7)" }}>{order.amount}</td>
                      <td style={{ textAlign: "right" }}>
                        <button style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(240,237,230,0.25)", padding: "0.2rem" }}>
                          <MoreHorizontal size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </main>

          {/* ── Right panel ─────────────────────── */}
          <aside className="dash-right">

            {/* Upcoming Deliveries */}
            <div className="right-card" style={{ animation: "fade-in-up 0.5s 0.15s ease both" }}>
              <div style={{
                background: "linear-gradient(135deg, rgba(245,182,30,0.12), rgba(212,146,10,0.05))",
                border: "1px solid rgba(245,182,30,0.18)",
                borderRadius: "0.75rem",
                padding: "1rem",
                marginBottom: "0.5rem",
              }}>
                <div className="flex items-center justify-between mb-3">
                  <h3 style={{
                    fontSize: "0.95rem",
                    fontWeight: 600,
                    color: "#F0EDE6",
                    letterSpacing: "0.03em",
                  }}>
                    Upcoming Deliveries
                  </h3>
                  <Clock size={14} style={{ color: "#F5B61E" }} />
                </div>

                {deliveries.map((d) => (
                  <div key={d.label} className="delivery-row">
                    <div style={{
                      width: "7px",
                      height: "7px",
                      borderRadius: "50%",
                      background: "#F5B61E",
                      flexShrink: 0,
                      marginTop: "4px",
                    }} />
                    <div>
                      <div style={{ fontSize: "0.72rem", color: "rgba(240,237,230,0.75)", lineHeight: 1.4 }}>{d.label}</div>
                      <div style={{ fontSize: "0.6rem", color: "rgba(240,237,230,0.3)", marginTop: "0.15rem" }}>{d.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Fulfillment Status */}
            <div className="right-card" style={{ animation: "fade-in-up 0.5s 0.28s ease both" }}>
              <h3 style={{
                fontSize: "0.95rem",
                fontWeight: 600,
                color: "#F0EDE6",
                letterSpacing: "0.03em",
                marginBottom: "1rem",
              }}>
                Fulfillment Status
              </h3>

              {fulfillment.map((item) => (
                <div
                  key={item.label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0.7rem 0.85rem",
                    borderRadius: "0.5rem",
                    background: "rgba(255,255,255,0.02)",
                    marginBottom: "0.5rem",
                    border: "1px solid rgba(245,182,30,0.06)",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "0.6rem", color: "rgba(240,237,230,0.3)", letterSpacing: "0.06em", marginBottom: "0.25rem" }}>
                      {item.label.toUpperCase()}
                    </div>
                    <div style={{
                      fontSize: "1.15rem",
                      fontWeight: 700,
                      color: "#F0EDE6",
                      lineHeight: 1,
                    }}>
                      {item.value}
                    </div>
                  </div>
                  <span style={{
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    color: item.color,
                    background: `${item.color}18`,
                    padding: "0.2rem 0.5rem",
                    borderRadius: "0.35rem",
                  }}>
                    {item.pct}
                  </span>
                </div>
              ))}
            </div>

            {/* Quick actions */}
            <div className="right-card" style={{ animation: "fade-in-up 0.5s 0.4s ease both" }}>
              <h3 style={{
                fontSize: "0.95rem",
                fontWeight: 600,
                color: "#F0EDE6",
                letterSpacing: "0.03em",
                marginBottom: "0.85rem",
              }}>
                Quick Actions
              </h3>
              <div className="flex flex-col gap-2">
                {[
                  { label: "New Order",       icon: Package },
                  { label: "Scan Gift Box",   icon: Gift },
                  { label: "Export Report",   icon: FileText },
                ].map((a) => {
                  const Icon = a.icon;
                  return (
                    <button key={a.label} className="quick-action-btn">
                      <Icon size={14} strokeWidth={1.5} style={{ color: "#F5B61E", flexShrink: 0 }} />
                      {a.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>
        </div>

        {/* Footer */}
        <footer style={{
          padding: "0.75rem 1.75rem",
          borderTop: "1px solid rgba(245,182,30,0.06)",
          fontSize: "0.58rem",
          letterSpacing: "0.07em",
          color: "rgba(240,237,230,0.14)",
          display: "flex",
          justifyContent: "space-between",
        }}>
          <span>BUDDIES OMS v1.0</span>
          <span>© 2026 Buddies · Your Vision, Our Mission</span>
        </footer>
      </div>
    </div>
  );
}
