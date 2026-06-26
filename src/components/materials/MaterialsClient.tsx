"use client";

import React, { useState, useMemo } from "react";
import { Plus, Search, AlertTriangle } from "lucide-react";
import { ChevronRight } from "lucide-react";
import { MaterialStatus } from "@prisma/client";
import MaterialSlideOver, { MaterialData } from "./MaterialSlideOver";
import MaterialExpandRow from "./MaterialExpandRow";
import MaterialCard, { MaterialRow } from "./MaterialCard";

type FilterTab = "ALL" | MaterialStatus;

const STATUS_PILL: Record<MaterialStatus, string> = {
  ACTIVE:   "status-fulfilled",
  PENDING:  "status-pending",
  INACTIVE: "status-cancelled",
};

const TABS: FilterTab[] = ["ALL", "ACTIVE", "PENDING", "INACTIVE"];

interface Props { materials: MaterialRow[]; }

export default function MaterialsClient({ materials }: Props) {
  const [search, setSearch]         = useState("");
  const [filter, setFilter]         = useState<FilterTab>("ALL");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [slideOpen, setSlideOpen]   = useState(false);
  const [editTarget, setEditTarget] = useState<MaterialData | undefined>(undefined);

  const lowStockCount = materials.filter(
    (m) => m.status === "ACTIVE" && m.minStockLevel > 0 && m.currentStockLevel <= m.minStockLevel
  ).length;

  const filtered = useMemo(() => materials.filter((m) => {
    if (filter !== "ALL" && m.status !== filter) return false;
    const q = search.toLowerCase();
    return !q || m.code.toLowerCase().includes(q) || m.name.toLowerCase().includes(q);
  }), [materials, filter, search]);

  function openNew() { setEditTarget(undefined); setSlideOpen(true); }
  function openEdit(id: number) {
    const m = materials.find((x) => x.id === id);
    if (m) { setEditTarget(m as MaterialData); setSlideOpen(true); }
  }
  function closeSlide() { setSlideOpen(false); setEditTarget(undefined); }

  function formatDim(m: MaterialRow) {
    if (m.sheetLengthIn != null && m.sheetWidthIn != null)
      return `${m.sheetLengthIn} × ${m.sheetWidthIn} in`;
    if (m.sheetLengthCm != null && m.sheetWidthCm != null)
      return `${m.sheetLengthCm} × ${m.sheetWidthCm} cm`;
    return "—";
  }

  return (
    <div style={{ padding: "1.25rem 1.75rem" }}>
      {/* Stat strip */}
      <div className="stat-strip" style={{ marginBottom: "1rem" }}>
        <div className="stat-strip-chip">
          <span className="value">{materials.length}</span><span>TOTAL</span>
        </div>
        <div className="stat-strip-chip">
          <span className="value" style={{ color: "#4ADE80" }}>{materials.filter((m) => m.status === "ACTIVE").length}</span><span>ACTIVE</span>
        </div>
        <div className="stat-strip-chip">
          <span className="value" style={{ color: "#FBBF24" }}>{materials.filter((m) => m.status === "PENDING").length}</span><span>PENDING</span>
        </div>
        {lowStockCount > 0 && (
          <div className="stat-strip-chip low-stock">
            <AlertTriangle size={11} style={{ color: "#F87171" }} />
            <span className="value">{lowStockCount}</span><span>LOW STOCK</span>
          </div>
        )}
      </div>

      {/* Controls */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        <div style={{ position: "relative", flex: "1 1 180px", maxWidth: "280px" }}>
          <Search size={12} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "rgba(240,237,230,0.22)", pointerEvents: "none" }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search code or name…"
            className="form-input"
            style={{ paddingLeft: "2.1rem", fontSize: "0.76rem" }}
          />
        </div>
        <div className="filter-tabs">
          {TABS.map((t) => (
            <button key={t} type="button" className={`filter-tab${filter === t ? " active" : ""}`} onClick={() => setFilter(t)}>{t}</button>
          ))}
        </div>
        <button type="button" className="cta-btn" onClick={openNew}
          style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.68rem", padding: "0.48rem 1rem", marginLeft: "auto" }}>
          <Plus size={12} />New Material
        </button>
      </div>

      {filtered.length === 0 && (
        <div className="content-card" style={{ padding: "3rem 0", textAlign: "center", fontSize: "0.8rem", color: "rgba(240,237,230,0.22)" }}>
          {search || filter !== "ALL" ? "No materials match your filter." : "No materials yet."}
        </div>
      )}

      {/* Desktop/tablet table */}
      {filtered.length > 0 && (
        <div id="materials-table-view">
          <div className="content-card" style={{ padding: 0, overflow: "hidden" }}>
            <table className="orders-table">
              <thead>
                <tr>
                  <th style={{ width: "2rem" }} />
                  <th>CODE</th>
                  <th>NAME</th>
                  <th className="hide-tablet">GSM</th>
                  <th className="hide-tablet">SHEET</th>
                  <th>BUY PRICE</th>
                  <th>UNIT PRICE</th>
                  <th>STOCK</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => {
                  const isExpanded = expandedId === m.id;
                  const lowStock = m.status === "ACTIVE" && m.minStockLevel > 0 && m.currentStockLevel <= m.minStockLevel;
                  const pct = m.minStockLevel > 0 ? Math.min((m.currentStockLevel / m.minStockLevel) * 100, 100) : 100;
                  const barColor = pct >= 100 ? "#4ADE80" : pct >= 50 ? "#FBBF24" : "#F87171";

                  return (
                    <React.Fragment key={m.id}>
                      <tr
                        style={{
                          borderLeft: m.status === "PENDING"
                            ? "2px solid rgba(251,191,36,0.4)"
                            : lowStock
                            ? "2px solid rgba(248,113,113,0.35)"
                            : "2px solid transparent",
                          cursor: "pointer",
                        }}
                        onClick={() => setExpandedId(isExpanded ? null : m.id)}
                      >
                        <td style={{ paddingRight: 0 }}>
                          <ChevronRight size={14} className={`row-chevron${isExpanded ? " expanded" : ""}`} />
                        </td>
                        <td style={{ fontWeight: 700, color: "#F5B61E", fontSize: "0.72rem", letterSpacing: "0.06em" }}>{m.code}</td>
                        <td style={{ fontWeight: 600, color: "#F0EDE6" }}>{m.name}</td>
                        <td className="hide-tablet" style={{ color: "rgba(240,237,230,0.5)" }}>{m.gsm}</td>
                        <td className="hide-tablet" style={{ color: "rgba(240,237,230,0.42)", fontSize: "0.72rem" }}>{formatDim(m)}</td>
                        <td style={{ color: "rgba(240,237,230,0.68)" }}>Rs. {m.costPerSheet.toFixed(2)}</td>
                        <td style={{ color: "rgba(240,237,230,0.68)" }}>Rs. {m.unitPrice.toFixed(2)}</td>
                        <td>
                          <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem", minWidth: "56px" }}>
                            <span style={{ color: lowStock ? "#F87171" : "rgba(240,237,230,0.6)", fontSize: "0.76rem", fontWeight: 600 }}>
                              {m.currentStockLevel}
                            </span>
                            <div className="stock-bar-track">
                              <div style={{ height: "100%", width: `${pct}%`, background: barColor, borderRadius: "2px", transition: "width 0.3s ease" }} />
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`status-pill ${STATUS_PILL[m.status]}`}>{m.status}</span>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={9} style={{ padding: 0 }}>
                            <MaterialExpandRow
                              material={m}
                              onFullEdit={() => { setExpandedId(null); openEdit(m.id); }}
                              onClose={() => setExpandedId(null)}
                            />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Mobile cards */}
      {filtered.length > 0 && (
        <div id="materials-card-view">
          {filtered.map((m) => (
            <MaterialCard key={m.id} material={m} onFullEdit={openEdit} />
          ))}
        </div>
      )}

      <MaterialSlideOver open={slideOpen} onClose={closeSlide} existing={editTarget} />
    </div>
  );
}
