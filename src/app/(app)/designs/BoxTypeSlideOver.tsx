"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { createBoxType, updateBoxType } from "@/actions/designs";
import type { BoxTypeData } from "./DesignsClient";

interface Props {
  isOpen:   boolean;
  existing: BoxTypeData | null;
  onClose:  () => void;
}

const inp: React.CSSProperties = {
  width: "100%", background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(245,182,30,0.18)", borderRadius: "0.45rem",
  padding: "0.6rem 0.85rem", color: "#F0EDE6", fontSize: "0.82rem", outline: "none",
};
const lbl: React.CSSProperties = {
  fontSize: "0.6rem", letterSpacing: "0.09em",
  color: "rgba(240,237,230,0.4)", display: "block", marginBottom: "0.3rem", fontWeight: 600,
};

export default function BoxTypeSlideOver({ isOpen, existing, onClose }: Props) {
  const [code,    setCode]    = useState("");
  const [name,    setName]    = useState("");
  const [desc,    setDesc]    = useState("");
  const [active,  setActive]  = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");

  useEffect(() => {
    if (isOpen) {
      setCode(existing?.code ?? "");
      setName(existing?.name ?? "");
      setDesc(existing?.description ?? "");
      setActive(existing?.active ?? true);
      setError("");
    }
  }, [isOpen, existing]);

  async function handleSave() {
    setSaving(true); setError("");
    const fd = new FormData();
    fd.set("code",   code);
    fd.set("name",   name);
    fd.set("description", desc);
    fd.set("active", String(active));

    const result = existing
      ? await updateBoxType(existing.id, fd)
      : await createBoxType(fd);

    setSaving(false);
    if ("error" in result) { setError(result.error ?? ""); return; }
    onClose();
  }

  if (!isOpen) return null;

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 49, backdropFilter: "blur(2px)" }} />
      <div style={{
        position: "fixed", top: 0, right: 0, height: "100%", width: "min(420px, 100vw)",
        background: "#141414", borderLeft: "1px solid rgba(245,182,30,0.18)",
        boxShadow: "-12px 0 48px rgba(0,0,0,0.7)", zIndex: 50,
        display: "flex", flexDirection: "column",
        animation: "slideInRight 0.22s ease-out",
      }}>
        <style>{`@keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 1.25rem", borderBottom: "1px solid rgba(245,182,30,0.1)", flexShrink: 0 }}>
          <div>
            <h2 style={{ fontSize: "0.9rem", fontWeight: 700, color: "#F5B61E", margin: 0 }}>
              {existing ? "Edit Box Type" : "New Box Type"}
            </h2>
            <p style={{ fontSize: "0.62rem", color: "rgba(240,237,230,0.35)", margin: "0.2rem 0 0", letterSpacing: "0.06em" }}>BOX TYPE</p>
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

          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "0.6rem", marginBottom: "0.6rem" }}>
            <div>
              <label style={lbl}>CODE *</label>
              <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="PMB" style={inp} />
            </div>
            <div>
              <label style={lbl}>NAME *</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Packing Mailer Box" style={inp} />
            </div>
          </div>

          <div style={{ marginBottom: "0.6rem" }}>
            <label style={lbl}>DESCRIPTION</label>
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} style={{ ...inp, resize: "vertical" }} />
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", marginBottom: "0.6rem" }}>
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} style={{ accentColor: "#F5B61E", width: 14, height: 14 }} />
            <span style={{ fontSize: "0.75rem", color: "rgba(240,237,230,0.7)" }}>Active</span>
          </label>
        </div>

        <div style={{ padding: "0.9rem 1.25rem", borderTop: "1px solid rgba(245,182,30,0.1)", display: "flex", gap: "0.6rem", flexShrink: 0 }}>
          <button onClick={handleSave} disabled={saving} style={{
            flex: 1, padding: "0.65rem 0",
            background: "rgba(245,182,30,0.18)", border: "1px solid rgba(245,182,30,0.35)",
            borderRadius: "0.5rem", color: "#F5B61E", fontSize: "0.75rem",
            letterSpacing: "0.08em", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer",
            opacity: saving ? 0.7 : 1,
          }}>
            {saving ? "SAVING…" : existing ? "SAVE CHANGES" : "CREATE BOX TYPE"}
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
