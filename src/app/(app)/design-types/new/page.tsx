"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createDesignType } from "@/actions/design-types";
import TopBar from "@/components/layout/TopBar";

export default function NewDesignTypePage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const result = await createDesignType(new FormData(e.currentTarget));
    if (result.error) { setError(result.error); setLoading(false); }
    else router.push("/design-types");
  }

  return (
    <>
      <TopBar title="New Design Type" />
      <div style={{ padding: "1.5rem 1.75rem", maxWidth: "520px" }}>
        <Link href="/design-types" className="nav-link" style={{ fontSize: "0.68rem", display: "inline-block", marginBottom: "1.25rem" }}>
          ← Back to Design Types
        </Link>
        <div className="content-card">
          <h2 style={{ fontSize: "1rem", fontWeight: 600, color: "#F5B61E", letterSpacing: "0.04em", marginBottom: "1.5rem" }}>
            New Design Type
          </h2>
          {error && <div className="form-error mb-5">{error}</div>}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            <div className="form-field">
              <label htmlFor="code" className="form-label">CODE * <span style={{ color: "rgba(240,237,230,0.3)", fontSize: "0.6rem" }}>(UPPERCASE, e.g. STD)</span></label>
              <input id="code" name="code" type="text" className="form-input" placeholder="STD" style={{ textTransform: "uppercase" }} required />
            </div>
            <div className="form-field">
              <label htmlFor="name" className="form-label">NAME *</label>
              <input id="name" name="name" type="text" className="form-input" placeholder="Standard Box" required />
            </div>
            <div className="form-field">
              <label htmlFor="description" className="form-label">DESCRIPTION</label>
              <textarea id="description" name="description" className="form-input" rows={2} style={{ resize: "vertical" }} />
            </div>
            <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
              <button type="submit" className="submit-btn" disabled={loading} style={{ flex: 1 }}>
                {loading ? "SAVING…" : "SAVE"}
              </button>
              <Link href="/design-types">
                <button type="button" style={{
                  padding: "0.7rem 1.25rem", background: "none",
                  border: "1px solid rgba(245,182,30,0.18)", borderRadius: "0.5rem",
                  color: "rgba(240,237,230,0.45)", fontSize: "0.72rem", letterSpacing: "0.08em", cursor: "pointer",
                }}>CANCEL</button>
              </Link>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
