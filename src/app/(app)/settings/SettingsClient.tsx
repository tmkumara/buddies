"use client";

import { useState, FormEvent } from "react";
import { Plus, Pencil, ToggleRight, ToggleLeft } from "lucide-react";
import { createLeadSource, updateLeadSource } from "@/actions/lead-sources";
import { createDeliveryMethod, updateDeliveryMethod } from "@/actions/delivery-methods";

type Tab = "lead-sources" | "delivery-methods";

interface Row { id: number; name: string; active: boolean; }

type CreateFn = (fd: FormData) => Promise<{ success: true } | { error: string }>;
type UpdateFn = (fd: FormData) => Promise<{ success: true } | { error: string }>;

function CrudList({
  label, placeholder, rows: initRows, onCreate, onUpdate,
}: {
  label: string; placeholder: string;
  rows: Row[];
  onCreate: CreateFn; onUpdate: UpdateFn;
}) {
  const [rows,      setRows]      = useState<Row[]>(initRows);
  const [showForm,  setShowForm]  = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formName,  setFormName]  = useState("");
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState("");

  function openCreate() { setEditingId(null); setFormName(""); setShowForm(true); setError(""); }
  function openEdit(r: Row) { setEditingId(r.id); setFormName(r.name); setShowForm(true); setError(""); }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true); setError("");
    const fd = new FormData();
    fd.set("name", formName);
    if (editingId) fd.set("id", String(editingId));
    const result = editingId ? await onUpdate(fd) : await onCreate(fd);
    setSaving(false);
    if ("error" in result) { setError(result.error); return; }
    window.location.reload();
  }

  async function handleToggle(r: Row) {
    const fd = new FormData();
    fd.set("id",     String(r.id));
    fd.set("name",   r.name);
    fd.set("active", String(!r.active));
    await onUpdate(fd);
    setRows((prev) => prev.map((x) => x.id === r.id ? { ...x, active: !x.active } : x));
  }

  const inp: React.CSSProperties = {
    flex: 1, background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(245,182,30,0.14)", borderRadius: "0.45rem",
    padding: "0.6rem 0.85rem", color: "#F0EDE6", fontSize: "0.83rem", outline: "none",
  };

  return (
    <div style={{ maxWidth: "600px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <p style={{ fontSize: "0.72rem", color: "rgba(240,237,230,0.35)" }}>
          {rows.filter((r) => r.active).length} active {label.toLowerCase()}
        </p>
        <button onClick={openCreate} className="cta-btn" style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.72rem" }}>
          <Plus size={13} /> Add {label.replace(/s$/, "")}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", alignItems: "center" }}>
          <input
            value={formName} onChange={(e) => setFormName(e.target.value)}
            placeholder={placeholder} required style={inp}
          />
          <button type="submit" disabled={saving} style={{ padding: "0.6rem 1rem", background: "rgba(245,182,30,0.15)", border: "1px solid rgba(245,182,30,0.3)", borderRadius: "0.45rem", color: "#F5B61E", fontSize: "0.72rem", cursor: saving ? "not-allowed" : "pointer" }}>
            {saving ? "…" : editingId ? "Save" : "Add"}
          </button>
          <button type="button" onClick={() => setShowForm(false)} style={{ padding: "0.6rem 0.85rem", background: "none", border: "1px solid rgba(245,182,30,0.1)", borderRadius: "0.45rem", color: "rgba(240,237,230,0.4)", fontSize: "0.72rem", cursor: "pointer" }}>×</button>
        </form>
      )}
      {error && <p style={{ fontSize: "0.72rem", color: "#F87171", marginBottom: "0.75rem" }}>{error}</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
        {rows.map((r) => (
          <div key={r.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.65rem 0.9rem", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(245,182,30,0.07)", borderRadius: "0.45rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <span style={{ fontSize: "0.85rem", color: r.active ? "#F0EDE6" : "rgba(240,237,230,0.35)", fontWeight: 500 }}>{r.name}</span>
              {!r.active && <span style={{ fontSize: "0.58rem", color: "#F87171" }}>INACTIVE</span>}
            </div>
            <div style={{ display: "flex", gap: "0.35rem" }}>
              <button onClick={() => openEdit(r)} style={{ background: "none", border: "1px solid rgba(245,182,30,0.12)", borderRadius: "0.35rem", padding: "0.25rem 0.5rem", color: "rgba(245,182,30,0.6)", cursor: "pointer" }}>
                <Pencil size={11} />
              </button>
              <button onClick={() => handleToggle(r)} style={{ background: "none", border: `1px solid ${r.active ? "rgba(248,113,113,0.15)" : "rgba(74,222,128,0.15)"}`, borderRadius: "0.35rem", padding: "0.25rem 0.5rem", color: r.active ? "#F87171" : "#4ADE80", cursor: "pointer" }}>
                {r.active ? <ToggleRight size={12} /> : <ToggleLeft size={12} />}
              </button>
            </div>
          </div>
        ))}
        {rows.length === 0 && (
          <p style={{ fontSize: "0.75rem", color: "rgba(240,237,230,0.2)", padding: "1rem 0" }}>No {label.toLowerCase()} configured yet.</p>
        )}
      </div>
    </div>
  );
}

const TABS: { id: Tab; label: string }[] = [
  { id: "lead-sources",     label: "Lead Sources"     },
  { id: "delivery-methods", label: "Delivery Methods" },
];

interface Props {
  leadSources:     Row[];
  deliveryMethods: Row[];
}

export default function SettingsClient({ leadSources, deliveryMethods }: Props) {
  const [tab, setTab] = useState<Tab>("lead-sources");

  return (
    <div>
      {/* Tabs */}
      <div style={{ display: "flex", gap: "0.25rem", marginBottom: "1.75rem", borderBottom: "1px solid rgba(245,182,30,0.1)", paddingBottom: "0" }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            style={{
              padding: "0.55rem 1.1rem",
              background: "none",
              border: "none",
              borderBottom: tab === t.id ? "2px solid #F5B61E" : "2px solid transparent",
              color: tab === t.id ? "#F5B61E" : "rgba(240,237,230,0.4)",
              fontSize: "0.72rem",
              letterSpacing: "0.09em",
              fontWeight: tab === t.id ? 700 : 400,
              cursor: "pointer",
              marginBottom: "-1px",
              transition: "color 0.15s",
            }}
          >
            {t.label.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === "lead-sources" && (
        <CrudList
          label="Lead Sources"
          placeholder="Lead source name (e.g. TikTok)"
          rows={leadSources}
          onCreate={createLeadSource}
          onUpdate={updateLeadSource}
        />
      )}
      {tab === "delivery-methods" && (
        <CrudList
          label="Delivery Methods"
          placeholder="Method name (e.g. DHL)"
          rows={deliveryMethods}
          onCreate={createDeliveryMethod}
          onUpdate={updateDeliveryMethod}
        />
      )}
    </div>
  );
}
