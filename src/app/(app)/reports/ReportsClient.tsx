"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Download, BarChart2 } from "lucide-react";

interface StatusCount { status: string; count: number; }

interface Props {
  from:             string;
  to:               string;
  orderCount:       number;
  totalRevenue:     number;
  statusBreakdown:  StatusCount[];
  csvUrl:           string;
}

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft", CONFIRMED: "Confirmed", IN_PRODUCTION: "In Production",
  READY: "Ready", DELIVERED: "Delivered", CANCELLED: "Cancelled",
};

export default function ReportsClient({ from: initFrom, to: initTo, orderCount, totalRevenue, statusBreakdown, csvUrl }: Props) {
  const router = useRouter();
  const [from, setFrom] = useState(initFrom);
  const [to,   setTo]   = useState(initTo);

  function applyFilter() {
    const q = from && to ? `?from=${from}&to=${to}` : "";
    router.push(`/reports${q}`);
  }

  const inp: React.CSSProperties = {
    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(245,182,30,0.14)",
    borderRadius: "0.45rem", padding: "0.6rem 0.85rem", color: "#F0EDE6", fontSize: "0.83rem", outline: "none",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Date filter */}
      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(245,182,30,0.08)", borderRadius: "0.6rem", padding: "1rem 1.25rem" }}>
        <p style={{ fontSize: "0.62rem", letterSpacing: "0.1em", color: "rgba(240,237,230,0.35)", marginBottom: "0.75rem" }}>DATE RANGE</p>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={inp} />
          <span style={{ color: "rgba(240,237,230,0.3)", fontSize: "0.8rem" }}>to</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={inp} />
          <button onClick={applyFilter} style={{ padding: "0.6rem 1.25rem", background: "rgba(245,182,30,0.12)", border: "1px solid rgba(245,182,30,0.25)", borderRadius: "0.45rem", color: "#F5B61E", fontSize: "0.72rem", letterSpacing: "0.07em", cursor: "pointer" }}>
            APPLY
          </button>
          <a href={csvUrl} style={{ display: "flex", alignItems: "center", gap: "0.35rem", padding: "0.6rem 1.1rem", background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: "0.45rem", color: "#4ADE80", fontSize: "0.72rem", letterSpacing: "0.07em", textDecoration: "none" }}>
            <Download size={13} /> EXPORT CSV
          </a>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(245,182,30,0.08)", borderRadius: "0.6rem", padding: "1.1rem 1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
            <BarChart2 size={14} color="rgba(240,237,230,0.35)" />
            <span style={{ fontSize: "0.6rem", letterSpacing: "0.1em", color: "rgba(240,237,230,0.35)" }}>TOTAL ORDERS</span>
          </div>
          <p style={{ fontSize: "2rem", fontWeight: 800, color: "#F0EDE6", letterSpacing: "-0.02em" }}>{orderCount}</p>
        </div>
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(245,182,30,0.08)", borderRadius: "0.6rem", padding: "1.1rem 1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
            <span style={{ fontSize: "0.6rem", letterSpacing: "0.1em", color: "rgba(240,237,230,0.35)" }}>TOTAL REVENUE</span>
          </div>
          <p style={{ fontSize: "2rem", fontWeight: 800, color: "#F5B61E", letterSpacing: "-0.02em" }}>Rs. {totalRevenue.toLocaleString()}</p>
        </div>
      </div>

      {/* Status breakdown */}
      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(245,182,30,0.08)", borderRadius: "0.6rem", padding: "1rem 1.25rem" }}>
        <p style={{ fontSize: "0.62rem", letterSpacing: "0.1em", color: "rgba(240,237,230,0.35)", marginBottom: "0.75rem" }}>ORDERS BY STATUS</p>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          {statusBreakdown.map((s) => (
            <div key={s.status} style={{ padding: "0.6rem 1rem", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(245,182,30,0.07)", borderRadius: "0.45rem", textAlign: "center" }}>
              <p style={{ fontSize: "1.15rem", fontWeight: 700, color: "#F0EDE6" }}>{s.count}</p>
              <p style={{ fontSize: "0.6rem", color: "rgba(240,237,230,0.35)", letterSpacing: "0.06em" }}>{STATUS_LABEL[s.status] ?? s.status}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
