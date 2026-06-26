"use client";

import { useState, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { MaterialStatus } from "@prisma/client";
import { createMaterial, updateMaterial } from "@/actions/materials";
import UnitInput from "@/components/ui/UnitInput";

export interface MaterialData {
  id: number; code: string; name: string; gsm: number;
  sheetLengthCm: number | null; sheetWidthCm: number | null;
  sheetLengthIn: number | null; sheetWidthIn: number | null;
  costPerSheet: number; unitPrice: number;
  minStockLevel: number; currentStockLevel: number;
  status: MaterialStatus;
}

interface Props {
  open: boolean;
  onClose: () => void;
  existing?: MaterialData;
}

const STATUS_OPTIONS: MaterialStatus[] = ["ACTIVE", "PENDING", "INACTIVE"];

export default function MaterialSlideOver({ open, onClose, existing }: Props) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<MaterialStatus>(existing?.status ?? "ACTIVE");
  const isEdit = !!existing;

  useEffect(() => {
    setStatus(existing?.status ?? "ACTIVE");
    setError("");
  }, [existing, open]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    fd.set("status", status);
    const result = isEdit ? await updateMaterial(existing!.id, fd) : await createMaterial(fd);
    setLoading(false);
    if ("error" in result) { setError(result.error ?? "An error occurred"); return; }
    onClose();
    router.refresh();
  }

  return (
    <>
      {open && <div className="slide-over-backdrop" onClick={() => !loading && onClose()} />}

      <div className={`slide-over-panel${open ? " open" : ""}`} role="dialog" aria-modal="true" aria-label={isEdit ? "Edit material" : "New material"}>
        <div className="slide-over-drag-handle" />

        <div className="slide-over-header">
          <h2 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#F5B61E", letterSpacing: "0.04em", margin: 0 }}>
            {isEdit ? `Edit — ${existing!.code}` : "New Material"}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(240,237,230,0.38)", display: "flex", padding: "0.25rem" }}>
            <X size={18} />
          </button>
        </div>

        <form id="material-slide-form" onSubmit={handleSubmit} noValidate style={{ display: "contents" }}>
          <div className="slide-over-body">
            {error && <div className="form-error" style={{ marginBottom: "1rem" }}>{error}</div>}

            <p className="form-section-label">IDENTITY</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem", marginBottom: "1.25rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div className="form-field">
                  <label className="form-label">CODE *</label>
                  <input name="code" type="text" className="form-input" defaultValue={existing?.code} required placeholder="ART-250" />
                </div>
                <div className="form-field">
                  <label className="form-label">GSM * <span style={{ color: "rgba(240,237,230,0.22)", fontSize: "0.56rem" }}>(80–600)</span></label>
                  <input name="gsm" type="number" min="80" max="600" className="form-input" defaultValue={existing?.gsm} required placeholder="250" />
                </div>
              </div>
              <div className="form-field">
                <label className="form-label">NAME *</label>
                <input name="name" type="text" className="form-input" defaultValue={existing?.name} required placeholder="Art Board 250 GSM" />
              </div>
            </div>

            <p className="form-section-label">DIMENSIONS</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1.25rem" }}>
              <UnitInput labelPrefix="LENGTH" nameCm="sheetLengthCm" nameIn="sheetLengthIn"
                defaultValueCm={existing?.sheetLengthCm} defaultValueIn={existing?.sheetLengthIn} required />
              <UnitInput labelPrefix="WIDTH" nameCm="sheetWidthCm" nameIn="sheetWidthIn"
                defaultValueCm={existing?.sheetWidthCm} defaultValueIn={existing?.sheetWidthIn} required />
            </div>

            <p className="form-section-label">PRICING</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1.25rem" }}>
              <div className="form-field">
                <label className="form-label">BUY PRICE / SHEET *</label>
                <div className="price-input-wrapper">
                  <span className="price-prefix">Rs.</span>
                  <input name="costPerSheet" type="number" step="0.01" min="0" className="form-input" defaultValue={existing?.costPerSheet} required placeholder="0.00" />
                </div>
              </div>
              <div className="form-field">
                <label className="form-label">UNIT PRICE / SHEET *</label>
                <div className="price-input-wrapper">
                  <span className="price-prefix">Rs.</span>
                  <input name="unitPrice" type="number" step="0.01" min="0" className="form-input" defaultValue={existing?.unitPrice} required placeholder="0.00" />
                </div>
              </div>
            </div>

            <p className="form-section-label">STOCK</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1.25rem" }}>
              <div className="form-field">
                <label className="form-label">MIN STOCK</label>
                <input name="minStockLevel" type="number" step="1" min="0" className="form-input" defaultValue={existing?.minStockLevel ?? 0} />
              </div>
              <div className="form-field">
                <label className="form-label">CURRENT STOCK</label>
                <input name="currentStockLevel" type="number" step="1" min="0" className="form-input" defaultValue={existing?.currentStockLevel ?? 0} />
              </div>
            </div>

            <p className="form-section-label">STATUS</p>
            <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap" }}>
              {STATUS_OPTIONS.map((s) => (
                <button key={s} type="button" className={`status-chip-btn${status === s ? ` active-${s}` : ""}`} onClick={() => setStatus(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="slide-over-footer">
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "0.7rem 1.25rem", background: "none",
                border: "1px solid rgba(245,182,30,0.18)", borderRadius: "0.5rem",
                color: "rgba(240,237,230,0.42)", fontSize: "0.7rem",
                letterSpacing: "0.08em", cursor: "pointer",
                fontFamily: "var(--font-jakarta, 'Plus Jakarta Sans', sans-serif)",
              }}
            >
              CANCEL
            </button>
            <button type="submit" form="material-slide-form" className="submit-btn" disabled={loading} style={{ flex: 1 }}>
              {loading ? "SAVING…" : isEdit ? "SAVE CHANGES" : "SAVE MATERIAL"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
