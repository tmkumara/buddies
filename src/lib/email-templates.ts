import type { InvoiceData } from "@/lib/invoice-data";

const STATUS_META: Record<string, { headline: string; message: string; subject: string } | undefined> = {
  CONFIRMED: {
    headline: "Your order is confirmed",
    message:  "We've received your payment and will begin production shortly.",
    subject:  "confirmed",
  },
  READY: {
    headline: "Your order is ready",
    message:  "Please arrange pickup or delivery at your convenience.",
    subject:  "ready for pickup",
  },
  DELIVERED: {
    headline: "Thank you!",
    message:  "Your order has been delivered. We hope you love it.",
    subject:  "delivered",
  },
  CANCELLED: {
    headline: "Order cancelled",
    message:  "Your order has been cancelled. Contact us if you have questions.",
    subject:  "cancelled",
  },
};

const METHOD_LABEL: Record<string, string> = {
  CASH: "Cash", BANK_TRANSFER: "Bank Transfer", CHEQUE: "Cheque",
};

const COMPANY_PHONE = "0783085081";
const COMPANY_EMAIL = "hello.buddieslk@gmail.com";

export function buildStatusEmail(
  status: string,
  data: InvoiceData,
): { html: string; subject: string } | null {
  const meta = STATUS_META[status];
  if (!meta) return null;

  const itemsHtml = data.items.map((item) => `
    <tr>
      <td style="padding:8px 6px;border-bottom:1px solid #e5e7eb;font-size:12px;color:#374151;">${item.designCode}</td>
      <td style="padding:8px 6px;border-bottom:1px solid #e5e7eb;font-size:12px;color:#374151;">
        <span>${item.designName}</span>
        ${item.boxTypeName || item.sizeCm ? `<br/><span style="font-size:10px;color:#9ca3af;">${[item.boxTypeName, item.sizeCm].filter(Boolean).join("  ·  ")}</span>` : ""}
      </td>
      <td style="padding:8px 6px;border-bottom:1px solid #e5e7eb;font-size:12px;color:#374151;text-align:right;">${item.quantity}</td>
      <td style="padding:8px 6px;border-bottom:1px solid #e5e7eb;font-size:12px;color:#374151;text-align:right;">Rs.&nbsp;${item.unitPrice.toFixed(2)}</td>
      <td style="padding:8px 6px;border-bottom:1px solid #e5e7eb;font-size:12px;font-weight:600;color:#111827;text-align:right;">Rs.&nbsp;${item.lineTotal.toFixed(2)}</td>
    </tr>`).join("");

  const discountRow = data.discountAmount > 0
    ? `<tr><td style="padding:4px 0;font-size:13px;color:#6b7280;">Discount (${data.discountPercent.toFixed(1)}%)</td><td style="padding:4px 0;font-size:13px;color:#dc2626;text-align:right;">−&nbsp;Rs.&nbsp;${data.discountAmount.toFixed(2)}</td></tr>`
    : "";

  const deliveryRow = data.deliveryCharge > 0
    ? `<tr><td style="padding:4px 0;font-size:13px;color:#6b7280;">${data.deliveryMethodName ?? "Delivery"}</td><td style="padding:4px 0;font-size:13px;color:#374151;text-align:right;">Rs.&nbsp;${data.deliveryCharge.toFixed(2)}</td></tr>`
    : "";

  const paymentsHtml = data.payments.length > 0
    ? `<div style="margin-bottom:20px;">
        <p style="font-size:10px;letter-spacing:0.07em;color:#6b7280;margin:0 0 8px 0;font-weight:600;">PAYMENT HISTORY</p>
        ${data.payments.map((p) => `
          <div style="display:flex;justify-content:space-between;font-size:12px;color:#555;margin-bottom:4px;">
            <span>${p.paymentDate} — ${METHOD_LABEL[p.method] ?? p.method}${p.referenceNo ? ` (#${p.referenceNo})` : ""}</span>
            <span style="color:#16a34a;font-weight:600;">Rs.&nbsp;${p.amount.toFixed(2)}</span>
          </div>`).join("")}
      </div>`
    : "";

  const remarksHtml = data.remarks
    ? `<div style="padding:10px 14px;background:#f9fafb;border-left:3px solid #e5e7eb;border-radius:0 4px 4px 0;margin-bottom:20px;">
        <p style="font-size:10px;letter-spacing:0.07em;color:#6b7280;margin:0 0 4px 0;font-weight:600;">REMARKS</p>
        <p style="font-size:13px;color:#555;margin:0;">${data.remarks}</p>
      </div>`
    : "";

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:24px 12px;">

  <div style="background:#ffffff;border-radius:8px 8px 0 0;padding:20px 28px 16px;border-bottom:3px solid #F5B61E;">
    <span style="font-size:22px;font-weight:800;color:#1a1a1a;letter-spacing:0.1em;">BUDDIES</span>
    <span style="font-size:11px;color:#9ca3af;margin-left:12px;letter-spacing:0.06em;">YOUR VISION, OUR MISSION</span>
  </div>

  <div style="background:#ffffff;padding:24px 28px 16px;border-bottom:1px solid #f0f0f0;">
    <h1 style="font-size:20px;font-weight:700;color:#1a1a1a;margin:0 0 8px 0;">${meta.headline}</h1>
    <p style="font-size:14px;color:#374151;margin:0 0 4px 0;">Hi ${data.customer.name},</p>
    <p style="font-size:14px;color:#374151;margin:0;">${meta.message}</p>
  </div>

  <div style="background:#ffffff;padding:24px 28px;">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;">
      <div>
        <p style="font-size:10px;letter-spacing:0.07em;color:#6b7280;margin:0 0 4px 0;font-weight:600;">BILL TO</p>
        <p style="font-size:14px;font-weight:700;color:#1a1a1a;margin:0 0 2px 0;">${data.customer.name}</p>
        <p style="font-size:12px;color:#555;margin:0;">${data.customer.phone}</p>
        ${data.customer.email ? `<p style="font-size:12px;color:#555;margin:2px 0 0 0;">${data.customer.email}</p>` : ""}
      </div>
      <div style="text-align:right;">
        <p style="font-size:16px;font-weight:700;color:#1a1a1a;margin:0;">#&nbsp;${data.orderNo}</p>
        <p style="font-size:12px;color:#6b7280;margin:4px 0 0 0;">Date: ${data.orderDate}</p>
        ${data.deliveryDate ? `<p style="font-size:12px;color:#6b7280;margin:2px 0 0 0;">Delivery: ${data.deliveryDate}</p>` : ""}
      </div>
    </div>

    <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
      <thead>
        <tr style="background:#f9fafb;">
          <th style="padding:8px 6px;text-align:left;font-size:10px;letter-spacing:0.07em;color:#6b7280;border-bottom:2px solid #e5e7eb;font-weight:600;">CODE</th>
          <th style="padding:8px 6px;text-align:left;font-size:10px;letter-spacing:0.07em;color:#6b7280;border-bottom:2px solid #e5e7eb;font-weight:600;">DESCRIPTION</th>
          <th style="padding:8px 6px;text-align:right;font-size:10px;letter-spacing:0.07em;color:#6b7280;border-bottom:2px solid #e5e7eb;font-weight:600;">QTY</th>
          <th style="padding:8px 6px;text-align:right;font-size:10px;letter-spacing:0.07em;color:#6b7280;border-bottom:2px solid #e5e7eb;font-weight:600;">UNIT</th>
          <th style="padding:8px 6px;text-align:right;font-size:10px;letter-spacing:0.07em;color:#6b7280;border-bottom:2px solid #e5e7eb;font-weight:600;">TOTAL</th>
        </tr>
      </thead>
      <tbody>${itemsHtml}</tbody>
    </table>

    <div style="display:flex;justify-content:flex-end;margin-bottom:20px;">
      <table style="width:220px;border-collapse:collapse;">
        <tr><td style="padding:4px 0;font-size:13px;color:#6b7280;">Subtotal</td><td style="padding:4px 0;font-size:13px;color:#374151;text-align:right;">Rs.&nbsp;${data.totalAmount.toFixed(2)}</td></tr>
        ${discountRow}
        ${deliveryRow}
        <tr style="border-top:2px solid #e5e7eb;">
          <td style="padding:8px 0 4px;font-size:15px;font-weight:700;color:#1a1a1a;">Total</td>
          <td style="padding:8px 0 4px;font-size:15px;font-weight:700;color:#1a1a1a;text-align:right;">Rs.&nbsp;${data.netAmount.toFixed(2)}</td>
        </tr>
        <tr><td style="padding:3px 0;font-size:13px;color:#6b7280;">Paid</td><td style="padding:3px 0;font-size:13px;color:#16a34a;font-weight:600;text-align:right;">Rs.&nbsp;${data.totalPaid.toFixed(2)}</td></tr>
        <tr><td style="padding:3px 0;font-size:13px;font-weight:600;color:#1a1a1a;">Balance Due</td><td style="padding:3px 0;font-size:13px;font-weight:700;color:${data.balance > 0.01 ? "#dc2626" : "#16a34a"};text-align:right;">Rs.&nbsp;${Math.max(0, data.balance).toFixed(2)}</td></tr>
      </table>
    </div>

    ${paymentsHtml}
    ${remarksHtml}

    <div style="border-top:1px solid #e5e7eb;padding-top:16px;text-align:center;">
      <p style="font-size:13px;font-weight:600;color:#1a1a1a;margin:0 0 4px 0;">Thank you for choosing Buddies</p>
      <p style="font-size:12px;color:#6b7280;margin:0;">${COMPANY_PHONE}&nbsp;&nbsp;·&nbsp;&nbsp;${COMPANY_EMAIL}</p>
    </div>
  </div>

</div>
</body>
</html>`;

  return { html, subject: `Order ${data.orderNo} ${meta.subject} — Buddies` };
}
