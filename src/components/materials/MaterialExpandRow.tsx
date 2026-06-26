"use client";

import React, { useState, useTransition } from "react";
import { Pencil, X } from "lucide-react";
import { MaterialStatus } from "@prisma/client";
import { updateMaterialStatus } from "@/actions/materials";
import StockAdjustmentSlideOver from "./StockAdjustmentSlideOver";
import StockHistoryTable, { StockHistoryEntry } from "./StockHistoryTable";

interface Props {
  material: {
    id: number;
    name: string;
    status: MaterialStatus;
    currentStockLevel: number;
    minStockLevel: number;
    stockAdjustments: StockHistoryEntry[];
  };
  onFullEdit: () => void;
  onClose: () => void;
}

const STATUSES: MaterialStatus[] = ["PENDING", "ACTIVE", "INACTIVE"];

export default function MaterialExpandRow({ material, onFullEdit, onClose }: Props) {
  const [localStock, setLocalStock] = useState(material.currentStockLevel);
  const [stockSlideOpen, setStockSlideOpen] = useState(false);
  const [optimisticStatus, setOptimisticStatus] = useState<MaterialStatus>(material.status);
  const [statusPending, startStatus] = useTransition();

  const min = material.minStockLevel;
  const lowStock = material.status === "ACTIVE" && min > 0 && localStock <= min;

  function handleStatus(s: MaterialStatus) {
    if (s === optimisticStatus) return;
    const prev = optimisticStatus;
    setOptimisticStatus(s);
    startStatus(async () => {
      const res = await updateMaterialStatus(material.id, s);
      if ("error" in res) setOptimisticStatus(prev);
    });
  }

  const sectionLabel: React.CSSProperties = {
    fontSize: "0.62rem",
    letterSpacing: "0.1em",
    color: "rgba(240,237,230,0.35)",
    textTransform: "uppercase",
    marginBottom: "0.6rem",
  };

  return (
    <div>
      {/* Two-column body */}
      <div className="expand-row" style={{ padding: 0 }}>
        {/* Left column: Stock */}
        <div style={{ padding: "1rem 1.25rem", borderRight: "1px solid rgba(245,182,30,0.08)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.6rem" }}>
            <p style={{ ...sectionLabel, marginBottom: 0 }}>Stock</p>
            <button
              type="button"
              onClick={() => setStockSlideOpen(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.3rem",
                background: "rgba(245,182,30,0.07)",
                border: "1px solid rgba(245,182,30,0.2)",
                borderRadius: "0.35rem",
                padding: "0.25rem 0.65rem",
                color: "#F5B61E",
                fontSize: "0.62rem",
                letterSpacing: "0.07em",
                cursor: "pointer",
                fontFamily: "var(--font-jakarta, 'Plus Jakarta Sans', sans-serif)",
              }}
            >
              + Adjust Stock
            </button>
          </div>

          <p style={{ fontSize: "1.15rem", fontWeight: 700, color: lowStock ? "#F87171" : "#F5B61E", margin: "0 0 0.4rem" }}>
            {localStock}{" "}
            <span style={{ fontSize: "0.65rem", color: "rgba(240,237,230,0.35)", fontWeight: 400 }}>sheets on hand</span>
            {lowStock && (
              <span style={{ fontSize: "0.62rem", color: "#F87171", marginLeft: "0.5rem" }}>⚠ LOW STOCK</span>
            )}
          </p>

          <StockHistoryTable entries={material.stockAdjustments} />
        </div>

        {/* Right column: Status */}
        <div style={{ padding: "1rem 1.25rem" }}>
          <p style={sectionLabel}>Status</p>
          <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
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
        </div>
      </div>

      {/* Full-width footer */}
      <div style={{
        borderTop: "1px solid rgba(245,182,30,0.08)",
        padding: "0.65rem 1.25rem",
        display: "flex",
        justifyContent: "flex-end",
        gap: "0.6rem",
        background: "rgba(245,182,30,0.01)",
      }}>
        <button
          type="button"
          onClick={onFullEdit}
          style={{
            display: "flex", alignItems: "center", gap: "0.3rem",
            padding: "0.3rem 0.8rem",
            background: "rgba(245,182,30,0.08)",
            border: "1px solid rgba(245,182,30,0.2)",
            borderRadius: "0.4rem",
            color: "rgba(240,237,230,0.7)",
            fontSize: "0.6rem",
            letterSpacing: "0.08em",
            cursor: "pointer",
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
            padding: "0.3rem 0.8rem",
            background: "transparent",
            border: "1px solid rgba(240,237,230,0.1)",
            borderRadius: "0.4rem",
            color: "rgba(240,237,230,0.28)",
            fontSize: "0.6rem",
            letterSpacing: "0.08em",
            cursor: "pointer",
            fontFamily: "var(--font-jakarta, 'Plus Jakarta Sans', sans-serif)",
          }}
        >
          <X size={10} /> CLOSE
        </button>
      </div>

      <StockAdjustmentSlideOver
        materialId={material.id}
        materialName={material.name}
        currentStock={localStock}
        isOpen={stockSlideOpen}
        onClose={() => setStockSlideOpen(false)}
        onSaved={(newStock) => setLocalStock(newStock)}
      />
    </div>
  );
}
