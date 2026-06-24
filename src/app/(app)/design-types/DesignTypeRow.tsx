"use client";

import Link from "next/link";
import { toggleDesignTypeActive } from "@/actions/design-types";

interface DesignType {
  id: number;
  code: string;
  name: string;
  description: string | null;
  active: boolean;
}

export default function DesignTypeRow({ designType: dt }: { designType: DesignType }) {
  async function handleToggle() {
    await toggleDesignTypeActive(dt.id, !dt.active);
  }

  return (
    <tr>
      <td style={{ fontWeight: 700, color: "#F5B61E", fontSize: "0.72rem", letterSpacing: "0.06em" }}>{dt.code}</td>
      <td style={{ fontWeight: 600, color: "#F0EDE6" }}>{dt.name}</td>
      <td style={{ color: "rgba(240,237,230,0.4)", fontSize: "0.72rem" }}>{dt.description ?? "—"}</td>
      <td>
        <span className={`status-pill ${dt.active ? "status-fulfilled" : "status-cancelled"}`}>
          {dt.active ? "ACTIVE" : "INACTIVE"}
        </span>
      </td>
      <td style={{ textAlign: "right" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "0.75rem" }}>
          <Link href={`/design-types/${dt.id}/edit`} className="nav-link" style={{ fontSize: "0.68rem" }}>Edit</Link>
          <form action={handleToggle}>
            <button
              type="submit"
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.68rem", color: dt.active ? "#F87171" : "#4ADE80" }}
            >
              {dt.active ? "Deactivate" : "Activate"}
            </button>
          </form>
        </div>
      </td>
    </tr>
  );
}
