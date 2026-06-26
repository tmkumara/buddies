"use client";

import React from "react";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImageOff } from "lucide-react";
import { createDesignType, updateDesignType } from "@/actions/design-types";

export interface DesignTypeData {
  id: number;
  code: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  active: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  existing?: DesignTypeData;
  designTypes?: DesignTypeData[];
}

export default function DesignTypeSlideOver({ open, onClose, existing }: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [active, setActive] = useState(true);
  const [imageUrl, setImageUrl] = useState("");
  const [imageVisible, setImageVisible] = useState(false);

  useEffect(() => {
    if (!open) return;
    setActive(existing?.active ?? true);
    setImageUrl(existing?.imageUrl ?? "");
    setImageVisible(false);
    setError("");
  }, [open, existing?.id]);

  // Show image preview when URL changes
  useEffect(() => {
    setImageVisible(!!imageUrl);
  }, [imageUrl]);

  function handleBackdrop(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("active", active ? "true" : "false");
    startTransition(async () => {
      const result = existing
        ? await updateDesignType(existing.id, formData)
        : await createDesignType(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        onClose();
        router.refresh();
      }
    });
  }

  if (!open) return null;

  const isEdit = !!existing;

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 50,
        background: "rgba(0,0,0,0.6)", backdropFilter: "blur(2px)",
        display: "flex", alignItems: "flex-end", justifyContent: "flex-end",
      }}
      onClick={handleBackdrop}
    >
      {/* Panel */}
      <div
        style={{
          background: "var(--surface, #111)",
          width: "clamp(320px, 440px, 100vw)",
          height: "100dvh",
          display: "flex", flexDirection: "column",
          boxShadow: "-4px 0 32px rgba(0,0,0,0.6)",
          borderLeft: "1px solid rgba(245,182,30,0.15)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", gap: "0.75rem",
          padding: "1rem 1.25rem",
          borderBottom: "1px solid rgba(245,182,30,0.1)",
          flexShrink: 0,
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "none", border: "none", color: "var(--text-muted, #888)",
              fontSize: "1.25rem", cursor: "pointer", lineHeight: 1, padding: "0.25rem",
            }}
            aria-label="Close"
          >
            ✕
          </button>
          <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 600, color: "var(--text, #F0EDE6)" }}>
            {isEdit ? `Edit — ${existing.code} ${existing.name}` : "New Design Type"}
          </h2>
        </div>

        {/* Content */}
        <form ref={formRef} onSubmit={handleSubmit} style={{ display: "contents" }}>
          <div style={{ flex: 1, overflowY: "auto", padding: "1.25rem" }}>
            {error && (
              <div style={{
                background: "rgba(248,113,113,0.12)", border: "1px solid rgba(248,113,113,0.3)",
                borderRadius: "6px", padding: "0.75rem 1rem", marginBottom: "1rem",
                color: "#F87171", fontSize: "0.85rem",
              }}>
                {error}
              </div>
            )}

            {/* IDENTITY */}
            <div style={{ marginBottom: "1.5rem" }}>
              <div style={{ fontSize: "0.65rem", letterSpacing: "0.1em", color: "var(--gold, #F5B61E)", fontWeight: 700, marginBottom: "0.75rem" }}>
                IDENTITY
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "0.75rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.7rem", color: "var(--text-muted, #888)", marginBottom: "0.25rem", letterSpacing: "0.05em" }}>
                    CODE *
                  </label>
                  <input
                    name="code"
                    defaultValue={existing?.code ?? ""}
                    required
                    onChange={(e) => { e.target.value = e.target.value.toUpperCase(); }}
                    style={{
                      width: "100%", background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(245,182,30,0.2)", borderRadius: "6px",
                      padding: "0.5rem 0.75rem", color: "var(--text, #F0EDE6)",
                      fontSize: "0.85rem", boxSizing: "border-box",
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.7rem", color: "var(--text-muted, #888)", marginBottom: "0.25rem", letterSpacing: "0.05em" }}>
                    NAME *
                  </label>
                  <input
                    name="name"
                    defaultValue={existing?.name ?? ""}
                    required
                    style={{
                      width: "100%", background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(245,182,30,0.2)", borderRadius: "6px",
                      padding: "0.5rem 0.75rem", color: "var(--text, #F0EDE6)",
                      fontSize: "0.85rem", boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>
            </div>

            {/* DESCRIPTION */}
            <div style={{ marginBottom: "1.5rem" }}>
              <div style={{ fontSize: "0.65rem", letterSpacing: "0.1em", color: "var(--gold, #F5B61E)", fontWeight: 700, marginBottom: "0.75rem" }}>
                DESCRIPTION
              </div>
              <textarea
                name="description"
                defaultValue={existing?.description ?? ""}
                rows={3}
                placeholder="Optional description…"
                style={{
                  width: "100%", background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(245,182,30,0.2)", borderRadius: "6px",
                  padding: "0.5rem 0.75rem", color: "var(--text, #F0EDE6)",
                  fontSize: "0.85rem", resize: "vertical", boxSizing: "border-box",
                  fontFamily: "inherit",
                }}
              />
            </div>

            {/* IMAGE */}
            <div style={{ marginBottom: "1.5rem" }}>
              <div style={{ fontSize: "0.65rem", letterSpacing: "0.1em", color: "var(--gold, #F5B61E)", fontWeight: 700, marginBottom: "0.75rem" }}>
                IMAGE
              </div>
              <input
                name="imageUrl"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://… (optional)"
                style={{
                  width: "100%", background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(245,182,30,0.2)", borderRadius: "6px",
                  padding: "0.5rem 0.75rem", color: "var(--text, #F0EDE6)",
                  fontSize: "0.85rem", boxSizing: "border-box",
                }}
              />
              {imageVisible && (
                <div style={{ marginTop: "0.75rem", borderRadius: "8px", overflow: "hidden", maxHeight: "120px" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUrl}
                    alt="Preview"
                    onError={() => setImageVisible(false)}
                    style={{ width: "100%", height: "120px", objectFit: "cover", display: "block" }}
                  />
                </div>
              )}
            </div>

            {/* STATUS */}
            <div style={{ marginBottom: "1.5rem" }}>
              <div style={{ fontSize: "0.65rem", letterSpacing: "0.1em", color: "var(--gold, #F5B61E)", fontWeight: 700, marginBottom: "0.75rem" }}>
                STATUS
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  type="button"
                  className={`status-chip-btn${active ? " active-ACTIVE" : ""}`}
                  onClick={() => setActive(true)}
                >
                  ✓ ACTIVE
                </button>
                <button
                  type="button"
                  className={`status-chip-btn${!active ? " active-INACTIVE" : ""}`}
                  onClick={() => setActive(false)}
                >
                  INACTIVE
                </button>
              </div>
              <input type="hidden" name="active" value={active ? "true" : "false"} />
            </div>
          </div>

          {/* Footer */}
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "1rem 1.25rem",
            borderTop: "1px solid rgba(245,182,30,0.1)",
            flexShrink: 0,
          }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "none", border: "1px solid rgba(245,182,30,0.2)",
                borderRadius: "6px", padding: "0.5rem 1rem",
                color: "var(--text-muted, #888)", cursor: "pointer", fontSize: "0.85rem",
              }}
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={isPending}
              style={{
                background: "var(--gold, #F5B61E)", border: "none",
                borderRadius: "6px", padding: "0.5rem 1.5rem",
                color: "#000", fontWeight: 700, cursor: isPending ? "not-allowed" : "pointer",
                fontSize: "0.85rem", opacity: isPending ? 0.7 : 1,
                display: "flex", alignItems: "center", gap: "0.5rem",
              }}
            >
              {isPending && (
                <span style={{
                  width: "14px", height: "14px", border: "2px solid rgba(0,0,0,0.3)",
                  borderTopColor: "#000", borderRadius: "50%",
                  animation: "spin 0.6s linear infinite", display: "inline-block",
                }} />
              )}
              SAVE TYPE
            </button>
          </div>
        </form>

        {/* Mobile: bottom sheet responsive override handled via CSS */}
        <style>{`
          @media (max-width: 767px) {
            /* The panel div is positioned at flex-end; on mobile make it full-width bottom sheet */
          }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    </div>
  );
}
