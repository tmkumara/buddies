"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createBoxDesign, updateBoxDesign } from "@/actions/box-designs";
import Combobox from "@/components/ui/Combobox";

interface SelectOption { id: number; code: string; name: string; }

interface BoxDesign {
  id: number; code: string; name: string; designTypeId: number; materialId: number;
  lengthCm: number; widthCm: number; heightCm: number;
  cutLengthCm: number; cutWidthCm: number;
  unitPrice: number; custom: boolean; active: boolean;
}

interface Props {
  designTypes: SelectOption[];
  materials: SelectOption[];
  existing?: BoxDesign;
}

export default function BoxDesignForm({ designTypes, materials, existing }: Props) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const result = existing
      ? await updateBoxDesign(existing.id, fd)
      : await createBoxDesign(fd);
    if (result.error) { setError(result.error); setLoading(false); }
    else router.push("/box-designs");
  }

  const isEdit = !!existing;

  return (
    <>
      <Link href="/box-designs" className="nav-link" style={{ fontSize: "0.68rem", display: "inline-block", marginBottom: "1.25rem" }}>
        ← Back to Box Designs
      </Link>
      <div className="content-card">
        <h2 style={{ fontSize: "1rem", fontWeight: 600, color: "#F5B61E", letterSpacing: "0.04em", marginBottom: "1.5rem" }}>
          {isEdit ? "Edit Box Design" : "New Box Design"}
        </h2>
        {error && <div className="form-error mb-5">{error}</div>}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div className="form-field">
              <label htmlFor="code" className="form-label">CODE *</label>
              <input id="code" name="code" type="text" className="form-input" defaultValue={existing?.code} required />
            </div>
            <div className="form-field">
              <label htmlFor="name" className="form-label">NAME *</label>
              <input id="name" name="name" type="text" className="form-input" defaultValue={existing?.name} required />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div className="form-field">
              <label className="form-label">DESIGN TYPE *</label>
              <Combobox
                name="designTypeId"
                placeholder="— Select Design Type —"
                defaultValue={existing?.designTypeId}
                required
                options={designTypes.map((dt) => ({ value: dt.id, label: `${dt.code} — ${dt.name}` }))}
              />
            </div>
            <div className="form-field">
              <label className="form-label">MATERIAL *</label>
              <Combobox
                name="materialId"
                placeholder="— Select Material —"
                defaultValue={existing?.materialId}
                required
                options={materials.map((m) => ({ value: m.id, label: `${m.code} — ${m.name}` }))}
              />
            </div>
          </div>

          <div style={{ borderTop: "1px solid rgba(245,182,30,0.08)", paddingTop: "1rem" }}>
            <p className="form-label" style={{ marginBottom: "0.75rem" }}>BOX DIMENSIONS (cm)</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
              <div className="form-field">
                <label htmlFor="lengthCm" className="form-label">LENGTH *</label>
                <input id="lengthCm" name="lengthCm" type="number" step="0.01" min="0" className="form-input" defaultValue={existing ? Number(existing.lengthCm) : undefined} required />
              </div>
              <div className="form-field">
                <label htmlFor="widthCm" className="form-label">WIDTH *</label>
                <input id="widthCm" name="widthCm" type="number" step="0.01" min="0" className="form-input" defaultValue={existing ? Number(existing.widthCm) : undefined} required />
              </div>
              <div className="form-field">
                <label htmlFor="heightCm" className="form-label">HEIGHT *</label>
                <input id="heightCm" name="heightCm" type="number" step="0.01" min="0" className="form-input" defaultValue={existing ? Number(existing.heightCm) : undefined} required />
              </div>
            </div>
          </div>

          <div>
            <p className="form-label" style={{ marginBottom: "0.75rem" }}>CUT SHEET (cm) — used to compute raw area</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div className="form-field">
                <label htmlFor="cutLengthCm" className="form-label">CUT LENGTH *</label>
                <input id="cutLengthCm" name="cutLengthCm" type="number" step="0.01" min="0" className="form-input" defaultValue={existing ? Number(existing.cutLengthCm) : undefined} required />
              </div>
              <div className="form-field">
                <label htmlFor="cutWidthCm" className="form-label">CUT WIDTH *</label>
                <input id="cutWidthCm" name="cutWidthCm" type="number" step="0.01" min="0" className="form-input" defaultValue={existing ? Number(existing.cutWidthCm) : undefined} required />
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", alignItems: "end" }}>
            <div className="form-field">
              <label htmlFor="unitPrice" className="form-label">UNIT PRICE *</label>
              <input id="unitPrice" name="unitPrice" type="number" step="0.01" min="0" className="form-input" defaultValue={existing ? Number(existing.unitPrice) : undefined} required />
            </div>
            <div className="form-field">
              <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.6rem" }}>
                <input type="checkbox" name="custom" value="true" defaultChecked={existing?.custom} style={{ accentColor: "#F5B61E" }} />
                <span>Custom design</span>
              </label>
            </div>
          </div>

          {isEdit && (
            <div className="form-field">
              <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input type="checkbox" name="active" value="true" defaultChecked={existing?.active} style={{ accentColor: "#F5B61E" }} />
                <span>Active</span>
              </label>
            </div>
          )}

          <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
            <button type="submit" className="submit-btn" disabled={loading} style={{ flex: 1 }}>
              {loading ? "SAVING…" : isEdit ? "SAVE CHANGES" : "SAVE BOX DESIGN"}
            </button>
            <Link href="/box-designs">
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
