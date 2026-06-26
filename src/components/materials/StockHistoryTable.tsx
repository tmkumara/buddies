"use client";

import React from "react";

export interface StockHistoryEntry {
  id:             number;
  quantityChange: number;
  reason:         string;
  changedAt:      string;
  changedBy:      { username: string };
  order:          { orderNo: string } | null;
}

interface Props {
  entries: StockHistoryEntry[];
}

export default function StockHistoryTable({ entries }: Props) {
  const th: React.CSSProperties = {
    padding: "0.45rem 0.65rem",
    fontSize: "0.58rem",
    letterSpacing: "0.1em",
    color: "rgba(240,237,230,0.3)",
    fontWeight: 600,
    textAlign: "left",
    borderBottom: "1px solid rgba(245,182,30,0.08)",
  };
  const td: React.CSSProperties = {
    padding: "0.5rem 0.65rem",
    fontSize: "0.75rem",
    borderBottom: "1px solid rgba(245,182,30,0.04)",
    verticalAlign: "middle",
  };

  if (entries.length === 0) {
    return (
      <p style={{ fontSize: "0.72rem", color: "rgba(240,237,230,0.2)", padding: "0.5rem 0" }}>
        No stock adjustments recorded.
      </p>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={th}>DATE</th>
            <th style={{ ...th, textAlign: "center" }}>CHANGE</th>
            <th style={th}>REASON</th>
            <th style={th}>BY</th>
            <th style={th}>ORDER</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.id}>
              <td style={{ ...td, color: "rgba(240,237,230,0.45)", whiteSpace: "nowrap" }}>
                {new Date(e.changedAt).toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </td>
              <td style={{ ...td, textAlign: "center" }}>
                <span
                  style={{
                    fontWeight: 700,
                    color: e.quantityChange > 0 ? "#4ADE80" : "#F87171",
                    fontSize: "0.82rem",
                  }}
                >
                  {e.quantityChange > 0 ? `+${e.quantityChange}` : e.quantityChange}
                </span>
              </td>
              <td style={{ ...td, color: "#F0EDE6" }}>{e.reason}</td>
              <td style={{ ...td, color: "rgba(240,237,230,0.5)" }}>{e.changedBy.username}</td>
              <td style={{ ...td, color: "rgba(240,237,230,0.4)", fontSize: "0.68rem" }}>
                {e.order ? e.order.orderNo : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
