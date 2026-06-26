"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { createBoxDesign, updateBoxDesign } from "@/actions/box-designs";
import UnitInput from "@/components/ui/UnitInput";
import Combobox from "@/components/ui/Combobox";

export interface BoxDesignData {
  id: number;
  code: string;
  name: string;
  designTypeId: number;
  materialId: number;
  custom: boolean;
  active: boolean;
  unitPrice: number;
  lengthCm: number | null; widthCm: number | null; heightCm: number | null;
  lengthIn: number | null; widthIn: number | null; heightIn: number | null;
  cutLengthCm: number | null; cutWidthCm: number | null;
  cutLengthIn: number | null; cutWidthIn: number | null;
}

interface SelectOption { id: number; code: string; name: string; }

interface Props {
  open: boolean;
  onClose: () => void;
  existing?: BoxDesignData;
  designTypes: SelectOption[];
  materials: SelectOption[];
}

export default function BoxDesignSlideOver({ open, onClose, existing, designTypes, materials }: Props) {
  const router = useRouter();
  const [active, setActive] = useState(existing?.active ?? true);
  const [custom, setCustom] = useState(existing?.custom ?? false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setActive(existing?.active ?? true);
    setCustom(existing?.custom ?? false);
    setError("");
  }, [open, existing?.id]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = existing
        ? await updateBoxDesign(existing.id, fd)
        : await createBoxDesign(fd);
      if (result?.error) {
        setError(result.error);
      } else {
        onClose();
        router.refresh();
      }
    });
  }

  if (!open) return null;

  const designTypeOptions = designTypes.map((dt) => ({
    value: dt.id,
    label: `${dt.code} — ${dt.name}`,
  }));

  const materialOptions = materials.map((m) => ({
    value: m.id,
    label: m.name,
    meta: m.code,
  }));

  return (
    <>
      <div className="slide-over-backdrop" onClick={onClose} />
      <div className="slide-over-panel open" style={{ width: "min(520px, 100vw)" }}>
        <div className="slide-over-header">
          <button
            type="button"
            onClick={onClose}
            style={{ background: "none", border: "none", color: "rgba(240,237,230,0.45)", cursor: "pointer", padding: "0.25rem" }}
          >
            <X size={16} />
          </button>
          <span style={{ fontWeight: 600, fontSize: "0.85rem", color: "#F0EDE6" }}>
            {existing ? `Edit — ${existing.code} ${existing.name}` : "New Box Design"}
          </span>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
          <div className="slide-over-body">
            {error && (
              <div style={{
                background: "rgba(248,113,113,0.08)",
                border: "1px solid rgba(248,113,113,0.25)",
                borderRadius: "0.4rem",
                padding: "0.6rem 0.9rem",
                fontSize: "0.72rem",
                color: "#F87171",
                marginBottom: "1rem",
              }}>
                {error}
              </div>
            )}

            {/* Hidden fields for boolean state */}
            <input type="hidden" name="active" value={active ? "true" : "false"} />
            <input type="hidden" name="custom" value={custom ? "true" : "false"} />

            {/* IDENTITY */}
            <p className="form-section-label" style={{ marginBottom: "0.75rem" }}>IDENTITY</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
              <div className="form-field">
                <label className="form-label">CODE *</label>
                <input name="code" type="text" className="form-input" defaultValue={existing?.code ?? ""} required />
              </div>
              <div className="form-field">
                <label className="form-label">NAME *</label>
                <input name="name" type="text" className="form-input" defaultValue={existing?.name ?? ""} required />
              </div>
            </div>
            <div style={{ marginBottom: "0.75rem" }}>
              <button
                type="button"
                className={`status-chip-btn${custom ? " active-ACTIVE" : ""}`}
                onClick={() => setCustom((v) => !v)}
                style={{ fontSize: "0.65rem" }}
              >
                {custom ? "✓ CUSTOM" : "STANDARD"}
              </button>
              <span style={{ fontSize: "0.65rem", color: "rgba(240,237,230,0.3)", marginLeft: "0.6rem" }}>
                {custom ? "Marked as custom design" : "Mark as custom design"}
              </span>
            </div>

            {/* LINKED */}
            <p className="form-section-label" style={{ marginBottom: "0.75rem" }}>LINKED</p>
            <div style={{ marginBottom: "0.75rem" }}>
              <label className="form-label">DESIGN TYPE *</label>
              <Combobox
                name="designTypeId"
                placeholder="— Select Design Type —"
                defaultValue={existing?.designTypeId}
                required
                options={designTypeOptions}
              />
            </div>
            <div style={{ marginBottom: "0.75rem" }}>
              <label className="form-label">MATERIAL *</label>
              <Combobox
                name="materialId"
                placeholder="— Select Material —"
                defaultValue={existing?.materialId}
                required
                options={materialOptions}
              />
            </div>

            {/* BOX DIMENSIONS */}
            <p className="form-section-label" style={{ marginBottom: "0.75rem" }}>BOX DIMENSIONS</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
              <UnitInput labelPrefix="LENGTH" nameCm="lengthCm" nameIn="lengthIn"
                defaultValueCm={existing?.lengthCm} defaultValueIn={existing?.lengthIn} required />
              <UnitInput labelPrefix="WIDTH"  nameCm="widthCm"  nameIn="widthIn"
                defaultValueCm={existing?.widthCm}  defaultValueIn={existing?.widthIn}  required />
              <UnitInput labelPrefix="HEIGHT" nameCm="heightCm" nameIn="heightIn"
                defaultValueCm={existing?.heightCm} defaultValueIn={existing?.heightIn} required />
            </div>

            {/* CUT SHEET */}
            <p className="form-section-label" style={{ marginBottom: "0.75rem" }}>CUT SHEET</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
              <UnitInput labelPrefix="CUT LENGTH" nameCm="cutLengthCm" nameIn="cutLengthIn"
                defaultValueCm={existing?.cutLengthCm} defaultValueIn={existing?.cutLengthIn} required />
              <UnitInput labelPrefix="CUT WIDTH"  nameCm="cutWidthCm"  nameIn="cutWidthIn"
                defaultValueCm={existing?.cutWidthCm}  defaultValueIn={existing?.cutWidthIn}  required />
            </div>

            {/* PRICING */}
            <p className="form-section-label" style={{ marginBottom: "0.75rem" }}>PRICING</p>
            <div className="form-field" style={{ marginBottom: "0.75rem" }}>
              <label className="form-label">UNIT PRICE *</label>
              <div className="price-input-wrapper">
                <span className="price-prefix">Rs.</span>
                <input
                  name="unitPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  className="form-input"
                  defaultValue={existing?.unitPrice ?? ""}
                  required
                  style={{ paddingLeft: "2.8rem" }}
                />
              </div>
            </div>

            {/* STATUS */}
            <p className="form-section-label" style={{ marginBottom: "0.6rem" }}>STATUS</p>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button type="button" className={`status-chip-btn${active ? " active-ACTIVE" : ""}`} onClick={() => setActive(true)}>ACTIVE</button>
              <button type="button" className={`status-chip-btn${!active ? " active-INACTIVE" : ""}`} onClick={() => setActive(false)}>INACTIVE</button>
            </div>
          </div>

          <div className="slide-over-footer">
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "0.6rem 1.25rem",
                background: "none",
                border: "1px solid rgba(245,182,30,0.18)",
                borderRadius: "0.5rem",
                color: "rgba(240,237,230,0.45)",
                fontSize: "0.72rem",
                letterSpacing: "0.08em",
                cursor: "pointer",
                fontFamily: "var(--font-jakarta, 'Plus Jakarta Sans', sans-serif)",
              }}
            >
              CANCEL
            </button>
            <button type="submit" className="submit-btn" disabled={pending} style={{ flex: 1 }}>
              {pending ? "SAVING…" : "SAVE DESIGN"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
