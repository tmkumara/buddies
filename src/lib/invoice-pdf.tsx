import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { InvoiceData } from "./invoice-data";

const styles = StyleSheet.create({
  page:       { fontFamily: "Helvetica", fontSize: 9, color: "#1a1a1a", padding: "40pt 48pt" },
  header:     { marginBottom: 20 },
  bizName:    { fontSize: 18, fontWeight: "bold", color: "#1a1a1a", marginBottom: 2 },
  bizSub:     { fontSize: 8, color: "#666", marginBottom: 14 },
  divider:    { height: 1, backgroundColor: "#e5e7eb", marginVertical: 10 },
  row:        { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  bold:       { fontFamily: "Helvetica-Bold" },
  label:      { color: "#666", fontSize: 7.5, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 2 },
  value:      { fontSize: 9 },
  th:         { backgroundColor: "#f3f4f6", padding: "5pt 7pt", fontSize: 7.5, fontFamily: "Helvetica-Bold", color: "#374151" },
  td:         { padding: "5pt 7pt", fontSize: 8.5, borderBottom: "0.5pt solid #f3f4f6" },
  totLine:    { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  netLine:    { flexDirection: "row", justifyContent: "space-between", borderTop: "1pt solid #1a1a1a", paddingTop: 5, marginTop: 5 },
  badge:      { fontSize: 7, padding: "2pt 6pt", borderRadius: 4, alignSelf: "flex-start" },
});

const COMPANY = {
  name:    "Buddies Gift Box",
  tagline: "Premium custom packaging solutions",
  phone:   "+94 77 XXX XXXX",
  email:   "info@buddiesgiftbox.lk",
};

const METHOD_LABEL: Record<string, string> = { CASH: "Cash", BANK_TRANSFER: "Bank Transfer", CHEQUE: "Cheque" };

export function InvoicePDFDocument({ data }: { data: InvoiceData }) {
  const colW = ["25%", "42%", "11%", "11%", "11%"] as const;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.row, { alignItems: "flex-start" }]}>
            <View>
              <Text style={styles.bizName}>{COMPANY.name}</Text>
              <Text style={styles.bizSub}>{COMPANY.tagline}</Text>
              <Text style={{ fontSize: 7.5, color: "#666" }}>{COMPANY.phone}  ·  {COMPANY.email}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={{ fontSize: 16, fontFamily: "Helvetica-Bold", color: "#1a1a1a" }}>INVOICE</Text>
              <Text style={{ fontSize: 9, marginTop: 4 }}># {data.orderNo}</Text>
              <Text style={{ fontSize: 7.5, color: "#666", marginTop: 2 }}>Date: {data.orderDate}</Text>
              {data.deliveryDate && <Text style={{ fontSize: 7.5, color: "#666" }}>Delivery: {data.deliveryDate}</Text>}
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Bill To */}
        <View style={{ marginBottom: 16 }}>
          <Text style={styles.label}>Bill To</Text>
          <Text style={[styles.bold, { fontSize: 10, marginBottom: 2 }]}>{data.customer.name}</Text>
          <Text style={{ color: "#555", fontSize: 8 }}>{data.customer.phone}</Text>
          {data.customer.phone2 && <Text style={{ color: "#555", fontSize: 8 }}>{data.customer.phone2}</Text>}
          {data.customer.email && <Text style={{ color: "#555", fontSize: 8 }}>{data.customer.email}</Text>}
          {data.customer.addressLine && <Text style={{ color: "#555", fontSize: 8 }}>{data.customer.addressLine}</Text>}
        </View>

        {/* Items table */}
        <View style={{ marginBottom: 14 }}>
          <View style={{ flexDirection: "row", backgroundColor: "#f3f4f6" }}>
            {["CODE", "DESCRIPTION", "QTY", "UNIT PRICE", "TOTAL"].map((h, i) => (
              <Text key={h} style={[styles.th, { width: colW[i] }]}>{h}</Text>
            ))}
          </View>
          {data.items.map((item, idx) => (
            <View key={idx} style={{ flexDirection: "row", backgroundColor: idx % 2 === 0 ? "#fff" : "#f9fafb" }}>
              <Text style={[styles.td, { width: colW[0] }]}>{item.designCode}</Text>
              <Text style={[styles.td, { width: colW[1] }]}>{item.designName}</Text>
              <Text style={[styles.td, { width: colW[2], textAlign: "center" }]}>{item.quantity}</Text>
              <Text style={[styles.td, { width: colW[3], textAlign: "right" }]}>{item.unitPrice.toFixed(2)}</Text>
              <Text style={[styles.td, { width: colW[4], textAlign: "right" }]}>{item.lineTotal.toFixed(2)}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={{ alignItems: "flex-end", marginBottom: 16 }}>
          <View style={{ width: "220pt" }}>
            <View style={styles.totLine}>
              <Text style={{ color: "#555" }}>Subtotal</Text>
              <Text>Rs. {data.totalAmount.toFixed(2)}</Text>
            </View>
            {data.discountAmount > 0 && (
              <View style={styles.totLine}>
                <Text style={{ color: "#555" }}>Discount ({data.discountPercent.toFixed(1)}%)</Text>
                <Text style={{ color: "#dc2626" }}>− Rs. {data.discountAmount.toFixed(2)}</Text>
              </View>
            )}
            <View style={styles.netLine}>
              <Text style={[styles.bold, { fontSize: 11 }]}>TOTAL</Text>
              <Text style={[styles.bold, { fontSize: 11 }]}>Rs. {data.netAmount.toFixed(2)}</Text>
            </View>
            <View style={[styles.totLine, { marginTop: 4 }]}>
              <Text style={{ color: "#555" }}>Paid</Text>
              <Text style={{ color: "#16a34a" }}>Rs. {data.totalPaid.toFixed(2)}</Text>
            </View>
            <View style={styles.totLine}>
              <Text style={[styles.bold]}>Balance Due</Text>
              <Text style={[styles.bold, { color: data.balance > 0.01 ? "#dc2626" : "#16a34a" }]}>Rs. {Math.max(0, data.balance).toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* Payments */}
        {data.payments.length > 0 && (
          <View style={{ marginBottom: 14 }}>
            <Text style={[styles.label, { marginBottom: 4 }]}>Payment History</Text>
            {data.payments.map((p, i) => (
              <View key={i} style={[styles.row, { marginBottom: 2 }]}>
                <Text style={{ color: "#555", fontSize: 8 }}>{p.paymentDate} — {METHOD_LABEL[p.method] ?? p.method}{p.referenceNo ? ` (#${p.referenceNo})` : ""}</Text>
                <Text style={{ color: "#16a34a", fontSize: 8, fontFamily: "Helvetica-Bold" }}>Rs. {p.amount.toFixed(2)}</Text>
              </View>
            ))}
          </View>
        )}

        {data.remarks && (
          <View style={{ marginBottom: 14, padding: "6pt 8pt", backgroundColor: "#f9fafb", borderLeft: "3pt solid #e5e7eb" }}>
            <Text style={[styles.label, { marginBottom: 2 }]}>Remarks</Text>
            <Text style={{ fontSize: 8.5, color: "#555" }}>{data.remarks}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={[styles.divider, { marginTop: 8 }]} />
        <Text style={{ textAlign: "center", fontSize: 7, color: "#9ca3af", marginTop: 6 }}>
          Thank you for choosing {COMPANY.name}! · {COMPANY.phone} · {COMPANY.email}
        </Text>
      </Page>
    </Document>
  );
}
