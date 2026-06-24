import { requireAuth } from "@/lib/auth-guards";
import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import PrintButton from "./PrintButton";

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAuth();
  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id: Number(id) },
    include: {
      customer: true,
      items:    { orderBy: { id: "asc" } },
    },
  });

  if (!order) notFound();

  const totalAmount    = Number(order.totalAmount);
  const discountAmount = Number(order.discountAmount);
  const netAmount      = Number(order.netAmount);
  const discountPct    = totalAmount > 0 ? Math.round((discountAmount / totalAmount) * 100 * 100) / 100 : 0;
  const orderDate      = order.orderDate.toISOString().split("T")[0];
  const deliveryDate   = order.deliveryDate?.toISOString().split("T")[0] ?? "—";

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; color: #111 !important; }
          .invoice-wrap { max-width: 100% !important; padding: 0 !important; }
        }
        body { background: #111; }
        .invoice-wrap { background: #fff; color: #111; max-width: 720px; margin: 2rem auto; padding: 2.5rem; font-family: 'Plus Jakarta Sans', system-ui, sans-serif; border-radius: 0.75rem; }
        .inv-table { width: 100%; border-collapse: collapse; margin-top: 0.75rem; }
        .inv-table th { padding: 0.5rem 0.75rem; font-size: 0.65rem; letter-spacing: 0.1em; color: #555; border-bottom: 1.5px solid #e5e5e5; text-align: left; }
        .inv-table td { padding: 0.55rem 0.75rem; font-size: 0.8rem; border-bottom: 1px solid #f0f0f0; }
        .inv-table tr:last-child td { border-bottom: none; }
      `}</style>

      {/* Screen-only nav */}
      <div className="no-print" style={{ maxWidth: "720px", margin: "1.5rem auto", padding: "0 1rem", display: "flex", gap: "0.75rem", alignItems: "center" }}>
        <Link href={`/orders/${order.id}`} style={{ fontSize: "0.75rem", color: "rgba(240,237,230,0.5)", textDecoration: "none" }}>
          ← Back to Order
        </Link>
        <PrintButton />
      </div>

      <div className="invoice-wrap">
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem", borderBottom: "2px solid #f0f0f0", paddingBottom: "1.5rem" }}>
          <div>
            <h1 style={{ fontSize: "1.6rem", fontWeight: 800, color: "#111", letterSpacing: "0.04em", margin: 0 }}>BUDDIES</h1>
            <p style={{ fontSize: "0.7rem", color: "#888", margin: "0.15rem 0 0", letterSpacing: "0.1em" }}>GIFT BOX OMS</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: "0.65rem", letterSpacing: "0.1em", color: "#888", margin: 0 }}>INVOICE</p>
            <p style={{ fontSize: "1.1rem", fontWeight: 700, color: "#111", margin: "0.2rem 0 0", letterSpacing: "0.04em" }}>{order.orderNo}</p>
          </div>
        </div>

        {/* Dates + Customer */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", marginBottom: "2rem" }}>
          <div>
            <p style={{ fontSize: "0.62rem", letterSpacing: "0.1em", color: "#888", marginBottom: "0.5rem" }}>BILL TO</p>
            <p style={{ fontWeight: 700, fontSize: "0.95rem", margin: "0 0 0.2rem" }}>{order.customer.name}</p>
            <p style={{ fontSize: "0.8rem", color: "#555", margin: "0 0 0.15rem" }}>{order.customer.phone}</p>
            {order.customer.email && <p style={{ fontSize: "0.78rem", color: "#555", margin: 0 }}>{order.customer.email}</p>}
            {order.customer.addressLine && (
              <p style={{ fontSize: "0.75rem", color: "#777", margin: "0.2rem 0 0", whiteSpace: "pre-line" }}>{order.customer.addressLine}</p>
            )}
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ marginBottom: "0.5rem" }}>
              <p style={{ fontSize: "0.62rem", letterSpacing: "0.1em", color: "#888", margin: "0 0 0.15rem" }}>ORDER DATE</p>
              <p style={{ fontWeight: 600, margin: 0 }}>{orderDate}</p>
            </div>
            <div style={{ marginBottom: "0.5rem" }}>
              <p style={{ fontSize: "0.62rem", letterSpacing: "0.1em", color: "#888", margin: "0 0 0.15rem" }}>DELIVERY DATE</p>
              <p style={{ fontWeight: 600, margin: 0 }}>{deliveryDate}</p>
            </div>
            {order.status && (
              <div>
                <p style={{ fontSize: "0.62rem", letterSpacing: "0.1em", color: "#888", margin: "0 0 0.15rem" }}>STATUS</p>
                <p style={{ fontWeight: 600, margin: 0 }}>{order.status}</p>
              </div>
            )}
          </div>
        </div>

        {/* Remarks */}
        {order.remarks && (
          <div style={{ marginBottom: "1.25rem", padding: "0.75rem 1rem", background: "#f8f8f8", borderRadius: "0.4rem", borderLeft: "3px solid #e5e5e5" }}>
            <p style={{ fontSize: "0.62rem", letterSpacing: "0.1em", color: "#888", margin: "0 0 0.3rem" }}>REMARKS</p>
            <p style={{ fontSize: "0.8rem", color: "#444", margin: 0, whiteSpace: "pre-line" }}>{order.remarks}</p>
          </div>
        )}

        {/* Items Table */}
        <table className="inv-table">
          <thead>
            <tr>
              <th>#</th>
              <th>CODE</th>
              <th>DESIGN NAME</th>
              <th style={{ textAlign: "right" }}>QTY</th>
              <th style={{ textAlign: "right" }}>UNIT PRICE</th>
              <th style={{ textAlign: "right" }}>LINE TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item, idx) => (
              <tr key={item.id}>
                <td style={{ color: "#aaa", fontSize: "0.72rem" }}>{idx + 1}</td>
                <td style={{ fontWeight: 700, fontSize: "0.75rem", color: "#333" }}>{item.designCode}</td>
                <td style={{ color: "#222" }}>{item.designName}</td>
                <td style={{ textAlign: "right", color: "#444" }}>{item.quantity.toLocaleString()}</td>
                <td style={{ textAlign: "right", color: "#444" }}>Rs. {Number(item.unitPrice).toFixed(2)}</td>
                <td style={{ textAlign: "right", fontWeight: 600, color: "#111" }}>Rs. {Number(item.lineTotal).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1.25rem" }}>
          <div style={{ minWidth: "240px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "0.4rem 0", fontSize: "0.82rem", color: "#555", borderBottom: "1px solid #f0f0f0" }}>
              <span>Subtotal</span>
              <span>Rs. {totalAmount.toFixed(2)}</span>
            </div>
            {discountAmount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "0.4rem 0", fontSize: "0.82rem", color: "#E53E3E", borderBottom: "1px solid #f0f0f0" }}>
                <span>Discount ({discountPct}%)</span>
                <span>− Rs. {discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "0.6rem 0 0", fontSize: "1rem", fontWeight: 800, color: "#111" }}>
              <span>Net Amount</span>
              <span>Rs. {netAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: "2.5rem", paddingTop: "1rem", borderTop: "1px solid #eee", fontSize: "0.68rem", color: "#bbb", textAlign: "center" }}>
          Thank you for your business.
        </div>
      </div>
    </>
  );
}
