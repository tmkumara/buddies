import Link from "next/link";
import { requireAuth } from "@/lib/auth-guards";
import prisma from "@/lib/prisma";
import TopBar from "@/components/layout/TopBar";

const STATUS_COLOR: Record<string, string> = { IN_PRODUCTION: "#f59e0b" };

export default async function ProductionQueuePage() {
  await requireAuth();

  const orders = await prisma.order.findMany({
    where:   { status: "IN_PRODUCTION" },
    orderBy: [{ deliveryDate: "asc" }, { orderDate: "asc" }],
    include: {
      customer: { select: { name: true, phone: true } },
      items: {
        select: { designCode: true, designName: true, quantity: true },
        orderBy: { id: "asc" },
      },
    },
  });

  const today = new Date(); today.setHours(0, 0, 0, 0);

  const th: React.CSSProperties = {
    padding: "0.55rem 0.75rem", fontSize: "0.62rem", letterSpacing: "0.1em",
    color: "rgba(240,237,230,0.3)", fontWeight: 600,
    borderBottom: "1px solid rgba(245,182,30,0.1)", textAlign: "left",
  };
  const td: React.CSSProperties = {
    padding: "0.65rem 0.75rem", borderBottom: "1px solid rgba(245,182,30,0.05)", verticalAlign: "top",
  };

  return (
    <>
      <TopBar title="Production Queue" />
      <div style={{ padding: "1.5rem 1.75rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
          <p style={{ fontSize: "0.75rem", color: "rgba(240,237,230,0.35)" }}>
            {orders.length} order{orders.length !== 1 ? "s" : ""} in production · sorted by delivery date
          </p>
        </div>

        {orders.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem", fontSize: "0.82rem", color: "rgba(240,237,230,0.2)" }}>
            No orders currently in production.
          </div>
        ) : (
          <div className="content-card" style={{ overflow: "clip", borderRadius: "0.7rem" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ position: "sticky", top: "4.5rem", background: "#0d0d0d", zIndex: 2 }}>
                <tr>
                  <th style={th}>ORDER</th>
                  <th style={th}>CUSTOMER</th>
                  <th style={th}>ITEMS</th>
                  <th style={th}>DELIVERY</th>
                  <th style={th}>DAYS LEFT</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const deliveryDate = order.deliveryDate ? new Date(order.deliveryDate) : null;
                  const daysLeft = deliveryDate
                    ? Math.ceil((deliveryDate.getTime() - today.getTime()) / 86400000)
                    : null;
                  const urgentColor = daysLeft !== null && daysLeft <= 2 ? "#F87171" : daysLeft !== null && daysLeft <= 5 ? "#FBBF24" : "#4ADE80";

                  return (
                    <tr key={order.id}>
                      <td style={td}>
                        <Link href={`/orders/${order.id}`} style={{ color: "#F5B61E", fontWeight: 700, textDecoration: "none", fontSize: "0.85rem" }}>
                          {order.orderNo}
                        </Link>
                      </td>
                      <td style={td}>
                        <div style={{ fontSize: "0.82rem", color: "#F0EDE6", fontWeight: 500 }}>{order.customer.name}</div>
                        <div style={{ fontSize: "0.65rem", color: "rgba(240,237,230,0.4)" }}>{order.customer.phone}</div>
                      </td>
                      <td style={td}>
                        {order.items.map((item, i) => (
                          <div key={i} style={{ fontSize: "0.72rem", color: "rgba(240,237,230,0.6)", marginBottom: "0.15rem" }}>
                            <span style={{ color: "#F0EDE6", fontWeight: 500 }}>{item.quantity}×</span> {item.designCode} {item.designName}
                          </div>
                        ))}
                      </td>
                      <td style={{ ...td, whiteSpace: "nowrap" }}>
                        {deliveryDate
                          ? <span style={{ fontSize: "0.8rem", color: "#F0EDE6" }}>{deliveryDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</span>
                          : <span style={{ fontSize: "0.72rem", color: "rgba(240,237,230,0.3)" }}>—</span>
                        }
                      </td>
                      <td style={td}>
                        {daysLeft !== null ? (
                          <span style={{ fontSize: "0.72rem", fontWeight: 700, color: urgentColor, background: `${urgentColor}18`, padding: "0.15rem 0.55rem", borderRadius: "0.3rem", border: `1px solid ${urgentColor}35` }}>
                            {daysLeft === 0 ? "TODAY" : daysLeft < 0 ? `${Math.abs(daysLeft)}d OVERDUE` : `${daysLeft}d`}
                          </span>
                        ) : (
                          <span style={{ fontSize: "0.65rem", color: "rgba(240,237,230,0.2)" }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
