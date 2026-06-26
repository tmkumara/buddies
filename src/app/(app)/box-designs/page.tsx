import { requireAuth } from "@/lib/auth-guards";
import prisma from "@/lib/prisma";
import TopBar from "@/components/layout/TopBar";
import Link from "next/link";
import { Plus } from "lucide-react";
import BoxDesignRow from "./BoxDesignRow";

export default async function BoxDesignsPage() {
  await requireAuth();

  const boxDesigns = (await prisma.boxDesign.findMany({
    orderBy: { code: "asc" },
    include: {
      designType: { select: { name: true } },
      material:   { select: { name: true } },
    },
  })).map((bd) => ({
    ...bd,
    lengthCm:    bd.lengthCm    != null ? Number(bd.lengthCm)    : null,
    widthCm:     bd.widthCm     != null ? Number(bd.widthCm)     : null,
    heightCm:    bd.heightCm    != null ? Number(bd.heightCm)    : null,
    lengthIn:    bd.lengthIn    != null ? Number(bd.lengthIn)    : null,
    widthIn:     bd.widthIn     != null ? Number(bd.widthIn)     : null,
    heightIn:    bd.heightIn    != null ? Number(bd.heightIn)    : null,
    cutLengthCm: bd.cutLengthCm != null ? Number(bd.cutLengthCm) : null,
    cutWidthCm:  bd.cutWidthCm  != null ? Number(bd.cutWidthCm)  : null,
    cutLengthIn: bd.cutLengthIn != null ? Number(bd.cutLengthIn) : null,
    cutWidthIn:  bd.cutWidthIn  != null ? Number(bd.cutWidthIn)  : null,
    rawAreaSqCm: bd.rawAreaSqCm != null ? Number(bd.rawAreaSqCm) : null,
    unitPrice:   Number(bd.unitPrice),
  }));

  return (
    <>
      <TopBar title="Box Designs" />

      <div style={{ padding: "1.5rem 1.75rem" }}>
        <div className="flex items-center justify-between mb-5">
          <p style={{ fontSize: "0.72rem", color: "rgba(240,237,230,0.35)", letterSpacing: "0.06em" }}>
            {boxDesigns.length} BOX DESIGN{boxDesigns.length !== 1 ? "S" : ""}
          </p>
          <Link href="/box-designs/new">
            <button className="cta-btn" style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.72rem", padding: "0.5rem 1rem" }}>
              <Plus size={14} />
              New Box Design
            </button>
          </Link>
        </div>

        <div className="content-card" style={{ overflowX: "auto" }}>
          {boxDesigns.length === 0 ? (
            <div style={{ padding: "3rem 0", textAlign: "center", fontSize: "0.8rem", color: "rgba(240,237,230,0.25)" }}>
              No box designs yet.{" "}
              <Link href="/box-designs/new" className="nav-link">Add one →</Link>
            </div>
          ) : (
            <table className="orders-table">
              <thead>
                <tr>
                  <th>CODE</th>
                  <th>NAME</th>
                  <th>TYPE</th>
                  <th>MATERIAL</th>
                  <th>DIMS</th>
                  <th>PRICE</th>
                  <th>STATUS</th>
                  <th style={{ textAlign: "right" }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {boxDesigns.map((bd) => (
                  <BoxDesignRow key={bd.id} boxDesign={bd} />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
