"use client";

import { useState, useTransition } from "react";
import { Pencil, X } from "lucide-react";
import { MaterialStatus } from "@prisma/client";
import { updateMaterialStatus, updateMaterialStock } from "@/actions/materials";

interface Props {
  material: {
    id: number;
    status: MaterialStatus;
    currentStockLevel: number;
    minStockLevel: number;
  };
  onFullEdit: () => void;
  onClose: () => void;
}

const STATUSES: MaterialStatus[] = ["PENDING", "ACTIVE", "INACTIVE"];

export default function MaterialExpandRow({ material, onFullEdit, onClose }: Props) {
  const [stock, setStock] = useState(material.currentStockLevel);
  const [optimisticStatus, setOptimisticStatus] = useState<MaterialStatus>(material.status);
  const [stockPending, startStock] = useTransition();
  const [statusPending, startStatus] = useTransition();
  const isDirty = stock !== material.currentStockLevel;

  const min = material.minStockLevel;
  const pct = min > 0 ? Math.min((stock / min) * 100, 100) : 100;
  const barColor: "green" | "amber" | "red" = pct >= 100 ? "green" : pct >= 50 ? "amber" : "red";

  function handleSaveStock() {
    startStock(async () => { await updateMaterialStock(material.id, stock); });
  }

  function handleStatus(s: MaterialStatus) {
    if (s === optimisticStatus) return;
    const prev = optimisticStatus;
    setOptimisticStatus(s);
    startStatus(async () => {
      const res = await updateMaterialStatus(material.id, s);
      if ("error" in res) setOptimisticStatus(prev);
    });
  }

  return (
    <div className="expand-row">
      {/* Stock */}
      <div>
        <p style={{ fontSize: "0.58rem", letterSpacing: "0.12em", color: "rgba(240,237,230,0.28)", marginBottom: "0.5rem" }}>
          CURRENT STOCK
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
          <button type="button" className="nudge-btn" onClick={() => setStock((v) => Math.max(0, v - 1))}>−</button>
          <input
            type="number"
            min="0"
            value={stock}
            onChange={(e) => setStock(Math.max(0, Number(e.target.value)))}
            style={{
              width: "68px", background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(245,182,30,0.2)", borderRadius: "0.4rem",
              padding: "0.3rem 0.4rem", color: "#F0EDE6", fontSize: "0.875rem",
              textAlign: "center", outline: "none",
              fontFamily: "var(--font-jakarta, 'Plus Jakarta Sans', sans-serif)",
            }}
          />
          <button type="button" className="nudge-btn" onClick={() => setStock((v) => v + 1)}>+</button>
          {isDirty && (
            <button
              type="button"
              onClick={handleSaveStock}
              disabled={stockPending}
              style={{
                padding: "0.3rem 0.7rem",
                background: "rgba(245,182,30,0.12)",
                border: "1px solid rgba(245,182,30,0.3)",
                borderRadius: "0.4rem",
                color: "#F5B61E",
                fontSize: "0.6rem",
                letterSpacing: "0.08em",
                cursor: "pointer",
                opacity: stockPending ? 0.55 : 1,
                fontFamily: "var(--font-jakarta, 'Plus Jakarta Sans', sans-serif)",
              }}
            >
              {stockPending ? "SAVING…" : "SAVE"}
            </button>
          )}
        </div>
        {min > 0 && (
          <div style={{ marginTop: "0.5rem" }}>
            <div className="stock-bar-track">
              <div className={`stock-bar-fill ${barColor}`} style={{ width: `${pct}%` }} />
            </div>
            <p style={{ fontSize: "0.56rem", color: "rgba(240,237,230,0.28)", marginTop: "0.3rem" }}>Min: {min}</p>
          </div>
        )}
      </div>

      {/* Status + actions */}
      <div>
        <p style={{ fontSize: "0.58rem", letterSpacing: "0.12em", color: "rgba(240,237,230,0.28)", marginBottom: "0.5rem" }}>
          STATUS
        </p>
        <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", marginBottom: "0.875rem" }}>
          {STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              className={`status-chip-btn${optimisticStatus === s ? ` active-${s}` : ""}`}
              onClick={() => handleStatus(s)}
              disabled={statusPending}
            >
              {s}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: "0.6rem" }}>
          <button
            type="button"
            onClick={onFullEdit}
            style={{
              display: "flex", alignItems: "center", gap: "0.3rem",
              padding: "0.3rem 0.7rem",
              background: "rgba(245,182,30,0.06)",
              border: "1px solid rgba(245,182,30,0.2)",
              borderRadius: "0.4rem",
              color: "rgba(240,237,230,0.55)",
              fontSize: "0.6rem", letterSpacing: "0.08em", cursor: "pointer",
              fontFamily: "var(--font-jakarta, 'Plus Jakarta Sans', sans-serif)",
            }}
          >
            <Pencil size={10} /> FULL EDIT
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              display: "flex", alignItems: "center", gap: "0.3rem",
              padding: "0.3rem 0.7rem",
              background: "transparent",
              border: "1px solid rgba(240,237,230,0.1)",
              borderRadius: "0.4rem",
              color: "rgba(240,237,230,0.28)",
              fontSize: "0.6rem", letterSpacing: "0.08em", cursor: "pointer",
              fontFamily: "var(--font-jakarta, 'Plus Jakarta Sans', sans-serif)",
            }}
          >
            <X size={10} /> CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}
