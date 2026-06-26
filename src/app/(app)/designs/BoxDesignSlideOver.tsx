"use client";

import { useState, useEffect, useMemo } from "react";
import { X, AlertTriangle } from "lucide-react";
import { createBoxDesign, updateBoxDesign } from "@/actions/designs";
import { calculateBoxesPerSheet, calculateMaterialCostPerBox, calculateSuggestedUnitPrice } from "@/lib/utils/pricing";
import type { BoxTypeData, BoxDesignData, MaterialOption } from "./DesignsClient";

interface Props {
  isOpen:         boolean;
  existing:       BoxDesignData | null;
  defaultBoxType: BoxTypeData | null;
  boxTypes:       BoxTypeData[];
  materials:      MaterialOption[];
  onClose:        () => void;
}

const inp: React.CSSProperties = {
  width: "100%", background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(245,182,30,0.18)", borderRadius: "0.45rem",
  padding: "0.55rem 0.8rem", color: "#F0EDE6", fontSize: "0.8rem", outline: "none",
};
const lbl: React.CSSProperties = {
  fontSize: "0.6rem", letterSpacing: "0.09em",
  color: "rgba(240,237,230,0.4)", display: "block", marginBottom: "0.3rem", fontWeight: 600,
};

export default function BoxDesignSlideOver({ isOpen, existing, defaultBoxType, boxTypes, materials, onClose }: Props) {
  const [boxTypeId, setBoxTypeId] = useState("");
  const [materialId, setMaterialId] = useState("");
  const [code,    setCode]    = useState("");
  const [name,    setName]    = useState("");
  const [lIn,     setLIn]     = useState("");
  const [wIn,     setWIn]     = useState("");
  const [hIn,     setHIn]     = useState("");
  const [clIn,    setClIn]    = useState("");
  const [cwIn,    setCwIn]    = useState("");
  const [lCm,     setLCm]     = useState("");
  const [wCm,     setWCm]     = useState("");
  const [hCm,     setHCm]     = useState("");
  const [clCm,    setClCm]    = useState("");
  const [cwCm,    setCwCm]    = useState("");
  const [addOn,   setAddOn]   = useState("0");
  const [price,   setPrice]   = useState("");
  const [custom,  setCustom]  = useState(false);
  const [active,  setActive]  = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");

  useEffect(() => {
    if (!isOpen) return;
    if (existing) {
      // Fix: look up the parent BoxTypeData by finding which boxType contains this design
      const parentBoxType = boxTypes.find((bt) => bt.boxDesigns.some((bd) => bd.id === existing.id));
      setBoxTypeId(parentBoxType ? String(parentBoxType.id) : "");
      setMaterialId(String(existing.material.id));
      setCode(existing.code);
      setName(existing.name);
      setLIn(existing.lengthIn?.toString() ?? "");
      setWIn(existing.widthIn?.toString() ?? "");
      setHIn(existing.heightIn?.toString() ?? "");
      setClIn(existing.cutLengthIn?.toString() ?? "");
      setCwIn(existing.cutWidthIn?.toString() ?? "");
      setLCm(existing.lengthCm?.toString() ?? "");
      setWCm(existing.widthCm?.toString() ?? "");
      setHCm(existing.heightCm?.toString() ?? "");
      setClCm(existing.cutLengthCm?.toString() ?? "");
      setCwCm(existing.cutWidthCm?.toString() ?? "");
      setPrice(existing.unitPrice.toString());
      setCustom(existing.custom);
      setActive(existing.active);
      setAddOn("0");
    } else {
      setBoxTypeId(defaultBoxType ? String(defaultBoxType.id) : "");
      setMaterialId(""); setCode(""); setName("");
      setLIn(""); setWIn(""); setHIn(""); setClIn(""); setCwIn("");
      setLCm(""); setWCm(""); setHCm(""); setClCm(""); setCwCm("");
      setAddOn("0"); setPrice(""); setCustom(false); setActive(true);
    }
    setError("");
  }, [isOpen, existing, defaultBoxType]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedMaterial = useMemo(
    () => materials.find((m) => m.id === Number(materialId)) ?? null,
    [materials, materialId],
  );

  const { boxesPerSheet, materialCostPerBox, suggested } = useMemo(() => {
    if (!selectedMaterial) return { boxesPerSheet: 0, materialCostPerBox: 0, suggested: 0 };
    const bps = calculateBoxesPerSheet({
      sheetLengthIn: selectedMaterial.sheetLengthIn,
      sheetWidthIn:  selectedMaterial.sheetWidthIn,
      sheetLengthCm: selectedMaterial.sheetLengthCm,
      sheetWidthCm:  selectedMaterial.sheetWidthCm,
      cutLengthIn:   clIn ? parseFloat(clIn) : null,
      cutWidthIn:    cwIn ? parseFloat(cwIn) : null,
      cutLengthCm:   clCm ? parseFloat(clCm) : null,
      cutWidthCm:    cwCm ? parseFloat(cwCm) : null,
    });
    const mcb = calculateMaterialCostPerBox(selectedMaterial.unitPrice, bps);
    const sug = calculateSuggestedUnitPrice(mcb, parseFloat(addOn) || 0);
    return { boxesPerSheet: bps, materialCostPerBox: mcb, suggested: sug };
  }, [selectedMaterial, clIn, cwIn, clCm, cwCm, addOn]);

  function applySuggested() { setPrice(suggested.toFixed(2)); }

  async function handleSave() {
    setSaving(true); setError("");
    const fd = new FormData();
    fd.set("code", code); fd.set("name", name);
    fd.set("boxTypeId",   boxTypeId);
    fd.set("materialId",  materialId);
    fd.set("lengthIn",    lIn);  fd.set("widthIn",  wIn);  fd.set("heightIn",  hIn);
    fd.set("cutLengthIn", clIn); fd.set("cutWidthIn", cwIn);
    fd.set("lengthCm",    lCm);  fd.set("widthCm",  wCm);  fd.set("heightCm",  hCm);
    fd.set("cutLengthCm", clCm); fd.set("cutWidthCm", cwCm);
    fd.set("unitPrice",   price);
    fd.set("custom",      String(custom));
    fd.set("active",      String(active));

    const result = existing
      ? await updateBoxDesign(existing.id, fd)
      : await createBoxDesign(fd);

    setSaving(false);
    if ("error" in result) { setError(result.error ?? "Unknown error"); return; }
    onClose();
  }

  if (!isOpen) return null;

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 49, backdropFilter: "blur(2px)" }} />
      <div style={{
        position: "fixed", top: 0, right: 0, height: "100%", width: "min(520px, 100vw)",
        background: "#141414", borderLeft: "1px solid rgba(245,182,30,0.18)",
        boxShadow: "-12px 0 48px rgba(0,0,0,0.7)", zIndex: 50,
        display: "flex", flexDirection: "column",
        animation: "slideInRight 0.22s ease-out",
      }}>
        <style>{`@keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 1.25rem", borderBottom: "1px solid rgba(245,182,30,0.1)", flexShrink: 0 }}>
          <div>
            <h2 style={{ fontSize: "0.9rem", fontWeight: 700, color: "#F5B61E", margin: 0 }}>
              {existing ? "Edit Box Design" : "New Box Design"}
            </h2>
            <p style={{ fontSize: "0.62rem", color: "rgba(240,237,230,0.35)", margin: "0.2rem 0 0", letterSpacing: "0.06em" }}>BOX DESIGN</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(240,237,230,0.4)" }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "1.1rem 1.25rem" }}>
          {error && (
            <div style={{ padding: "0.55rem 0.75rem", background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)", borderRadius: "0.4rem", fontSize: "0.72rem", color: "#F87171", marginBottom: "0.75rem" }}>
              {error}
            </div>
          )}

          {/* Code + Name */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "0.6rem", marginBottom: "0.6rem" }}>
            <div><label style={lbl}>CODE *</label><input value={code} onChange={(e) => setCode(e.target.value)} placeholder="BD-001" style={inp} /></div>
            <div><label style={lbl}>NAME *</label><input value={name} onChange={(e) => setName(e.target.value)} placeholder="3×2×1 Mailer" style={inp} /></div>
          </div>

          {/* Box Type + Material */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem", marginBottom: "0.6rem" }}>
            <div>
              <label style={lbl}>BOX TYPE *</label>
              <select value={boxTypeId} onChange={(e) => setBoxTypeId(e.target.value)} style={{ ...inp, color: boxTypeId ? "#F0EDE6" : "rgba(240,237,230,0.3)" }} disabled={!!existing}>
                <option value="" disabled>— Select —</option>
                {boxTypes.map((bt) => <option key={bt.id} value={bt.id} style={{ background: "#141414" }}>{bt.code} — {bt.name}</option>)}
              </select>
              {existing && <p style={{ fontSize: "0.6rem", color: "rgba(240,237,230,0.3)", marginTop: "0.2rem" }}>Box type cannot be changed after creation.</p>}
            </div>
            <div>
              <label style={lbl}>MATERIAL *</label>
              <select value={materialId} onChange={(e) => setMaterialId(e.target.value)} style={{ ...inp, color: materialId ? "#F0EDE6" : "rgba(240,237,230,0.3)" }}>
                <option value="" disabled>— Select —</option>
                {materials.map((m) => <option key={m.id} value={m.id} style={{ background: "#141414" }}>{m.code} — {m.name}{m.status === "PENDING" ? " ⚠" : ""}</option>)}
              </select>
              {selectedMaterial?.status === "PENDING" && (
                <p style={{ fontSize: "0.6rem", color: "#FBBF24", marginTop: "0.2rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                  <AlertTriangle size={10} /> Pending purchase
                </p>
              )}
            </div>
          </div>

          {/* Dimensions — inches (primary) */}
          <div style={{ borderTop: "1px solid rgba(245,182,30,0.07)", paddingTop: "0.75rem", marginBottom: "0.6rem" }}>
            <p style={{ ...lbl, marginBottom: "0.5rem" }}>DIMENSIONS — INCHES (primary)</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.6rem", marginBottom: "0.5rem" }}>
              <div><label style={lbl}>L</label><input type="number" step="0.001" min="0" value={lIn} onChange={(e) => setLIn(e.target.value)} style={inp} /></div>
              <div><label style={lbl}>W</label><input type="number" step="0.001" min="0" value={wIn} onChange={(e) => setWIn(e.target.value)} style={inp} /></div>
              <div><label style={lbl}>H</label><input type="number" step="0.001" min="0" value={hIn} onChange={(e) => setHIn(e.target.value)} style={inp} /></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
              <div><label style={lbl}>CUT L</label><input type="number" step="0.001" min="0" value={clIn} onChange={(e) => setClIn(e.target.value)} style={inp} /></div>
              <div><label style={lbl}>CUT W</label><input type="number" step="0.001" min="0" value={cwIn} onChange={(e) => setCwIn(e.target.value)} style={inp} /></div>
            </div>
          </div>

          {/* Dimensions — cm (optional) */}
          <div style={{ marginBottom: "0.75rem" }}>
            <p style={{ ...lbl, marginBottom: "0.5rem" }}>DIMENSIONS — CM (optional)</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.6rem", marginBottom: "0.5rem" }}>
              <div><label style={lbl}>L</label><input type="number" step="0.01" min="0" value={lCm} onChange={(e) => setLCm(e.target.value)} style={inp} /></div>
              <div><label style={lbl}>W</label><input type="number" step="0.01" min="0" value={wCm} onChange={(e) => setWCm(e.target.value)} style={inp} /></div>
              <div><label style={lbl}>H</label><input type="number" step="0.01" min="0" value={hCm} onChange={(e) => setHCm(e.target.value)} style={inp} /></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
              <div><label style={lbl}>CUT L</label><input type="number" step="0.01" min="0" value={clCm} onChange={(e) => setClCm(e.target.value)} style={inp} /></div>
              <div><label style={lbl}>CUT W</label><input type="number" step="0.01" min="0" value={cwCm} onChange={(e) => setCwCm(e.target.value)} style={inp} /></div>
            </div>
          </div>

          {/* Price calculator */}
          {selectedMaterial && (
            <div style={{ background: "rgba(245,182,30,0.04)", border: "1px solid rgba(245,182,30,0.12)", borderRadius: "0.5rem", padding: "0.85rem 1rem", marginBottom: "0.75rem" }}>
              <p style={{ ...lbl, color: "#F5B61E", marginBottom: "0.6rem" }}>PRICE CALCULATOR</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "0.5rem", fontSize: "0.72rem", color: "rgba(240,237,230,0.55)" }}>
                <span>Boxes/sheet:</span>
                <span style={{ color: "#F0EDE6", fontWeight: 600 }}>{boxesPerSheet || "—"}</span>
                <span>Material cost/box:</span>
                <span style={{ color: "#F0EDE6", fontWeight: 600 }}>Rs. {materialCostPerBox.toFixed(2)}</span>
              </div>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-end" }}>
                <div style={{ flex: 1 }}>
                  <label style={lbl}>ADD-ON COST (ribbon, etc.)</label>
                  <input type="number" step="0.01" min="0" value={addOn} onChange={(e) => setAddOn(e.target.value)} style={inp} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ ...lbl, color: "#4ADE80" }}>SUGGESTED</p>
                  <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                    <span style={{ fontSize: "1rem", fontWeight: 700, color: "#4ADE80" }}>Rs. {suggested.toFixed(2)}</span>
                    <button type="button" onClick={applySuggested} style={{ fontSize: "0.6rem", color: "#F5B61E", background: "rgba(245,182,30,0.1)", border: "1px solid rgba(245,182,30,0.25)", borderRadius: "0.3rem", padding: "0.2rem 0.5rem", cursor: "pointer" }}>
                      USE
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Unit price */}
          <div style={{ marginBottom: "0.6rem" }}>
            <label style={lbl}>UNIT PRICE (Rs.) *</label>
            <input type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" style={inp} />
          </div>

          {/* Custom + Active toggles */}
          <div style={{ display: "flex", gap: "1.5rem", marginBottom: "0.6rem" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "0.45rem", cursor: "pointer" }}>
              <input type="checkbox" checked={custom} onChange={(e) => setCustom(e.target.checked)} style={{ accentColor: "#F5B61E" }} />
              <span style={{ fontSize: "0.72rem", color: "rgba(240,237,230,0.6)" }}>Custom design</span>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "0.45rem", cursor: "pointer" }}>
              <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} style={{ accentColor: "#F5B61E" }} />
              <span style={{ fontSize: "0.72rem", color: "rgba(240,237,230,0.6)" }}>Active</span>
            </label>
          </div>
        </div>

        <div style={{ padding: "0.9rem 1.25rem", borderTop: "1px solid rgba(245,182,30,0.1)", display: "flex", gap: "0.6rem", flexShrink: 0 }}>
          <button onClick={handleSave} disabled={saving} style={{
            flex: 1, padding: "0.65rem 0",
            background: "rgba(245,182,30,0.18)", border: "1px solid rgba(245,182,30,0.35)",
            borderRadius: "0.5rem", color: "#F5B61E", fontSize: "0.75rem",
            letterSpacing: "0.08em", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer",
            opacity: saving ? 0.7 : 1,
          }}>
            {saving ? "SAVING…" : existing ? "SAVE CHANGES" : "CREATE DESIGN"}
          </button>
          <button onClick={onClose} style={{
            padding: "0.65rem 1rem", background: "none",
            border: "1px solid rgba(245,182,30,0.15)", borderRadius: "0.5rem",
            color: "rgba(240,237,230,0.4)", fontSize: "0.72rem", cursor: "pointer",
          }}>
            Cancel
          </button>
        </div>
      </div>
    </>
  );
}
