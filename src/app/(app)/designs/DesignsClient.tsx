"use client";

import { useState, useMemo } from "react";
import { ChevronDown, ChevronRight, Plus, Edit2 } from "lucide-react";
import BoxTypeSlideOver from "./BoxTypeSlideOver";
import BoxDesignSlideOver from "./BoxDesignSlideOver";

export interface MaterialOption {
  id: number; code: string; name: string; status: string;
  unitPrice: number; costPerSheet: number;
  sheetLengthIn: number | null; sheetWidthIn: number | null;
  sheetLengthCm: number | null; sheetWidthCm: number | null;
}

export interface BoxDesignData {
  id: number; code: string; name: string; active: boolean; custom: boolean;
  designTypeId: number;
  unitPrice: number;
  lengthIn: number | null; widthIn: number | null; heightIn: number | null;
  cutLengthIn: number | null; cutWidthIn: number | null;
  lengthCm: number | null; widthCm: number | null; heightCm: number | null;
  cutLengthCm: number | null; cutWidthCm: number | null;
  rawAreaSqCm: number | null;
  material: { id: number; code: string; name: string };
}

export interface BoxTypeData {
  id: number; code: string; name: string;
  description: string | null; imageUrl: string | null; active: boolean;
  boxDesigns: BoxDesignData[];
}

interface Props {
  boxTypes:      BoxTypeData[];
  materials:     MaterialOption[];
  initialSearch: string;
}

function designSizeStr(bd: BoxDesignData): string {
  if (bd.lengthIn && bd.widthIn && bd.heightIn)
    return `${bd.lengthIn}×${bd.widthIn}×${bd.heightIn} in`;
  if (bd.lengthCm && bd.widthCm && bd.heightCm)
    return `${bd.lengthCm}×${bd.widthCm}×${bd.heightCm} cm`;
  return "";
}

