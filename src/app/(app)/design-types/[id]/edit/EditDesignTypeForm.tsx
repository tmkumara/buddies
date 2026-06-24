"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { updateDesignType } from "@/actions/design-types";

interface DesignType {
  id: number; code: string; name: string; description: string | null; imageUrl: string | null; active: boolean;
}

export default function EditDesignTypeForm({ designType: dt }: { designType: DesignType }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const result = await updateDesignType(dt.id, new FormData(e.currentTarget));
    if (result.error) { setError(result.error); setLoading(false); }
    else router.push("/design-types");
  }

  return (
    <>
      <Link href="/design-types" className="nav-link" style={{ fontSize: "0.68rem", display: "inline-block", marginBottom: "1.25rem" }}>
        ← Back to Design Types
      </Link>
      <div className="content-card">
        <h2 style={{ fontSize: "1rem", fontWeight: 600, color: "#F5B61E", letterSpacing: "0.04em", marginBottom: "1.5rem" }}>
          Edit Design Type
        </h2>
        {error && <div className="form-error mb-5">{error}</div>}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <div className="form-field">
            <label htmlFor="code" className="form-label">CODE *</label>
            <input id="code" name="code" type="text" className="form-input" defaultValue={dt.code} style={{ textTransform: "uppercase" }} required />
          </div>
          <div className="form-field">
            <label htmlFor="name" className="form-label">NAME *</label>
            <input id="name" name="name" type="text" className="form-input" defaultValue={dt.name} required />
          </div>
          <div className="form-field">
            <label htmlFor="description" className="form-label">DESCRIPTION</label>
            <textarea id="description" name="description" className="form-input" defaultValue={dt.description ?? ""} rows={2} style={{ resize: "vertical" }} />
          </div>
          <div className="form-field">
            <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <input type="checkbox" name="active" value="true" defaultChecked={dt.active} style={{ accentColor: "#F5B61E" }} />
              <span>Active</span>
            </label>
          </div>
          <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
            <button type="submit" className="submit-btn" disabled={loading} style={{ flex: 1 }}>
              {loading ? "SAVING…" : "SAVE CHANGES"}
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
    </>
  );
}
