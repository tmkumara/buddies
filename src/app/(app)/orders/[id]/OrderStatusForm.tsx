"use client";

import { useState, FormEvent } from "react";
import { updateOrderStatus } from "@/actions/orders";
import { getAllowedTransitions, STATUS_LABELS, type OrderStatusKey } from "@/lib/utils/status-transitions";

interface Props {
  orderId: number;
  currentStatus: OrderStatusKey;
}

export default function OrderStatusForm({ orderId, currentStatus }: Props) {
  const allowed = getAllowedTransitions(currentStatus);
  const [newStatus, setNewStatus] = useState(allowed[0] ?? "");
  const [note, setNote]           = useState("");
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [success, setSuccess]     = useState("");

  if (allowed.length === 0) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!newStatus) return;
    setLoading(true); setError(""); setSuccess("");
    const result = await updateOrderStatus(orderId, newStatus, note);
    if (result.error) { setError(result.error); setLoading(false); }
    else { setSuccess(`Status updated to ${STATUS_LABELS[newStatus as OrderStatusKey]}`); setNote(""); setLoading(false); }
  }

  const input: React.CSSProperties = {
    width: "100%", background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(245,182,30,0.14)", borderRadius: "0.5rem",
    padding: "0.6rem 0.9rem", color: "#F0EDE6", fontSize: "0.82rem", outline: "none",
  };

  return (
    <form onSubmit={handleSubmit}>
      <h3 style={{ fontSize: "0.75rem", letterSpacing: "0.1em", color: "rgba(240,237,230,0.4)", marginBottom: "0.9rem" }}>
        UPDATE STATUS
      </h3>
      {error   && <div className="form-error" style={{ marginBottom: "0.75rem" }}>{error}</div>}
      {success && <div style={{ marginBottom: "0.75rem", padding: "0.6rem 0.9rem", background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: "0.5rem", fontSize: "0.78rem", color: "#4ADE80" }}>{success}</div>}

      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: "140px" }}>
          <label style={{ fontSize: "0.62rem", letterSpacing: "0.08em", color: "rgba(240,237,230,0.3)", display: "block", marginBottom: "0.4rem" }}>
            NEW STATUS
          </label>
          <select value={newStatus} onChange={(e) => setNewStatus(e.target.value as OrderStatusKey)} style={input}>
            {allowed.map((s) => (
              <option key={s} value={s} style={{ background: "#0d0d0d" }}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>
        <div style={{ flex: 2, minWidth: "180px" }}>
          <label style={{ fontSize: "0.62rem", letterSpacing: "0.08em", color: "rgba(240,237,230,0.3)", display: "block", marginBottom: "0.4rem" }}>
            NOTE (optional)
          </label>
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason for status change…" style={input} />
        </div>
        <div style={{ display: "flex", alignItems: "flex-end" }}>
          <button type="submit" className="submit-btn" disabled={loading} style={{ whiteSpace: "nowrap" }}>
            {loading ? "UPDATING…" : "UPDATE STATUS"}
          </button>
        </div>
      </div>
    </form>
  );
}
