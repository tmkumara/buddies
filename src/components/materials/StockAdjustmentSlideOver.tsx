"use client";

import { useState, FormEvent } from "react";
import { X, TrendingUp, TrendingDown } from "lucide-react";
import { createManualStockAdjustment } from "@/actions/stock-adjustments";

interface Props {
  materialId:   number;
  materialName: string;
  currentStock: number;
  isOpen:       boolean;
  onClose:      () => void;
  onSaved:      (newStock: number) => void;
}

const inp: React.CSSProperties = {
  width: "100%", background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(245,182,30,0.14)", borderRadius: "0.45rem",
  padding: "0.65rem 0.85rem", color: "#F0EDE6", fontSize: "0.83rem", outline: "none",
};
const lbl: React.CSSProperties = {
  fontSize: "0.6rem", letterSpacing: "0.09em",
  color: "rgba(240,237,230,0.4)", display: "block", marginBottom: "0.3rem", fontWeight: 600,
};

export default function StockAdjustmentSlideOver({ materialId, materialName, currentStock, isOpen, onClose, onSaved }: Props) {
  const [mode,    setMode]    = useState<"add" | "remove">("add");
  const [qty,     setQty]     = useState("");
  const [reason,  setReason]  = useState("");
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");

  const delta     = Number(qty) || 0;
  const newStock  = mode === "add" ? currentStock + delta : currentStock - delta;
  const isNegResult = newStock < 0;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!qty || delta <= 0) { setError("Enter a positive quantity."); return; }
    if (!reason.trim()) { setError("Reason is required."); return; }
    if (isNegResult) { setError("Adjustment would result in negative stock."); return; }

    setSaving(true); setError("");
    const fd = new FormData();
    fd.set("materialId", String(materialId));
    fd.set("quantityChange", String(mode === "add" ? delta : -delta));
    fd.set("reason", reason);

    const result = await createManualStockAdjustment(fd) as { error?: string; success?: boolean };
    setSaving(false);
    if ("error" in result) { setError(result.error || "Unknown error"); return; }
    onSaved(newStock);
    setQty(""); setReason("");
    onClose();
  }

  if (!isOpen) return null;

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 59, backdropFilter: "blur(2px)" }} />
      <div style={{
        position: "fixed", top: 0, right: 0, height: "100%", width: "min(400px, 100vw)",
        background: "#141414", borderLeft: "1px solid rgba(245,182,30,0.18)",
        boxShadow: "-12px 0 48px rgba(0,0,0,0.7)", zIndex: 60,
        display: "flex", flexDirection: "column",
        animation: "slideInRight 0.22s ease-out",
      }}>
        <style>{`@keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 1.25rem", borderBottom: "1px solid rgba(245,182,30,0.1)", flexShrink: 0 }}>
          <div>
            <h2 style={{ fontSize: "0.9rem", fontWeight: 700, color: "#F5B61E", margin: 0 }}>Stock Adjustment</h2>
            <p style={{ fontSize: "0.62rem", color: "rgba(240,237,230,0.35)", margin: "0.2rem 0 0", letterSpacing: "0.06em" }}>{materialName.toUpperCase()}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(240,237,230,0.4)" }}><X size={18} /></button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "1.1rem 1.25rem", flex: 1 }}>
            {/* Current stock */}
            <div style={{ textAlign: "center", marginBottom: "1.25rem", padding: "0.85rem", background: "rgba(245,182,30,0.04)", borderRadius: "0.5rem", border: "1px solid rgba(245,182,30,0.1)" }}>
              <p style={{ fontSize: "0.6rem", letterSpacing: "0.09em", color: "rgba(240,237,230,0.35)", marginBottom: "0.25rem" }}>CURRENT STOCK</p>
              <p style={{ fontSize: "1.75rem", fontWeight: 800, color: currentStock <= 10 ? "#F87171" : "#F5B61E", letterSpacing: "-0.02em" }}>{currentStock}</p>
              <p style={{ fontSize: "0.65rem", color: "rgba(240,237,230,0.35)" }}>sheets</p>
            </div>

            {/* Mode toggle */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "1rem" }}>
              {(["add", "remove"] as const).map((m) => (
                <button
                  key={m} type="button" onClick={() => setMode(m)}
                  style={{
                    padding: "0.65rem", borderRadius: "0.45rem",
                    background: mode === m ? (m === "add" ? "rgba(74,222,128,0.12)" : "rgba(248,113,113,0.12)") : "rgba(255,255,255,0.03)",
                    border: `1px solid ${mode === m ? (m === "add" ? "rgba(74,222,128,0.35)" : "rgba(248,113,113,0.35)") : "rgba(245,182,30,0.1)"}`,
                    color: mode === m ? (m === "add" ? "#4ADE80" : "#F87171") : "rgba(240,237,230,0.4)",
                    fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.07em", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem",
                  }}
                >
                  {m === "add" ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                  {m === "add" ? "ADD STOCK" : "REMOVE STOCK"}
                </button>
              ))}
            </div>

            {error && <div style={{ padding: "0.55rem 0.75rem", background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)", borderRadius: "0.4rem", fontSize: "0.72rem", color: "#F87171", marginBottom: "0.75rem" }}>{error}</div>}

            <div style={{ marginBottom: "0.75rem" }}>
              <label style={lbl}>QUANTITY (SHEETS) *</label>
              <input type="number" min="1" step="1" value={qty} onChange={(e) => setQty(e.target.value)} required style={inp} />
            </div>

            <div style={{ marginBottom: "0.75rem" }}>
              <label style={lbl}>REASON *</label>
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="e.g. New delivery from supplier, Damaged sheets written off" required style={{ ...inp, resize: "vertical" }} />
            </div>

            {/* Preview */}
            {delta > 0 && (
              <div style={{ padding: "0.6rem 0.75rem", background: "rgba(255,255,255,0.03)", borderRadius: "0.4rem", border: "1px solid rgba(245,182,30,0.08)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.72rem", color: "rgba(240,237,230,0.4)" }}>After adjustment:</span>
                <span style={{ fontSize: "0.9rem", fontWeight: 700, color: isNegResult ? "#F87171" : "#4ADE80" }}>
                  {newStock} sheets {isNegResult ? "(INVALID)" : ""}
                </span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{ padding: "0.9rem 1.25rem", borderTop: "1px solid rgba(245,182,30,0.1)", display: "flex", gap: "0.6rem", flexShrink: 0 }}>
            <button type="submit" disabled={saving || isNegResult} style={{ flex: 1, padding: "0.65rem", background: "rgba(245,182,30,0.15)", border: "1px solid rgba(245,182,30,0.3)", borderRadius: "0.5rem", color: "#F5B61E", fontSize: "0.75rem", letterSpacing: "0.08em", fontWeight: 700, cursor: saving || isNegResult ? "not-allowed" : "pointer", opacity: saving || isNegResult ? 0.6 : 1 }}>
              {saving ? "SAVING…" : "SAVE ADJUSTMENT"}
            </button>
            <button type="button" onClick={onClose} style={{ padding: "0.65rem 1rem", background: "none", border: "1px solid rgba(245,182,30,0.12)", borderRadius: "0.5rem", color: "rgba(240,237,230,0.4)", fontSize: "0.72rem", cursor: "pointer" }}>Cancel</button>
          </div>
        </form>
      </div>
    </>
  );
}
