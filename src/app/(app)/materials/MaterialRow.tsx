"use client";

import Link from "next/link";
import { updateMaterialStatus } from "@/actions/materials";
import { AlertTriangle } from "lucide-react";
import { MaterialStatus } from "@prisma/client";

interface Material {
  id: number; code: string; name: string; gsm: number;
  sheetLengthCm: number; sheetWidthCm: number;
  costPerSheet: number; minStockLevel: number; currentStockLevel: number;
  status: MaterialStatus;
}

const STATUS_PILL: Record<MaterialStatus, string> = {
  ACTIVE:   "status-fulfilled",
  PENDING:  "status-in-production",
  INACTIVE: "status-cancelled",
};

const STATUS_LABEL: Record<MaterialStatus, string> = {
  ACTIVE:   "ACTIVE",
  PENDING:  "PENDING",
  INACTIVE: "INACTIVE",
};

export default function MaterialRow({ material: m }: { material: Material }) {
  const current  = Number(m.currentStockLevel);
  const min      = Number(m.minStockLevel);
  const lowStock = current <= min && m.status === "ACTIVE";

  async function handleActivate()   { await updateMaterialStatus(m.id, MaterialStatus.ACTIVE);   }
  async function handleDeactivate() { await updateMaterialStatus(m.id, MaterialStatus.INACTIVE); }

  return (
    <tr>
      <td style={{ fontWeight: 700, color: "#F5B61E", fontSize: "0.72rem", letterSpacing: "0.06em" }}>{m.code}</td>
      <td style={{ fontWeight: 600, color: "#F0EDE6" }}>{m.name}</td>
      <td style={{ color: "rgba(240,237,230,0.6)" }}>{m.gsm}</td>
      <td style={{ color: "rgba(240,237,230,0.5)", fontSize: "0.72rem" }}>
        {Number(m.sheetLengthCm)} × {Number(m.sheetWidthCm)}
      </td>
      <td style={{ color: "rgba(240,237,230,0.7)" }}>{Number(m.costPerSheet).toFixed(2)}</td>
      <td>
        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
          <span style={{ color: lowStock ? "#F87171" : "rgba(240,237,230,0.6)", fontSize: "0.8rem", fontWeight: 600 }}>
            {current.toFixed(0)}
          </span>
          {lowStock && (
            <span title={`Low stock (min: ${min})`}>
              <AlertTriangle size={12} style={{ color: "#F87171" }} />
            </span>
          )}
        </div>
      </td>
      <td>
        <span className={`status-pill ${STATUS_PILL[m.status]}`}>
          {STATUS_LABEL[m.status]}
        </span>
      </td>
      <td style={{ textAlign: "right" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "0.75rem" }}>
          <Link href={`/materials/${m.id}/edit`} className="nav-link" style={{ fontSize: "0.68rem" }}>Edit</Link>
          {m.status !== "INACTIVE" ? (
            <form action={handleDeactivate}>
              <button type="submit" style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.68rem", color: "#F87171" }}>
                Deactivate
              </button>
            </form>
          ) : (
            <form action={handleActivate}>
              <button type="submit" style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.68rem", color: "#4ADE80" }}>
                Activate
              </button>
            </form>
          )}
        </div>
      </td>
    </tr>
  );
}
