import { notFound } from "next/navigation";
import { getInvoiceDataByToken } from "@/lib/invoice-data";
import type { InvoiceData } from "@/lib/invoice-data";

export default async function PublicInvoicePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const data = await getInvoiceDataByToken(token);
  if (!data) notFound();

  const COMPANY = {
    name:    "Buddies Gift Box",
    tagline: "Premium custom packaging solutions",
    phone:   "+94 77 XXX XXXX",
    email:   "info@buddiesgiftbox.lk",
  };

  const METHOD_LABEL: Record<string, string> = { CASH: "Cash", BANK_TRANSFER: "Bank Transfer", CHEQUE: "Cheque" };

  const pdfUrl = `/api/invoice/${token}/pdf`;

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Invoice {data.orderNo} — {COMPANY.name}</title>
        <style>{`
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f3f4f6; color: #1a1a1a; }
          .sheet { max-width: 780px; margin: 2rem auto; background: #fff; padding: 3rem 3.5rem; border-radius: 0.5rem; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
          @media (max-width: 600px) { .sheet { margin: 0; padding: 1.5rem; border-radius: 0; } }
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 1.25rem; }
          th { background: #f3f4f6; padding: 0.5rem 0.75rem; font-size: 0.7rem; letter-spacing: 0.07em; text-align: left; font-weight: 600; color: #374151; }
          td { padding: 0.6rem 0.75rem; border-bottom: 1px solid #f3f4f6; font-size: 0.875rem; }
          .text-right { text-align: right; }
          .label { font-size: 0.65rem; letter-spacing: 0.08em; color: #6b7280; margin-bottom: 0.25rem; text-transform: uppercase; }
          .divider { height: 1px; background: #e5e7eb; margin: 1.25rem 0; }
          .tot-row { display: flex; justify-content: space-between; margin-bottom: 0.35rem; font-size: 0.875rem; }
          .net-row { display: flex; justify-content: space-between; border-top: 1.5px solid #1a1a1a; padding-top: 0.5rem; margin-top: 0.5rem; font-size: 1.1rem; font-weight: 700; }
          .btn { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.5rem 1.25rem; border-radius: 0.375rem; font-size: 0.8rem; font-weight: 600; cursor: pointer; text-decoration: none; border: none; }
          .btn-pdf { background: #1a1a1a; color: #fff; }
          .btn-print { background: #f3f4f6; color: #374151; }
          @media print { .no-print { display: none !important; } .sheet { box-shadow: none; margin: 0; padding: 1.5cm; } }
        `}</style>
      </head>
      <body>
        <div className="sheet">
          {/* Actions */}
          <div className="no-print" style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginBottom: "1.5rem" }}>
            <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="btn btn-pdf">⬇ Download PDF</a>
            <button onClick={() => window.print()} className="btn btn-print">🖨 Print</button>
          </div>

          {/* Header */}
          <div className="header">
            <div>
              <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#1a1a1a", marginBottom: "0.2rem" }}>{COMPANY.name}</div>
              <div style={{ fontSize: "0.8rem", color: "#6b7280", marginBottom: "0.75rem" }}>{COMPANY.tagline}</div>
              <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>{COMPANY.phone} · {COMPANY.email}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: "0.25rem" }}>INVOICE</div>
              <div style={{ fontSize: "0.9rem", color: "#555", marginBottom: "0.15rem" }}># {data.orderNo}</div>
              <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>Date: {data.orderDate}</div>
              {data.deliveryDate && <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>Delivery: {data.deliveryDate}</div>}
            </div>
          </div>

          <div className="divider" />

          {/* Customer */}
          <div style={{ marginBottom: "1.5rem" }}>
            <div className="label">Bill To</div>
            <div style={{ fontWeight: 700, fontSize: "1rem", marginBottom: "0.2rem" }}>{data.customer.name}</div>
            <div style={{ fontSize: "0.8rem", color: "#555" }}>{data.customer.phone}</div>
            {data.customer.phone2 && <div style={{ fontSize: "0.8rem", color: "#555" }}>{data.customer.phone2}</div>}
            {data.customer.email && <div style={{ fontSize: "0.8rem", color: "#555" }}>{data.customer.email}</div>}
            {data.customer.addressLine && <div style={{ fontSize: "0.8rem", color: "#555" }}>{data.customer.addressLine}</div>}
          </div>

          {/* Items */}
          <table>
            <thead>
              <tr>
                <th>CODE</th>
                <th>DESCRIPTION</th>
                <th className="text-right">QTY</th>
                <th className="text-right">UNIT PRICE</th>
                <th className="text-right">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#f9fafb" }}>
                  <td>{item.designCode}</td>
                  <td>{item.designName}</td>
                  <td className="text-right">{item.quantity}</td>
                  <td className="text-right">Rs. {item.unitPrice.toFixed(2)}</td>
                  <td className="text-right">Rs. {item.lineTotal.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1.5rem" }}>
            <div style={{ width: "240px" }}>
              <div className="tot-row"><span style={{ color: "#555" }}>Subtotal</span><span>Rs. {data.totalAmount.toFixed(2)}</span></div>
              {data.discountAmount > 0 && (
                <div className="tot-row"><span style={{ color: "#555" }}>Discount ({data.discountPercent.toFixed(1)}%)</span><span style={{ color: "#dc2626" }}>− Rs. {data.discountAmount.toFixed(2)}</span></div>
              )}
              <div className="net-row"><span>Total</span><span>Rs. {data.netAmount.toFixed(2)}</span></div>
              <div className="tot-row" style={{ marginTop: "0.5rem" }}><span style={{ color: "#555" }}>Paid</span><span style={{ color: "#16a34a", fontWeight: 600 }}>Rs. {data.totalPaid.toFixed(2)}</span></div>
              <div className="tot-row"><span style={{ fontWeight: 600 }}>Balance Due</span><span style={{ fontWeight: 700, color: data.balance > 0.01 ? "#dc2626" : "#16a34a" }}>Rs. {Math.max(0, data.balance).toFixed(2)}</span></div>
            </div>
          </div>

          {/* Payments */}
          {data.payments.length > 0 && (
            <div style={{ marginBottom: "1.5rem" }}>
              <div className="label" style={{ marginBottom: "0.5rem" }}>Payment History</div>
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
              <div className="label" style={{ marginBottom: "0.2rem" }}>Remarks</div>
              <div style={{ fontSize: "0.85rem", color: "#555" }}>{data.remarks}</div>
            </div>
          )}

          <div className="divider" />
          <div style={{ textAlign: "center", fontSize: "0.7rem", color: "#9ca3af", marginTop: "0.75rem" }}>
            Thank you for choosing {COMPANY.name}! · {COMPANY.phone} · {COMPANY.email}
          </div>
        </div>

        <script dangerouslySetInnerHTML={{ __html: `
          document.querySelectorAll('.btn-print').forEach(b => b.addEventListener('click', () => window.print()));
        `}} />
      </body>
    </html>
  );
}
