"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { createCustomer, updateCustomer } from "@/actions/customers";

export interface CustomerData {
  id: number;
  name: string;
  phone: string;
  phone2: string | null;
  email: string | null;
  addressLine: string | null;
  notes: string | null;
  active: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  existing?: CustomerData;
}

export default function CustomerSlideOver({ open, onClose, existing }: Props) {
  const router = useRouter();
  const [active, setActive] = useState(existing?.active ?? true);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  // Sync state when slide-over opens for a different customer
  useEffect(() => {
    if (!open) return;
    setActive(existing?.active ?? true);
    setError("");
  }, [open, existing?.id]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = existing
        ? await updateCustomer(existing.id, fd)
        : await createCustomer(fd);
      if (result?.error) {
        setError(result.error);
      } else {
        onClose();
        router.refresh();
      }
    });
  }

  if (!open) return null;

  return (
    <>
      <div className="slide-over-backdrop" onClick={onClose} />
      <div className="slide-over-panel open">
        <div className="slide-over-header">
          <button
            type="button"
            onClick={onClose}
            style={{ background: "none", border: "none", color: "rgba(240,237,230,0.45)", cursor: "pointer", padding: "0.25rem" }}
          >
            <X size={16} />
          </button>
          <span style={{ fontWeight: 600, fontSize: "0.85rem", color: "#F0EDE6" }}>
            {existing ? `Edit — ${existing.name}` : "New Customer"}
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

            <input type="hidden" name="active" value={active ? "true" : "false"} />

            {/* IDENTITY */}
            <p className="form-section-label" style={{ marginBottom: "0.75rem" }}>IDENTITY</p>
            <div className="form-field" style={{ marginBottom: "0.75rem" }}>
              <label className="form-label">NAME *</label>
              <input name="name" type="text" className="form-input" defaultValue={existing?.name ?? ""} required />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
              <div className="form-field">
                <label className="form-label">PRIMARY PHONE *</label>
                <input name="phone" type="text" className="form-input" defaultValue={existing?.phone ?? ""} required />
              </div>
              <div className="form-field">
                <label className="form-label">SECONDARY PHONE</label>
                <input name="phone2" type="text" className="form-input" defaultValue={existing?.phone2 ?? ""} />
              </div>
            </div>

            {/* CONTACT */}
            <p className="form-section-label" style={{ marginTop: "0.5rem", marginBottom: "0.75rem" }}>CONTACT</p>
            <div className="form-field" style={{ marginBottom: "0.75rem" }}>
              <label className="form-label">EMAIL</label>
              <input name="email" type="email" className="form-input" defaultValue={existing?.email ?? ""} />
            </div>
            <div className="form-field" style={{ marginBottom: "0.75rem" }}>
              <label className="form-label">ADDRESS LINE</label>
              <input name="addressLine" type="text" className="form-input" defaultValue={existing?.addressLine ?? ""} />
            </div>
            <div className="form-field" style={{ marginBottom: "1rem" }}>
              <label className="form-label">NOTES</label>
              <textarea
                name="notes"
                className="form-input"
                rows={3}
                defaultValue={existing?.notes ?? ""}
                style={{ resize: "vertical", minHeight: "80px" }}
              />
            </div>

            {/* STATUS */}
            <p className="form-section-label" style={{ marginBottom: "0.6rem" }}>STATUS</p>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                type="button"
                className={`status-chip-btn${active ? " active-ACTIVE" : ""}`}
                onClick={() => setActive(true)}
              >
                ACTIVE
              </button>
              <button
                type="button"
                className={`status-chip-btn${!active ? " active-INACTIVE" : ""}`}
                onClick={() => setActive(false)}
              >
                INACTIVE
              </button>
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
              {pending ? "SAVING…" : "SAVE CUSTOMER"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
