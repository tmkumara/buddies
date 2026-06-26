"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImageOff, Plus, Search } from "lucide-react";
import StatChip from "@/components/ui/StatChip";
import FilterTabBar from "@/components/ui/FilterTabBar";
import PaginationBar from "@/components/ui/PaginationBar";
import DesignTypeSlideOver, { DesignTypeData } from "./DesignTypeSlideOver";

interface Props {
  designTypes: DesignTypeData[];
  filteredTotal: number;
  page: number;
  size: number;
  currentQ: string;
  currentStatus: string;
  statTotals: { total: number; active: number; inactive: number };
  currentParams: Record<string, string>;
}

export default function DesignTypesClient({
  designTypes,
  filteredTotal,
  page,
  size,
  currentQ,
  currentStatus,
  statTotals,
  currentParams,
}: Props) {
  const router = useRouter();
  const [searchValue, setSearchValue] = useState(currentQ);
  const [slideOverOpen, setSlideOverOpen] = useState(false);
  const [selectedDesignType, setSelectedDesignType] = useState<DesignTypeData | undefined>(undefined);
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
      if (size !== 20) params.set("size", String(size));
      // page intentionally omitted → resets to 1
      router.replace(`?${params.toString()}`);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchValue]);

  // currentParams for FilterTabBar and PaginationBar (preserve other params)
  const liveParams: Record<string, string> = {};
  if (searchValue) liveParams.q = searchValue;
  if (currentStatus && currentStatus !== "ALL") liveParams.status = currentStatus;
  if (size !== 20) liveParams.size = String(size);

  function openNew() {
    setSelectedDesignType(undefined);
    setSlideOverOpen(true);
  }

  function openEdit(dt: DesignTypeData) {
    setSelectedDesignType(dt);
    setSlideOverOpen(true);
  }

  return (
    <div style={{ padding: "1.25rem 1.75rem" }}>
      {/* Stat strip */}
      <div className="stat-strip" style={{ marginBottom: "1rem" }}>
        <StatChip label="TOTAL" value={statTotals.total} />
        <StatChip label="ACTIVE" value={statTotals.active} color="#4ADE80" />
        <StatChip label="INACTIVE" value={statTotals.inactive} color="#F87171" />
      </div>

      {/* Controls row */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        <div style={{ position: "relative", flex: "1 1 180px", maxWidth: "280px" }}>
          <Search
            size={12}
            style={{
              position: "absolute", left: "0.75rem", top: "50%",
              transform: "translateY(-50%)", color: "rgba(240,237,230,0.22)",
              pointerEvents: "none",
            }}
          />
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
          tabs={["ALL", "ACTIVE", "INACTIVE"]}
          activeTab={currentStatus || "ALL"}
          currentParams={liveParams}
        />
        <button
          type="button"
          className="cta-btn"
          onClick={openNew}
          style={{
            display: "flex", alignItems: "center", gap: "0.4rem",
            fontSize: "0.68rem", padding: "0.48rem 1rem", marginLeft: "auto",
          }}
        >
          <Plus size={12} /> New Type
        </button>
      </div>

      {/* Empty state */}
      {designTypes.length === 0 && (
        <div
          className="content-card"
          style={{ padding: "3rem 0", textAlign: "center", fontSize: "0.8rem", color: "rgba(240,237,230,0.22)" }}
        >
          {searchValue || currentStatus !== "ALL"
            ? "No design types match your filter."
            : "No design types yet."}
        </div>
      )}

      {/* Desktop / tablet table */}
      {designTypes.length > 0 && (
        <div id="design-types-table-view">
          <div className="content-card" style={{ padding: 0, overflow: "hidden" }}>
            <table className="orders-table">
              <thead>
                <tr>
                  <th style={{ width: "2.5rem" }} />
                  <th>CODE</th>
                  <th>NAME</th>
                  <th className="hide-tablet">DESCRIPTION</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {designTypes.map((dt) => (
                  <DesignTypeTableRow key={dt.id} dt={dt} onClick={() => openEdit(dt)} />
                ))}
              </tbody>
            </table>
          </div>
          <PaginationBar
            total={filteredTotal}
            page={page}
            size={size}
            currentParams={liveParams}
          />
        </div>
      )}

      {/* Mobile cards */}
      {designTypes.length > 0 && (
        <div id="design-types-card-view">
          {designTypes.map((dt) => (
            <DesignTypeCard key={dt.id} dt={dt} onClick={() => openEdit(dt)} />
          ))}
          <PaginationBar
            total={filteredTotal}
            page={page}
            size={size}
            currentParams={liveParams}
          />
        </div>
      )}

      <DesignTypeSlideOver
        open={slideOverOpen}
        onClose={() => setSlideOverOpen(false)}
        existing={selectedDesignType}
      />
    </div>
  );
}

