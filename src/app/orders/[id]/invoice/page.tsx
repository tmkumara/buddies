import { requireAuth } from "@/lib/auth-guards";
import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import PrintButton from "./PrintButton";

const COMPANY = {
  name:    "Buddies",
  tagline: "Your Vision, Our Mission",
  phone:   "0783085081 / 0707490585",
  email:   "hello.buddieslk@gmail.com",
  web:     "www.buddiescraft.net",
  city:    "Athurugiriya, Sri Lanka",
};

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAuth();
  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id: Number(id) },
    include: {
      customer: true,
      items:    { orderBy: { id: "asc" } },
      payments: { orderBy: { paymentDate: "asc" }, select: { amount: true, paymentDate: true, method: true, referenceNo: true } },
    },
  });

  if (!order) notFound();

  const totalAmount    = Number(order.totalAmount);
  const discountAmount = Number(order.discountAmount);
  const netAmount      = Number(order.netAmount);
  const discountPct    = totalAmount > 0 ? Math.round((discountAmount / totalAmount) * 100 * 10) / 10 : 0;
  const totalPaid      = order.payments.reduce((s, p) => s + Number(p.amount), 0);
  const balance        = netAmount - totalPaid;
  const orderDate      = order.orderDate.toISOString().split("T")[0];
  const deliveryDate   = order.deliveryDate?.toISOString().split("T")[0] ?? null;

  const METHOD: Record<string, string> = { CASH: "Cash", BANK_TRANSFER: "Bank Transfer", CHEQUE: "Cheque" };

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; background: #0d0d0d; font-family: 'Plus Jakarta Sans', system-ui, sans-serif; }

        .inv-page { min-height: 100vh; background: #0d0d0d; padding: 0 1rem 3rem; }

        .inv-nav {
          max-width: 760px; margin: 0 auto; padding: 1.25rem 0;
          display: flex; align-items: center; justify-content: space-between; gap: 1rem;
        }

        .inv-sheet {
          max-width: 760px; margin: 0 auto;
          background: #141414;
          border: 1px solid rgba(245,182,30,0.15);
          border-radius: 0.75rem;
          padding: 2.5rem 2.75rem;
          color: #F0EDE6;
        }

        .inv-co-name { font-size: 1.75rem; font-weight: 800; color: #F5B61E; letter-spacing: 0.06em; margin: 0; }
        .inv-co-tag  { font-size: 0.65rem; color: rgba(240,237,230,0.35); letter-spacing: 0.1em; margin: 0.2rem 0 0; text-transform: uppercase; }

        .inv-divider { border: none; border-top: 1px solid rgba(245,182,30,0.1); margin: 1.5rem 0; }

        .inv-label { font-size: 0.58rem; letter-spacing: 0.12em; color: rgba(240,237,230,0.35); text-transform: uppercase; margin-bottom: 0.3rem; }

        .inv-table { width: 100%; border-collapse: collapse; margin-top: 0.5rem; }
        .inv-table th {
          padding: 0.55rem 0.75rem; font-size: 0.6rem; letter-spacing: 0.1em;
          color: rgba(240,237,230,0.35); font-weight: 600; text-align: left;
          border-bottom: 1px solid rgba(245,182,30,0.12);
        }
        .inv-table th.r { text-align: right; }
        .inv-table td {
          padding: 0.6rem 0.75rem; font-size: 0.8rem;
          border-bottom: 1px solid rgba(245,182,30,0.05); color: #F0EDE6;
        }
        .inv-table td.r   { text-align: right; }
        .inv-table td.muted { color: rgba(240,237,230,0.4); font-size: 0.72rem; }
        .inv-table tbody tr:last-child td { border-bottom: none; }

        .inv-tot-row { display: flex; justify-content: space-between; font-size: 0.82rem; padding: 0.3rem 0; color: rgba(240,237,230,0.55); }
        .inv-net-row { display: flex; justify-content: space-between; font-size: 1rem; font-weight: 800; color: #F5B61E; border-top: 1px solid rgba(245,182,30,0.2); padding-top: 0.6rem; margin-top: 0.3rem; }
        .inv-balance  { font-weight: 700; }

        .inv-footer { text-align: center; font-size: 0.65rem; color: rgba(240,237,230,0.2); margin-top: 2rem; padding-top: 1rem; border-top: 1px solid rgba(245,182,30,0.07); letter-spacing: 0.06em; }

        @media print {
          .no-print { display: none !important; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          body { background: #0d0d0d !important; }
          .inv-page { padding: 0; }
          .inv-sheet { max-width: 100%; border-radius: 0; border: none; margin: 0; padding: 2rem; }
        }
      `}</style>

      <div className="inv-page">
        {/* Nav bar */}
        <div className="inv-nav no-print">
          <Link href={`/orders/${order.id}`} style={{ fontSize: "0.75rem", color: "rgba(240,237,230,0.45)", textDecoration: "none" }}>
            ← Back to Order
          </Link>
          <PrintButton />
        </div>

        {/* Invoice sheet */}
        <div className="inv-sheet">

          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
            <div>
              <h1 className="inv-co-name">{COMPANY.name}</h1>
              <p className="inv-co-tag">{COMPANY.tagline}</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: "0.6rem", letterSpacing: "0.1em", color: "rgba(240,237,230,0.3)", margin: 0 }}>INVOICE</p>
              <p style={{ fontSize: "1.05rem", fontWeight: 700, color: "#F0EDE6", margin: "0.2rem 0 0", letterSpacing: "0.04em" }}>{order.orderNo}</p>
            </div>
          </div>

          {/* Company contact line */}
          <p style={{ fontSize: "0.65rem", color: "rgba(240,237,230,0.28)", margin: "0.3rem 0 0" }}>
            {COMPANY.phone} · {COMPANY.email} · {COMPANY.web} · {COMPANY.city}
          </p>

          <hr className="inv-divider" />

          {/* Bill to + dates */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", marginBottom: "1.5rem" }}>
            <div>
              <p className="inv-label">Bill To</p>
              <p style={{ fontWeight: 700, fontSize: "0.95rem", color: "#F0EDE6", margin: "0 0 0.2rem" }}>{order.customer.name}</p>
              <p style={{ fontSize: "0.78rem", color: "rgba(240,237,230,0.55)", margin: "0 0 0.1rem" }}>{order.customer.phone}</p>
              {order.customer.phone2     && <p style={{ fontSize: "0.78rem", color: "rgba(240,237,230,0.55)", margin: 0 }}>{order.customer.phone2}</p>}
              {order.customer.email      && <p style={{ fontSize: "0.75rem", color: "rgba(240,237,230,0.45)", margin: "0.1rem 0 0" }}>{order.customer.email}</p>}
              {order.customer.addressLine && <p style={{ fontSize: "0.72rem", color: "rgba(240,237,230,0.35)", margin: "0.2rem 0 0", whiteSpace: "pre-line" }}>{order.customer.addressLine}</p>}
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ marginBottom: "0.6rem" }}>
                <p className="inv-label">Order Date</p>
                <p style={{ fontWeight: 600, margin: 0, color: "#F0EDE6" }}>{orderDate}</p>
              </div>
              {deliveryDate && (
                <div style={{ marginBottom: "0.6rem" }}>
                  <p className="inv-label">Delivery Date</p>
                  <p style={{ fontWeight: 600, margin: 0, color: "#F0EDE6" }}>{deliveryDate}</p>
                </div>
              )}
              <div>
                <p className="inv-label">Status</p>
                <p style={{ fontWeight: 600, margin: 0, color: "#F5B61E", fontSize: "0.82rem" }}>{order.status.replace(/_/g, " ")}</p>
              </div>
            </div>
          </div>

          {/* Remarks */}
          {order.remarks && (
            <div style={{ marginBottom: "1.25rem", padding: "0.65rem 0.9rem", background: "rgba(245,182,30,0.04)", borderLeft: "2px solid rgba(245,182,30,0.25)", borderRadius: "0 0.3rem 0.3rem 0" }}>
              <p className="inv-label">Remarks</p>
              <p style={{ fontSize: "0.8rem", color: "rgba(240,237,230,0.65)", margin: 0, whiteSpace: "pre-line" }}>{order.remarks}</p>
            </div>
          )}

          {/* Items table */}
          <table className="inv-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Code</th>
                <th>Design Name</th>
                <th className="r">Qty</th>
                <th className="r">Unit Price</th>
                <th className="r">Line Total</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, idx) => (
                <tr key={item.id}>
                  <td className="muted">{idx + 1}</td>
                  <td style={{ fontWeight: 700, color: "#F5B61E", fontSize: "0.72rem", letterSpacing: "0.05em" }}>{item.designCode}</td>
                  <td>{item.designName}</td>
                  <td className="r">{item.quantity.toLocaleString()}</td>
                  <td className="r" style={{ color: "rgba(240,237,230,0.6)" }}>Rs. {Number(item.unitPrice).toFixed(2)}</td>
                  <td className="r" style={{ fontWeight: 600 }}>Rs. {Number(item.lineTotal).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1.25rem", marginBottom: "1.5rem" }}>
            <div style={{ minWidth: "260px" }}>
              <div className="inv-tot-row"><span>Subtotal</span><span>Rs. {totalAmount.toFixed(2)}</span></div>
              {discountAmount > 0 && (
                <div className="inv-tot-row" style={{ color: "#F87171" }}>
                  <span>Discount ({discountPct}%)</span><span>− Rs. {discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="inv-net-row"><span>Net Amount</span><span>Rs. {netAmount.toFixed(2)}</span></div>
              <div className="inv-tot-row" style={{ marginTop: "0.5rem" }}>
                <span style={{ color: "#4ADE80" }}>Paid</span>
                <span style={{ color: "#4ADE80", fontWeight: 600 }}>Rs. {totalPaid.toFixed(2)}</span>
              </div>
              {balance > 0.01 && (
                <div className="inv-tot-row">
                  <span className="inv-balance" style={{ color: "#F87171" }}>Balance Due</span>
                  <span className="inv-balance" style={{ color: "#F87171" }}>Rs. {balance.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Payments */}
          {order.payments.length > 0 && (
            <div style={{ marginBottom: "1.5rem" }}>
              <p className="inv-label" style={{ marginBottom: "0.5rem" }}>Payment History</p>
              {order.payments.map((p, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", marginBottom: "0.2rem", color: "rgba(240,237,230,0.45)" }}>
                  <span>{p.paymentDate.toISOString().split("T")[0]} — {METHOD[p.method] ?? p.method}{p.referenceNo ? ` (#${p.referenceNo})` : ""}</span>
                  <span style={{ color: "#4ADE80", fontWeight: 600 }}>Rs. {Number(p.amount).toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}

          <div className="inv-footer">
            Thank you for choosing {COMPANY.name} · {COMPANY.phone} · {COMPANY.email}
          </div>
        </div>
      </div>
    </>
  );
}
