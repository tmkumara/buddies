"use client";

import React from "react";
import { useState, useEffect } from "react";
import { Pencil, X, ExternalLink } from "lucide-react";
import { getCustomerRecentOrders } from "@/actions/customers";

type RecentOrder = Awaited<ReturnType<typeof getCustomerRecentOrders>>[number];

interface Props {
  customer: {
    id: number;
    phone: string;
    phone2: string | null;
    email: string | null;
    addressLine: string | null;
    notes: string | null;
  };
  onFullEdit: () => void;
  onClose: () => void;
}

const sectionLabel: React.CSSProperties = {
  fontSize: "0.62rem",
  letterSpacing: "0.1em",
  color: "rgba(240,237,230,0.35)",
  textTransform: "uppercase",
  marginBottom: "0.6rem",
};

const fieldRow: React.CSSProperties = {
  display: "flex",
  gap: "0.6rem",
  marginBottom: "0.35rem",
  fontSize: "0.75rem",
};

const fieldLabel: React.CSSProperties = {
  minWidth: "64px",
  color: "rgba(240,237,230,0.35)",
  fontSize: "0.65rem",
  paddingTop: "1px",
  flexShrink: 0,
};

export default function CustomerExpandRow({ customer, onFullEdit, onClose }: Props) {
  const [orders, setOrders] = useState<RecentOrder[] | null>(null);

  useEffect(() => {
    getCustomerRecentOrders(customer.id).then(setOrders).catch(() => setOrders([]));
  }, [customer.id]);

  function formatDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  }

  const displayedOrders = orders?.slice(0, 3) ?? [];
  const extraCount = orders ? Math.max(0, orders.length - 3) : 0;

  return (
    <div>
      {/* Two-column body */}
      <div className="expand-row" style={{ padding: 0 }}>
        {/* Left: Contact details */}
        <div style={{ padding: "1rem 1.25rem", borderRight: "1px solid rgba(245,182,30,0.08)" }}>
          <p style={sectionLabel}>Contact Details</p>

          <div style={fieldRow}>
            <span style={fieldLabel}>Phone 1</span>
            <span style={{ color: "#F0EDE6" }}>{customer.phone}</span>
          </div>

          {customer.phone2 && (
            <div style={fieldRow}>
              <span style={fieldLabel}>Phone 2</span>
              <span style={{ color: "#F0EDE6" }}>{customer.phone2}</span>
            </div>
          )}

          {customer.email && (
            <div style={fieldRow}>
              <span style={fieldLabel}>Email</span>
              <span style={{ color: "rgba(240,237,230,0.7)" }}>{customer.email}</span>
            </div>
          )}

          {customer.addressLine && (
            <div style={fieldRow}>
              <span style={fieldLabel}>Address</span>
              <span style={{ color: "rgba(240,237,230,0.7)", lineHeight: 1.4 }}>{customer.addressLine}</span>
            </div>
          )}

          {customer.notes && (
            <div style={fieldRow}>
              <span style={fieldLabel}>Notes</span>
              <span style={{
                color: "rgba(240,237,230,0.55)",
                overflow: "hidden",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                lineHeight: 1.4,
              }}>
                {customer.notes}
              </span>
            </div>
          )}
        </div>

        {/* Right: Recent orders */}
        <div style={{ padding: "1rem 1.25rem" }}>
          <p style={sectionLabel}>Recent Orders</p>

          {orders === null && (
            <p style={{ fontSize: "0.72rem", color: "rgba(240,237,230,0.28)", fontStyle: "italic" }}>
              Loading…
            </p>
          )}

          {orders !== null && orders.length === 0 && (
            <p style={{ fontSize: "0.72rem", color: "rgba(240,237,230,0.28)", fontStyle: "italic" }}>
              No orders yet.
            </p>
          )}

          {displayedOrders.map((o) => (
            <div key={o.id} style={{
              display: "flex",
              alignItems: "center",
              gap: "0.6rem",
              marginBottom: "0.4rem",
              fontSize: "0.72rem",
            }}>
              <a
                href={`/orders/${o.id}`}
                style={{ color: "#F5B61E", fontWeight: 700, textDecoration: "none", letterSpacing: "0.04em", flexShrink: 0 }}
              >
                #{o.orderNo}
              </a>
              <span style={{ color: "rgba(240,237,230,0.35)", flexShrink: 0 }}>{formatDate(o.orderDate)}</span>
              <span className={`status-pill ${o.statusPillClass}`} style={{ fontSize: "0.58rem", padding: "0.1rem 0.5rem" }}>
                {o.status}
              </span>
            </div>
          ))}

          {extraCount > 0 && (
            <a
              href={`/orders?customer=${customer.id}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.25rem",
                fontSize: "0.65rem",
                color: "rgba(245,182,30,0.7)",
                textDecoration: "none",
                marginTop: "0.25rem",
              }}
            >
              + {extraCount} more <ExternalLink size={10} />
            </a>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        borderTop: "1px solid rgba(245,182,30,0.08)",
        padding: "0.65rem 1.25rem",
        display: "flex",
        justifyContent: "flex-end",
        gap: "0.6rem",
        background: "rgba(245,182,30,0.01)",
      }}>
        <button
          type="button"
          onClick={onFullEdit}
          style={{
            display: "flex", alignItems: "center", gap: "0.3rem",
            padding: "0.3rem 0.8rem",
            background: "rgba(245,182,30,0.08)",
            border: "1px solid rgba(245,182,30,0.2)",
            borderRadius: "0.4rem",
            color: "rgba(240,237,230,0.7)",
            fontSize: "0.6rem",
            letterSpacing: "0.08em",
            cursor: "pointer",
            fontFamily: "var(--font-jakarta, 'Plus Jakarta Sans', sans-serif)",
          }}
        >
          <Pencil size={10} /> FULL EDIT
        </button>
        <button
          type="button"
          onClick={onClose}
          style={{
            display: "flex", alignItems: "center", gap: "0.3rem",
            padding: "0.3rem 0.8rem",
            background: "transparent",
            border: "1px solid rgba(240,237,230,0.1)",
            borderRadius: "0.4rem",
            color: "rgba(240,237,230,0.28)",
            fontSize: "0.6rem",
            letterSpacing: "0.08em",
            cursor: "pointer",
            fontFamily: "var(--font-jakarta, 'Plus Jakarta Sans', sans-serif)",
          }}
        >
          <X size={10} /> CLOSE
        </button>
      </div>
    </div>
  );
}
