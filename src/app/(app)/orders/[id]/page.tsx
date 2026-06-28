import { requireAuth } from "@/lib/auth-guards";
import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import TopBar from "@/components/layout/TopBar";
import Link from "next/link";
import { FileText } from "lucide-react";
import { STATUS_LABELS, STATUS_CSS, type OrderStatusKey } from "@/lib/utils/status-transitions";
import OrderStatusForm from "./OrderStatusForm";
import PaymentSection from "./PaymentSection";
import WhatsAppShareButton from "./WhatsAppShareButton";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAuth();
  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id: Number(id) },
    include: {
      customer: true,
      items: {
        orderBy: { id: "asc" },
        include: {
          boxDesign: {
            select: {
              material:   { select: { status: true } },
              designType: { select: { name: true } },
              lengthCm: true, widthCm: true, heightCm: true,
              lengthIn: true, widthIn: true, heightIn: true,
            },
          },
        },
      },
      statusHistory: {
        orderBy: { changedAt: "desc" },
        include: { changedBy: { select: { username: true } } },
      },
      payments: {
        orderBy: { paymentDate: "asc" },
        select: { id: true, amount: true, paymentDate: true, method: true, referenceNo: true, note: true },
      },
      deliveryMethod: { select: { name: true } },
    },
  });

  if (!order) notFound();

  // Old Spring Boot orders have no public_token — generate and persist one on first view.
  let publicToken = order.publicToken;
  if (!publicToken) {
    const { randomBytes } = await import("crypto");
    publicToken = randomBytes(32).toString("hex");
    await prisma.order.update({ where: { id: order.id }, data: { publicToken } });
  }

  function itemSizeStr(bd: { lengthIn?: unknown; widthIn?: unknown; heightIn?: unknown; lengthCm?: unknown; widthCm?: unknown; heightCm?: unknown } | null): string | undefined {
    if (!bd) return undefined;
    const inDims = [bd.lengthIn, bd.widthIn, bd.heightIn].filter((v): v is NonNullable<typeof v> => v != null).map((v) => Number(v).toFixed(0));
    if (inDims.length === 3) return `${inDims.join("×")} in`;
    const cmDims = [bd.lengthCm, bd.widthCm, bd.heightCm].filter((v): v is NonNullable<typeof v> => v != null).map((v) => Number(v).toFixed(0));
    if (cmDims.length === 3) return `${cmDims.join("×")} cm`;
    return undefined;
  }

  const totalAmount    = Number(order.totalAmount);
  const discountAmount = Number(order.discountAmount);
  const deliveryCharge = Number(order.deliveryCharge);
  const netAmount      = Number(order.netAmount);
  const discountPct    = totalAmount > 0 ? Math.round((discountAmount / totalAmount) * 100 * 100) / 100 : 0;

  const hasPendingMaterial = order.items.some(
    (item) => item.boxDesign?.material?.status === "PENDING"
  );

  const payments = order.payments.map((p) => ({
    ...p,
    amount:      Number(p.amount),
    paymentDate: p.paymentDate.toISOString().split("T")[0],
  }));

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const balance   = netAmount - totalPaid;

  const deliveryDate = order.deliveryDate?.toISOString().split("T")[0] ?? null;
  const orderDate    = order.orderDate.toISOString().split("T")[0];

  const section: React.CSSProperties = {
    borderTop: "1px solid rgba(245,182,30,0.08)", paddingTop: "1.25rem", marginTop: "1.25rem",
  };
  const metaLabel: React.CSSProperties = { fontSize: "0.62rem", letterSpacing: "0.08em", color: "rgba(240,237,230,0.3)", marginBottom: "0.25rem" };
  const metaValue: React.CSSProperties = { fontSize: "0.88rem", color: "#F0EDE6", fontWeight: 500 };

  return (
    <>
      <TopBar title={order.orderNo} />

      <div style={{ padding: "1.5rem 1.75rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem" }}>
          <Link href="/orders" className="nav-link" style={{ fontSize: "0.68rem" }}>← Orders</Link>
          <span style={{ color: "rgba(240,237,230,0.2)", fontSize: "0.7rem" }}>/</span>
          <span style={{ fontSize: "0.78rem", color: "rgba(240,237,230,0.5)" }}>{order.orderNo}</span>
        </div>

        {hasPendingMaterial && (
          <div style={{
            display: "flex", alignItems: "flex-start", gap: "0.65rem",
            padding: "0.75rem 1rem", marginBottom: "1rem",
            background: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.25)",
            borderRadius: "0.6rem",
          }}>
            <span style={{ fontSize: "0.9rem", flexShrink: 0, marginTop: "0.05rem" }}>⚠</span>
            <div>
              <p style={{ fontSize: "0.78rem", fontWeight: 600, color: "#FBBF24", margin: 0 }}>
                Pending material
              </p>
              <p style={{ fontSize: "0.72rem", color: "rgba(251,191,36,0.7)", margin: "0.15rem 0 0" }}>
                One or more box designs in this order use a material that is pending purchase. Confirm stock before moving to production.
              </p>
            </div>
          </div>
        )}

        <div className="content-card">
          {/* ── Order Header ── */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", marginBottom: "1.25rem" }}>
            <div>
              <h2 style={{ fontSize: "1.15rem", fontWeight: 700, color: "#F5B61E", letterSpacing: "0.04em" }}>
                {order.orderNo}
              </h2>
              <span className={`status-pill ${STATUS_CSS[order.status as OrderStatusKey]}`} style={{ marginTop: "0.4rem", display: "inline-block" }}>
                {STATUS_LABELS[order.status as OrderStatusKey]?.toUpperCase()}
              </span>
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              {["DRAFT", "CONFIRMED", "IN_PRODUCTION"].includes(order.status) && (
                <Link href={`/orders/${order.id}/edit`}>
                  <button style={{
                    display: "flex", alignItems: "center", gap: "0.4rem",
                    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(245,182,30,0.15)",
                    borderRadius: "0.5rem", padding: "0.5rem 0.9rem",
                    color: "rgba(240,237,230,0.6)", fontSize: "0.68rem", letterSpacing: "0.07em", cursor: "pointer",
                  }}>
                    EDIT ORDER
                  </button>
                </Link>
              )}
              <Link href={`/orders/${order.id}/invoice`} target="_blank">
                <button style={{
                  display: "flex", alignItems: "center", gap: "0.4rem",
                  background: "rgba(245,182,30,0.07)", border: "1px solid rgba(245,182,30,0.2)",
                  borderRadius: "0.5rem", padding: "0.5rem 0.9rem",
                  color: "#F5B61E", fontSize: "0.68rem", letterSpacing: "0.07em", cursor: "pointer",
                }}>
                  <FileText size={13} /> INVOICE
                </button>
              </Link>
              <WhatsAppShareButton
                orderNo={order.orderNo}
                customerName={order.customer.name}
                orderDate={orderDate}
                deliveryDate={deliveryDate}
                items={order.items.map((item) => ({
                  code:        item.designCode,
                  name:        item.designName,
                  boxTypeName: item.boxDesign?.designType?.name ?? undefined,
                  sizeStr:     itemSizeStr(item.boxDesign ?? null),
                  quantity:    item.quantity,
                  unitPrice:   Number(item.unitPrice),
                  lineTotal:   Number(item.lineTotal),
                }))}
                totalAmount={totalAmount}
                discountAmount={discountAmount}
                discountPct={discountPct}
                deliveryCharge={deliveryCharge}
                deliveryMethodName={order.deliveryMethod?.name}
                netAmount={netAmount}
                totalPaid={totalPaid}
                balance={balance}
                publicToken={publicToken}
              />
            </div>
          </div>

          {/* ── Meta Info ── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "1rem", marginBottom: "1.25rem" }}>
            <div>
              <p style={metaLabel}>CUSTOMER</p>
              <p style={{ ...metaValue, color: "#F0EDE6", fontWeight: 600 }}>{order.customer.name}</p>
              <p style={{ fontSize: "0.72rem", color: "rgba(240,237,230,0.45)" }}>{order.customer.phone}</p>
            </div>
            <div>
              <p style={metaLabel}>ORDER DATE</p>
              <p style={metaValue}>{orderDate}</p>
            </div>
            <div>
              <p style={metaLabel}>DELIVERY DATE</p>
              <p style={{ ...metaValue, color: deliveryDate ? "#F0EDE6" : "rgba(240,237,230,0.25)" }}>{deliveryDate ?? "Not set"}</p>
            </div>
            {order.deliveryMethod && (
              <div>
                <p style={metaLabel}>DELIVERY METHOD</p>
                <p style={metaValue}>{order.deliveryMethod.name}</p>
              </div>
            )}
            {deliveryCharge > 0 && (
              <div>
                <p style={metaLabel}>DELIVERY CHARGE</p>
                <p style={metaValue}>Rs. {deliveryCharge.toFixed(2)}</p>
              </div>
            )}
            {order.remarks && (
              <div style={{ gridColumn: "1 / -1" }}>
                <p style={metaLabel}>REMARKS</p>
                <p style={{ ...metaValue, fontSize: "0.82rem", color: "rgba(240,237,230,0.7)", whiteSpace: "pre-line" }}>{order.remarks}</p>
              </div>
            )}
          </div>

          {/* ── Items Table ── */}
          <div style={section}>
            <h3 style={{ fontSize: "0.75rem", letterSpacing: "0.1em", color: "rgba(240,237,230,0.4)", marginBottom: "0.9rem" }}>
              ORDER ITEMS
            </h3>
            <div style={{ overflowX: "auto" }}>
              <table className="orders-table">
                <thead>
                  <tr>
                    <th>CODE</th>
                    <th>DESIGN NAME</th>
                    <th style={{ textAlign: "right" }}>QTY</th>
                    <th style={{ textAlign: "right" }}>UNIT PRICE</th>
                    <th style={{ textAlign: "right" }}>LINE TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => {
                    const boxTypeName = item.boxDesign?.designType?.name;
                    const sizeStr     = itemSizeStr(item.boxDesign ?? null);
                    return (
                      <tr key={item.id}>
                        <td style={{ fontWeight: 700, color: "#F5B61E", fontSize: "0.72rem", letterSpacing: "0.06em" }}>{item.designCode}</td>
                        <td style={{ color: "#F0EDE6" }}>
                          <div>{item.designName}</div>
                          {(boxTypeName || sizeStr) && (
                            <div style={{ fontSize: "0.68rem", color: "rgba(240,237,230,0.3)", marginTop: "0.1rem" }}>
                              {[boxTypeName, sizeStr].filter(Boolean).join("  ·  ")}
                            </div>
                          )}
                        </td>
                        <td style={{ textAlign: "right", color: "rgba(240,237,230,0.7)" }}>{item.quantity.toLocaleString()}</td>
                        <td style={{ textAlign: "right", color: "rgba(240,237,230,0.7)" }}>Rs. {Number(item.unitPrice).toFixed(2)}</td>
                        <td style={{ textAlign: "right", fontWeight: 600, color: "#F0EDE6" }}>Rs. {Number(item.lineTotal).toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem" }}>
              <div style={{ minWidth: "240px", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", color: "rgba(240,237,230,0.55)" }}>
                  <span>Total</span>
                  <span>Rs. {totalAmount.toFixed(2)}</span>
                </div>
                {discountAmount > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", color: "#F87171" }}>
                    <span>Discount ({discountPct}%)</span>
                    <span>− Rs. {discountAmount.toFixed(2)}</span>
                  </div>
                )}
                {deliveryCharge > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", color: "rgba(240,237,230,0.55)" }}>
                    <span>{order.deliveryMethod?.name ?? "Delivery"}</span>
                    <span>Rs. {deliveryCharge.toFixed(2)}</span>
                  </div>
                )}
                <div style={{
                  display: "flex", justifyContent: "space-between",
                  fontSize: "1rem", fontWeight: 700, color: "#F5B61E",
                  borderTop: "1px solid rgba(245,182,30,0.15)", paddingTop: "0.45rem", marginTop: "0.2rem",
                }}>
                  <span>Net Amount</span>
                  <span>Rs. {netAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Payments ── */}
          <div style={section}>
            <PaymentSection
              orderId={order.id}
              netAmount={netAmount}
              payments={payments}
              isTerminal={["DELIVERED", "CANCELLED"].includes(order.status)}
            />
          </div>

          {/* ── Status Update ── */}
          <div style={section}>
            <OrderStatusForm orderId={order.id} currentStatus={order.status as OrderStatusKey} />
          </div>

          {/* ── Status History ── */}
          {order.statusHistory.length > 0 && (
            <div style={section}>
              <h3 style={{ fontSize: "0.75rem", letterSpacing: "0.1em", color: "rgba(240,237,230,0.4)", marginBottom: "0.9rem" }}>
                STATUS HISTORY
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {order.statusHistory.map((h) => (
                  <div key={h.id} style={{
                    display: "flex", alignItems: "center", gap: "0.75rem",
                    fontSize: "0.75rem", color: "rgba(240,237,230,0.5)",
                  }}>
                    <span style={{ color: "rgba(240,237,230,0.3)", flexShrink: 0 }}>
                      {h.changedAt.toISOString().replace("T", " ").slice(0, 16)}
                    </span>
                    <span className={`status-pill ${STATUS_CSS[h.fromStatus as OrderStatusKey]}`} style={{ fontSize: "0.55rem" }}>
                      {STATUS_LABELS[h.fromStatus as OrderStatusKey]}
                    </span>
                    <span style={{ color: "rgba(240,237,230,0.25)" }}>→</span>
                    <span className={`status-pill ${STATUS_CSS[h.toStatus as OrderStatusKey]}`} style={{ fontSize: "0.55rem" }}>
                      {STATUS_LABELS[h.toStatus as OrderStatusKey]}
                    </span>
                    {h.changedBy && <span style={{ color: "rgba(240,237,230,0.3)" }}>by {h.changedBy.username}</span>}
                    {h.note && <span style={{ color: "rgba(240,237,230,0.45)", fontStyle: "italic" }}>— {h.note}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
