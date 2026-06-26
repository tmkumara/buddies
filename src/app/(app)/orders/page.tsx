import { requireAuth } from "@/lib/auth-guards";
import prisma from "@/lib/prisma";
import TopBar from "@/components/layout/TopBar";
import Link from "next/link";
import { Plus } from "lucide-react";
import { STATUS_LABELS, STATUS_CSS, type OrderStatusKey } from "@/lib/utils/status-transitions";

const PAGE_SIZE = 15;

const ALL_STATUSES: OrderStatusKey[] = ["DRAFT", "CONFIRMED", "IN_PRODUCTION", "READY", "DELIVERED", "CANCELLED"];

interface Props {
  searchParams: Promise<{ status?: string; search?: string; page?: string }>;
}

export default async function OrdersPage({ searchParams }: Props) {
  await requireAuth();

  const { status, search, page } = await searchParams;
  const pageNum  = Math.max(1, parseInt(page ?? "1") || 1);
  const statusFilter = ALL_STATUSES.includes(status as OrderStatusKey) ? (status as OrderStatusKey) : undefined;

  const where = {
    ...(statusFilter && { status: statusFilter }),
    ...(search && {
      customer: {
        OR: [
          { name: { contains: search } },
          { phone: { contains: search } },
        ],
      },
    }),
  };

  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: [{ orderDate: "desc" }, { id: "desc" }],
      skip: (pageNum - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        customer: { select: { name: true, phone: true } },
        items:    { select: { id: true } },
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const serialized = orders.map((o) => ({
    ...o,
    totalAmount:    Number(o.totalAmount),
    discountAmount: Number(o.discountAmount),
    netAmount:      Number(o.netAmount),
    orderDate:      o.orderDate.toISOString().split("T")[0],
    deliveryDate:   o.deliveryDate?.toISOString().split("T")[0] ?? null,
  }));

  function buildUrl(params: Record<string, string | undefined>) {
    const p = new URLSearchParams();
    if (params.status)  p.set("status", params.status);
    if (params.search)  p.set("search", params.search);
    if (params.page)    p.set("page", params.page);
    return `/orders${p.size ? `?${p}` : ""}`;
  }

  return (
    <>
      <TopBar title="Orders" />

      <div style={{ padding: "1.5rem 1.75rem" }}>
        {/* ── Filters ── */}
        <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
          <form method="GET" action="/orders" style={{ display: "flex", gap: "0.5rem", flex: 1, minWidth: "220px" }}>
            {statusFilter && <input type="hidden" name="status" value={statusFilter} />}
            <input
              name="search"
              defaultValue={search}
              placeholder="Search customer name or phone…"
              style={{
                flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(245,182,30,0.14)",
                borderRadius: "0.5rem", padding: "0.55rem 0.9rem", color: "#F0EDE6", fontSize: "0.8rem", outline: "none",
              }}
            />
            <button type="submit" className="cta-btn" style={{ fontSize: "0.7rem", padding: "0.5rem 0.9rem" }}>
              Search
            </button>
            {search && (
              <Link href={buildUrl({ status })} className="nav-link" style={{ fontSize: "0.7rem", display: "flex", alignItems: "center" }}>
                Clear
              </Link>
            )}
          </form>

          <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", alignItems: "center" }}>
            <Link href={buildUrl({ search })} style={{
              fontSize: "0.65rem", padding: "0.4rem 0.75rem", borderRadius: "0.35rem",
              background: !statusFilter ? "rgba(245,182,30,0.15)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${!statusFilter ? "rgba(245,182,30,0.4)" : "rgba(245,182,30,0.1)"}`,
              color: !statusFilter ? "#F5B61E" : "rgba(240,237,230,0.45)",
              textDecoration: "none", letterSpacing: "0.06em",
            }}>ALL</Link>
            {ALL_STATUSES.map((s) => (
              <Link key={s} href={buildUrl({ status: s, search })} style={{
                fontSize: "0.65rem", padding: "0.4rem 0.75rem", borderRadius: "0.35rem",
                background: statusFilter === s ? "rgba(245,182,30,0.15)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${statusFilter === s ? "rgba(245,182,30,0.4)" : "rgba(245,182,30,0.1)"}`,
                color: statusFilter === s ? "#F5B61E" : "rgba(240,237,230,0.45)",
                textDecoration: "none", letterSpacing: "0.06em",
              }}>{STATUS_LABELS[s].toUpperCase()}</Link>
            ))}
          </div>

          <Link href="/orders/new">
            <button className="cta-btn" style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.72rem", padding: "0.5rem 1rem", whiteSpace: "nowrap" }}>
              <Plus size={14} /> New Order
            </button>
          </Link>
        </div>

        {/* ── Table ── */}
        <div className="content-card" style={{ overflow: "clip" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem", padding: "0 0.25rem" }}>
            <span style={{ fontSize: "0.68rem", color: "rgba(240,237,230,0.3)", letterSpacing: "0.06em" }}>
              {total} ORDER{total !== 1 ? "S" : ""}
            </span>
          </div>

          {serialized.length === 0 ? (
            <div style={{ padding: "3rem 0", textAlign: "center", fontSize: "0.8rem", color: "rgba(240,237,230,0.25)" }}>
              {search || statusFilter ? "No orders match your filter." : "No orders yet. "}
              {!search && !statusFilter && (
                <Link href="/orders/new" className="nav-link">Create one →</Link>
              )}
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
            <table className="orders-table">
              <thead style={{
                position: "sticky",
                top: "4.5rem",
                zIndex: 2,
                background: "rgba(10,10,10,0.98)",
                boxShadow: "0 1px 0 rgba(245,182,30,0.1)",
              }}>
                <tr>
                  <th style={{ paddingTop: "0.75rem" }}>ORDER NO</th>
                  <th style={{ paddingTop: "0.75rem" }}>CUSTOMER</th>
                  <th style={{ paddingTop: "0.75rem" }}>ORDER DATE</th>
                  <th style={{ paddingTop: "0.75rem" }}>DELIVERY</th>
                  <th style={{ paddingTop: "0.75rem" }}>ITEMS</th>
                  <th style={{ textAlign: "right", paddingTop: "0.75rem" }}>NET AMOUNT</th>
                  <th style={{ paddingTop: "0.75rem" }}>STATUS</th>
                  <th style={{ textAlign: "right", paddingTop: "0.75rem" }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {serialized.map((order) => (
                  <tr key={order.id}>
                    <td style={{ fontWeight: 700, color: "#F5B61E", fontSize: "0.72rem", letterSpacing: "0.05em" }}>
                      {order.orderNo}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: "#F0EDE6", fontSize: "0.82rem" }}>{order.customer.name}</div>
                      <div style={{ fontSize: "0.65rem", color: "rgba(240,237,230,0.4)" }}>{order.customer.phone}</div>
                    </td>
                    <td style={{ fontSize: "0.78rem", color: "rgba(240,237,230,0.6)" }}>{order.orderDate}</td>
                    <td style={{ fontSize: "0.78rem", color: order.deliveryDate ? "rgba(240,237,230,0.6)" : "rgba(240,237,230,0.25)" }}>
                      {order.deliveryDate ?? "—"}
                    </td>
                    <td style={{ fontSize: "0.78rem", color: "rgba(240,237,230,0.5)" }}>{order.items.length}</td>
                    <td style={{ textAlign: "right", fontWeight: 600, color: "#F0EDE6", fontSize: "0.85rem" }}>
                      Rs. {order.netAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>
                    <td>
                      <span className={`status-pill ${STATUS_CSS[order.status as OrderStatusKey]}`}>
                        {STATUS_LABELS[order.status as OrderStatusKey]?.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <Link href={`/orders/${order.id}`} className="nav-link" style={{ fontSize: "0.68rem" }}>
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", marginTop: "1.25rem" }}>
            {pageNum > 1 && (
              <Link href={buildUrl({ status, search, page: String(pageNum - 1) })} className="nav-link" style={{ fontSize: "0.72rem" }}>
                ← Prev
              </Link>
            )}
            <span style={{ fontSize: "0.72rem", color: "rgba(240,237,230,0.35)" }}>
              Page {pageNum} of {totalPages}
            </span>
            {pageNum < totalPages && (
              <Link href={buildUrl({ status, search, page: String(pageNum + 1) })} className="nav-link" style={{ fontSize: "0.72rem" }}>
                Next →
              </Link>
            )}
          </div>
        )}
      </div>
    </>
  );
}
