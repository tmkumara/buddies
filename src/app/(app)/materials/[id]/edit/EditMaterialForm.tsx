"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { updateMaterial } from "@/actions/materials";

interface Material {
  id: number; code: string; name: string; gsm: number;
  sheetLengthCm: unknown; sheetWidthCm: unknown;
  costPerSheet: unknown; minStockLevel: unknown; currentStockLevel: unknown;
  active: boolean;
}

export default function EditMaterialForm({ material: m }: { material: Material }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const result = await updateMaterial(m.id, new FormData(e.currentTarget));
    if (result.error) { setError(result.error); setLoading(false); }
    else router.push("/materials");
  }

  return (
    <>
      <Link href="/materials" className="nav-link" style={{ fontSize: "0.68rem", display: "inline-block", marginBottom: "1.25rem" }}>
        ← Back to Materials
      </Link>
      <div className="content-card">
        <h2 style={{ fontSize: "1rem", fontWeight: 600, color: "#F5B61E", letterSpacing: "0.04em", marginBottom: "1.5rem" }}>
          Edit Material
        </h2>
        {error && <div className="form-error mb-5">{error}</div>}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div className="form-field">
              <label htmlFor="code" className="form-label">CODE *</label>
              <input id="code" name="code" type="text" className="form-input" defaultValue={m.code} required />
            </div>
            <div className="form-field">
              <label htmlFor="gsm" className="form-label">GSM *</label>
              <input id="gsm" name="gsm" type="number" min="80" max="600" className="form-input" defaultValue={m.gsm} required />
            </div>
          </div>
          <div className="form-field">
            <label htmlFor="name" className="form-label">NAME *</label>
            <input id="name" name="name" type="text" className="form-input" defaultValue={m.name} required />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div className="form-field">
              <label htmlFor="sheetLengthCm" className="form-label">SHEET LENGTH (cm) *</label>
              <input id="sheetLengthCm" name="sheetLengthCm" type="number" step="0.01" min="0" className="form-input" defaultValue={Number(m.sheetLengthCm)} required />
            </div>
            <div className="form-field">
              <label htmlFor="sheetWidthCm" className="form-label">SHEET WIDTH (cm) *</label>
              <input id="sheetWidthCm" name="sheetWidthCm" type="number" step="0.01" min="0" className="form-input" defaultValue={Number(m.sheetWidthCm)} required />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
            <div className="form-field">
              <label htmlFor="costPerSheet" className="form-label">COST/SHEET *</label>
              <input id="costPerSheet" name="costPerSheet" type="number" step="0.01" min="0" className="form-input" defaultValue={Number(m.costPerSheet)} required />
            </div>
            <div className="form-field">
              <label htmlFor="minStockLevel" className="form-label">MIN STOCK</label>
              <input id="minStockLevel" name="minStockLevel" type="number" step="1" min="0" className="form-input" defaultValue={Number(m.minStockLevel)} />
            </div>
            <div className="form-field">
              <label htmlFor="currentStockLevel" className="form-label">CURRENT STOCK</label>
              <input id="currentStockLevel" name="currentStockLevel" type="number" step="1" min="0" className="form-input" defaultValue={Number(m.currentStockLevel)} />
            </div>
          </div>
          <div className="form-field">
            <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <input type="checkbox" name="active" value="true" defaultChecked={m.active} style={{ accentColor: "#F5B61E" }} />
              <span>Active</span>
            </label>
          </div>
          <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
            <button type="submit" className="submit-btn" disabled={loading} style={{ flex: 1 }}>
              {loading ? "SAVING…" : "SAVE CHANGES"}
            </button>
            <Link href="/materials">
              <button type="button" style={{
                padding: "0.7rem 1.25rem", background: "none",
                border: "1px solid rgba(245,182,30,0.18)", borderRadius: "0.5rem",
                color: "rgba(240,237,230,0.45)", fontSize: "0.72rem", letterSpacing: "0.08em", cursor: "pointer",
              }}>CANCEL</button>
            </Link>
          </div>
        </form>
      </div>
    </>
  );
}