export default function DesignsClient({ boxTypes, materials, initialSearch }: Props) {
  const [search,        setSearch]        = useState(initialSearch);
  const [sizeSearch,    setSizeSearch]    = useState("");
  const [expanded,      setExpanded]      = useState<Set<number>>(new Set(boxTypes.map((bt) => bt.id)));
  const [editingType,   setEditingType]   = useState<BoxTypeData | null>(null);
  const [creatingType,  setCreatingType]  = useState(false);
  const [editingDesign, setEditingDesign] = useState<BoxDesignData | null>(null);
  const [addingToType,  setAddingToType]  = useState<BoxTypeData | null>(null);

  const q  = search.toLowerCase().trim();
  const qs = sizeSearch.toLowerCase().trim();

  const sizeOptions = useMemo(() => {
    const set = new Set<string>();
    boxTypes.forEach((bt) =>
      bt.boxDesigns.forEach((bd) => {
        const s = designSizeStr(bd);
        if (s) set.add(s);
      })
    );
    return [...set].sort();
  }, [boxTypes]);

  const filtered = useMemo(() => {
    if (!q && !qs) return boxTypes;
    return boxTypes
      .map((bt) => {
        const typeTextMatch = !q || bt.code.toLowerCase().includes(q) || bt.name.toLowerCase().includes(q);
        const matchingDesigns = bt.boxDesigns.filter((bd) => {
          const textMatch = !q || typeTextMatch || (
            bd.code.toLowerCase().includes(q) ||
            bd.name.toLowerCase().includes(q) ||
            bd.material.name.toLowerCase().includes(q) ||
            bd.material.code.toLowerCase().includes(q)
          );
          const sizeMatch = !qs || designSizeStr(bd).toLowerCase().includes(qs);
          return textMatch && sizeMatch;
        });
        if (matchingDesigns.length > 0) return { ...bt, boxDesigns: matchingDesigns };
        return null;
      })
      .filter(Boolean) as BoxTypeData[];
  }, [boxTypes, q, qs]);

  function toggleExpand(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const inputStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(245,182,30,0.14)", borderRadius: "0.5rem",
    padding: "0.55rem 0.9rem", color: "#F0EDE6", fontSize: "0.8rem", outline: "none",
  };

  return (
    <div style={{ padding: "1.5rem 1.75rem" }}>
      {/* Header row */}
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.25rem", alignItems: "center", flexWrap: "wrap" }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search box types, designs, materials…"
          style={{ flex: "2 1 180px", ...inputStyle }}
        />
        <div style={{ position: "relative", flex: "1 1 140px" }}>
          <input
            value={sizeSearch}
            onChange={(e) => setSizeSearch(e.target.value)}
            placeholder="Size (L×W×H cm/in)"
            list="size-options"
            style={{ width: "100%", ...inputStyle }}
          />
          <datalist id="size-options">
            {sizeOptions.map((s) => <option key={s} value={s} />)}
          </datalist>
        </div>
        <button
          onClick={() => setCreatingType(true)}
          className="cta-btn"
          style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.72rem", whiteSpace: "nowrap" }}
        >
          <Plus size={14} /> New Box Type
        </button>
      </div>

      {/* Grouped list */}
      <div className="content-card" style={{ overflow: "clip" }}>
        {filtered.length === 0 && (
          <div style={{ padding: "3rem", textAlign: "center", fontSize: "0.8rem", color: "rgba(240,237,230,0.25)" }}>
            {q || qs ? "No designs match your search." : "No box types yet."}
          </div>
        )}

        {filtered.map((bt, btIdx) => (
          <div key={bt.id} style={{ borderBottom: btIdx < filtered.length - 1 ? "1px solid rgba(245,182,30,0.07)" : "none" }}>
            {/* Box Type header row */}
            <div
              style={{
                display: "flex", alignItems: "center", gap: "0.75rem",
                padding: "0.85rem 1rem", cursor: "pointer",
                background: "rgba(245,182,30,0.02)",
              }}
              onClick={() => toggleExpand(bt.id)}
            >
              {expanded.has(bt.id)
                ? <ChevronDown size={14} color="rgba(245,182,30,0.5)" />
                : <ChevronRight size={14} color="rgba(245,182,30,0.5)" />
              }
              <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#F5B61E", letterSpacing: "0.06em" }}>
                {bt.name}
              </span>
              <span style={{ fontSize: "0.62rem", color: "rgba(240,237,230,0.3)", letterSpacing: "0.06em" }}>
                {bt.code}
              </span>
              {!bt.active && (
                <span style={{ fontSize: "0.55rem", color: "#F87171", background: "rgba(248,113,113,0.1)", padding: "0.1rem 0.4rem", borderRadius: "0.25rem", border: "1px solid rgba(248,113,113,0.25)" }}>
                  INACTIVE
                </span>
              )}
              <span style={{ fontSize: "0.62rem", color: "rgba(240,237,230,0.25)", marginLeft: "auto" }}>
                {bt.boxDesigns.length} variant{bt.boxDesigns.length !== 1 ? "s" : ""}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); setEditingType(bt); }}
                style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(240,237,230,0.3)", padding: "0.2rem 0.4rem" }}
                title="Edit box type"
              >
                <Edit2 size={13} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setAddingToType(bt); }}
                style={{
                  background: "rgba(245,182,30,0.08)", border: "1px solid rgba(245,182,30,0.2)",
                  borderRadius: "0.35rem", padding: "0.2rem 0.6rem",
                  fontSize: "0.6rem", color: "#F5B61E", cursor: "pointer", letterSpacing: "0.06em",
                }}
              >
                + Variant
              </button>
            </div>

            {/* Box Design rows */}
            {expanded.has(bt.id) && bt.boxDesigns.map((bd) => (
              <div
                key={bd.id}
                style={{
                  display: "flex", alignItems: "center", gap: "1rem",
                  padding: "0.6rem 1rem 0.6rem 2.75rem",
                  borderTop: "1px solid rgba(245,182,30,0.04)",
                  background: bd.active ? "transparent" : "rgba(248,113,113,0.02)",
                }}
              >
                <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#F5B61E", minWidth: "80px", letterSpacing: "0.05em" }}>
                  {bd.code}
                </span>
                <span style={{ fontSize: "0.78rem", color: "#F0EDE6", flex: 1 }}>{bd.name}</span>
                <span style={{ fontSize: "0.68rem", color: "rgba(240,237,230,0.4)", minWidth: "140px" }}>
                  {bd.material.code} · {bd.material.name}
                </span>
                {(bd.lengthIn || bd.lengthCm) && (
                  <span style={{ fontSize: "0.68rem", color: "rgba(240,237,230,0.35)", minWidth: "100px" }}>
                    {designSizeStr(bd)}
                  </span>
                )}
                <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#F0EDE6", minWidth: "70px", textAlign: "right" }}>
                  Rs. {bd.unitPrice.toFixed(2)}
                </span>
                {bd.custom && (
                  <span style={{ fontSize: "0.55rem", color: "#A78BFA", background: "rgba(167,139,250,0.1)", padding: "0.1rem 0.4rem", borderRadius: "0.25rem", border: "1px solid rgba(167,139,250,0.25)" }}>
                    CUSTOM
                  </span>
                )}
                {!bd.active && (
                  <span style={{ fontSize: "0.55rem", color: "#F87171", background: "rgba(248,113,113,0.1)", padding: "0.1rem 0.4rem", borderRadius: "0.25rem", border: "1px solid rgba(248,113,113,0.25)" }}>
                    INACTIVE
                  </span>
                )}
                <button
                  onClick={() => setEditingDesign(bd)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(240,237,230,0.3)", padding: "0.2rem 0.4rem" }}
                  title="Edit design"
                >
                  <Edit2 size={12} />
                </button>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Slide-overs */}
      <BoxTypeSlideOver
        isOpen={creatingType || editingType !== null}
        existing={editingType}
        onClose={() => { setCreatingType(false); setEditingType(null); }}
      />
      <BoxDesignSlideOver
        isOpen={editingDesign !== null || addingToType !== null}
        existing={editingDesign}
        defaultBoxType={addingToType}
        boxTypes={boxTypes}
        materials={materials}
        onClose={() => { setEditingDesign(null); setAddingToType(null); }}
      />
    </div>
  );
}
