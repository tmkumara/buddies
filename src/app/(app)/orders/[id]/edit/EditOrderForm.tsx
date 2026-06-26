"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { updateOrderItems } from "@/actions/orders";
import OrderItemsEditor, { type BoxTypeOption, type BoxDesignOption, type OrderItem } from "@/components/orders/OrderItemsEditor";
import { calculateQuantityDiscount } from "@/lib/utils/calculations";
import type { DesignTypeOption, MaterialOption } from "@/components/orders/QuickCreateDesignPanel";
import Combobox from "@/components/ui/Combobox";

interface Props {
  order: {
    id: number; status: string; deliveryDate: string | null;
    remarks: string | null; leadSourceId: number | null;
    discountPercent: number;
    items: OrderItem[];
  };
  boxTypes:    BoxTypeOption[];
  boxDesigns:  BoxDesignOption[];
  designTypes: DesignTypeOption[];
  materials:   MaterialOption[];
  leadSources: { id: number; name: string }[];
  isAdmin:     boolean;
}

export default function EditOrderForm({ order, boxTypes, boxDesigns, designTypes, materials, leadSources, isAdmin }: Props) {
  const router = useRouter();
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);
  const [items,   setItems]   = useState<OrderItem[]>(order.items);
  const [discountOverride, setDiscountOverride] = useState(
    order.discountPercent > 0 ? String(order.discountPercent) : ""
  );

  const canEditDiscount = ["DRAFT", "CONFIRMED", "IN_PRODUCTION"].includes(order.status);

  const totalQty       = items.reduce((s, i) => s + i.quantity, 0);
  const totalAmount    = items.reduce((s, i) => s + i.lineTotal, 0);
  const autoRate       = calculateQuantityDiscount(totalQty);
  const effectiveRate  = discountOverride !== "" && isAdmin ? parseFloat(discountOverride) / 100 : autoRate;
  const discountAmount = Math.round(totalAmount * effectiveRate * 100) / 100;
  const netAmount      = Math.round((totalAmount - discountAmount) * 100) / 100;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (items.length === 0) { setError("At least one item required."); return; }

    setLoading(true); setError("");
    const fd = new FormData(e.currentTarget);
    fd.set("itemsJson", JSON.stringify(items.map(({ key: _k, ...rest }) => rest)));
    if (discountOverride !== "" && isAdmin) fd.set("discountPercent", discountOverride);

    const result = await updateOrderItems(order.id, fd);
    if (result?.error) { setError(result.error); setLoading(false); return; }
    router.push(`/orders/${order.id}`);
  }

  const label: React.CSSProperties = {
    fontSize: "0.62rem", letterSpacing: "0.1em", color: "rgba(240,237,230,0.35)",
    fontWeight: 600, display: "block", marginBottom: "0.4rem",
  };
  const input: React.CSSProperties = {
    width: "100%", background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(245,182,30,0.14)", borderRadius: "0.5rem",
    padding: "0.7rem 1rem", color: "#F0EDE6", fontSize: "0.875rem", outline: "none",
  };

  return (
    <>
      <Link href={`/orders/${order.id}`} className="nav-link" style={{ fontSize: "0.68rem", display: "inline-block", marginBottom: "1.25rem" }}>
        ← Back to Order
      </Link>

      <div className="content-card">
        <h2 style={{ fontSize: "1rem", fontWeight: 600, color: "#F5B61E", marginBottom: "1.5rem" }}>
          Edit Order
        </h2>

        {error && <div className="form-error" style={{ marginBottom: "1rem" }}>{error}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
            <div>
              <label style={label}>DELIVERY DATE</label>
              <input name="deliveryDate" type="date" defaultValue={order.deliveryDate ?? ""} style={input} />
            </div>
            <div>
              <label style={label}>LEAD SOURCE</label>
              <Combobox
                name="leadSourceId"
                placeholder="— None —"
                defaultValue={order.leadSourceId ?? ""}
                options={[
                  { value: "", label: "— None —" },
                  ...leadSources.map((ls) => ({ value: ls.id, label: ls.name })),
                ]}
              />
            </div>
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <label style={label}>REMARKS</label>
            <textarea name="remarks" rows={2} defaultValue={order.remarks ?? ""} style={{ ...input, resize: "vertical" }} />
          </div>

          <div style={{ borderTop: "1px solid rgba(245,182,30,0.08)", paddingTop: "1.25rem", marginBottom: "1.25rem" }}>
            <OrderItemsEditor
              boxTypes={boxTypes}
              boxDesigns={boxDesigns}
              designTypes={designTypes}
              materials={materials}
              isAdmin={isAdmin}
              onChange={setItems}
              initialItems={order.items}
            />
          </div>

          {/* Totals */}
          {items.length > 0 && (
            <div style={{ background: "rgba(245,182,30,0.04)", border: "1px solid rgba(245,182,30,0.1)", borderRadius: "0.5rem", padding: "1rem 1.25rem", marginBottom: "1.5rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem", alignItems: "flex-end" }}>
                <div style={{ display: "flex", justifyContent: "space-between", width: "260px", fontSize: "0.82rem", color: "rgba(240,237,230,0.55)" }}>
                  <span>Subtotal</span><span>Rs. {totalAmount.toFixed(2)}</span>
                </div>
                {isAdmin && canEditDiscount && (
                  <div style={{ display: "flex", justifyContent: "space-between", width: "260px", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ fontSize: "0.72rem", color: "rgba(240,237,230,0.4)" }}>Discount %:</span>
                    <input
                      type="number" min="0" max="100" step="0.01"
                      value={discountOverride}
                      onChange={(e) => setDiscountOverride(e.target.value)}
                      placeholder={String((autoRate * 100).toFixed(0))}
                      style={{ width: "80px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(245,182,30,0.2)", borderRadius: "0.35rem", padding: "0.3rem 0.5rem", color: "#F5B61E", fontSize: "0.78rem", outline: "none" }}
                    />
                  </div>
                )}
                {discountAmount > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", width: "260px", fontSize: "0.82rem", color: "#F87171" }}>
                    <span>Discount ({(effectiveRate * 100).toFixed(1)}%)</span>
                    <span>− Rs. {discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", width: "260px", fontSize: "1rem", fontWeight: 700, color: "#F5B61E", borderTop: "1px solid rgba(245,182,30,0.15)", paddingTop: "0.45rem", marginTop: "0.2rem" }}>
                  <span>Net Amount</span><span>Rs. {netAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button type="submit" className="submit-btn" disabled={loading} style={{ flex: 1 }}>
              {loading ? "SAVING…" : "SAVE CHANGES"}
            </button>
            <Link href={`/orders/${order.id}`}>
              <button type="button" style={{ padding: "0.7rem 1.25rem", background: "none", border: "1px solid rgba(245,182,30,0.18)", borderRadius: "0.5rem", color: "rgba(240,237,230,0.45)", fontSize: "0.72rem", letterSpacing: "0.08em", cursor: "pointer" }}>
                CANCEL
              </button>
            </Link>
          </div>
        </form>
      </div>
    </>
  );
}
