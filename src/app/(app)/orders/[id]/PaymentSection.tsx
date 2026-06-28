"use client";

import { useState, FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import { createPayment, deletePayment } from "@/actions/payments";
import { useToast } from "@/lib/toast-context";

interface PaymentRow {
  id:          number;
  amount:      number;
  paymentDate: string;
  method:      string;
  referenceNo: string | null;
  note:        string | null;
}

interface Props {
  orderId:    number;
  netAmount:  number;
  payments:   PaymentRow[];
  isTerminal: boolean; // DELIVERED or CANCELLED — no edits
}

const METHOD_LABEL: Record<string, string> = {
  CASH: "Cash", BANK_TRANSFER: "Bank Transfer", CHEQUE: "Cheque",
};

export default function PaymentSection({ orderId, netAmount, payments: initPayments, isTerminal }: Props) {
  const [payments, setPayments] = useState<PaymentRow[]>(initPayments);
  const [showForm, setShowForm] = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState("");
  const { showToast } = useToast();

  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const balance   = netAmount - totalPaid;
  const payStatus = totalPaid <= 0 ? "Unpaid" : balance > 0.01 ? "Partially Paid" : "Fully Paid";
  const statusColor = payStatus === "Fully Paid" ? "#4ADE80" : payStatus === "Partially Paid" ? "#FBBF24" : "#F87171";

  async function handleAddPayment(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true); setError("");
    const fd = new FormData(e.currentTarget);
    const result = await createPayment(orderId, fd);
    setSaving(false);
    if ("error" in result) { setError(result.error ?? "Unknown error"); return; }
    if (result.toast) showToast(result.toast);
    window.location.reload();
  }

  async function handleDelete(paymentId: number) {
    if (!confirm("Remove this payment?")) return;
    const result = await deletePayment(paymentId, orderId);
    if ("toast" in result && result.toast) showToast(result.toast);
    window.location.reload();
  }

  const inp: React.CSSProperties = {
    width: "100%", background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(245,182,30,0.14)", borderRadius: "0.45rem",
    padding: "0.55rem 0.75rem", color: "#F0EDE6", fontSize: "0.8rem", outline: "none",
  };
  const lbl: React.CSSProperties = {
    fontSize: "0.58rem", letterSpacing: "0.09em",
    color: "rgba(240,237,230,0.35)", display: "block", marginBottom: "0.25rem", fontWeight: 600,
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
        <h3 style={{ fontSize: "0.75rem", letterSpacing: "0.1em", color: "rgba(240,237,230,0.4)" }}>PAYMENTS</h3>
        {!isTerminal && (
          <button
            type="button" onClick={() => setShowForm((v) => !v)}
            style={{ display: "flex", alignItems: "center", gap: "0.3rem", background: "rgba(245,182,30,0.08)", border: "1px solid rgba(245,182,30,0.2)", borderRadius: "0.4rem", padding: "0.3rem 0.7rem", color: "#F5B61E", fontSize: "0.65rem", cursor: "pointer" }}
          >
            <Plus size={11} /> Add Payment
          </button>
        )}
      </div>

      {/* Summary */}
      <div style={{ display: "flex", gap: "1.5rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
        {[
          { label: "Total", value: `Rs. ${netAmount.toFixed(2)}`, color: "rgba(240,237,230,0.7)" },
          { label: "Paid",  value: `Rs. ${totalPaid.toFixed(2)}`, color: "#4ADE80" },
          { label: "Balance", value: `Rs. ${Math.max(0, balance).toFixed(2)}`, color: balance > 0.01 ? "#F87171" : "#4ADE80" },
        ].map((s) => (
          <div key={s.label}>
            <p style={{ fontSize: "0.58rem", letterSpacing: "0.08em", color: "rgba(240,237,230,0.3)", marginBottom: "0.15rem" }}>{s.label}</p>
            <p style={{ fontSize: "0.9rem", fontWeight: 700, color: s.color }}>{s.value}</p>
          </div>
        ))}
        <div>
          <p style={{ fontSize: "0.58rem", letterSpacing: "0.08em", color: "rgba(240,237,230,0.3)", marginBottom: "0.15rem" }}>STATUS</p>
          <span style={{ fontSize: "0.65rem", fontWeight: 700, color: statusColor, background: `${statusColor}18`, padding: "0.15rem 0.5rem", borderRadius: "0.3rem", border: `1px solid ${statusColor}40` }}>
            {payStatus.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Add payment form */}
      {showForm && (
        <form onSubmit={handleAddPayment} style={{ background: "rgba(245,182,30,0.03)", border: "1px solid rgba(245,182,30,0.1)", borderRadius: "0.5rem", padding: "0.85rem", marginBottom: "0.75rem" }}>
          {error && <div style={{ fontSize: "0.72rem", color: "#F87171", marginBottom: "0.5rem" }}>{error}</div>}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.6rem", marginBottom: "0.6rem" }}>
            <div><label style={lbl}>AMOUNT *</label><input name="amount" type="number" step="0.01" min="0.01" required style={inp} /></div>
            <div><label style={lbl}>DATE *</label><input name="paymentDate" type="date" defaultValue={new Date().toISOString().split("T")[0]} required style={inp} /></div>
            <div>
              <label style={lbl}>METHOD *</label>
              <select name="method" required style={{ ...inp, background: "rgba(255,255,255,0.04)" }}>
                <option value="CASH">Cash</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="CHEQUE">Cheque</option>
              </select>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem", marginBottom: "0.6rem" }}>
            <div><label style={lbl}>REFERENCE #</label><input name="referenceNo" type="text" placeholder="Cheque / TXN no." style={inp} /></div>
            <div><label style={lbl}>NOTE</label><input name="note" type="text" style={inp} /></div>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button type="submit" disabled={saving} style={{ padding: "0.5rem 1.25rem", background: "rgba(245,182,30,0.15)", border: "1px solid rgba(245,182,30,0.3)", borderRadius: "0.4rem", color: "#F5B61E", fontSize: "0.72rem", cursor: saving ? "not-allowed" : "pointer" }}>
              {saving ? "SAVING…" : "RECORD PAYMENT"}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setError(""); }} style={{ padding: "0.5rem 0.85rem", background: "none", border: "1px solid rgba(245,182,30,0.12)", borderRadius: "0.4rem", color: "rgba(240,237,230,0.4)", fontSize: "0.72rem", cursor: "pointer" }}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Payment list */}
      {payments.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
          {payments.map((p) => (
            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.5rem 0.75rem", background: "rgba(255,255,255,0.02)", borderRadius: "0.4rem", border: "1px solid rgba(245,182,30,0.06)" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#4ADE80" }}>Rs. {p.amount.toFixed(2)}</span>
              <span style={{ fontSize: "0.68rem", color: "rgba(240,237,230,0.45)" }}>{p.paymentDate}</span>
              <span style={{ fontSize: "0.62rem", color: "rgba(240,237,230,0.35)", background: "rgba(255,255,255,0.04)", padding: "0.1rem 0.4rem", borderRadius: "0.25rem" }}>{METHOD_LABEL[p.method] ?? p.method}</span>
              {p.referenceNo && <span style={{ fontSize: "0.65rem", color: "rgba(240,237,230,0.4)" }}>#{p.referenceNo}</span>}
              {p.note && <span style={{ fontSize: "0.65rem", color: "rgba(240,237,230,0.35)", fontStyle: "italic", flex: 1 }}>{p.note}</span>}
              {!isTerminal && (
                <button onClick={() => handleDelete(p.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(248,113,113,0.4)", marginLeft: "auto", padding: "0.1rem" }}>
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {payments.length === 0 && (
        <p style={{ fontSize: "0.72rem", color: "rgba(240,237,230,0.2)" }}>No payments recorded yet.</p>
      )}
    </div>
  );
}
