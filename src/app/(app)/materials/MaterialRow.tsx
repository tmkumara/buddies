"use client";

import Link from "next/link";
import { toggleMaterialActive } from "@/actions/materials";
import { AlertTriangle } from "lucide-react";

interface Material {
  id: number; code: string; name: string; gsm: number;
  sheetLengthCm: number; sheetWidthCm: number;
  costPerSheet: number; minStockLevel: number; currentStockLevel: number;
  active: boolean;
}

export default function MaterialRow({ material: m }: { material: Material }) {
  const current = Number(m.currentStockLevel);
  const min = Number(m.minStockLevel);
  const lowStock = current <= min;

  async function handleToggle() {
    await toggleMaterialActive(m.id, !m.active);
  }

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
          {lowStock && m.active && (
            <span title={`Low stock (min: ${min})`}>
              <AlertTriangle size={12} style={{ color: "#F87171" }} />
            </span>
          )}
        </div>
      </td>
      <td>
        <span className={`status-pill ${m.active ? "status-fulfilled" : "status-cancelled"}`}>
          {m.active ? "ACTIVE" : "INACTIVE"}
        </span>
      </td>
      <td style={{ textAlign: "right" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "0.75rem" }}>
          <Link href={`/materials/${m.id}/edit`} className="nav-link" style={{ fontSize: "0.68rem" }}>Edit</Link>
          <form action={handleToggle}>
            <button type="submit" style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.68rem", color: m.active ? "#F87171" : "#4ADE80" }}>
              {m.active ? "Deactivate" : "Activate"}
            </button>
          </form>
        </div>
      </td>
    </tr>
  );
}
