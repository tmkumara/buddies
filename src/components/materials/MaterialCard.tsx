"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { MaterialStatus } from "@prisma/client";
import MaterialExpandRow from "./MaterialExpandRow";
import { StockHistoryEntry } from "./StockHistoryTable";

export interface MaterialRow {
  id: number; code: string; name: string; gsm: number;
  sheetLengthCm: number | null; sheetWidthCm: number | null;
  sheetLengthIn: number | null; sheetWidthIn: number | null;
  costPerSheet: number; unitPrice: number;
  minStockLevel: number; currentStockLevel: number;
  status: MaterialStatus;
  stockAdjustments: StockHistoryEntry[];
}

const STATUS_PILL: Record<MaterialStatus, string> = {
  ACTIVE:   "status-fulfilled",
  PENDING:  "status-pending",
  INACTIVE: "status-cancelled",
};

interface Props {
  material: MaterialRow;
  onFullEdit: (id: number) => void;
}

export default function MaterialCard({ material: m, onFullEdit }: Props) {
  const [expanded, setExpanded] = useState(false);
  const lowStock = m.status === "ACTIVE" && m.minStockLevel > 0 && m.currentStockLevel <= m.minStockLevel;

  const dimStr = m.sheetLengthIn != null && m.sheetWidthIn != null
    ? `${m.sheetLengthIn} × ${m.sheetWidthIn} in`
    : m.sheetLengthCm != null && m.sheetWidthCm != null
    ? `${m.sheetLengthCm} × ${m.sheetWidthCm} cm`
    : null;

  return (
    <div className={`material-card${m.status === "PENDING" ? " pending" : lowStock ? " low-stock" : ""}`}>
      <div className="material-card-face" onClick={() => setExpanded((v) => !v)}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginBottom: "0.25rem" }}>
            <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "#F5B61E", letterSpacing: "0.06em" }}>{m.code}</span>
            <span className={`status-pill ${STATUS_PILL[m.status]}`}>{m.status}</span>
          </div>
          <p style={{ fontSize: "0.86rem", fontWeight: 600, color: "#F0EDE6", margin: "0 0 0.2rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name}</p>
          <p style={{ fontSize: "0.66rem", color: "rgba(240,237,230,0.38)", margin: 0 }}>
            BUY Rs.{m.costPerSheet.toFixed(2)} · UNIT Rs.{m.unitPrice.toFixed(2)}{dimStr && ` · ${dimStr}`}
          </p>
        </div>
        <ChevronRight size={15} className={`row-chevron${expanded ? " expanded" : ""}`} />
      </div>

      {expanded && (
        <div className="material-card-expand">
          <MaterialExpandRow
            material={m}
            onFullEdit={() => { setExpanded(false); onFullEdit(m.id); }}
            onClose={() => setExpanded(false)}
          />
        </div>
      )}
    </div>
  );
}
