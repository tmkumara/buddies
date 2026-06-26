"use client";

import { useState, useEffect } from "react";
import { X, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import { quickCreateMaterial, quickCreateBoxDesign } from "@/actions/quick-create";
import type { BoxDesignOption } from "./OrderItemsEditor";

export interface DesignTypeOption { id: number; code: string; name: string; }
export interface MaterialOption    { id: number; code: string; name: string; status: string; }

interface Props {
  isOpen:           boolean;
  onClose:          () => void;
  onCreated:        (design: BoxDesignOption) => void;
  designTypes:      DesignTypeOption[];
  initialMaterials: MaterialOption[];
}

const inp: React.CSSProperties = {
  width: "100%", background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(245,182,30,0.18)", borderRadius: "0.45rem",
  padding: "0.55rem 0.8rem", color: "#F0EDE6", fontSize: "0.8rem", outline: "none",
};
const lbl: React.CSSProperties = {
  fontSize: "0.6rem", letterSpacing: "0.09em", color: "rgba(240,237,230,0.4)",
  display: "block", marginBottom: "0.3rem", fontWeight: 600,
};

export default function QuickCreateDesignPanel({ isOpen, onClose, onCreated, designTypes, initialMaterials }: Props) {
  const [materials, setMaterials] = useState<MaterialOption[]>(initialMaterials);

  // Material mini-form
  const [showMatForm, setShowMatForm]   = useState(false);
  const [mCode,  setMCode]             = useState("");
  const [mName,  setMName]             = useState("");
  const [mGsm,   setMGsm]             = useState("250");
  const [mLen,   setMLen]             = useState("");
  const [mWid,   setMWid]             = useState("");
  const [mCost,  setMCost]            = useState("");
  const [mPend,  setMPend]            = useState(false);
  const [mErr,   setMErr]             = useState("");
  const [mSaving, setMSaving]         = useState(false);
  const [mCreated, setMCreated]       = useState<MaterialOption | null>(null);

  // Design form
  const [dCode,   setDCode]   = useState("");
  const [dName,   setDName]   = useState("");
  const [dTypeId, setDTypeId] = useState("");
  const [dMatId,  setDMatId]  = useState("");
  const [dL,      setDL]      = useState("");
  const [dW,      setDW]      = useState("");
  const [dH,      setDH]      = useState("");
  const [dCL,     setDCL]     = useState("");
  const [dCW,     setDCW]     = useState("");
  const [dPrice,  setDPrice]  = useState("");
  const [dCustom, setDCustom] = useState(false);
  const [dErr,    setDErr]    = useState("");
  const [dSaving, setDSaving] = useState(false);

  // Reset panel state when opened
  useEffect(() => {
    if (isOpen) {
      setMaterials(initialMaterials);
      setShowMatForm(false); setMCode(""); setMName(""); setMGsm("250");
      setMLen(""); setMWid(""); setMCost(""); setMPend(false);
      setMErr(""); setMCreated(null);
      setDCode(""); setDName(""); setDTypeId(""); setDMatId("");
      setDL(""); setDW(""); setDH(""); setDCL(""); setDCW("");
      setDPrice(""); setDCustom(false); setDErr("");
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep materials in sync if initialMaterials changes (new ones added externally)
  useEffect(() => {
    setMaterials(initialMaterials);
  }, [initialMaterials]);

  async function handleCreateMaterial() {
    setMSaving(true); setMErr("");
    const fd = new FormData();
    fd.set("code", mCode); fd.set("name", mName); fd.set("gsm", mGsm);
    fd.set("sheetLengthCm", mLen); fd.set("sheetWidthCm", mWid);
    fd.set("costPerSheet", mCost || "0");
    fd.set("isPending", mPend ? "true" : "false");
    const result = await quickCreateMaterial(fd);
    setMSaving(false);
    if ("error" in result) { setMErr(result.error ?? "Failed to create material"); return; }
    const newMat = result.data;
    setMaterials((prev) => [...prev, newMat]);
    setDMatId(String(newMat.id));
    setMCreated(newMat);
    setShowMatForm(false);
    setMCode(""); setMName(""); setMGsm("250"); setMLen(""); setMWid(""); setMCost(""); setMPend(false);
  }

  async function handleCreateDesign() {
    if (!dCode || !dName || !dTypeId || !dMatId || !dL || !dW || !dH || !dCL || !dCW || !dPrice) {
      setDErr("Please fill in all required fields.");
      return;
    }
    setDSaving(true); setDErr("");
    const fd = new FormData();
    fd.set("code", dCode); fd.set("name", dName);
    fd.set("designTypeId", dTypeId); fd.set("materialId", dMatId);
    fd.set("lengthCm", dL); fd.set("widthCm", dW); fd.set("heightCm", dH);
    fd.set("cutLengthCm", dCL); fd.set("cutWidthCm", dCW);
    fd.set("unitPrice", dPrice);
    fd.set("custom", dCustom ? "true" : "false");
    const result = await quickCreateBoxDesign(fd);
    setDSaving(false);
    if ("error" in result) { setDErr(result.error ?? "Failed to create design"); return; }
    onCreated(result.data);
    onClose();
  }

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
          zIndex: 49, backdropFilter: "blur(2px)",
        }}
      />

      {/* Panel */}
      <div style={{
        position: "fixed", top: 0, right: 0, height: "100%", width: "min(480px, 100vw)",
        background: "#141414", borderLeft: "1px solid rgba(245,182,30,0.18)",
        boxShadow: "-12px 0 48px rgba(0,0,0,0.7)",
        zIndex: 50, display: "flex", flexDirection: "column",
        animation: "slideInRight 0.22s ease-out",
      }}>
        <style>{`
          @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to   { transform: translateX(0);    opacity: 1; }
          }
        `}</style>

        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "1rem 1.25rem", borderBottom: "1px solid rgba(245,182,30,0.1)",
          flexShrink: 0,
        }}>
          <div>
            <h2 style={{ fontSize: "0.9rem", fontWeight: 700, color: "#F5B61E", letterSpacing: "0.04em", margin: 0 }}>
              New Box Design
            </h2>
            <p style={{ fontSize: "0.62rem", color: "rgba(240,237,230,0.35)", margin: "0.2rem 0 0", letterSpacing: "0.06em" }}>
              QUICK CREATE
            </p>
          </div>
          <button
            type="button" onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(240,237,230,0.4)", padding: "0.3rem" }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "1.1rem 1.25rem" }}>

          {/* ── Material mini-form ── */}
          <div style={{
            border: "1px solid rgba(245,182,30,0.12)", borderRadius: "0.6rem",
            marginBottom: "1.25rem", overflow: "hidden",
          }}>
            <button
              type="button"
              onClick={() => setShowMatForm((v) => !v)}
              style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "0.7rem 1rem", background: "rgba(245,182,30,0.04)",
                border: "none", cursor: "pointer",
              }}
            >
              <span style={{ fontSize: "0.72rem", fontWeight: 600, color: "rgba(240,237,230,0.7)", letterSpacing: "0.07em" }}>
                + ADD NEW MATERIAL
              </span>
              {showMatForm ? <ChevronUp size={14} color="rgba(240,237,230,0.4)" /> : <ChevronDown size={14} color="rgba(240,237,230,0.4)" />}
            </button>

            {showMatForm && (
              <div style={{ padding: "0.9rem 1rem", borderTop: "1px solid rgba(245,182,30,0.08)" }}>
                {mErr && (
                  <div style={{ padding: "0.5rem 0.75rem", background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)", borderRadius: "0.4rem", fontSize: "0.72rem", color: "#F87171", marginBottom: "0.75rem" }}>
                    {mErr}
                  </div>
                )}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem", marginBottom: "0.6rem" }}>
                  <div>
                    <label style={lbl}>CODE *</label>
                    <input type="text" value={mCode} onChange={(e) => setMCode(e.target.value)} placeholder="MAT-01" style={inp} />
                  </div>
                  <div>
                    <label style={lbl}>GSM *</label>
                    <input type="number" value={mGsm} onChange={(e) => setMGsm(e.target.value)} min="80" max="600" style={inp} />
                  </div>
                </div>
                <div style={{ marginBottom: "0.6rem" }}>
                  <label style={lbl}>NAME *</label>
                  <input type="text" value={mName} onChange={(e) => setMName(e.target.value)} placeholder="Art Board 300gsm" style={inp} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.6rem", marginBottom: "0.6rem" }}>
                  <div>
                    <label style={lbl}>LENGTH cm *</label>
                    <input type="number" step="0.01" value={mLen} onChange={(e) => setMLen(e.target.value)} placeholder="43" style={inp} />
                  </div>
                  <div>
                    <label style={lbl}>WIDTH cm *</label>
                    <input type="number" step="0.01" value={mWid} onChange={(e) => setMWid(e.target.value)} placeholder="31" style={inp} />
                  </div>
                  <div>
                    <label style={lbl}>COST/SHEET</label>
                    <input type="number" step="0.01" value={mCost} onChange={(e) => setMCost(e.target.value)} placeholder="0" style={inp} />
                  </div>
                </div>

                <label style={{
                  display: "flex", alignItems: "center", gap: "0.5rem",
                  cursor: "pointer", padding: "0.55rem 0.75rem",
                  background: mPend ? "rgba(245,182,30,0.07)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${mPend ? "rgba(245,182,30,0.3)" : "rgba(245,182,30,0.1)"}`,
                  borderRadius: "0.45rem", marginBottom: "0.75rem",
                }}>
                  <input type="checkbox" checked={mPend} onChange={(e) => setMPend(e.target.checked)} style={{ accentColor: "#F5B61E", width: 14, height: 14 }} />
                  <div>
                    <span style={{ fontSize: "0.75rem", color: mPend ? "#F5B61E" : "rgba(240,237,230,0.7)", fontWeight: 600 }}>
                      Pending Purchase
                    </span>
                    <p style={{ fontSize: "0.62rem", color: "rgba(240,237,230,0.35)", margin: "0.1rem 0 0" }}>
                      Material requested but not yet purchased
                    </p>
                  </div>
                </label>

                <button
                  type="button" onClick={handleCreateMaterial} disabled={mSaving}
                  style={{
                    width: "100%", padding: "0.55rem 0", background: "rgba(245,182,30,0.12)",
                    border: "1px solid rgba(245,182,30,0.25)", borderRadius: "0.45rem",
                    color: "#F5B61E", fontSize: "0.72rem", letterSpacing: "0.08em",
                    fontWeight: 600, cursor: mSaving ? "not-allowed" : "pointer",
                    opacity: mSaving ? 0.6 : 1,
                  }}
                >
                  {mSaving ? "CREATING…" : "CREATE MATERIAL"}
                </button>
              </div>
            )}

            {mCreated && !showMatForm && (
              <div style={{
                padding: "0.55rem 1rem", background: "rgba(74,222,128,0.06)",
                borderTop: "1px solid rgba(74,222,128,0.15)", display: "flex", alignItems: "center", gap: "0.5rem",
              }}>
                <span style={{ fontSize: "0.62rem", color: "#4ADE80" }}>✓</span>
                <span style={{ fontSize: "0.72rem", color: "rgba(240,237,230,0.6)" }}>
                  <strong style={{ color: "#F5B61E" }}>{mCreated.code}</strong> created
                  {mCreated.status === "PENDING" && (
                    <span style={{ marginLeft: "0.4rem", fontSize: "0.6rem", color: "#FBBF24", background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.25)", borderRadius: "0.3rem", padding: "0.1rem 0.35rem" }}>
                      PENDING
                    </span>
                  )}
                </span>
              </div>
            )}
          </div>

          {/* ── Box Design Form ── */}
          <p style={{ fontSize: "0.62rem", letterSpacing: "0.09em", color: "rgba(240,237,230,0.3)", marginBottom: "0.9rem", fontWeight: 600 }}>
            DESIGN DETAILS
          </p>

          {dErr && (
            <div style={{ padding: "0.55rem 0.75rem", background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)", borderRadius: "0.4rem", fontSize: "0.72rem", color: "#F87171", marginBottom: "0.75rem" }}>
              {dErr}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem", marginBottom: "0.6rem" }}>
            <div>
              <label style={lbl}>CODE *</label>
              <input type="text" value={dCode} onChange={(e) => setDCode(e.target.value)} placeholder="BD-001" style={inp} />
            </div>
            <div>
              <label style={lbl}>NAME *</label>
              <input type="text" value={dName} onChange={(e) => setDName(e.target.value)} placeholder="Small Square Box" style={inp} />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem", marginBottom: "0.6rem" }}>
            <div>
              <label style={lbl}>DESIGN TYPE *</label>
              <select value={dTypeId} onChange={(e) => setDTypeId(e.target.value)} style={{ ...inp, color: dTypeId ? "#F0EDE6" : "rgba(240,237,230,0.3)" }}>
                <option value="" disabled>— Select —</option>
                {designTypes.map((dt) => (
                  <option key={dt.id} value={dt.id} style={{ background: "#141414" }}>
                    {dt.code} — {dt.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={lbl}>MATERIAL *</label>
              <select value={dMatId} onChange={(e) => setDMatId(e.target.value)} style={{ ...inp, color: dMatId ? "#F0EDE6" : "rgba(240,237,230,0.3)" }}>
                <option value="" disabled>— Select —</option>
                {materials.map((m) => (
                  <option key={m.id} value={m.id} style={{ background: "#141414" }}>
                    {m.code} — {m.name}{m.status === "PENDING" ? " ⚠ Pending" : ""}
                  </option>
                ))}
              </select>
              {materials.find((m) => m.id === Number(dMatId))?.status === "PENDING" && (
                <p style={{ fontSize: "0.6rem", color: "#FBBF24", marginTop: "0.3rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                  <AlertTriangle size={10} /> This material is pending purchase
                </p>
              )}
            </div>
          </div>

          <div style={{ borderTop: "1px solid rgba(245,182,30,0.07)", paddingTop: "0.75rem", marginBottom: "0.6rem" }}>
            <p style={{ ...lbl, marginBottom: "0.5rem" }}>BOX DIMENSIONS (cm)</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.6rem" }}>
              <div>
                <label style={lbl}>LENGTH *</label>
                <input type="number" step="0.01" min="0" value={dL} onChange={(e) => setDL(e.target.value)} style={inp} />
              </div>
              <div>
                <label style={lbl}>WIDTH *</label>
                <input type="number" step="0.01" min="0" value={dW} onChange={(e) => setDW(e.target.value)} style={inp} />
              </div>
              <div>
                <label style={lbl}>HEIGHT *</label>
                <input type="number" step="0.01" min="0" value={dH} onChange={(e) => setDH(e.target.value)} style={inp} />
              </div>
            </div>
          </div>

          <div style={{ marginBottom: "0.6rem" }}>
            <p style={{ ...lbl, marginBottom: "0.5rem" }}>CUT SHEET (cm)</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
              <div>
                <label style={lbl}>CUT LENGTH *</label>
                <input type="number" step="0.01" min="0" value={dCL} onChange={(e) => setDCL(e.target.value)} style={inp} />
              </div>
              <div>
                <label style={lbl}>CUT WIDTH *</label>
                <input type="number" step="0.01" min="0" value={dCW} onChange={(e) => setDCW(e.target.value)} style={inp} />
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem", marginBottom: "0.75rem", alignItems: "end" }}>
            <div>
              <label style={lbl}>UNIT PRICE *</label>
              <input type="number" step="0.01" min="0" value={dPrice} onChange={(e) => setDPrice(e.target.value)} style={inp} />
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: "0.45rem", cursor: "pointer", paddingBottom: "0.3rem" }}>
              <input type="checkbox" checked={dCustom} onChange={(e) => setDCustom(e.target.checked)} style={{ accentColor: "#F5B61E" }} />
              <span style={{ fontSize: "0.72rem", color: "rgba(240,237,230,0.6)" }}>Custom design</span>
            </label>
          </div>

          {/* TODO: DFX file upload */}
        </div>

        {/* Footer */}
        <div style={{
          padding: "0.9rem 1.25rem", borderTop: "1px solid rgba(245,182,30,0.1)",
          display: "flex", gap: "0.6rem", flexShrink: 0,
        }}>
          <button
            type="button" onClick={handleCreateDesign} disabled={dSaving}
            style={{
              flex: 1, padding: "0.65rem 0",
              background: dSaving ? "rgba(245,182,30,0.15)" : "rgba(245,182,30,0.18)",
              border: "1px solid rgba(245,182,30,0.35)", borderRadius: "0.5rem",
              color: "#F5B61E", fontSize: "0.75rem", letterSpacing: "0.08em",
              fontWeight: 700, cursor: dSaving ? "not-allowed" : "pointer",
              opacity: dSaving ? 0.7 : 1,
            }}
          >
            {dSaving ? "CREATING…" : "CREATE DESIGN"}
          </button>
          <button
            type="button" onClick={onClose}
            style={{
              padding: "0.65rem 1rem", background: "none",
              border: "1px solid rgba(245,182,30,0.15)", borderRadius: "0.5rem",
              color: "rgba(240,237,230,0.4)", fontSize: "0.72rem", cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </>
  );
}