/* ── Table row ───────────────────────────────────────── */

interface RowProps {
  dt: DesignTypeData;
  onClick: () => void;
}

function DesignTypeTableRow({ dt, onClick }: RowProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <tr
      style={{
        opacity: dt.active ? 1 : 0.6,
        cursor: "pointer",
        borderLeft: hovered ? "2px solid rgba(245,182,30,0.5)" : "2px solid transparent",
        transition: "border-left-color 0.15s ease",
      }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <td style={{ paddingRight: 0, paddingLeft: "0.75rem" }}>
        {dt.imageUrl ? (
          <ImageWithFallback src={dt.imageUrl} />
        ) : (
          <div
            style={{
              width: 36, height: 36, borderRadius: 4,
              background: "rgba(255,255,255,0.04)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <ImageOff size={14} style={{ color: "rgba(240,237,230,0.2)" }} />
          </div>
        )}
      </td>
      <td style={{ fontWeight: 700, color: "#F5B61E", fontSize: "0.72rem", letterSpacing: "0.06em" }}>
        {dt.code}
      </td>
      <td style={{ fontWeight: 600, color: "#F0EDE6" }}>{dt.name}</td>
      <td
        className="hide-tablet"
        style={{ color: "rgba(240,237,230,0.4)", fontSize: "0.72rem", maxWidth: "300px" }}
      >
        {dt.description ?? "—"}
      </td>
      <td>
        <span className={`status-pill ${dt.active ? "status-fulfilled" : "status-cancelled"}`}>
          {dt.active ? "ACTIVE" : "INACTIVE"}
        </span>
      </td>
    </tr>
  );
}

/* ── Mobile card ─────────────────────────────────────── */

function DesignTypeCard({ dt, onClick }: RowProps) {
  return (
    <div
      onClick={onClick}
      style={{
        background: "var(--surface, #111)",
        border: "1px solid rgba(245,182,30,0.08)",
        borderRadius: "0.5rem",
        padding: "0.75rem 1rem",
        display: "flex",
        alignItems: "flex-start",
        gap: "0.75rem",
        cursor: "pointer",
        opacity: dt.active ? 1 : 0.6,
      }}
    >
      {/* Thumbnail */}
      <div style={{ flexShrink: 0 }}>
        {dt.imageUrl ? (
          <ImageWithFallback src={dt.imageUrl} />
        ) : (
          <div
            style={{
              width: 36, height: 36, borderRadius: 4,
              background: "rgba(255,255,255,0.04)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <ImageOff size={14} style={{ color: "rgba(240,237,230,0.2)" }} />
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.15rem" }}>
          <span style={{ fontWeight: 700, color: "#F5B61E", fontSize: "0.72rem", letterSpacing: "0.06em" }}>
            {dt.code}
          </span>
          <span
            className={`status-pill ${dt.active ? "status-fulfilled" : "status-cancelled"}`}
            style={{ fontSize: "0.6rem" }}
          >
            {dt.active ? "ACTIVE" : "INACTIVE"}
          </span>
        </div>
        <div style={{ fontWeight: 600, color: "#F0EDE6", fontSize: "0.8rem", marginBottom: "0.25rem" }}>
          {dt.name}
        </div>
        {dt.description && (
          <div
            style={{
              color: "rgba(240,237,230,0.4)", fontSize: "0.72rem",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}
          >
            {dt.description}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Thumbnail with fallback ─────────────────────────── */

function ImageWithFallback({ src }: { src: string }) {
  const [errored, setErrored] = useState(false);

  if (errored) {
    return (
      <div
        style={{
          width: 36, height: 36, borderRadius: 4,
          background: "rgba(255,255,255,0.04)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <ImageOff size={14} style={{ color: "rgba(240,237,230,0.2)" }} />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      width={36}
      height={36}
      onError={() => setErrored(true)}
      style={{ width: 36, height: 36, objectFit: "cover", borderRadius: 4, display: "block" }}
    />
  );
}
