import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { getInvoiceDataByToken } from "@/lib/invoice-data";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";

const LOGO_SRC = (() => {
  const buf = fs.readFileSync(path.join(process.cwd(), "public", "buddiesicon-removebg.png"));
  return `data:image/png;base64,${buf.toString("base64")}`;
})();

const METHOD: Record<string, string> = {
  CASH: "Cash", BANK_TRANSFER: "Bank Transfer", CHEQUE: "Cheque",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const data = await getInvoiceDataByToken(token);
  if (!data) return new Response("Not found", { status: 404 });

  const W = 900;
  const H = Math.max(860,
    540
    + data.items.length * 58
    + (data.payments.length > 0 ? 52 + data.payments.length * 24 : 0)
    + (data.remarks ? 52 : 0),
  );

  // Palette
  const G   = "#F5B61E";
  const T   = "#F0EDE6";
  const T2  = "#8C8880";
  const BG  = "#0D0D0D";
  const BG2 = "#141414";
  const SEP = "rgba(245,182,30,0.18)";

  const colCode = "130px";
  const colQty  = "52px";
  const colUnit = "100px";
  const colTot  = "100px";

  return new ImageResponse(
    (
      <div style={{
        display: "flex", flexDirection: "column",
        width: "100%", height: "100%",
        backgroundColor: BG, padding: "48px",
        fontFamily: "sans-serif", position: "relative", overflow: "hidden",
      }}>

        {/* Watermark */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={LOGO_SRC}
          alt=""
          width={220} height={220}
          style={{
            position: "absolute",
            top: H / 2 - 110,
            left: W / 2 - 158,   // 48px padding offset
            opacity: 0.04,
          }}
        />

        {/* ── Header ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "flex-start" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOGO_SRC} alt="Buddies" width={52} height={52} style={{ objectFit: "contain" }} />
            <div style={{ display: "flex", flexDirection: "column", marginLeft: "14px" }}>
              <span style={{ fontSize: 20, fontWeight: 700, color: G, letterSpacing: "0.5px" }}>Buddies</span>
              <span style={{ fontSize: 7.5, color: T2, letterSpacing: "1.5px", marginTop: "4px" }}>YOUR VISION, OUR MISSION</span>
              <span style={{ fontSize: 8.5, color: T2, marginTop: "7px" }}>
                0783085081  ·  hello.buddieslk@gmail.com  ·  Athurugiriya, Sri Lanka
              </span>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <span style={{ fontSize: 22, fontWeight: 700, color: G, letterSpacing: "2px" }}>INVOICE</span>
            <span style={{ fontSize: 11, color: T, marginTop: "5px" }}>#{data.orderNo}</span>
            <span style={{ fontSize: 8.5, color: T2, marginTop: "3px" }}>Date: {data.orderDate}</span>
            {data.deliveryDate && (
              <span style={{ fontSize: 8.5, color: T2, marginTop: "2px" }}>Delivery: {data.deliveryDate}</span>
            )}
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: "1px", backgroundColor: SEP, marginBottom: "16px" }} />

        {/* ── Bill To ── */}
        <div style={{ display: "flex", flexDirection: "column", marginBottom: "16px" }}>
          <span style={{ fontSize: 7.5, color: T2, letterSpacing: "1.5px", marginBottom: "6px" }}>BILL TO</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: T, marginBottom: "3px" }}>{data.customer.name}</span>
          <span style={{ fontSize: 8.5, color: T2 }}>{data.customer.phone}</span>
          {data.customer.email && <span style={{ fontSize: 8.5, color: T2 }}>{data.customer.email}</span>}
          {data.customer.addressLine && <span style={{ fontSize: 8.5, color: T2 }}>{data.customer.addressLine}</span>}
        </div>

        {/* Divider */}
        <div style={{ height: "1px", backgroundColor: SEP, marginBottom: "0px" }} />

        {/* ── Table header ── */}
        <div style={{
          display: "flex", alignItems: "center",
          backgroundColor: "rgba(245,182,30,0.10)",
          padding: "8px 10px",
        }}>
          <span style={{ width: colCode, fontSize: 7.5, fontWeight: 700, color: G, letterSpacing: "1px" }}>CODE</span>
          <span style={{ flex: 1, fontSize: 7.5, fontWeight: 700, color: G, letterSpacing: "1px" }}>DESCRIPTION</span>
          <span style={{ width: colQty,  fontSize: 7.5, fontWeight: 700, color: G, letterSpacing: "1px", textAlign: "right" }}>QTY</span>
          <span style={{ width: colUnit, fontSize: 7.5, fontWeight: 700, color: G, letterSpacing: "1px", textAlign: "right" }}>UNIT</span>
          <span style={{ width: colTot,  fontSize: 7.5, fontWeight: 700, color: G, letterSpacing: "1px", textAlign: "right" }}>TOTAL</span>
        </div>

        {/* ── Items ── */}
        {data.items.map((item, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center",
            padding: "9px 10px",
            backgroundColor: i % 2 === 1 ? BG2 : "transparent",
            borderBottom: "1px solid rgba(245,182,30,0.06)",
          }}>
            <span style={{ width: colCode, fontSize: 8.5, fontWeight: 700, color: G }}>{item.designCode}</span>
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 9.5, color: T }}>{item.designName}</span>
              {(item.boxTypeName || item.sizeCm) && (
                <span style={{ fontSize: 7.5, color: T2, marginTop: "2px" }}>
                  {[item.boxTypeName, item.sizeCm].filter(Boolean).join("  ·  ")}
                </span>
              )}
            </div>
            <span style={{ width: colQty,  fontSize: 9.5, color: T,  textAlign: "right" }}>{item.quantity}</span>
            <span style={{ width: colUnit, fontSize: 9.5, color: T2, textAlign: "right" }}>Rs. {item.unitPrice.toFixed(2)}</span>
            <span style={{ width: colTot,  fontSize: 9.5, color: T,  textAlign: "right", fontWeight: 700 }}>Rs. {item.lineTotal.toFixed(2)}</span>
          </div>
        ))}

        {/* ── Totals ── */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "18px" }}>
          <div style={{ display: "flex", flexDirection: "column", width: "280px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
              <span style={{ fontSize: 10, color: T2 }}>Subtotal</span>
              <span style={{ fontSize: 10, color: T }}>Rs. {data.totalAmount.toFixed(2)}</span>
            </div>
            {data.discountAmount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <span style={{ fontSize: 10, color: T2 }}>Discount ({data.discountPercent.toFixed(1)}%)</span>
                <span style={{ fontSize: 10, color: "#F87171" }}>−Rs. {data.discountAmount.toFixed(2)}</span>
              </div>
            )}
            {data.deliveryCharge > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <span style={{ fontSize: 10, color: T2 }}>{data.deliveryMethodName ?? "Delivery"}</span>
                <span style={{ fontSize: 10, color: T }}>Rs. {data.deliveryCharge.toFixed(2)}</span>
              </div>
            )}
            <div style={{
              display: "flex", justifyContent: "space-between",
              borderTop: "1px solid rgba(245,182,30,0.3)",
              paddingTop: "8px", marginTop: "4px", marginBottom: "6px",
            }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: G }}>TOTAL</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: G }}>Rs. {data.netAmount.toFixed(2)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
              <span style={{ fontSize: 10, color: T2 }}>Paid</span>
              <span style={{ fontSize: 10, color: "#4ADE80" }}>Rs. {data.totalPaid.toFixed(2)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: T }}>Balance Due</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: data.balance > 0.01 ? "#F87171" : "#4ADE80" }}>
                Rs. {Math.max(0, data.balance).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* ── Payments ── */}
        {data.payments.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", marginTop: "20px" }}>
            <span style={{ fontSize: 7.5, color: T2, letterSpacing: "1.5px", marginBottom: "8px" }}>PAYMENT HISTORY</span>
            {data.payments.map((p, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <span style={{ fontSize: 8.5, color: T2 }}>
                  {p.paymentDate} — {METHOD[p.method] ?? p.method}
                  {p.referenceNo ? ` (#${p.referenceNo})` : ""}
                </span>
                <span style={{ fontSize: 8.5, fontWeight: 700, color: "#4ADE80" }}>Rs. {p.amount.toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── Remarks ── */}
        {data.remarks && (
          <div style={{
            display: "flex", flexDirection: "column",
            marginTop: "18px", padding: "8px 12px",
            backgroundColor: "rgba(245,182,30,0.04)",
            borderLeft: "3px solid rgba(245,182,30,0.3)",
          }}>
            <span style={{ fontSize: 7.5, color: T2, letterSpacing: "1.5px", marginBottom: "4px" }}>REMARKS</span>
            <span style={{ fontSize: 8.5, color: T2 }}>{data.remarks}</span>
          </div>
        )}

        {/* ── Footer ── */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: "auto", paddingTop: "20px" }}>
          <div style={{ height: "1px", backgroundColor: SEP, width: "100%", marginBottom: "12px" }} />
          <span style={{ fontSize: 8.5, color: T2, fontStyle: "italic" }}>Thank you for choosing Buddies</span>
          <span style={{ fontSize: 7.5, color: T2, marginTop: "3px" }}>
            0783085081  ·  hello.buddieslk@gmail.com  ·  Athurugiriya, Sri Lanka
          </span>
        </div>

      </div>
    ),
    { width: W, height: H },
  );
}
