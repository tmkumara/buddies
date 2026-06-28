"use client";

import { MessageCircle, Link2 } from "lucide-react";

export interface InvoiceItem {
  code:         string;
  name:         string;
  boxTypeName?: string;
  sizeStr?:     string;
  quantity:     number;
  unitPrice:    number;
  lineTotal:    number;
}

interface Props {
  orderNo:            string;
  customerName:       string;
  orderDate:          string;
  deliveryDate?:      string | null;
  items:              InvoiceItem[];
  totalAmount:        number;
  discountAmount:     number;
  discountPct:        number;
  deliveryCharge:     number;
  deliveryMethodName?: string | null;
  netAmount:          number;
  totalPaid:          number;
  balance:            number;
  publicToken:        string | null;
}

export default function WhatsAppShareButton({
  orderNo, customerName, orderDate, deliveryDate,
  items, totalAmount, discountAmount, discountPct,
  deliveryCharge, deliveryMethodName,
  netAmount, totalPaid, balance, publicToken,
}: Props) {
  if (!publicToken) return null;

  const SEP = "─────────────────────";

  function buildMessage() {
    const lines: string[] = [
      "*Buddies — Invoice*",
      "",
      `*Order:* ${orderNo}`,
      `*Customer:* ${customerName}`,
      `*Date:* ${orderDate}`,
    ];
    if (deliveryDate) lines.push(`*Delivery:* ${deliveryDate}`);

    lines.push("", SEP, "*ITEMS*", SEP);

    for (const item of items) {
      lines.push(`*${item.code}* — ${item.name}`);
      const sub = [item.boxTypeName, item.sizeStr].filter(Boolean).join("  ·  ");
      if (sub) lines.push(`_${sub}_`);
      lines.push(`Qty ${item.quantity}  ×  Rs. ${item.unitPrice.toFixed(2)}  =  *Rs. ${item.lineTotal.toFixed(2)}*`);
      lines.push("");
    }

    lines.push(SEP);
    lines.push(`Subtotal:        Rs. ${totalAmount.toFixed(2)}`);
    if (discountAmount > 0) {
      lines.push(`_Discount (${discountPct.toFixed(1)}%):  −Rs. ${discountAmount.toFixed(2)}_`);
    }
    if (deliveryCharge > 0) {
      lines.push(`${deliveryMethodName ?? "Delivery"}:  Rs. ${deliveryCharge.toFixed(2)}`);
    }
    lines.push(`*Net Amount:     Rs. ${netAmount.toFixed(2)}*`);
    lines.push("");
    lines.push(`Paid:            Rs. ${totalPaid.toFixed(2)}`);
    lines.push(`*Balance Due:    Rs. ${Math.max(0, balance).toFixed(2)}*`);
    lines.push(SEP);

    return lines.join("\n");
  }

  function handleWhatsApp() {
    window.open(`https://wa.me/?text=${encodeURIComponent(buildMessage())}`, "_blank");
  }

  function handleCopy() {
    const url = `${window.location.origin}/invoice/${publicToken}`;
    navigator.clipboard.writeText(url).catch(() => {});
  }

  return (
    <>
      <button
        type="button"
        onClick={handleWhatsApp}
        style={{
          display: "flex", alignItems: "center", gap: "0.4rem",
          background: "rgba(37,211,102,0.1)", border: "1px solid rgba(37,211,102,0.3)",
          borderRadius: "0.5rem", padding: "0.5rem 0.9rem",
          color: "#25D366", fontSize: "0.68rem", letterSpacing: "0.07em", cursor: "pointer",
        }}
      >
        <MessageCircle size={13} /> WHATSAPP
      </button>
      <button
        type="button"
        onClick={handleCopy}
        style={{
          display: "flex", alignItems: "center", gap: "0.4rem",
          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(245,182,30,0.12)",
          borderRadius: "0.5rem", padding: "0.5rem 0.9rem",
          color: "rgba(240,237,230,0.45)", fontSize: "0.68rem", letterSpacing: "0.07em", cursor: "pointer",
        }}
      >
        <Link2 size={13} /> COPY LINK
      </button>
    </>
  );
}
