import { requireAuth } from "@/lib/auth-guards";
import prisma from "@/lib/prisma";
import TopBar from "@/components/layout/TopBar";
import Link from "next/link";
import { Plus } from "lucide-react";
import MaterialRow from "./MaterialRow";
import { MaterialStatus } from "@prisma/client";

export default async function MaterialsPage() {
  await requireAuth();
  const all = (await prisma.material.findMany({ orderBy: { code: "asc" } })).map((m) => ({
    ...m,
    sheetLengthCm:     Number(m.sheetLengthCm),
    sheetWidthCm:      Number(m.sheetWidthCm),
    costPerSheet:      Number(m.costPerSheet),
    minStockLevel:     Number(m.minStockLevel),
    currentStockLevel: Number(m.currentStockLevel),
    status:            m.status as MaterialStatus,
  }));

  const active   = all.filter((m) => m.status === "ACTIVE");
  const pending  = all.filter((m) => m.status === "PENDING");
  const inactive = all.filter((m) => m.status === "INACTIVE");

  const tableHead = (
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
  );

  return (
    <>
      <TopBar title="Materials" />

      <div style={{ padding: "1.5rem 1.75rem" }}>
        <div className="flex items-center justify-between mb-5">
          <p style={{ fontSize: "0.72rem", color: "rgba(240,237,230,0.35)", letterSpacing: "0.06em" }}>
            {all.length} MATERIAL{all.length !== 1 ? "S" : ""}
          </p>
          <Link href="/materials/new">
            <button className="cta-btn" style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.72rem", padding: "0.5rem 1rem" }}>
              <Plus size={14} />
              New Material
            </button>
          </Link>
        </div>

        {all.length === 0 ? (
          <div className="content-card" style={{ padding: "3rem 0", textAlign: "center", fontSize: "0.8rem", color: "rgba(240,237,230,0.25)" }}>
            No materials yet.{" "}
            <Link href="/materials/new" className="nav-link">Add one →</Link>
          </div>
        ) : (
          <>
            {/* ── Active ── */}
            {active.length > 0 && (
              <div className="content-card" style={{ marginBottom: "1.25rem" }}>
                <p style={{ fontSize: "0.62rem", letterSpacing: "0.1em", color: "rgba(240,237,230,0.3)", marginBottom: "0.75rem", fontWeight: 600 }}>
                  ACTIVE — {active.length}
                </p>
                <table className="orders-table">
                  {tableHead}
                  <tbody>
                    {active.map((m) => <MaterialRow key={m.id} material={m} />)}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── Pending Purchase ── */}
            {pending.length > 0 && (
              <div style={{
                marginBottom: "1.25rem", border: "1px solid rgba(251,191,36,0.2)",
                borderRadius: "0.75rem", overflow: "hidden",
                background: "rgba(251,191,36,0.03)",
              }}>
                <div style={{ padding: "0.75rem 1.25rem", borderBottom: "1px solid rgba(251,191,36,0.1)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ fontSize: "0.75rem" }}>⚠</span>
                  <p style={{ fontSize: "0.62rem", letterSpacing: "0.1em", color: "#FBBF24", fontWeight: 600, margin: 0 }}>
                    PENDING PURCHASE — {pending.length}
                  </p>
                  <span style={{ fontSize: "0.62rem", color: "rgba(251,191,36,0.5)", marginLeft: "0.25rem" }}>
                    Requested but not yet purchased
                  </span>
                </div>
                <div style={{ padding: "0 0.25rem" }}>
                  <table className="orders-table">
                    {tableHead}
                    <tbody>
                      {pending.map((m) => <MaterialRow key={m.id} material={m} />)}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── Inactive ── */}
            {inactive.length > 0 && (
              <div className="content-card" style={{ opacity: 0.6 }}>
                <p style={{ fontSize: "0.62rem", letterSpacing: "0.1em", color: "rgba(240,237,230,0.3)", marginBottom: "0.75rem", fontWeight: 600 }}>
                  INACTIVE — {inactive.length}
                </p>
                <table className="orders-table">
                  {tableHead}
                  <tbody>
                    {inactive.map((m) => <MaterialRow key={m.id} material={m} />)}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
