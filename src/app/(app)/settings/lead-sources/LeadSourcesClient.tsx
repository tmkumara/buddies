"use client";

import { useState, FormEvent } from "react";
import { Plus, Pencil, ToggleRight, ToggleLeft } from "lucide-react";
import { createLeadSource, updateLeadSource } from "@/actions/lead-sources";

interface LeadSourceRow { id: number; name: string; active: boolean; }

interface Props { sources: LeadSourceRow[]; }

export default function LeadSourcesClient({ sources: initSources }: Props) {
  const [sources,    setSources]    = useState<LeadSourceRow[]>(initSources);
  const [showForm,   setShowForm]   = useState(false);
  const [editingId,  setEditingId]  = useState<number | null>(null);
  const [formName,   setFormName]   = useState("");
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState("");

  function openCreate() { setEditingId(null); setFormName(""); setShowForm(true); setError(""); }
  function openEdit(s: LeadSourceRow) { setEditingId(s.id); setFormName(s.name); setShowForm(true); setError(""); }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const fd = new FormData();
    fd.set("name", formName);
    if (editingId) fd.set("id", String(editingId));

    const action = editingId ? updateLeadSource : createLeadSource;
    const result = await action(fd);
    setSaving(false);
    if ("error" in result && typeof result.error === "string") {
      setError(result.error);
      return;
    }
    window.location.reload();
  }

  async function handleToggle(s: LeadSourceRow) {
    const fd = new FormData();
    fd.set("id",     String(s.id));
    fd.set("name",   s.name);
    fd.set("active", String(!s.active));
    await updateLeadSource(fd);
    setSources((prev) => prev.map((ls) => ls.id === s.id ? { ...ls, active: !ls.active } : ls));
  }

  const inp: React.CSSProperties = {
    flex: 1, background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(245,182,30,0.14)", borderRadius: "0.45rem",
    padding: "0.6rem 0.85rem", color: "#F0EDE6", fontSize: "0.83rem", outline: "none",
  };

  return (
    <div style={{ maxWidth: "600px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <p style={{ fontSize: "0.72rem", color: "rgba(240,237,230,0.35)" }}>{sources.filter((s) => s.active).length} active sources</p>
        <button onClick={openCreate} className="cta-btn" style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.72rem" }}>
          <Plus size={13} /> Add Source
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", alignItems: "center" }}>
          <input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Lead source name (e.g. TikTok)" required style={inp} />
          <button type="submit" disabled={saving} style={{ padding: "0.6rem 1rem", background: "rgba(245,182,30,0.15)", border: "1px solid rgba(245,182,30,0.3)", borderRadius: "0.45rem", color: "#F5B61E", fontSize: "0.72rem", cursor: saving ? "not-allowed" : "pointer" }}>
            {saving ? "…" : editingId ? "Save" : "Add"}
          </button>
          <button type="button" onClick={() => setShowForm(false)} style={{ padding: "0.6rem 0.85rem", background: "none", border: "1px solid rgba(245,182,30,0.1)", borderRadius: "0.45rem", color: "rgba(240,237,230,0.4)", fontSize: "0.72rem", cursor: "pointer" }}>×</button>
        </form>
      )}
      {error && <p style={{ fontSize: "0.72rem", color: "#F87171", marginBottom: "0.75rem" }}>{error}</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
        {sources.map((s) => (
          <div key={s.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.65rem 0.9rem", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(245,182,30,0.07)", borderRadius: "0.45rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <span style={{ fontSize: "0.85rem", color: s.active ? "#F0EDE6" : "rgba(240,237,230,0.35)", fontWeight: 500 }}>{s.name}</span>
              {!s.active && <span style={{ fontSize: "0.58rem", color: "#F87171" }}>INACTIVE</span>}
            </div>
            <div style={{ display: "flex", gap: "0.35rem" }}>
              <button onClick={() => openEdit(s)} style={{ background: "none", border: "1px solid rgba(245,182,30,0.12)", borderRadius: "0.35rem", padding: "0.25rem 0.5rem", color: "rgba(245,182,30,0.6)", cursor: "pointer" }}>
                <Pencil size={11} />
              </button>
              <button onClick={() => handleToggle(s)} style={{ background: "none", border: `1px solid ${s.active ? "rgba(248,113,113,0.15)" : "rgba(74,222,128,0.15)"}`, borderRadius: "0.35rem", padding: "0.25rem 0.5rem", color: s.active ? "#F87171" : "#4ADE80", cursor: "pointer" }}>
                {s.active ? <ToggleRight size={12} /> : <ToggleLeft size={12} />}
              </button>
            </div>
          </div>
        ))}
        {sources.length === 0 && (
          <p style={{ fontSize: "0.75rem", color: "rgba(240,237,230,0.2)", padding: "1rem 0" }}>No lead sources configured yet.</p>
        )}
      </div>
    </div>
  );
}
