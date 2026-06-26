"use client";

import Link from "next/link";
import { toggleBoxDesignActive } from "@/actions/box-designs";

interface BoxDesign {
  id: number; code: string; name: string; custom: boolean; active: boolean;
  lengthCm: number | null; widthCm: number | null; heightCm: number | null;
  lengthIn: number | null; widthIn: number | null; heightIn: number | null;
  unitPrice: number;
  designType: { name: string };
  material: { name: string };
}

export default function BoxDesignRow({ boxDesign: bd }: { boxDesign: BoxDesign }) {
  async function handleToggle() {
    await toggleBoxDesignActive(bd.id, !bd.active);
  }

  return (
    <tr>
      <td style={{ fontWeight: 700, color: "#F5B61E", fontSize: "0.72rem", letterSpacing: "0.06em" }}>
        {bd.code}
        {bd.custom && (
          <span style={{ marginLeft: "0.35rem", fontSize: "0.55rem", color: "#A78BFA", background: "rgba(167,139,250,0.12)", padding: "0.1rem 0.3rem", borderRadius: "0.2rem" }}>
            CUSTOM
          </span>
        )}
      </td>
      <td style={{ fontWeight: 600, color: "#F0EDE6" }}>{bd.name}</td>
      <td style={{ color: "rgba(240,237,230,0.55)", fontSize: "0.72rem" }}>{bd.designType.name}</td>
      <td style={{ color: "rgba(240,237,230,0.55)", fontSize: "0.72rem" }}>{bd.material.name}</td>
      <td style={{ color: "rgba(240,237,230,0.5)", fontSize: "0.72rem" }}>
        {bd.lengthIn != null && bd.widthIn != null && bd.heightIn != null
          ? `${bd.lengthIn}×${bd.widthIn}×${bd.heightIn} in`
          : bd.lengthCm != null && bd.widthCm != null && bd.heightCm != null
          ? `${bd.lengthCm}×${bd.widthCm}×${bd.heightCm} cm`
          : "—"}
      </td>
      <td style={{ color: "rgba(240,237,230,0.7)", fontWeight: 600 }}>
        {Number(bd.unitPrice).toFixed(2)}
      </td>
      <td>
        <span className={`status-pill ${bd.active ? "status-fulfilled" : "status-cancelled"}`}>
          {bd.active ? "ACTIVE" : "INACTIVE"}
        </span>
      </td>
      <td style={{ textAlign: "right" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "0.75rem" }}>
          <Link href={`/box-designs/${bd.id}/edit`} className="nav-link" style={{ fontSize: "0.68rem" }}>Edit</Link>
          <form action={handleToggle}>
            <button type="submit" style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.68rem", color: bd.active ? "#F87171" : "#4ADE80" }}>
              {bd.active ? "Deactivate" : "Activate"}
            </button>
          </form>
        </div>
      </td>
    </tr>
  );
}
