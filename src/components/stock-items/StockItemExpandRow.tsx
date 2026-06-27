"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { recordPurchase } from "@/actions/stock-items";
import type { StockItemRow } from "./StockItemsClient";

interface Props { item: StockItemRow; }

const TYPE_LABEL: Record<string, string> = {
  PURCHASE: "PURCHASE", SOLD: "SOLD", ADJUSTMENT: "ADJUSTMENT",
};
const TYPE_COLOR: Record<string, string> = {
  PURCHASE: "#4ADE80", SOLD: "#F87171", ADJUSTMENT: "#FBBF24",
};

export default function StockItemExpandRow({ item }: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error,   setError]        = useState("");

  const isLow = item.currentStock <= item.minStock;
  const isOut = item.currentStock <= 0;

  function handlePurchase(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData(formRef.current!);
    fd.set("stockItemId", String(item.id));
    setError("");
    startTransition(async () => {
      const result = await recordPurchase(fd);
      if ("error" in result && result.error) { setError(result.error); return; }
      router.refresh();
      setModalOpen(false);
    });
  }

  const inp: React.CSSProperties = {
    width: "100%", background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(245,182,30,0.14)", borderRadius: "0.5rem",
    padding: "0.6rem 0.9rem", color: "#F0EDE6", fontSize: "0.82rem", outline: "none",
  };

  return (
    <div style={{ padding: "1.25rem 1.75rem" }}>
      {/* Stock summary */}
      <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", marginBottom: "1.25rem" }}>
        <div>
          <p style={{ fontSize: "0.55rem", letterSpacing: "0.1em", color: "rgba(240,237,230,0.3)", marginBottom: "0.25rem" }}>
            STOCK ({item.stockUnit.toUpperCase()})
          </p>
          <p style={{ fontSize: "1.4rem", fontWeight: 800, color: isOut ? "#F87171" : isLow ? "#FBBF24" : "#4ADE80", margin: 0 }}>
            {item.currentStock.toFixed(item.currentStock % 1 === 0 ? 0 : 2)}
          </p>
        </div>
        <div style={{ borderLeft: "1px solid rgba(245,182,30,0.1)", paddingLeft: "1.5rem" }}>
          <p style={{ fontSize: "0.55rem", letterSpacing: "0.1em", color: "rgba(240,237,230,0.3)", marginBottom: "0.25rem" }}>MIN STOCK</p>
          <p style={{ fontSize: "1rem", color: "rgba(240,237,230,0.6)", margin: 0 }}>{item.minStock.toFixed(item.minStock % 1 === 0 ? 0 : 2)}</p>
        </div>
        {isOut && <span style={{ fontSize: "0.65rem", color: "#F87171", fontWeight: 700, letterSpacing: "0.07em" }}>OUT OF STOCK — reorder {item.stockUnit} needed</span>}
        {!isOut && isLow && <span style={{ fontSize: "0.65rem", color: "#FBBF24", fontWeight: 700, letterSpacing: "0.07em" }}>BELOW MINIMUM — reorder {item.stockUnit} needed</span>}
        <button
          onClick={() => setModalOpen(true)}
          className="cta-btn"
          style={{ marginLeft: "auto", fontSize: "0.68rem", padding: "0.4rem 0.85rem" }}
        >
          + Record Purchase
        </button>
      </div>

      {/* History */}
      <p style={{ fontSize: "0.55rem", letterSpacing: "0.1em", color: "rgba(240,237,230,0.3)", marginBottom: "0.6rem" }}>HISTORY</p>
      {item.stockEntries.length === 0 ? (
        <p style={{ fontSize: "0.75rem", color: "rgba(240,237,230,0.25)" }}>No stock history yet.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Date", "Type", "Change", "Note", "By"].map((h) => (
                <th key={h} style={{ fontSize: "0.58rem", letterSpacing: "0.08em", color: "rgba(240,237,230,0.25)", fontWeight: 600, padding: "0.35rem 0.6rem", textAlign: "left", borderBottom: "1px solid rgba(245,182,30,0.06)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {item.stockEntries.map((e) => (
              <tr key={e.id}>
                <td style={{ padding: "0.4rem 0.6rem", fontSize: "0.73rem", color: "rgba(240,237,230,0.45)" }}>
                  {new Date(e.changedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" })}
                </td>
                <td style={{ padding: "0.4rem 0.6rem" }}>
                  <span style={{ fontSize: "0.58rem", padding: "0.15rem 0.4rem", borderRadius: "0.2rem", fontWeight: 700, letterSpacing: "0.06em", color: TYPE_COLOR[e.type] ?? "#F0EDE6", background: `${TYPE_COLOR[e.type] ?? "#F0EDE6"}15` }}>
                    {TYPE_LABEL[e.type] ?? e.type}
                  </span>
                </td>
                <td style={{ padding: "0.4rem 0.6rem", fontSize: "0.8rem", fontWeight: 700, color: e.quantityChange > 0 ? "#4ADE80" : "#F87171" }}>
                  {e.quantityChange > 0 ? "+" : ""}{e.quantityChange.toFixed(e.quantityChange % 1 === 0 ? 0 : 2)}
                </td>
                <td style={{ padding: "0.4rem 0.6rem", fontSize: "0.72rem", color: "rgba(240,237,230,0.4)" }}>{e.note ?? "—"}</td>
                <td style={{ padding: "0.4rem 0.6rem", fontSize: "0.7rem", color: "rgba(240,237,230,0.3)" }}>{e.changedBy ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Purchase modal */}
      {modalOpen && (
        <>
          <div className="slide-overlay" onClick={() => setModalOpen(false)} />
          <div className="slide-panel">
            <div className="slide-header">
              <h2 className="slide-title">Record Purchase — {item.name}</h2>
              <button onClick={() => setModalOpen(false)} style={{ background: "none", border: "none", color: "rgba(240,237,230,0.4)", cursor: "pointer", padding: "0.25rem" }}>✕</button>
            </div>
            {error && <div className="form-error" style={{ marginBottom: "0.75rem" }}>{error}</div>}
            <form ref={formRef} onSubmit={handlePurchase} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ fontSize: "0.62rem", letterSpacing: "0.08em", color: "rgba(240,237,230,0.4)", display: "block", marginBottom: "0.4rem" }}>
                  QUANTITY ({item.stockUnit.toUpperCase()})
                </label>
                <input name="quantity" type="number" min="0.01" step="0.01" required autoFocus style={inp} />
              </div>
              <div>
                <label style={{ fontSize: "0.62rem", letterSpacing: "0.08em", color: "rgba(240,237,230,0.4)", display: "block", marginBottom: "0.4rem" }}>
                  NOTE (supplier, reference, etc.)
                </label>
                <input name="note" maxLength={255} placeholder="Optional" style={inp} />
              </div>
              <button type="submit" className="submit-btn" disabled={pending}>
                {pending ? "RECORDING…" : "RECORD PURCHASE"}
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
