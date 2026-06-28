import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import path from "path";
import fs from "fs";
import type { InvoiceData } from "./invoice-data";

const LOGO = fs.readFileSync(path.join(process.cwd(), "public", "buddiesicon-removebg.png"));

const COMPANY = {
  name:    "Buddies",
  tagline: "Your Vision, Our Mission",
  phone:   "0783085081",
  email:   "hello.buddieslk@gmail.com",
  city:    "Athurugiriya, Sri Lanka",
};

const G = "#F5B61E";   // gold accent
const T = "#F0EDE6";   // primary text
const T2 = "#A09C96";  // secondary text
const BG = "#0D0D0D";  // page background
const BG2 = "#161616"; // slightly lighter background for alternating rows
const BOR = "rgba(245,182,30,0.14)";

const styles = StyleSheet.create({
  page:    { fontFamily: "Helvetica", fontSize: 9, color: T, backgroundColor: BG, padding: "40pt 48pt" },
  divider: { height: 0.5, backgroundColor: "rgba(245,182,30,0.2)", marginVertical: 10 },
  row:     { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  between: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  bold:    { fontFamily: "Helvetica-Bold" },
  label:   { color: T2, fontSize: 7.5, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 2 },
  th:      { backgroundColor: "rgba(245,182,30,0.10)", padding: "5pt 7pt", fontSize: 7.5, fontFamily: "Helvetica-Bold", color: G },
  td:      { padding: "5pt 7pt", fontSize: 8.5, borderBottom: `0.5pt solid rgba(245,182,30,0.08)` },
  totLine: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  netLine: { flexDirection: "row", justifyContent: "space-between", borderTop: `1pt solid rgba(245,182,30,0.3)`, paddingTop: 5, marginTop: 5 },
  footer:  { textAlign: "center", fontSize: 7, color: T2, marginTop: 4 },
});

const METHOD_LABEL: Record<string, string> = { CASH: "Cash", BANK_TRANSFER: "Bank Transfer", CHEQUE: "Cheque" };

export function InvoicePDFDocument({ data }: { data: InvoiceData }) {
  const colW = ["25%", "42%", "11%", "11%", "11%"] as const;

  return (
    <Document>
      <Page size="A4" style={styles.page}>

        {/* Watermark — behind all content */}
        <View style={{ position: "absolute", top: 299, left: 175, width: 245, height: 245, opacity: 0.04 }}>
          <Image src={LOGO} style={{ width: 245, height: 245, objectFit: "contain" }} />
        </View>

        {/* Header */}
        <View style={[styles.between, { marginBottom: 16 }]}>
          <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
            <Image src={LOGO} style={{ width: 48, height: 48, objectFit: "contain" }} />
            <View style={{ marginLeft: 10 }}>
              <Text style={{ fontSize: 15, fontFamily: "Helvetica-Bold", color: G, letterSpacing: 0.5 }}>{COMPANY.name}</Text>
              <Text style={{ fontSize: 6.5, color: T2, letterSpacing: 0.7, marginTop: 2 }}>{COMPANY.tagline.toUpperCase()}</Text>
              <Text style={{ fontSize: 7, color: T2, marginTop: 5 }}>
                {COMPANY.phone}  ·  {COMPANY.email}  ·  {COMPANY.city}
              </Text>
            </View>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ fontSize: 16, fontFamily: "Helvetica-Bold", color: G, letterSpacing: 1 }}>INVOICE</Text>
            <Text style={{ fontSize: 9, marginTop: 4, color: T }}># {data.orderNo}</Text>
            <Text style={{ fontSize: 7.5, color: T2, marginTop: 2 }}>Date: {data.orderDate}</Text>
            {data.deliveryDate && <Text style={{ fontSize: 7.5, color: T2 }}>Delivery: {data.deliveryDate}</Text>}
          </View>
        </View>

        <View style={styles.divider} />

        {/* Bill To */}
        <View style={{ marginBottom: 16 }}>
          <Text style={styles.label}>Bill To</Text>
          <Text style={[styles.bold, { fontSize: 10, marginBottom: 2, color: T }]}>{data.customer.name}</Text>
          <Text style={{ color: T2, fontSize: 8 }}>{data.customer.phone}</Text>
          {data.customer.phone2      && <Text style={{ color: T2, fontSize: 8 }}>{data.customer.phone2}</Text>}
          {data.customer.email       && <Text style={{ color: T2, fontSize: 8 }}>{data.customer.email}</Text>}
          {data.customer.addressLine && <Text style={{ color: T2, fontSize: 8 }}>{data.customer.addressLine}</Text>}
        </View>

        {/* Items table */}
        <View style={{ marginBottom: 14 }}>
          <View style={{ flexDirection: "row", backgroundColor: "rgba(245,182,30,0.10)" }}>
            {["CODE", "DESCRIPTION", "QTY", "UNIT PRICE", "TOTAL"].map((h, i) => (
              <Text key={h} style={[styles.th, { width: colW[i] }]}>{h}</Text>
            ))}
          </View>
          {data.items.map((item, idx) => (
            <View key={idx} style={{ flexDirection: "row", backgroundColor: idx % 2 === 0 ? "transparent" : BG2 }}>
              <Text style={[styles.td, { width: colW[0], color: G, fontFamily: "Helvetica-Bold", fontSize: 8 }]}>{item.designCode}</Text>
              <View style={[styles.td, { width: colW[1] }]}>
                <Text style={{ color: T }}>{item.designName}</Text>
                {(item.boxTypeName || item.sizeCm) && (
                  <Text style={{ fontSize: 7, color: T2, marginTop: 2 }}>
                    {[item.boxTypeName, item.sizeCm].filter(Boolean).join("  ·  ")}
                  </Text>
                )}
              </View>
              <Text style={[styles.td, { width: colW[2], textAlign: "center", color: T }]}>{item.quantity}</Text>
              <Text style={[styles.td, { width: colW[3], textAlign: "right", color: T }]}>{item.unitPrice.toFixed(2)}</Text>
              <Text style={[styles.td, { width: colW[4], textAlign: "right", color: T, fontFamily: "Helvetica-Bold" }]}>{item.lineTotal.toFixed(2)}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={{ alignItems: "flex-end", marginBottom: 16 }}>
          <View style={{ width: "220pt" }}>
            <View style={styles.totLine}><Text style={{ color: T2 }}>Subtotal</Text><Text style={{ color: T }}>Rs. {data.totalAmount.toFixed(2)}</Text></View>
            {data.discountAmount > 0 && (
              <View style={styles.totLine}>
                <Text style={{ color: T2 }}>Discount ({data.discountPercent.toFixed(1)}%)</Text>
                <Text style={{ color: "#F87171" }}>− Rs. {data.discountAmount.toFixed(2)}</Text>
              </View>
            )}
            {data.deliveryCharge > 0 && (
              <View style={styles.totLine}>
                <Text style={{ color: T2 }}>{data.deliveryMethodName ?? "Delivery"}</Text>
                <Text style={{ color: T }}>Rs. {data.deliveryCharge.toFixed(2)}</Text>
              </View>
            )}
            <View style={styles.netLine}>
              <Text style={[styles.bold, { fontSize: 11, color: G }]}>TOTAL</Text>
              <Text style={[styles.bold, { fontSize: 11, color: G }]}>Rs. {data.netAmount.toFixed(2)}</Text>
            </View>
            <View style={[styles.totLine, { marginTop: 4 }]}><Text style={{ color: T2 }}>Paid</Text><Text style={{ color: "#4ADE80" }}>Rs. {data.totalPaid.toFixed(2)}</Text></View>
            <View style={styles.totLine}>
              <Text style={[styles.bold, { color: T }]}>Balance Due</Text>
              <Text style={[styles.bold, { color: data.balance > 0.01 ? "#F87171" : "#4ADE80" }]}>Rs. {Math.max(0, data.balance).toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* Payments */}
        {data.payments.length > 0 && (
          <View style={{ marginBottom: 14 }}>
            <Text style={[styles.label, { marginBottom: 4 }]}>Payment History</Text>
            {data.payments.map((p, i) => (
              <View key={i} style={[styles.row, { marginBottom: 2 }]}>
                <Text style={{ color: T2, fontSize: 8 }}>{p.paymentDate} — {METHOD_LABEL[p.method] ?? p.method}{p.referenceNo ? ` (#${p.referenceNo})` : ""}</Text>
                <Text style={{ color: "#4ADE80", fontSize: 8, fontFamily: "Helvetica-Bold" }}>Rs. {p.amount.toFixed(2)}</Text>
              </View>
            ))}
          </View>
        )}

        {data.remarks && (
          <View style={{ marginBottom: 14, padding: "6pt 8pt", backgroundColor: "rgba(245,182,30,0.05)", borderLeft: `3pt solid rgba(245,182,30,0.3)` }}>
            <Text style={[styles.label, { marginBottom: 2 }]}>Remarks</Text>
            <Text style={{ fontSize: 8.5, color: T2 }}>{data.remarks}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={[styles.divider, { marginTop: 8 }]} />
        <Text style={[styles.footer, { fontFamily: "Helvetica-Oblique", marginBottom: 2, color: T2 }]}>Thank you for choosing {COMPANY.name}</Text>
        <Text style={styles.footer}>{COMPANY.phone}  ·  {COMPANY.email}  ·  {COMPANY.city}</Text>
      </Page>
    </Document>
  );
}
