"use client";

import { MessageCircle, Link2 } from "lucide-react";

interface Props {
  orderNo: string;
  customerName: string;
  netAmount: number;
  balance: number;
  publicToken: string | null;
}

export default function WhatsAppShareButton({
  orderNo,
  customerName,
  netAmount,
  balance,
  publicToken,
}: Props) {
  if (!publicToken) {
    return null;
  }

  function handleShare() {
    const baseUrl = window.location.origin;
    const invoiceUrl = `${baseUrl}/invoice/${publicToken}`;
    const message = [
      `*Buddies Gift Box — Invoice*`,
      ``,
      `Order: *${orderNo}*`,
      `Customer: ${customerName}`,
      `Amount: *Rs. ${netAmount.toFixed(2)}*`,
      balance > 0.01
        ? `Balance Due: Rs. ${balance.toFixed(2)}`
        : `✅ Fully Paid`,
      ``,
      `View Invoice: ${invoiceUrl}`,
    ].join("\n");

    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function handleCopy() {
    const url = `${window.location.origin}/invoice/${publicToken}`;
    navigator.clipboard.writeText(url).catch(() => {});
  }

  return (
    <>
      <button
        type="button"
        onClick={handleShare}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.4rem",
          background: "rgba(37,211,102,0.1)",
          border: "1px solid rgba(37,211,102,0.3)",
          borderRadius: "0.5rem",
          padding: "0.5rem 0.9rem",
          color: "#25D366",
          fontSize: "0.68rem",
          letterSpacing: "0.07em",
          cursor: "pointer",
        }}
      >
        <MessageCircle size={13} /> WHATSAPP
      </button>
      <button
        type="button"
        onClick={handleCopy}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.4rem",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(245,182,30,0.12)",
          borderRadius: "0.5rem",
          padding: "0.5rem 0.9rem",
          color: "rgba(240,237,230,0.45)",
          fontSize: "0.68rem",
          letterSpacing: "0.07em",
          cursor: "pointer",
        }}
      >
        <Link2 size={13} /> COPY LINK
      </button>
    </>
  );
}
