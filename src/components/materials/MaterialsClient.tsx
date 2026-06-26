"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, AlertTriangle } from "lucide-react";
import { ChevronRight } from "lucide-react";
import { MaterialStatus } from "@prisma/client";
import StatChip from "@/components/ui/StatChip";
import FilterTabBar from "@/components/ui/FilterTabBar";
import PaginationBar from "@/components/ui/PaginationBar";
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

interface StatTotals {
  total: number;
  active: number;
  pending: number;
  lowStock: number;
}

interface Props {
  materials: MaterialRow[];
  filteredTotal: number;
  page: number;
  size: number;
  currentQ: string;
  currentStatus: string;
  statTotals: StatTotals;
}

export default function MaterialsClient({
  materials,
  filteredTotal,
  page,
  size,
  currentQ,
  currentStatus,
  statTotals,
}: Props) {
  const router = useRouter();
  const [searchValue, setSearchValue] = useState(currentQ);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [slideOpen, setSlideOpen]   = useState(false);
  const [editTarget, setEditTarget] = useState<MaterialData | undefined>(undefined);
  const isFirstRender = useRef(true);

  // Debounced URL update when search value changes
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const timer = setTimeout(() => {
      const params = new URLSearchParams();
      if (searchValue) params.set("q", searchValue);
      if (currentStatus && currentStatus !== "ALL") params.set("status", currentStatus);
      params.set("size", String(size));
      // page intentionally omitted → resets to 1
      router.replace(`?${params.toString()}`);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchValue]);

  // currentParams passed to FilterTabBar and PaginationBar so they preserve other params
  const currentParams: Record<string, string> = {};
  if (searchValue) currentParams.q = searchValue;
  if (currentStatus && currentStatus !== "ALL") currentParams.status = currentStatus;
  currentParams.size = String(size);

  function openNew()  { setEditTarget(undefined); setSlideOpen(true); }
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
        <StatChip label="TOTAL"   value={statTotals.total} />
        <StatChip label="ACTIVE"  value={statTotals.active}  color="#4ADE80" />
        <StatChip label="PENDING" value={statTotals.pending} color="#FBBF24" />
        {statTotals.lowStock > 0 && (
          <StatChip
            label="LOW STOCK"
            value={statTotals.lowStock}
            color="#F87171"
            icon={<AlertTriangle size={11} style={{ color: "#F87171" }} />}
            pulse
          />
        )}
      </div>

      {/* Controls */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        <div style={{ position: "relative", flex: "1 1 180px", maxWidth: "280px" }}>
          <Search size={12} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "rgba(240,237,230,0.22)", pointerEvents: "none" }} />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search code or name…"
            className="form-input"
            style={{ paddingLeft: "2.1rem", fontSize: "0.76rem" }}
          />
        </div>
        <FilterTabBar
          tabs={TABS}
          activeTab={currentStatus || "ALL"}
          currentParams={currentParams}
        />
        <button
          type="button"
          className="cta-btn"
          onClick={openNew}
          style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.68rem", padding: "0.48rem 1rem", marginLeft: "auto" }}
        >
          <Plus size={12} /> New Material
        </button>
      </div>

      {materials.length === 0 && (
        <div className="content-card" style={{ padding: "3rem 0", textAlign: "center", fontSize: "0.8rem", color: "rgba(240,237,230,0.22)" }}>
          {searchValue || currentStatus !== "ALL"
            ? "No materials match your filter."
            : "No materials yet."}
        </div>
      )}

      {/* Desktop/tablet table */}
      {materials.length > 0 && (
        <div id="materials-table-view">
          <div className="content-card" style={{ padding: 0, overflow: "clip" }}>
            <table className="orders-table">
              <thead style={{
                position: "sticky",
                top: "4.5rem",
                zIndex: 2,
                background: "rgba(10,10,10,0.98)",
                boxShadow: "0 1px 0 rgba(245,182,30,0.1)",
              }}>
                <tr>
                  <th style={{ width: "2rem", paddingTop: "0.75rem" }} />
                  <th style={{ paddingTop: "0.75rem" }}>CODE</th>
                  <th style={{ paddingTop: "0.75rem" }}>NAME</th>
                  <th className="hide-tablet" style={{ paddingTop: "0.75rem" }}>GSM</th>
                  <th className="hide-tablet" style={{ paddingTop: "0.75rem" }}>SHEET</th>
                  <th style={{ paddingTop: "0.75rem" }}>BUY PRICE</th>
                  <th style={{ paddingTop: "0.75rem" }}>UNIT PRICE</th>
                  <th style={{ paddingTop: "0.75rem" }}>STOCK</th>
                  <th style={{ paddingTop: "0.75rem" }}>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {materials.map((m) => {
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
                            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                              <span style={{ color: lowStock ? "#F87171" : "rgba(240,237,230,0.6)", fontSize: "0.76rem", fontWeight: 600 }}>
                                {m.currentStockLevel}
                              </span>
                              {lowStock && (
                                <span style={{ fontSize: "0.52rem", color: "#F87171", background: "rgba(248,113,113,0.1)", padding: "0.1rem 0.35rem", borderRadius: "0.2rem", border: "1px solid rgba(248,113,113,0.2)", letterSpacing: "0.06em", fontWeight: 700 }}>
                                  LOW
                                </span>
                              )}
                            </div>
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
          <PaginationBar
            total={filteredTotal}
            page={page}
            size={size}
            currentParams={currentParams}
          />
        </div>
      )}

      {/* Mobile cards */}
      {materials.length > 0 && (
        <div id="materials-card-view">
          {materials.map((m) => (
            <MaterialCard key={m.id} material={m} onFullEdit={openEdit} />
          ))}
          <PaginationBar
            total={filteredTotal}
            page={page}
            size={size}
            currentParams={currentParams}
          />
        </div>
      )}

      <MaterialSlideOver open={slideOpen} onClose={closeSlide} existing={editTarget} />
    </div>
  );
}
