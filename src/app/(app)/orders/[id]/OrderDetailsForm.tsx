"use client";

import { useState, FormEvent } from "react";
import { updateOrderDetails } from "@/actions/orders";
import { useToast } from "@/lib/toast-context";
import Combobox from "@/components/ui/Combobox";

interface DeliveryMethod { id: number; name: string; }

interface Props {
  orderId:          number;
  deliveryDate:     string | null;
  remarks:          string | null;
  deliveryMethodId: number | null;
  deliveryCharge:   number;
  deliveryMethods:  DeliveryMethod[];
}

export default function OrderDetailsForm({
  orderId, deliveryDate, remarks, deliveryMethodId: initMethodId, deliveryCharge: initCharge, deliveryMethods,
}: Props) {
  const [loading,           setLoading]           = useState(false);
  const [error,             setError]             = useState("");
  const { showToast }                             = useToast();
  const [deliveryMethodId,  setDeliveryMethodId]  = useState<number | null>(initMethodId);
  const [deliveryChargeStr, setDeliveryChargeStr] = useState<string>(
    initCharge > 0 ? String(initCharge) : ""
  );

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true); setError("");
    const fd = new FormData(e.currentTarget);
    if (deliveryMethodId) fd.set("deliveryMethodId", String(deliveryMethodId));
    else fd.delete("deliveryMethodId");
    fd.set("deliveryCharge", String(parseFloat(deliveryChargeStr || "0") || 0));
    const result = await updateOrderDetails(orderId, fd);
    if (result.error) { setError(result.error); }
    else if (result.toast) { showToast(result.toast); }
    setLoading(false);
  }

  const lbl: React.CSSProperties = {
    fontSize: "0.62rem", letterSpacing: "0.08em", color: "rgba(240,237,230,0.3)", display: "block", marginBottom: "0.4rem",
  };
  const inp: React.CSSProperties = {
    width: "100%", background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(245,182,30,0.14)", borderRadius: "0.5rem",
    padding: "0.6rem 0.9rem", color: "#F0EDE6", fontSize: "0.82rem", outline: "none",
  };

  return (
    <form onSubmit={handleSubmit}>
      <h3 style={{ fontSize: "0.75rem", letterSpacing: "0.1em", color: "rgba(240,237,230,0.4)", marginBottom: "0.9rem" }}>
        EDIT DETAILS
      </h3>
      {error && <div className="form-error" style={{ marginBottom: "0.75rem" }}>{error}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
        <div>
          <label style={lbl}>DELIVERY DATE</label>
          <input name="deliveryDate" type="date" defaultValue={deliveryDate ?? ""} style={inp} />
        </div>
        <div>
          <label style={lbl}>REMARKS</label>
          <textarea name="remarks" rows={1} defaultValue={remarks ?? ""} style={{ ...inp, resize: "vertical" }} />
        </div>
      </div>

      {/* Delivery method + charge */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1rem" }}>
        <div>
          <label style={lbl}>DELIVERY METHOD</label>
          <Combobox
            name="__deliveryMethod"
            placeholder="— None —"
            value={deliveryMethodId ?? ""}
            options={[
              { value: "", label: "— None —" },
              ...deliveryMethods.map((m) => ({ value: m.id, label: m.name })),
            ]}
            onChange={(v) => setDeliveryMethodId(v === "" ? null : Number(v))}
          />
        </div>
        <div>
          <label style={lbl}>DELIVERY CHARGE (Rs.)</label>
          <input
            type="number" min="0" step="0.01"
            value={deliveryChargeStr}
            onChange={(e) => setDeliveryChargeStr(e.target.value)}
            placeholder="0.00"
            style={inp}
          />
        </div>
      </div>

      <button type="submit" className="submit-btn" disabled={loading} style={{ minWidth: "140px" }}>
        {loading ? "SAVING…" : "SAVE DETAILS"}
      </button>
    </form>
  );
}
