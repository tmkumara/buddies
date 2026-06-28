import * as ReactPDF from "@react-pdf/renderer";
import path from "path";
import fs from "fs";

const { Document, Page, Text, View, StyleSheet, Image } = ReactPDF;

const LOGO = fs.readFileSync(path.join(process.cwd(), "public", "buddiesicon-removebg.png"));

const COMPANY = {
  name:    "Buddies",
  tagline: "Your Vision, Our Mission",
  phone:   "0783085081",
  email:   "hello.buddieslk@gmail.com",
  city:    "Athurugiriya, Sri Lanka",
};

const METHOD: Record<string, string> = {
  CASH: "Cash", BANK_TRANSFER: "Bank Transfer", CHEQUE: "Cheque",
};

const C = {
  bg: "#0d0d0d", card: "#141414", gold: "#F5B61E", goldDim: "#8A6A10",
  text: "#F0EDE6", muted: "#7A7570", dim: "#3A3530", sep: "#1E1C14",
  red: "#F87171", green: "#4ADE80", codeBg: "#1A1914",
};

const s = StyleSheet.create({
  page:    { backgroundColor: C.bg, padding: "36pt 44pt", fontFamily: "Helvetica", fontSize: 9, color: C.text },
  row:     { flexDirection: "row" },
  between: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  divider: { height: 0.5, backgroundColor: C.dim, marginVertical: 12 },
  logo:    { width: 48, height: 48, objectFit: "contain" },
  invWord: { fontSize: 7, letterSpacing: 1.2, color: C.muted, textAlign: "right" },
  invNo:   { fontSize: 13, fontFamily: "Helvetica-Bold", color: C.text, textAlign: "right", marginTop: 3 },
  lbl:     { fontSize: 6.5, letterSpacing: 0.9, color: C.muted, marginBottom: 2.5, textTransform: "uppercase" },
  val:     { fontSize: 9, color: C.text },
  bold:    { fontFamily: "Helvetica-Bold" },
  gold:    { color: C.gold },
  thCell:  { fontSize: 7, letterSpacing: 0.7, color: C.muted, fontFamily: "Helvetica-Bold", padding: "5pt 6pt" },
  tdCell:  { fontSize: 8.5, color: C.text, padding: "5.5pt 6pt", borderBottom: `0.5pt solid ${C.sep}` },
  totRow:  { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  netRow:  { flexDirection: "row", justifyContent: "space-between", borderTop: `1pt solid ${C.gold}`, paddingTop: 5, marginTop: 4 },
  footer:  { textAlign: "center", fontSize: 7, color: C.muted, marginTop: 4 },
});

export interface OrderPDFData {
  orderNo: string; orderDate: string; deliveryDate: string | null; status: string; remarks: string | null;
  customer: { name: string; phone: string; phone2: string | null; email: string | null; addressLine: string | null };
  items: { designCode: string; designName: string; boxTypeName?: string; sizeCm?: string; quantity: number; unitPrice: number; lineTotal: number }[];
  totalAmount: number; discountAmount: number; discountPct: number; deliveryCharge: number; deliveryMethodName?: string; netAmount: number; totalPaid: number; balance: number;
  payments: { paymentDate: string; method: string; referenceNo: string | null; amount: number }[];
}

const COL = ["18%", "37%", "10%", "17%", "18%"] as const;

export function OrderInvoicePDF({ data }: { data: OrderPDFData }) {
  return (
    <Document>
      <Page size="A4" style={s.page}>

        {/* Watermark — behind all content */}
        <View style={{ position: "absolute", top: 299, left: 175, width: 245, height: 245, opacity: 0.04 }}>
          <Image src={LOGO} style={{ width: 245, height: 245, objectFit: "contain" }} />
        </View>

        {/* Header */}
        <View style={[s.between, { marginBottom: 4 }]}>
          <View style={s.row}>
            <Image src={LOGO} style={s.logo} />
            <View style={{ marginLeft: 10 }}>
              <Text style={{ fontSize: 15, fontFamily: "Helvetica-Bold", color: C.gold, letterSpacing: 1 }}>{COMPANY.name}</Text>
              <Text style={{ fontSize: 6.5, color: C.muted, letterSpacing: 0.8, marginTop: 2 }}>{COMPANY.tagline.toUpperCase()}</Text>
              <Text style={{ fontSize: 7, color: C.muted, marginTop: 5 }}>
                {COMPANY.phone}  ·  {COMPANY.email}  ·  {COMPANY.city}
              </Text>
            </View>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={s.invWord}>INVOICE</Text>
            <Text style={s.invNo}>{data.orderNo}</Text>
            <Text style={{ fontSize: 7.5, color: C.muted, marginTop: 4 }}>Date: {data.orderDate}</Text>
            {data.deliveryDate && <Text style={{ fontSize: 7.5, color: C.muted }}>Delivery: {data.deliveryDate}</Text>}
            <View style={{ backgroundColor: C.codeBg, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3, marginTop: 4, borderWidth: 0.5, borderColor: C.dim }}>
              <Text style={{ fontSize: 7, color: C.gold, fontFamily: "Helvetica-Bold", letterSpacing: 0.5 }}>
                {data.status.replace(/_/g, " ")}
              </Text>
            </View>
          </View>
        </View>

        <View style={s.divider} />

        {/* Bill To */}
        <View style={[s.between, { marginBottom: 14 }]}>
          <View style={{ flex: 1 }}>
            <Text style={s.lbl}>Bill To</Text>
            <Text style={[s.bold, { fontSize: 11, color: C.text, marginBottom: 2 }]}>{data.customer.name}</Text>
            <Text style={{ fontSize: 8, color: C.muted }}>{data.customer.phone}</Text>
            {data.customer.phone2      && <Text style={{ fontSize: 8, color: C.muted }}>{data.customer.phone2}</Text>}
            {data.customer.email       && <Text style={{ fontSize: 8, color: C.muted }}>{data.customer.email}</Text>}
            {data.customer.addressLine && <Text style={{ fontSize: 8, color: C.muted, marginTop: 2 }}>{data.customer.addressLine}</Text>}
          </View>
        </View>

        {/* Remarks */}
        {data.remarks && (
          <View style={{ marginBottom: 12, padding: "6pt 8pt", backgroundColor: "#1A1A12", borderLeft: `2pt solid ${C.goldDim}` }}>
            <Text style={[s.lbl, { marginBottom: 2 }]}>Remarks</Text>
            <Text style={{ fontSize: 8.5, color: C.muted }}>{data.remarks}</Text>
          </View>
        )}

        {/* Items table */}
        <View style={{ marginBottom: 14 }}>
          <View style={[s.row, { backgroundColor: "#1A1914", borderBottom: `0.5pt solid ${C.dim}` }]}>
            {["CODE", "DESIGN NAME", "QTY", "UNIT PRICE", "LINE TOTAL"].map((h, i) => (
              <Text key={h} style={[s.thCell, { width: COL[i], textAlign: i >= 2 ? "right" : "left" }]}>{h}</Text>
            ))}
          </View>
          {data.items.map((item, idx) => (
            <View key={idx} style={[s.row, { backgroundColor: idx % 2 === 0 ? C.card : "#111111" }]}>
              <Text style={[s.tdCell, { width: COL[0], color: C.gold, fontFamily: "Helvetica-Bold", fontSize: 8 }]}>{item.designCode}</Text>
              <View style={[s.tdCell, { width: COL[1] }]}>
                <Text>{item.designName}</Text>
                {(item.boxTypeName || item.sizeCm) && (
                  <Text style={{ fontSize: 7, color: C.muted, marginTop: 2 }}>
                    {[item.boxTypeName, item.sizeCm].filter(Boolean).join("  ·  ")}
                  </Text>
                )}
              </View>
              <Text style={[s.tdCell, { width: COL[2], textAlign: "right", color: C.muted }]}>{item.quantity.toLocaleString()}</Text>
              <Text style={[s.tdCell, { width: COL[3], textAlign: "right", color: C.muted }]}>Rs. {item.unitPrice.toFixed(2)}</Text>
              <Text style={[s.tdCell, { width: COL[4], textAlign: "right", fontFamily: "Helvetica-Bold" }]}>Rs. {item.lineTotal.toFixed(2)}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={{ alignItems: "flex-end", marginBottom: 14 }}>
          <View style={{ width: "220pt" }}>
            <View style={s.totRow}><Text style={{ color: C.muted }}>Subtotal</Text><Text>Rs. {data.totalAmount.toFixed(2)}</Text></View>
            {data.discountAmount > 0 && (
              <View style={s.totRow}>
                <Text style={{ color: C.muted }}>Discount ({data.discountPct.toFixed(1)}%)</Text>
                <Text style={{ color: C.red }}>− Rs. {data.discountAmount.toFixed(2)}</Text>
              </View>
            )}
            {data.deliveryCharge > 0 && (
              <View style={s.totRow}>
                <Text style={{ color: C.muted }}>{data.deliveryMethodName ?? "Delivery"}</Text>
                <Text>Rs. {data.deliveryCharge.toFixed(2)}</Text>
              </View>
            )}
            <View style={s.netRow}>
              <Text style={[s.bold, { fontSize: 11, color: C.gold }]}>Net Amount</Text>
              <Text style={[s.bold, { fontSize: 11, color: C.gold }]}>Rs. {data.netAmount.toFixed(2)}</Text>
            </View>
            <View style={[s.totRow, { marginTop: 6 }]}>
              <Text style={{ color: C.green }}>Paid</Text>
              <Text style={{ color: C.green, fontFamily: "Helvetica-Bold" }}>Rs. {data.totalPaid.toFixed(2)}</Text>
            </View>
            {data.balance > 0.01 && (
              <View style={s.totRow}>
                <Text style={{ color: C.red, fontFamily: "Helvetica-Bold" }}>Balance Due</Text>
                <Text style={{ color: C.red, fontFamily: "Helvetica-Bold" }}>Rs. {data.balance.toFixed(2)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Payment history */}
        {data.payments.length > 0 && (
          <View style={{ marginBottom: 14 }}>
            <Text style={[s.lbl, { marginBottom: 4 }]}>Payment History</Text>
            {data.payments.map((p, i) => (
              <View key={i} style={[s.between, { marginBottom: 2 }]}>
                <Text style={{ fontSize: 7.5, color: C.muted }}>
                  {p.paymentDate} — {METHOD[p.method] ?? p.method}{p.referenceNo ? ` (#${p.referenceNo})` : ""}
                </Text>
                <Text style={{ fontSize: 7.5, color: C.green, fontFamily: "Helvetica-Bold" }}>Rs. {p.amount.toFixed(2)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Footer */}
        <View style={[s.divider, { borderTopColor: "#C8940A", borderTopWidth: 0.5 }]} />
        <Text style={[s.footer, { fontFamily: "Helvetica-Oblique", marginBottom: 2 }]}>Thank you for choosing {COMPANY.name}</Text>
        <Text style={s.footer}>{COMPANY.phone}  ·  {COMPANY.email}  ·  {COMPANY.city}</Text>
      </Page>
    </Document>
  );
}
