import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getInvoiceDataByToken } from "@/lib/invoice-data";
import PrintButton from "./PrintButton";

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const data = await getInvoiceDataByToken(token);
  if (!data) return {};
  return { title: `Invoice ${data.orderNo} — Buddies Gift Box` };
}

const COMPANY = {
  name:    "Buddies",
  tagline: "Your Vision, Our Mission",
  phone:   "0783085081 / 0707490585",
  email:   "hello.buddieslk@gmail.com",
  web:     "www.buddiescraft.net",
  city:    "Athurugiriya, Sri Lanka",
};

const METHOD_LABEL: Record<string, string> = {
  CASH: "Cash", BANK_TRANSFER: "Bank Transfer", CHEQUE: "Cheque",
};

export default async function PublicInvoicePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const data = await getInvoiceDataByToken(token);
  if (!data) notFound();

  const pdfUrl = `/api/invoice/${token}/pdf`;

  return (
    <div className="inv-sheet">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/buddiesicon-removebg.png" alt="" className="inv-watermark" aria-hidden="true" />
      <div className="inv-content">
        {/* Actions */}
        <div className="no-print" style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginBottom: "1.5rem" }}>
          <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="inv-btn inv-btn-pdf">⬇ Download PDF</a>
          <PrintButton />
        </div>

      {/* Header */}
      <div className="inv-header">
        <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/buddiesicon-removebg.png" alt="Buddies logo" style={{ width: "52px", height: "52px", objectFit: "contain" }} />
          <div>
            <div style={{ fontSize: "1.35rem", fontWeight: 800, color: "#1a1a1a", marginBottom: "0.15rem" }}>{COMPANY.name}</div>
            <div style={{ fontSize: "0.65rem", color: "#6b7280", letterSpacing: "0.07em", marginBottom: "0.5rem" }}>{COMPANY.tagline.toUpperCase()}</div>
            <div style={{ fontSize: "0.7rem", color: "#6b7280" }}>{COMPANY.phone} · {COMPANY.email}</div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: "0.25rem" }}>INVOICE</div>
          <div style={{ fontSize: "0.9rem", color: "#555", marginBottom: "0.15rem" }}># {data.orderNo}</div>
          <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>Date: {data.orderDate}</div>
          {data.deliveryDate && <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>Delivery: {data.deliveryDate}</div>}
        </div>
      </div>

      <div className="inv-divider" />

      {/* Customer */}
      <div style={{ marginBottom: "1.5rem" }}>
        <div className="inv-label">Bill To</div>
        <div style={{ fontWeight: 700, fontSize: "1rem", marginBottom: "0.2rem" }}>{data.customer.name}</div>
        <div style={{ fontSize: "0.8rem", color: "#555" }}>{data.customer.phone}</div>
        {data.customer.phone2 && <div style={{ fontSize: "0.8rem", color: "#555" }}>{data.customer.phone2}</div>}
        {data.customer.email && <div style={{ fontSize: "0.8rem", color: "#555" }}>{data.customer.email}</div>}
        {data.customer.addressLine && <div style={{ fontSize: "0.8rem", color: "#555" }}>{data.customer.addressLine}</div>}
      </div>

      {/* Items */}
      <table className="inv-table">
        <thead>
          <tr>
            <th>CODE</th>
            <th>DESCRIPTION</th>
            <th className="inv-tr">QTY</th>
            <th className="inv-tr">UNIT PRICE</th>
            <th className="inv-tr">TOTAL</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((item, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#f9fafb" }}>
              <td>{item.designCode}</td>
              <td>
                <div>{item.designName}</div>
                {(item.boxTypeName || item.sizeCm) && (
                  <div style={{ fontSize: "0.68rem", color: "#9ca3af", marginTop: "0.15rem" }}>
                    {[item.boxTypeName, item.sizeCm].filter(Boolean).join("  ·  ")}
                  </div>
                )}
              </td>
              <td className="inv-tr">{item.quantity}</td>
              <td className="inv-tr">Rs. {item.unitPrice.toFixed(2)}</td>
              <td className="inv-tr">Rs. {item.lineTotal.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1.5rem" }}>
        <div style={{ width: "240px" }}>
          <div className="inv-tot-row"><span style={{ color: "#555" }}>Subtotal</span><span>Rs. {data.totalAmount.toFixed(2)}</span></div>
          {data.discountAmount > 0 && (
            <div className="inv-tot-row"><span style={{ color: "#555" }}>Discount ({data.discountPercent.toFixed(1)}%)</span><span style={{ color: "#dc2626" }}>− Rs. {data.discountAmount.toFixed(2)}</span></div>
          )}
          <div className="inv-net-row"><span>Total</span><span>Rs. {data.netAmount.toFixed(2)}</span></div>
          <div className="inv-tot-row" style={{ marginTop: "0.5rem" }}><span style={{ color: "#555" }}>Paid</span><span style={{ color: "#16a34a", fontWeight: 600 }}>Rs. {data.totalPaid.toFixed(2)}</span></div>
          <div className="inv-tot-row"><span style={{ fontWeight: 600 }}>Balance Due</span><span style={{ fontWeight: 700, color: data.balance > 0.01 ? "#dc2626" : "#16a34a" }}>Rs. {Math.max(0, data.balance).toFixed(2)}</span></div>
        </div>
      </div>

      {/* Payments */}
      {data.payments.length > 0 && (
        <div style={{ marginBottom: "1.5rem" }}>
          <div className="inv-label" style={{ marginBottom: "0.5rem" }}>Payment History</div>
          {data.payments.map((p, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: "0.25rem", color: "#555" }}>
              <span>{p.paymentDate} — {METHOD_LABEL[p.method] ?? p.method}{p.referenceNo ? ` (#${p.referenceNo})` : ""}</span>
              <span style={{ color: "#16a34a", fontWeight: 600 }}>Rs. {p.amount.toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}

      {data.remarks && (
        <div style={{ padding: "0.65rem 0.9rem", background: "#f9fafb", borderLeft: "3px solid #e5e7eb", borderRadius: "0 0.25rem 0.25rem 0", marginBottom: "1.5rem" }}>
          <div className="inv-label" style={{ marginBottom: "0.2rem" }}>Remarks</div>
          <div style={{ fontSize: "0.85rem", color: "#555" }}>{data.remarks}</div>
        </div>
      )}

      <div className="inv-divider" />
      <div className="inv-footer-wrap">
        <div className="inv-footer-tagline">Thank you for choosing {COMPANY.name}</div>
        <div>{COMPANY.phone} · {COMPANY.email} · {COMPANY.web} · {COMPANY.city}</div>
      </div>
      </div>
    </div>
  );
}
