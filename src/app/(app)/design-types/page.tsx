import { requireAuth } from "@/lib/auth-guards";
import prisma from "@/lib/prisma";
import TopBar from "@/components/layout/TopBar";
import Link from "next/link";
import { Plus } from "lucide-react";
import DesignTypeRow from "./DesignTypeRow";

export default async function DesignTypesPage() {
  await requireAuth();

  const designTypes = await prisma.designType.findMany({ orderBy: { code: "asc" } });

  return (
    <>
      <TopBar title="Design Types" />

      <div style={{ padding: "1.5rem 1.75rem" }}>
        <div className="flex items-center justify-between mb-5">
          <p style={{ fontSize: "0.72rem", color: "rgba(240,237,230,0.35)", letterSpacing: "0.06em" }}>
            {designTypes.length} DESIGN TYPE{designTypes.length !== 1 ? "S" : ""}
          </p>
          <Link href="/design-types/new">
            <button className="cta-btn" style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.72rem", padding: "0.5rem 1rem" }}>
              <Plus size={14} />
              New Design Type
            </button>
          </Link>
        </div>

        <div className="content-card">
          {designTypes.length === 0 ? (
            <div style={{ padding: "3rem 0", textAlign: "center", fontSize: "0.8rem", color: "rgba(240,237,230,0.25)" }}>
              No design types yet.{" "}
              <Link href="/design-types/new" className="nav-link">Add one →</Link>
            </div>
          ) : (
            <table className="orders-table">
              <thead>
                <tr>
                  <th>CODE</th>
                  <th>NAME</th>
                  <th>DESCRIPTION</th>
                  <th>STATUS</th>
                  <th style={{ textAlign: "right" }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {designTypes.map((dt) => (
                  <DesignTypeRow key={dt.id} designType={dt} />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
