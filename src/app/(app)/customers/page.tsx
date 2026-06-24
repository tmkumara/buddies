import { requireAuth } from "@/lib/auth-guards";
import prisma from "@/lib/prisma";
import TopBar from "@/components/layout/TopBar";
import Link from "next/link";
import { UserPlus } from "lucide-react";
import CustomerRow from "./CustomerRow";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; inactive?: string }>;
}) {
  await requireAuth();
  const { q, inactive } = await searchParams;

  const showInactive = inactive === "1";
  const customers = await prisma.customer.findMany({
    where: {
      active: showInactive ? undefined : true,
      OR: q
        ? [
            { name:  { contains: q } },
            { phone: { contains: q } },
          ]
        : undefined,
    },
    orderBy: { name: "asc" },
  });

  return (
    <>
      <TopBar title="Customers" />

      <div className="dash-body" style={{ display: "block", padding: "1.5rem 1.75rem" }}>

        {/* Toolbar */}
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <form method="GET" className="flex items-center gap-2">
            <input
              name="q"
              defaultValue={q ?? ""}
              placeholder="Search name or phone…"
              className="form-input"
              style={{ width: "240px", padding: "0.5rem 0.75rem", fontSize: "0.8rem" }}
            />
            {showInactive && <input type="hidden" name="inactive" value="1" />}
            <button type="submit" className="cta-btn" style={{ padding: "0.5rem 1rem", fontSize: "0.72rem" }}>
              Search
            </button>
            {q && (
              <Link
                href={showInactive ? "/customers?inactive=1" : "/customers"}
                className="nav-link"
                style={{ fontSize: "0.7rem" }}
              >
                Clear
              </Link>
            )}
          </form>

          <div className="flex items-center gap-3">
            <Link
              href={showInactive ? "/customers" : "/customers?inactive=1"}
              className="nav-link"
              style={{ fontSize: "0.68rem" }}
            >
              {showInactive ? "Hide inactive" : "Show inactive"}
            </Link>
            <Link href="/customers/new">
              <button className="cta-btn" style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.72rem", padding: "0.5rem 1rem" }}>
                <UserPlus size={14} />
                New Customer
              </button>
            </Link>
          </div>
        </div>

        {/* Table */}
        <div className="content-card">
          {customers.length === 0 ? (
            <div style={{ padding: "3rem 0", textAlign: "center", fontSize: "0.8rem", color: "rgba(240,237,230,0.25)" }}>
              {q ? `No customers matching "${q}".` : "No customers yet."}
              {!q && (
                <>
                  {" "}<Link href="/customers/new" className="nav-link">Add the first one →</Link>
                </>
              )}
            </div>
          ) : (
            <table className="orders-table">
              <thead>
                <tr>
                  <th>NAME</th>
                  <th>PHONE</th>
                  <th>EMAIL</th>
                  <th>STATUS</th>
                  <th style={{ textAlign: "right" }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <CustomerRow key={c.id} customer={c} />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <footer style={{
        padding: "0.75rem 1.75rem", borderTop: "1px solid rgba(245,182,30,0.06)",
        fontSize: "0.58rem", letterSpacing: "0.07em", color: "rgba(240,237,230,0.14)",
      }}>
        {customers.length} customer{customers.length !== 1 ? "s" : ""}
      </footer>
    </>
  );
}
