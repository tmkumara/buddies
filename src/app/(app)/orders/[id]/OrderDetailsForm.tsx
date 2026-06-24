"use client";

import { useState, FormEvent } from "react";
import { updateOrderDetails } from "@/actions/orders";

interface Props {
  orderId: number;
  deliveryDate: string | null;
  remarks: string | null;
}

export default function OrderDetailsForm({ orderId, deliveryDate, remarks }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true); setError(""); setSuccess("");
    const result = await updateOrderDetails(orderId, new FormData(e.currentTarget));
    if (result.error) { setError(result.error); }
    else { setSuccess("Details updated."); }
    setLoading(false);
  }

  const input: React.CSSProperties = {
    width: "100%", background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(245,182,30,0.14)", borderRadius: "0.5rem",
    padding: "0.6rem 0.9rem", color: "#F0EDE6", fontSize: "0.82rem", outline: "none",
  };

  return (
    <form onSubmit={handleSubmit}>
      <h3 style={{ fontSize: "0.75rem", letterSpacing: "0.1em", color: "rgba(240,237,230,0.4)", marginBottom: "0.9rem" }}>
        EDIT DETAILS
      </h3>
      {error   && <div className="form-error" style={{ marginBottom: "0.75rem" }}>{error}</div>}
      {success && <div style={{ marginBottom: "0.75rem", padding: "0.6rem 0.9rem", background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: "0.5rem", fontSize: "0.78rem", color: "#4ADE80" }}>{success}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
        <div>
          <label style={{ fontSize: "0.62rem", letterSpacing: "0.08em", color: "rgba(240,237,230,0.3)", display: "block", marginBottom: "0.4rem" }}>
            DELIVERY DATE
          </label>
          <input name="deliveryDate" type="date" defaultValue={deliveryDate ?? ""} style={input} />
        </div>
        <div style={{ display: "flex", alignItems: "flex-end" }}>
          <button type="submit" className="submit-btn" disabled={loading} style={{ width: "100%" }}>
            {loading ? "SAVING…" : "SAVE DETAILS"}
          </button>
        </div>
      </div>
      <div>
        <label style={{ fontSize: "0.62rem", letterSpacing: "0.08em", color: "rgba(240,237,230,0.3)", display: "block", marginBottom: "0.4rem" }}>
          REMARKS
        </label>
        <textarea name="remarks" rows={2} defaultValue={remarks ?? ""} style={{ ...input, resize: "vertical" }} />
      </div>
    </form>
  );
}
