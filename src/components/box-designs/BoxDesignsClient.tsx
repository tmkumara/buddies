"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";
import StatChip from "@/components/ui/StatChip";
import FilterTabBar from "@/components/ui/FilterTabBar";
import PaginationBar from "@/components/ui/PaginationBar";
import BoxDesignSlideOver, { BoxDesignData } from "./BoxDesignSlideOver";

export interface BoxDesignRow {
  id: number;
  code: string;
  name: string;
  designTypeName: string;
  materialCode: string;
  lengthCm: number | null; widthCm: number | null; heightCm: number | null;
  lengthIn: number | null; widthIn: number | null; heightIn: number | null;
  cutLengthCm: number | null; cutWidthCm: number | null;
  cutLengthIn: number | null; cutWidthIn: number | null;
  unitPrice: number;
  custom: boolean;
  active: boolean;
  // for slide-over
  designTypeId: number;
  materialId: number;
}

interface SelectOption { id: number; code: string; name: string; }

interface StatTotals { total: number; active: number; inactive: number; custom: number; }

interface Props {
  designs: BoxDesignRow[];
  filteredTotal: number;
  page: number;
  size: number;
  currentQ: string;
  currentStatus: string;
  statTotals: StatTotals;
  designTypes: SelectOption[];
  materials: SelectOption[];
}

const TABS = ["ALL", "ACTIVE", "INACTIVE", "CUSTOM"];

export default function BoxDesignsClient({
  designs,
  filteredTotal,
  page,
  size,
  currentQ,
  currentStatus,
  statTotals,
  designTypes,
  materials,
}: Props) {
  const router = useRouter();
  const [searchValue, setSearchValue] = useState(currentQ);
  const [slideOpen, setSlideOpen]   = useState(false);
  const [editTarget, setEditTarget] = useState<BoxDesignData | undefined>(undefined);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    const timer = setTimeout(() => {
      const params = new URLSearchParams();
      if (searchValue) params.set("q", searchValue);
      if (currentStatus && currentStatus !== "ALL") params.set("status", currentStatus);
      params.set("size", String(size));
      router.replace(`?${params.toString()}`);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchValue]);

  const currentParams: Record<string, string> = {};
  if (searchValue) currentParams.q = searchValue;
  if (currentStatus && currentStatus !== "ALL") currentParams.status = currentStatus;
  currentParams.size = String(size);

  function openNew() { setEditTarget(undefined); setSlideOpen(true); }
  function openEdit(design: BoxDesignRow) {
    setEditTarget({
      id: design.id, code: design.code, name: design.name,
      designTypeId: design.designTypeId, materialId: design.materialId,
      custom: design.custom, active: design.active, unitPrice: design.unitPrice,
      lengthCm: design.lengthCm, widthCm: design.widthCm, heightCm: design.heightCm,
      lengthIn: design.lengthIn, widthIn: design.widthIn, heightIn: design.heightIn,
      cutLengthCm: design.cutLengthCm, cutWidthCm: design.cutWidthCm,
      cutLengthIn: design.cutLengthIn, cutWidthIn: design.cutWidthIn,
    });
    setSlideOpen(true);
  }
  function closeSlide() { setSlideOpen(false); setEditTarget(undefined); }

  function formatDims(d: BoxDesignRow) {
    if (d.lengthIn != null && d.widthIn != null && d.heightIn != null)
      return `${d.lengthIn}×${d.widthIn}×${d.heightIn}in`;
    if (d.lengthCm != null && d.widthCm != null && d.heightCm != null)
      return `${d.lengthCm}×${d.widthCm}×${d.heightCm}cm`;
    return "—";
  }

  return (
    <div style={{ padding: "1.25rem 1.75rem" }}>
      {/* Stat strip */}
      <div className="stat-strip" style={{ marginBottom: "1rem" }}>
        <StatChip label="TOTAL"    value={statTotals.total} />
        <StatChip label="ACTIVE"   value={statTotals.active}   color="#4ADE80" />
        <StatChip label="INACTIVE" value={statTotals.inactive} color="#F87171" />
        <StatChip label="CUSTOM"   value={statTotals.custom}   color="#F5B61E" />
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
        <FilterTabBar tabs={TABS} activeTab={currentStatus || "ALL"} currentParams={currentParams} />
        <button
          type="button"
          className="cta-btn"
          onClick={openNew}
          style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.68rem", padding: "0.48rem 1rem", marginLeft: "auto" }}
        >
          <Plus size={12} /> New Design
        </button>
      </div>

      {designs.length === 0 && (
        <div className="content-card" style={{ padding: "3rem 0", textAlign: "center", fontSize: "0.8rem", color: "rgba(240,237,230,0.22)" }}>
          {searchValue || currentStatus !== "ALL" ? "No designs match your filter." : "No box designs yet."}
        </div>
      )}

      {designs.length > 0 && (
        <>
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
                  <th style={{ paddingTop: "0.75rem" }}>CODE</th>
                  <th style={{ paddingTop: "0.75rem" }}>NAME</th>
                  <th className="hide-tablet" style={{ paddingTop: "0.75rem" }}>TYPE</th>
                  <th className="hide-tablet" style={{ paddingTop: "0.75rem" }}>MATERIAL</th>
                  <th style={{ paddingTop: "0.75rem" }}>DIMS</th>
                  <th style={{ paddingTop: "0.75rem" }}>PRICE</th>
                  <th style={{ paddingTop: "0.75rem" }}>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {designs.map((d) => (
                  <tr
                    key={d.id}
                    style={{
                      cursor: "pointer",
                      opacity: d.active ? 1 : 0.6,
                      borderLeft: "2px solid transparent",
                    }}
                    onClick={() => openEdit(d)}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderLeftColor = "rgba(245,182,30,0.25)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderLeftColor = "transparent"; }}
                  >
                    <td style={{ fontWeight: 700, color: "#F5B61E", fontSize: "0.72rem", letterSpacing: "0.06em" }}>{d.code}</td>
                    <td style={{ fontWeight: 600, color: "#F0EDE6" }}>
                      {d.name}
                      {d.custom && (
                        <span style={{ marginLeft: "0.4rem", fontSize: "0.58rem", color: "#F5B61E", border: "1px solid rgba(245,182,30,0.3)", borderRadius: "0.25rem", padding: "0 0.3rem", verticalAlign: "middle" }}>
                          CUSTOM
                        </span>
                      )}
                    </td>
                    <td className="hide-tablet" style={{ color: "rgba(240,237,230,0.5)" }}>{d.designTypeName}</td>
                    <td className="hide-tablet" style={{ color: "rgba(240,237,230,0.42)", fontSize: "0.72rem" }}>{d.materialCode}</td>
                    <td style={{ color: "rgba(240,237,230,0.55)", fontSize: "0.72rem" }}>{formatDims(d)}</td>
                    <td style={{ color: "rgba(240,237,230,0.68)" }}>Rs. {d.unitPrice.toFixed(2)}</td>
                    <td>
                      <span className={`status-pill ${d.active ? "status-fulfilled" : "status-cancelled"}`}>
                        {d.active ? "ACTIVE" : "INACTIVE"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PaginationBar total={filteredTotal} page={page} size={size} currentParams={currentParams} />
        </>
      )}

      <BoxDesignSlideOver
        open={slideOpen}
        onClose={closeSlide}
        existing={editTarget}
        designTypes={designTypes}
        materials={materials}
      />
    </div>
  );
}
