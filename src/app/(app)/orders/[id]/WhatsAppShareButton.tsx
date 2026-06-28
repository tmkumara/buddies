"use client";

import { useState } from "react";
import { MessageCircle, Link2 } from "lucide-react";
import { useToast } from "@/lib/toast-context";

interface Props {
  orderNo:      string;
  customerName: string;
  netAmount:    number;
  balance:      number;
  publicToken:  string | null;
}

export default function WhatsAppShareButton({ orderNo, publicToken }: Props) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  if (!publicToken) return null;

  async function handleShare() {
    setLoading(true);
    try {
      const res  = await fetch(`/api/invoice/${publicToken}/pdf`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const file = new File([blob], `${orderNo}-invoice.pdf`, { type: "application/pdf" });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `Invoice ${orderNo}` });
      } else {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `${orderNo}-invoice.pdf`;
        a.click();
        URL.revokeObjectURL(a.href);
        showToast({ type: "info", title: "PDF downloaded — share it manually via WhatsApp" });
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        showToast({ type: "error", title: "Could not share PDF — check your connection" });
      }
    } finally {
      setLoading(false);
    }
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
        disabled={loading}
        style={{
          display: "flex", alignItems: "center", gap: "0.4rem",
          background: "rgba(37,211,102,0.1)", border: "1px solid rgba(37,211,102,0.3)",
          borderRadius: "0.5rem", padding: "0.5rem 0.9rem",
          color: "#25D366", fontSize: "0.68rem", letterSpacing: "0.07em",
          cursor: loading ? "wait" : "pointer", opacity: loading ? 0.7 : 1,
        }}
      >
        <MessageCircle size={13} /> {loading ? "LOADING…" : "WHATSAPP"}
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
