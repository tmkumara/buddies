"use client";

import { useState, useRef, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createOrder } from "@/actions/orders";
import OrderItemsEditor, { type BoxDesignOption, type OrderItem } from "@/components/orders/OrderItemsEditor";

interface Customer { id: number; name: string; phone: string; }

interface Props {
  customers: Customer[];
  boxDesigns: BoxDesignOption[];
}

const today = new Date().toISOString().split("T")[0];
const defaultDelivery = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];

export default function NewOrderForm({ customers, boxDesigns }: Props) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [discountPercent, setDiscountPercent] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);

  const totalAmount    = items.reduce((s, i) => s + i.lineTotal, 0);
  const discountAmount = Math.round(totalAmount * (discountPercent / 100) * 100) / 100;
  const netAmount      = Math.round((totalAmount - discountAmount) * 100) / 100;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (items.length === 0) { setError("Add at least one order item."); return; }
    const invalid = items.some((i) => !i.boxDesignId || i.quantity < 1);
    if (invalid) { setError("All items must have a box design and quantity ≥ 1."); return; }

    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    fd.set("itemsJson", JSON.stringify(items.map(({ key: _k, ...rest }) => rest)));

    const result = await createOrder(fd);
    if (result?.error) { setError(result.error); setLoading(false); }
    // on success, server action redirects — no further action needed
  }

  const label: React.CSSProperties = {
    fontSize: "0.62rem", letterSpacing: "0.1em", color: "rgba(240,237,230,0.35)", fontWeight: 600,
    display: "block", marginBottom: "0.4rem",
  };
  const input: React.CSSProperties = {
    width: "100%", background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(245,182,30,0.14)", borderRadius: "0.5rem",
    padding: "0.7rem 1rem", color: "#F0EDE6", fontSize: "0.875rem", outline: "none",
  };

  return (
    <>
      <Link href="/orders" className="nav-link" style={{ fontSize: "0.68rem", display: "inline-block", marginBottom: "1.25rem" }}>
        ← Back to Orders
      </Link>

      <div className="content-card">
        <h2 style={{ fontSize: "1rem", fontWeight: 600, color: "#F5B61E", letterSpacing: "0.04em", marginBottom: "1.5rem" }}>
          New Order
        </h2>

        {error && <div className="form-error" style={{ marginBottom: "1rem" }}>{error}</div>}

        <form ref={formRef} onSubmit={handleSubmit} noValidate>
          {/* ── Header Fields ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
            <div>
              <label style={label}>CUSTOMER *</label>
              <select name="customerId" required style={{ ...input, background: "rgba(255,255,255,0.04)" }}>
                <option value="" style={{ background: "#0d0d0d" }}>— Select Customer —</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id} style={{ background: "#0d0d0d" }}>
                    {c.name} ({c.phone})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={label}>ORDER DATE *</label>
              <input name="orderDate" type="date" defaultValue={today} required style={input} />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
            <div>
              <label style={label}>DELIVERY DATE</label>
              <input name="deliveryDate" type="date" defaultValue={defaultDelivery} style={input} />
            </div>
            <div>
              <label style={label}>DISCOUNT %</label>
              <input
                name="discountPercent" type="number" min="0" max="100" step="0.01"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
                style={input}
              />
            </div>
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <label style={label}>REMARKS</label>
            <textarea name="remarks" rows={2} style={{ ...input, resize: "vertical" }} />
          </div>

          {/* ── Items Editor ── */}
          <div style={{ borderTop: "1px solid rgba(245,182,30,0.08)", paddingTop: "1.25rem", marginBottom: "1.25rem" }}>
            <OrderItemsEditor boxDesigns={boxDesigns} onChange={setItems} />
          </div>

          {/* ── Totals ── */}
          {items.length > 0 && (
            <div style={{
              background: "rgba(245,182,30,0.04)", border: "1px solid rgba(245,182,30,0.1)",
              borderRadius: "0.5rem", padding: "1rem 1.25rem", marginBottom: "1.5rem",
            }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem", alignItems: "flex-end" }}>
                <div style={{ display: "flex", justifyContent: "space-between", width: "220px", fontSize: "0.82rem", color: "rgba(240,237,230,0.55)" }}>
                  <span>Total</span>
                  <span>Rs. {totalAmount.toFixed(2)}</span>
                </div>
                {discountAmount > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", width: "220px", fontSize: "0.82rem", color: "#F87171" }}>
                    <span>Discount ({discountPercent}%)</span>
                    <span>− Rs. {discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div style={{
                  display: "flex", justifyContent: "space-between", width: "220px",
                  fontSize: "1rem", fontWeight: 700, color: "#F5B61E",
                  borderTop: "1px solid rgba(245,182,30,0.15)", paddingTop: "0.45rem", marginTop: "0.2rem",
                }}>
                  <span>Net Amount</span>
                  <span>Rs. {netAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button type="submit" className="submit-btn" disabled={loading} style={{ flex: 1 }}>
              {loading ? "CREATING ORDER…" : "CREATE ORDER"}
            </button>
            <Link href="/orders">
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
