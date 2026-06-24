import { requireAuth } from "@/lib/auth-guards";
import prisma from "@/lib/prisma";
import TopBar from "@/components/layout/TopBar";
import Link from "next/link";
import { Plus } from "lucide-react";
import MaterialRow from "./MaterialRow";

export default async function MaterialsPage() {
  await requireAuth();
  const materials = (await prisma.material.findMany({ orderBy: { code: "asc" } })).map((m) => ({
    ...m,
    sheetLengthCm:     Number(m.sheetLengthCm),
    sheetWidthCm:      Number(m.sheetWidthCm),
    costPerSheet:      Number(m.costPerSheet),
    minStockLevel:     Number(m.minStockLevel),
    currentStockLevel: Number(m.currentStockLevel),
  }));

  return (
    <>
      <TopBar title="Materials" />

      <div style={{ padding: "1.5rem 1.75rem" }}>
        <div className="flex items-center justify-between mb-5">
          <p style={{ fontSize: "0.72rem", color: "rgba(240,237,230,0.35)", letterSpacing: "0.06em" }}>
            {materials.length} MATERIAL{materials.length !== 1 ? "S" : ""}
          </p>
          <Link href="/materials/new">
            <button className="cta-btn" style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.72rem", padding: "0.5rem 1rem" }}>
              <Plus size={14} />
              New Material
            </button>
          </Link>
        </div>

        <div className="content-card">
          {materials.length === 0 ? (
            <div style={{ padding: "3rem 0", textAlign: "center", fontSize: "0.8rem", color: "rgba(240,237,230,0.25)" }}>
              No materials yet.{" "}
              <Link href="/materials/new" className="nav-link">Add one →</Link>
            </div>
          ) : (
            <table className="orders-table">
              <thead>
                <tr>
                  <th>CODE</th>
                  <th>NAME</th>
                  <th>GSM</th>
                  <th>SHEET (cm)</th>
                  <th>COST/SHEET</th>
                  <th>STOCK</th>
                  <th>STATUS</th>
                  <th style={{ textAlign: "right" }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {materials.map((m) => (
                  <MaterialRow key={m.id} material={m} />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
