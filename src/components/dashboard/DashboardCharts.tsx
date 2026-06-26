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
            <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [`Rs. ${v.toLocaleString()}`, "Revenue"]} />
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
              formatter={(v: any, _: any, props: any) => [v, STATUS_LABEL[props.payload?.status ?? ""] ?? props.payload?.status]}
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
