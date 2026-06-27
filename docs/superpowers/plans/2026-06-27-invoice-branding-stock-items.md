# Invoice Branding + Stock Items Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add logo/watermark/footer branding to all four invoice surfaces, then build a new StockItem module for directly-stocked inventory (corrugated boxes, glue, accessories) with CRUD, stock tracking, and order integration.

**Architecture:** Invoice branding is pure UI — no schema changes. Stock items introduce a new `StockItem` + `StockItemEntry` model; `OrderItem.boxDesignId` becomes nullable and gains a `stockItemId` FK. Order creation, editing, and status transitions are extended to handle both item types. The `OrderItem` denormalised fields (`designCode`, `designName`, `quantity`, `unitPrice`, `lineTotal`) make invoice rendering work for stock items without any changes to PDF or HTML invoice code.

**Tech Stack:** Next.js 16 App Router, Server Actions, Prisma 7 + MySQL 8, @react-pdf/renderer, TypeScript, Lucide React icons, Zod validation.

## Global Constraints

- `public/buddiesicon-removebg.png` must exist before Task 1 — user places this file manually.
- All server actions marked `"use server"`, client components marked `"use client"`.
- Decimal fields from Prisma must be wrapped in `Number()` before passing to client components.
- `searchParams` is a `Promise` in Next.js 16 — must be `await`ed.
- `prisma db push` is used (no migrations folder) — apply CHECK constraint SQL manually after push.
- Follow existing dark luxury colour tokens: bg `#0d0d0d`, gold `#F5B61E`, text `#F0EDE6`, muted `#7A7570`.
- COMPANY constant (use exactly):
  ```ts
  const COMPANY = { name: "Buddies", tagline: "Your Vision, Our Mission", phone: "0783085081 / 0707490585", email: "hello.buddieslk@gmail.com", web: "www.buddiescraft.net", city: "Athurugiriya, Sri Lanka" };
  ```

---

## Phase 1 — Invoice Branding

### Task 1: Brand both PDF files (logo, watermark, footer)

**Files:**
- Modify: `src/lib/invoice-order-pdf.tsx` (dark luxury PDF)
- Modify: `src/lib/invoice-pdf.tsx` (light/white PDF)

**Prerequisite:** `public/buddiesicon-removebg.png` exists.

- [ ] **Step 1: Update `invoice-order-pdf.tsx`**

Replace the file content with:

```tsx
import * as ReactPDF from "@react-pdf/renderer";
import path from "path";

const { Document, Page, Text, View, StyleSheet, Image } = ReactPDF;

const LOGO = path.join(process.cwd(), "public/buddiesicon-removebg.png");

const COMPANY = {
  name:    "Buddies",
  tagline: "Your Vision, Our Mission",
  phone:   "0783085081 / 0707490585",
  email:   "hello.buddieslk@gmail.com",
  web:     "www.buddiescraft.net",
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
  items: { designCode: string; designName: string; quantity: number; unitPrice: number; lineTotal: number }[];
  totalAmount: number; discountAmount: number; discountPct: number; netAmount: number; totalPaid: number; balance: number;
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
                {COMPANY.phone}  ·  {COMPANY.email}  ·  {COMPANY.web}  ·  {COMPANY.city}
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
              <Text style={[s.tdCell, { width: COL[1] }]}>{item.designName}</Text>
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
        <Text style={s.footer}>{COMPANY.phone}  ·  {COMPANY.email}  ·  {COMPANY.web}  ·  {COMPANY.city}</Text>
      </Page>
    </Document>
  );
}
```

- [ ] **Step 2: Update `invoice-pdf.tsx`**

Replace the file content with:

```tsx
import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import path from "path";
import type { InvoiceData } from "./invoice-data";

const LOGO = path.join(process.cwd(), "public/buddiesicon-removebg.png");

const COMPANY = {
  name:    "Buddies",
  tagline: "Your Vision, Our Mission",
  phone:   "0783085081 / 0707490585",
  email:   "hello.buddieslk@gmail.com",
  web:     "www.buddiescraft.net",
  city:    "Athurugiriya, Sri Lanka",
};

const styles = StyleSheet.create({
  page:    { fontFamily: "Helvetica", fontSize: 9, color: "#1a1a1a", padding: "40pt 48pt" },
  header:  { marginBottom: 20 },
  divider: { height: 1, backgroundColor: "#e5e7eb", marginVertical: 10 },
  row:     { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  between: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  bold:    { fontFamily: "Helvetica-Bold" },
  label:   { color: "#666", fontSize: 7.5, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 2 },
  th:      { backgroundColor: "#f3f4f6", padding: "5pt 7pt", fontSize: 7.5, fontFamily: "Helvetica-Bold", color: "#374151" },
  td:      { padding: "5pt 7pt", fontSize: 8.5, borderBottom: "0.5pt solid #f3f4f6" },
  totLine: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  netLine: { flexDirection: "row", justifyContent: "space-between", borderTop: "1pt solid #1a1a1a", paddingTop: 5, marginTop: 5 },
  footer:  { textAlign: "center", fontSize: 7, color: "#9ca3af", marginTop: 4 },
});

const METHOD_LABEL: Record<string, string> = { CASH: "Cash", BANK_TRANSFER: "Bank Transfer", CHEQUE: "Cheque" };

export function InvoicePDFDocument({ data }: { data: InvoiceData }) {
  const colW = ["25%", "42%", "11%", "11%", "11%"] as const;

  return (
    <Document>
      <Page size="A4" style={styles.page}>

        {/* Watermark — behind all content */}
        <View style={{ position: "absolute", top: 299, left: 175, width: 245, height: 245, opacity: 0.06 }}>
          <Image src={LOGO} style={{ width: 245, height: 245, objectFit: "contain" }} />
        </View>

        {/* Header */}
        <View style={[styles.between, { marginBottom: 16 }]}>
          <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
            <Image src={LOGO} style={{ width: 48, height: 48, objectFit: "contain" }} />
            <View style={{ marginLeft: 10 }}>
              <Text style={{ fontSize: 15, fontFamily: "Helvetica-Bold", color: "#1a1a1a", letterSpacing: 0.5 }}>{COMPANY.name}</Text>
              <Text style={{ fontSize: 6.5, color: "#9ca3af", letterSpacing: 0.7, marginTop: 2 }}>{COMPANY.tagline.toUpperCase()}</Text>
              <Text style={{ fontSize: 7, color: "#6b7280", marginTop: 5 }}>
                {COMPANY.phone}  ·  {COMPANY.email}  ·  {COMPANY.web}  ·  {COMPANY.city}
              </Text>
            </View>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ fontSize: 16, fontFamily: "Helvetica-Bold", color: "#1a1a1a" }}>INVOICE</Text>
            <Text style={{ fontSize: 9, marginTop: 4 }}># {data.orderNo}</Text>
            <Text style={{ fontSize: 7.5, color: "#666", marginTop: 2 }}>Date: {data.orderDate}</Text>
            {data.deliveryDate && <Text style={{ fontSize: 7.5, color: "#666" }}>Delivery: {data.deliveryDate}</Text>}
          </View>
        </View>

        <View style={styles.divider} />

        {/* Bill To */}
        <View style={{ marginBottom: 16 }}>
          <Text style={styles.label}>Bill To</Text>
          <Text style={[styles.bold, { fontSize: 10, marginBottom: 2 }]}>{data.customer.name}</Text>
          <Text style={{ color: "#555", fontSize: 8 }}>{data.customer.phone}</Text>
          {data.customer.phone2      && <Text style={{ color: "#555", fontSize: 8 }}>{data.customer.phone2}</Text>}
          {data.customer.email       && <Text style={{ color: "#555", fontSize: 8 }}>{data.customer.email}</Text>}
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
            <View style={styles.totLine}><Text style={{ color: "#555" }}>Subtotal</Text><Text>Rs. {data.totalAmount.toFixed(2)}</Text></View>
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
            <View style={[styles.totLine, { marginTop: 4 }]}><Text style={{ color: "#555" }}>Paid</Text><Text style={{ color: "#16a34a" }}>Rs. {data.totalPaid.toFixed(2)}</Text></View>
            <View style={styles.totLine}>
              <Text style={styles.bold}>Balance Due</Text>
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
        <Text style={[styles.footer, { fontFamily: "Helvetica-Oblique", marginBottom: 2 }]}>Thank you for choosing {COMPANY.name}</Text>
        <Text style={styles.footer}>{COMPANY.phone}  ·  {COMPANY.email}  ·  {COMPANY.web}  ·  {COMPANY.city}</Text>
      </Page>
    </Document>
  );
}
```

- [ ] **Step 3: Verify PDFs render — open internal PDF**

Navigate to any order's internal invoice PDF (`/api/orders/<id>/invoice-pdf`) and the customer PDF (`/api/invoice/<token>/pdf`). Check: logo visible top-left, faint watermark centred, two-line footer at bottom.

- [ ] **Step 4: Commit**

```bash
git add src/lib/invoice-order-pdf.tsx src/lib/invoice-pdf.tsx
git commit -m "feat: logo, watermark, and enhanced footer on both invoice PDFs"
```

---

### Task 2: Brand internal HTML invoice (dark theme)

**Files:**
- Modify: `src/app/orders/[id]/invoice/page.tsx`

**Notes:** This file already has a logo (`/buddiesicon.png`) and an `inv-footer` class. Changes: swap logo path, add watermark, upgrade footer text, add watermark CSS, add `position: relative` to `.inv-sheet`.

- [ ] **Step 1: Update the `<style>` block**

In the `<style>` block (currently lines 44–67), find and update:

```css
/* Add to .inv-sheet */
.inv-sheet { max-width: 820px; margin: 0 auto; background: #141414; border: 1px solid rgba(245,182,30,0.15); border-radius: 0.75rem; padding: 2.5rem 2.75rem; color: #F0EDE6; position: relative; overflow: hidden; }

/* Replace .inv-footer */
.inv-footer  { text-align: center; font-size: 0.63rem; color: rgba(240,237,230,0.18); margin-top: 2rem; padding-top: 1rem; border-top: 1px solid rgba(200,148,10,0.3); letter-spacing: 0.06em; }
.inv-footer-tagline { font-style: italic; margin-bottom: 0.2rem; }

/* Add watermark */
.inv-watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 280px; height: 280px; opacity: 0.04; pointer-events: none; z-index: 0; }
.inv-content   { position: relative; z-index: 1; }
```

- [ ] **Step 2: Wrap all sheet content in `.inv-content` and add watermark**

Inside `<div className="inv-sheet">`, add the watermark div immediately after the opening tag, then wrap existing content:

```jsx
<div className="inv-sheet">
  {/* Watermark */}
  {/* eslint-disable-next-line @next/next/no-img-element */}
  <img src="/buddiesicon-removebg.png" alt="" className="inv-watermark" aria-hidden="true" />

  <div className="inv-content">
    {/* Nav ... Header ... all existing content ... */}

    {/* Replace the footer div at the bottom */}
    <div className="inv-footer">
      <div className="inv-footer-tagline">Thank you for choosing {COMPANY.name}</div>
      <div>{COMPANY.phone} · {COMPANY.email} · {COMPANY.web} · {COMPANY.city}</div>
    </div>
  </div>
</div>
```

- [ ] **Step 3: Swap logo path**

Change line 87 from `/buddiesicon.png` to `/buddiesicon-removebg.png`:

```jsx
<img src="/buddiesicon-removebg.png" alt="Buddies logo" style={{ width: "56px", height: "56px", objectFit: "contain", borderRadius: "0.35rem" }} />
```

- [ ] **Step 4: Update COMPANY constant**

Replace the existing `COMPANY` object at the top of the file:

```ts
const COMPANY = {
  name:  "Buddies",
  tag:   "Your Vision, Our Mission",
  phone: "0783085081 / 0707490585",
  email: "hello.buddieslk@gmail.com",
  web:   "www.buddiescraft.net",
  city:  "Athurugiriya, Sri Lanka",
};
```

- [ ] **Step 5: Verify in browser**

Open `/orders/<id>/invoice`. Check: logo with transparent background, faint watermark centred in the dark card, two-line italic footer.

- [ ] **Step 6: Commit**

```bash
git add src/app/orders/[id]/invoice/page.tsx
git commit -m "feat: watermark and enhanced footer on internal HTML invoice"
```

---

### Task 3: Brand customer HTML invoice (light theme)

**Files:**
- Modify: `src/app/invoice/[token]/page.tsx`
- Modify: `src/app/invoice/layout.tsx`

**Notes:** This page has NO logo currently. The CSS lives in `layout.tsx` as a `<style>` tag.

- [ ] **Step 1: Add watermark + content wrapper CSS to `layout.tsx`**

Inside the `<style>` template literal, append:

```css
.inv-sheet { position: relative; overflow: hidden; }
.inv-watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 280px; height: 280px; opacity: 0.06; pointer-events: none; z-index: 0; }
.inv-content   { position: relative; z-index: 1; }
.inv-footer-wrap { text-align: center; font-size: 0.7rem; color: #9ca3af; margin-top: 0.75rem; }
.inv-footer-tagline { font-style: italic; margin-bottom: 0.15rem; }
@media print { .inv-watermark { opacity: 0.04; } }
```

- [ ] **Step 2: Update `page.tsx` — replace COMPANY constant**

Replace the existing `COMPANY` object:

```ts
const COMPANY = {
  name:    "Buddies",
  tagline: "Your Vision, Our Mission",
  phone:   "0783085081 / 0707490585",
  email:   "hello.buddieslk@gmail.com",
  web:     "www.buddiescraft.net",
  city:    "Athurugiriya, Sri Lanka",
};
```

- [ ] **Step 3: Replace the `inv-header` block to add logo**

Find the existing header block and replace it:

```jsx
<div className="inv-header">
  <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src="/buddiesicon-removebg.png" alt="Buddies logo" style={{ width: "52px", height: "52px", objectFit: "contain" }} />
    <div>
      <div style={{ fontSize: "1.35rem", fontWeight: 800, color: "#1a1a1a", marginBottom: "0.15rem" }}>{COMPANY.name}</div>
      <div style={{ fontSize: "0.65rem", color: "#6b7280", letterSpacing: "0.07em", marginBottom: "0.5rem" }}>{COMPANY.tagline.toUpperCase()}</div>
      <div style={{ fontSize: "0.7rem", color: "#6b7280" }}>{COMPANY.phone} · {COMPANY.email}</div>
    </div>
  </div>
  <div style={{ textAlign: "right" }}>
    <div style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: "0.25rem" }}>INVOICE</div>
    <div style={{ fontSize: "0.9rem", color: "#555", marginBottom: "0.15rem" }}># {data.orderNo}</div>
    <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>Date: {data.orderDate}</div>
    {data.deliveryDate && <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>Delivery: {data.deliveryDate}</div>}
  </div>
</div>
```

- [ ] **Step 4: Add watermark div and wrap content**

Inside `<div className="inv-sheet">`, add watermark before all content and wrap:

```jsx
<div className="inv-sheet">
  {/* eslint-disable-next-line @next/next/no-img-element */}
  <img src="/buddiesicon-removebg.png" alt="" className="inv-watermark" aria-hidden="true" />
  <div className="inv-content">
    {/* Actions bar */}
    <div className="no-print" ...>...</div>
    {/* Header */}
    ...
    {/* All existing content */}
    ...
    {/* Replace footer */}
    <div className="inv-footer-wrap">
      <div className="inv-footer-tagline">Thank you for choosing {COMPANY.name}</div>
      <div>{COMPANY.phone} · {COMPANY.email} · {COMPANY.web} · {COMPANY.city}</div>
    </div>
  </div>
</div>
```

Remove the old single-line footer `<div>` that says `Thank you for choosing...`.

- [ ] **Step 5: Verify in browser**

Open `/invoice/<any-token>`. Check: logo with transparent background, faint watermark, two-line italic footer. Print preview: watermark persists at lower opacity.

- [ ] **Step 6: Commit**

```bash
git add src/app/invoice/[token]/page.tsx src/app/invoice/layout.tsx
git commit -m "feat: logo, watermark, and enhanced footer on customer HTML invoice"
```

---

## Phase 2 — Stock Items Module

### Task 4: Prisma schema — StockItem, StockItemEntry, alter OrderItem

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add new enums and models to `schema.prisma`**

After the existing `StockAdjustmentType` enum (line 237), add:

```prisma
enum StockItemEntryType {
  PURCHASE
  SOLD
  ADJUSTMENT
}

model StockItem {
  id           Int              @id @default(autoincrement())
  code         String           @unique @db.VarChar(50)
  name         String           @db.VarChar(150)
  description  String?          @db.VarChar(255)
  stockUnit    String           @map("stock_unit") @db.VarChar(50)
  unitPrice    Decimal          @map("unit_price") @db.Decimal(10, 2)
  currentStock Decimal          @default(0) @map("current_stock") @db.Decimal(10, 2)
  minStock     Decimal          @default(0) @map("min_stock") @db.Decimal(10, 2)
  active       Boolean          @default(true) @map("is_active")
  createdAt    DateTime         @default(now()) @map("created_at") @db.DateTime
  updatedAt    DateTime         @updatedAt @map("updated_at") @db.DateTime
  orderItems   OrderItem[]
  stockEntries StockItemEntry[]

  @@index([active])
  @@map("stock_item")
}

model StockItemEntry {
  id             Int                @id @default(autoincrement())
  stockItemId    Int                @map("stock_item_id")
  stockItem      StockItem          @relation(fields: [stockItemId], references: [id])
  quantityChange Decimal            @map("quantity_change") @db.Decimal(10, 2)
  type           StockItemEntryType
  orderId        Int?               @map("order_id")
  order          Order?             @relation(fields: [orderId], references: [id])
  note           String?            @db.VarChar(255)
  changedById    Int?               @map("changed_by_id")
  changedBy      User?              @relation(fields: [changedById], references: [id])
  changedAt      DateTime           @default(now()) @map("changed_at") @db.DateTime

  @@index([stockItemId])
  @@index([orderId])
  @@map("stock_item_entry")
}
```

- [ ] **Step 2: Alter `OrderItem` — make `boxDesignId` nullable, add `stockItemId`**

Replace the `OrderItem` model:

```prisma
model OrderItem {
  id          Int        @id @default(autoincrement())
  orderId     Int        @map("order_id")
  order       Order      @relation(fields: [orderId], references: [id], onDelete: Cascade)
  boxDesignId Int?       @map("box_design_id")
  boxDesign   BoxDesign? @relation(fields: [boxDesignId], references: [id])
  stockItemId Int?       @map("stock_item_id")
  stockItem   StockItem? @relation(fields: [stockItemId], references: [id])
  designName  String     @map("design_name") @db.VarChar(150)
  designCode  String     @map("design_code") @db.VarChar(50)
  quantity    Int
  unitPrice   Decimal    @map("unit_price") @db.Decimal(10, 2)
  lineTotal   Decimal    @map("line_total") @db.Decimal(12, 2)

  @@index([orderId])
  @@index([boxDesignId])
  @@index([stockItemId])
  @@map("order_item")
}
```

- [ ] **Step 3: Add `stockItemEntries` relation to `Order` model**

Inside the `Order` model, after `stockAdjustments StockAdjustment[]`, add:

```prisma
stockItemEntries StockItemEntry[]
```

- [ ] **Step 4: Add `stockItemEntries` relation to `User` model**

Inside the `User` model, after `stockAdjustments StockAdjustment[]`, add:

```prisma
stockItemEntries StockItemEntry[]
```

- [ ] **Step 5: Push schema**

```bash
npx prisma db push
```

Expected output: Tables `stock_item` and `stock_item_entry` created; `order_item.box_design_id` is now nullable; `order_item.stock_item_id` column added.

- [ ] **Step 6: Add CHECK constraint manually**

Run this SQL on the database (via MySQL client or Prisma `$executeRaw`):

```sql
ALTER TABLE order_item
  ADD CONSTRAINT chk_order_item_exactly_one_ref
  CHECK (
    (box_design_id IS NULL) != (stock_item_id IS NULL)
  );
```

> Note: MySQL 8+ supports CHECK constraints. If using MariaDB < 10.2, skip this and rely on application-level validation only.

- [ ] **Step 7: Regenerate Prisma client**

```bash
npx prisma generate
```

- [ ] **Step 8: Fix `deductStockForOrder` in `src/actions/stock.ts`**

`boxDesignId` is now nullable so `item.boxDesign` may be null. Add guard:

```ts
export async function deductStockForOrder(orderId: number, userId: number): Promise<void> {
  const order = await prisma.order.findUnique({
    where:   { id: orderId },
    include: {
      items: {
        include: {
          boxDesign: { include: { material: true } },
        },
      },
    },
  });
  if (!order) return;

  for (const item of order.items) {
    const bd  = item.boxDesign;
    if (!bd || !bd.material) continue;    // ← skip stock items and designs without material
    const mat = bd.material;

    const boxesPerSheet = calculateBoxesPerSheet({ ... }); // unchanged
    if (boxesPerSheet === 0) continue;
    const sheetsNeeded = calculateSheetsNeeded(item.quantity, boxesPerSheet);

    await prisma.$transaction([
      prisma.material.update({ where: { id: mat.id }, data: { currentStockLevel: { decrement: sheetsNeeded } } }),
      prisma.stockAdjustment.create({ data: { materialId: mat.id, quantityChange: -sheetsNeeded, reason: `Auto-deducted for Order #${order.orderNo}`, type: "AUTO_PRODUCTION", orderId, changedById: userId } }),
    ]);
  }
}
```

- [ ] **Step 9: Commit**

```bash
git add prisma/schema.prisma src/actions/stock.ts
git commit -m "feat: add StockItem and StockItemEntry models; make OrderItem.boxDesignId nullable"
```

---

### Task 5: Stock Items server actions

**Files:**
- Create: `src/actions/stock-items.ts`

- [ ] **Step 1: Create `src/actions/stock-items.ts`**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guards";

const stockItemSchema = z.object({
  code:        z.string().min(1).max(50),
  name:        z.string().min(1).max(150),
  description: z.string().max(255).optional(),
  stockUnit:   z.string().min(1).max(50),
  unitPrice:   z.coerce.number().min(0),
  minStock:    z.coerce.number().min(0).default(0),
});

const purchaseSchema = z.object({
  stockItemId:  z.coerce.number().int().positive(),
  quantity:     z.coerce.number().positive(),
  note:         z.string().max(255).optional(),
});

export async function createStockItem(formData: FormData) {
  await requireAuth();
  const parsed = stockItemSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Validation error" };

  const existing = await prisma.stockItem.findUnique({ where: { code: parsed.data.code } });
  if (existing) return { error: "A stock item with this code already exists" };

  await prisma.stockItem.create({
    data: {
      code:        parsed.data.code,
      name:        parsed.data.name,
      description: parsed.data.description ?? null,
      stockUnit:   parsed.data.stockUnit,
      unitPrice:   parsed.data.unitPrice,
      minStock:    parsed.data.minStock,
    },
  });
  revalidatePath("/stock-items");
  return { success: true as const };
}

export async function updateStockItem(id: number, formData: FormData) {
  await requireAuth();
  const parsed = stockItemSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Validation error" };

  const conflict = await prisma.stockItem.findFirst({ where: { code: parsed.data.code, NOT: { id } } });
  if (conflict) return { error: "Another stock item uses this code" };

  await prisma.stockItem.update({
    where: { id },
    data: {
      code:        parsed.data.code,
      name:        parsed.data.name,
      description: parsed.data.description ?? null,
      stockUnit:   parsed.data.stockUnit,
      unitPrice:   parsed.data.unitPrice,
      minStock:    parsed.data.minStock,
    },
  });
  revalidatePath("/stock-items");
  return { success: true as const };
}

export async function toggleStockItemActive(id: number, active: boolean) {
  await requireAuth();
  await prisma.stockItem.update({ where: { id }, data: { active } });
  revalidatePath("/stock-items");
  return { success: true as const };
}

export async function recordPurchase(formData: FormData) {
  const session = await requireAuth();
  const parsed = purchaseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Validation error" };

  const { stockItemId, quantity, note } = parsed.data;

  await prisma.$transaction([
    prisma.stockItem.update({
      where: { id: stockItemId },
      data:  { currentStock: { increment: quantity } },
    }),
    prisma.stockItemEntry.create({
      data: {
        stockItemId,
        quantityChange: quantity,
        type:           "PURCHASE",
        note:           note ?? null,
        changedById:    Number(session.user.id),
      },
    }),
  ]);
  revalidatePath("/stock-items");
  return { success: true as const };
}

export async function deductStockItemsForOrder(orderId: number, userId: number): Promise<{ warnings: string[] }> {
  const order = await prisma.order.findUnique({
    where:   { id: orderId },
    include: { items: { include: { stockItem: true } } },
  });
  if (!order) return { warnings: [] };

  const warnings: string[] = [];

  for (const item of order.items) {
    if (!item.stockItem) continue;

    const newStock = Number(item.stockItem.currentStock) - item.quantity;
    if (newStock < 0) {
      warnings.push(`${item.stockItem.name}: stock will go negative (${newStock.toFixed(2)} ${item.stockItem.stockUnit})`);
    }

    await prisma.$transaction([
      prisma.stockItem.update({
        where: { id: item.stockItem.id },
        data:  { currentStock: { decrement: item.quantity } },
      }),
      prisma.stockItemEntry.create({
        data: {
          stockItemId:    item.stockItem.id,
          quantityChange: -item.quantity,
          type:           "SOLD",
          orderId,
          note:           `Order #${order.orderNo}`,
          changedById:    userId,
        },
      }),
    ]);
  }

  return { warnings };
}

export async function restoreStockItemsForOrder(orderId: number, userId: number): Promise<void> {
  const entries = await prisma.stockItemEntry.findMany({
    where: { orderId, type: "SOLD" },
  });
  if (entries.length === 0) return;

  for (const entry of entries) {
    const qty = Math.abs(Number(entry.quantityChange));
    await prisma.$transaction([
      prisma.stockItem.update({
        where: { id: entry.stockItemId },
        data:  { currentStock: { increment: qty } },
      }),
      prisma.stockItemEntry.create({
        data: {
          stockItemId:    entry.stockItemId,
          quantityChange: qty,
          type:           "ADJUSTMENT",
          orderId,
          note:           `Restored — Order cancelled`,
          changedById:    userId,
        },
      }),
    ]);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/actions/stock-items.ts
git commit -m "feat: stock items server actions (CRUD, purchase, deduct, restore)"
```

---

### Task 6: Stock Items list page

**Files:**
- Create: `src/app/(app)/stock-items/page.tsx`
- Create: `src/components/stock-items/StockItemsClient.tsx`

- [ ] **Step 1: Create the server component `src/app/(app)/stock-items/page.tsx`**

```tsx
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guards";
import StockItemsClient from "@/components/stock-items/StockItemsClient";

export const metadata = { title: "Stock Items — Buddies OMS" };

export default async function StockItemsPage() {
  await requireAuth();

  const items = await prisma.stockItem.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      stockEntries: {
        orderBy: { changedAt: "desc" },
        take: 30,
        include: { changedBy: { select: { username: true } } },
      },
    },
  });

  const serialised = items.map((item) => ({
    id:           item.id,
    code:         item.code,
    name:         item.name,
    description:  item.description,
    stockUnit:    item.stockUnit,
    unitPrice:    Number(item.unitPrice),
    currentStock: Number(item.currentStock),
    minStock:     Number(item.minStock),
    active:       item.active,
    stockEntries: item.stockEntries.map((e) => ({
      id:             e.id,
      quantityChange: Number(e.quantityChange),
      type:           e.type,
      note:           e.note,
      changedAt:      e.changedAt.toISOString(),
      changedBy:      e.changedBy?.username ?? null,
    })),
  }));

  const total    = items.length;
  const inStock  = items.filter((i) => Number(i.currentStock) > Number(i.minStock) && i.active).length;
  const lowStock = items.filter((i) => Number(i.currentStock) <= Number(i.minStock) && Number(i.currentStock) > 0 && i.active).length;
  const outStock = items.filter((i) => Number(i.currentStock) <= 0 && i.active).length;

  return (
    <StockItemsClient
      items={serialised}
      stats={{ total, inStock, lowStock, outStock }}
    />
  );
}
```

- [ ] **Step 2: Create `src/components/stock-items/StockItemsClient.tsx`**

```tsx
"use client";

import { useState } from "react";
import { Package, TrendingDown, AlertTriangle, Archive } from "lucide-react";
import StatChip from "@/components/ui/StatChip";
import StockItemSlideOver from "./StockItemSlideOver";
import StockItemExpandRow from "./StockItemExpandRow";

export interface StockItemRow {
  id: number; code: string; name: string; description: string | null;
  stockUnit: string; unitPrice: number; currentStock: number; minStock: number; active: boolean;
  stockEntries: {
    id: number; quantityChange: number; type: string;
    note: string | null; changedAt: string; changedBy: string | null;
  }[];
}

interface Props {
  items: StockItemRow[];
  stats: { total: number; inStock: number; lowStock: number; outStock: number };
}

type Filter = "all" | "in_stock" | "low_stock" | "out_of_stock";

function stockStatus(item: StockItemRow): "in_stock" | "low_stock" | "out_of_stock" {
  if (item.currentStock <= 0) return "out_of_stock";
  if (item.currentStock <= item.minStock) return "low_stock";
  return "in_stock";
}

export default function StockItemsClient({ items, stats }: Props) {
  const [filter,      setFilter]      = useState<Filter>("all");
  const [slideOpen,   setSlideOpen]   = useState(false);
  const [editItem,    setEditItem]    = useState<StockItemRow | null>(null);
  const [expandedId,  setExpandedId]  = useState<number | null>(null);

  const filtered = items.filter((item) => {
    if (filter === "all") return true;
    return stockStatus(item) === filter;
  });

  const th: React.CSSProperties = {
    padding: "0.55rem 0.85rem", fontSize: "0.6rem", letterSpacing: "0.09em",
    color: "rgba(240,237,230,0.3)", fontWeight: 600, textAlign: "left",
    borderBottom: "1px solid rgba(245,182,30,0.08)", whiteSpace: "nowrap",
  };

  return (
    <div className="module-root">
      {/* Stat strip */}
      <div className="stat-strip">
        <StatChip label="Total SKUs"  value={stats.total}    icon={Package} />
        <StatChip label="In Stock"    value={stats.inStock}  icon={Archive}        color="green" />
        <StatChip label="Low Stock"   value={stats.lowStock} icon={AlertTriangle}  color="amber" />
        <StatChip label="Out of Stock" value={stats.outStock} icon={TrendingDown}  color="red" />
      </div>

      {/* Filter tabs */}
      <div className="filter-tab-bar">
        {(["all", "in_stock", "low_stock", "out_of_stock"] as Filter[]).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`filter-tab${filter === f ? " active" : ""}`}>
            {f === "all" ? "All" : f === "in_stock" ? "In Stock" : f === "low_stock" ? "Low Stock" : "Out of Stock"}
          </button>
        ))}
      </div>

      {/* Header bar */}
      <div className="content-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h2 className="section-title">Stock Items</h2>
          <button className="cta-btn" onClick={() => { setEditItem(null); setSlideOpen(true); }}>
            + New Stock Item
          </button>
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">No stock items{filter !== "all" ? " in this category" : ""}.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>CODE</th>
                <th style={th}>NAME</th>
                <th style={th}>UNIT</th>
                <th style={{ ...th, textAlign: "right" }}>STOCK</th>
                <th style={{ ...th, textAlign: "right" }}>MIN</th>
                <th style={{ ...th, textAlign: "right" }}>UNIT PRICE</th>
                <th style={th}>STATUS</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const status = stockStatus(item);
                const isExpanded = expandedId === item.id;
                return (
                  <>
                    <tr
                      key={item.id}
                      style={{ cursor: "pointer", background: isExpanded ? "rgba(245,182,30,0.04)" : undefined }}
                      onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    >
                      <td style={{ padding: "0.65rem 0.85rem", fontSize: "0.75rem", fontWeight: 700, color: "#F5B61E", letterSpacing: "0.05em" }}>{item.code}</td>
                      <td style={{ padding: "0.65rem 0.85rem", fontSize: "0.82rem" }}>{item.name}</td>
                      <td style={{ padding: "0.65rem 0.85rem", fontSize: "0.75rem", color: "rgba(240,237,230,0.5)" }}>{item.stockUnit}</td>
                      <td style={{ padding: "0.65rem 0.85rem", textAlign: "right", fontWeight: 700, fontSize: "0.9rem", color: status === "out_of_stock" ? "#F87171" : status === "low_stock" ? "#FBBF24" : "#4ADE80" }}>
                        {item.currentStock.toFixed(item.currentStock % 1 === 0 ? 0 : 2)}
                      </td>
                      <td style={{ padding: "0.65rem 0.85rem", textAlign: "right", fontSize: "0.78rem", color: "rgba(240,237,230,0.4)" }}>
                        {item.minStock.toFixed(item.minStock % 1 === 0 ? 0 : 2)}
                      </td>
                      <td style={{ padding: "0.65rem 0.85rem", textAlign: "right", fontSize: "0.82rem" }}>Rs. {item.unitPrice.toFixed(2)}</td>
                      <td style={{ padding: "0.65rem 0.85rem" }}>
                        <span style={{
                          fontSize: "0.6rem", padding: "0.2rem 0.5rem", borderRadius: "0.25rem", fontWeight: 600, letterSpacing: "0.05em",
                          background: status === "out_of_stock" ? "rgba(248,113,113,0.1)" : status === "low_stock" ? "rgba(251,191,36,0.1)" : "rgba(74,222,128,0.1)",
                          color:      status === "out_of_stock" ? "#F87171" : status === "low_stock" ? "#FBBF24" : "#4ADE80",
                        }}>
                          {status === "out_of_stock" ? "OUT OF STOCK" : status === "low_stock" ? "LOW STOCK" : "IN STOCK"}
                        </span>
                      </td>
                      <td style={{ padding: "0.65rem 0.85rem" }}>
                        <button
                          className="edit-btn"
                          onClick={(e) => { e.stopPropagation(); setEditItem(item); setSlideOpen(true); }}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${item.id}-expand`}>
                        <td colSpan={8} style={{ padding: 0, background: "rgba(20,20,20,0.6)" }}>
                          <StockItemExpandRow item={item} />
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <StockItemSlideOver
        isOpen={slideOpen}
        editItem={editItem}
        onClose={() => { setSlideOpen(false); setEditItem(null); }}
      />
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/(app)/stock-items/page.tsx src/components/stock-items/StockItemsClient.tsx
git commit -m "feat: stock items list page with stat strip and filter tabs"
```

---

### Task 7: StockItem slide-over + expand row

**Files:**
- Create: `src/components/stock-items/StockItemSlideOver.tsx`
- Create: `src/components/stock-items/StockItemExpandRow.tsx`

- [ ] **Step 1: Create `src/components/stock-items/StockItemSlideOver.tsx`**

```tsx
"use client";

import { useRef, useTransition } from "react";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { createStockItem, updateStockItem, toggleStockItemActive } from "@/actions/stock-items";
import type { StockItemRow } from "./StockItemsClient";

interface Props {
  isOpen: boolean;
  editItem: StockItemRow | null;
  onClose: () => void;
}

export default function StockItemSlideOver({ isOpen, editItem, onClose }: Props) {
  const router      = useRouter();
  const formRef     = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();

  const inp: React.CSSProperties = {
    width: "100%", background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(245,182,30,0.14)", borderRadius: "0.5rem",
    padding: "0.6rem 0.9rem", color: "#F0EDE6", fontSize: "0.82rem", outline: "none",
  };
  const lbl: React.CSSProperties = {
    fontSize: "0.62rem", letterSpacing: "0.08em", color: "rgba(240,237,230,0.4)",
    display: "block", marginBottom: "0.4rem",
  };

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData(formRef.current!);
    startTransition(async () => {
      const result = editItem
        ? await updateStockItem(editItem.id, fd)
        : await createStockItem(fd);
      if ("error" in result && result.error) {
        alert(result.error);
        return;
      }
      router.refresh();
      onClose();
    });
  }

  async function handleToggleActive() {
    if (!editItem) return;
    await toggleStockItemActive(editItem.id, !editItem.active);
    router.refresh();
    onClose();
  }

  if (!isOpen) return null;

  return (
    <>
      <div className="slide-overlay" onClick={onClose} />
      <div className="slide-panel">
        <div className="slide-header">
          <h2 className="slide-title">{editItem ? "Edit Stock Item" : "New Stock Item"}</h2>
          <button onClick={onClose} className="slide-close"><X size={18} /></button>
        </div>

        <form ref={formRef} onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label style={lbl}>CODE</label>
            <input name="code" required maxLength={50} defaultValue={editItem?.code ?? ""} style={inp} />
          </div>
          <div>
            <label style={lbl}>NAME</label>
            <input name="name" required maxLength={150} defaultValue={editItem?.name ?? ""} style={inp} />
          </div>
          <div>
            <label style={lbl}>DESCRIPTION (optional)</label>
            <input name="description" maxLength={255} defaultValue={editItem?.description ?? ""} style={inp} />
          </div>
          <div>
            <label style={lbl}>STOCK UNIT</label>
            <input name="stockUnit" required maxLength={50} placeholder="e.g. boxes, liters, meters" defaultValue={editItem?.stockUnit ?? ""} style={inp} />
            <p style={{ fontSize: "0.6rem", color: "rgba(240,237,230,0.3)", marginTop: "0.3rem" }}>
              Used as the label throughout the stock UI — be precise (e.g. "boxes" not "box")
            </p>
          </div>
          <div>
            <label style={lbl}>UNIT PRICE (Rs.)</label>
            <input name="unitPrice" type="number" min="0" step="0.01" required defaultValue={editItem?.unitPrice ?? 0} style={inp} />
          </div>
          <div>
            <label style={lbl}>MIN STOCK (low-stock threshold)</label>
            <input name="minStock" type="number" min="0" step="0.01" defaultValue={editItem?.minStock ?? 0} style={inp} />
          </div>

          <button type="submit" className="submit-btn" disabled={pending} style={{ marginTop: "0.5rem" }}>
            {pending ? "SAVING…" : editItem ? "SAVE CHANGES" : "CREATE STOCK ITEM"}
          </button>

          {editItem && (
            <button
              type="button"
              onClick={handleToggleActive}
              style={{
                background: "none", border: `1px solid ${editItem.active ? "rgba(248,113,113,0.3)" : "rgba(74,222,128,0.3)"}`,
                borderRadius: "0.5rem", padding: "0.6rem", color: editItem.active ? "#F87171" : "#4ADE80",
                fontSize: "0.72rem", letterSpacing: "0.07em", cursor: "pointer",
              }}
            >
              {editItem.active ? "DEACTIVATE" : "REACTIVATE"}
            </button>
          )}
        </form>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Create `src/components/stock-items/StockItemExpandRow.tsx`**

```tsx
"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { recordPurchase } from "@/actions/stock-items";
import type { StockItemRow } from "./StockItemsClient";

interface Props { item: StockItemRow; }

const TYPE_LABEL: Record<string, string> = {
  PURCHASE: "PURCHASE", SOLD: "SOLD", ADJUSTMENT: "ADJUSTMENT",
};
const TYPE_COLOR: Record<string, string> = {
  PURCHASE: "#4ADE80", SOLD: "#F87171", ADJUSTMENT: "#FBBF24",
};

export default function StockItemExpandRow({ item }: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error,   setError]        = useState("");

  const isLow = item.currentStock <= item.minStock;
  const isOut = item.currentStock <= 0;

  function handlePurchase(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData(formRef.current!);
    fd.set("stockItemId", String(item.id));
    setError("");
    startTransition(async () => {
      const result = await recordPurchase(fd);
      if ("error" in result && result.error) { setError(result.error); return; }
      router.refresh();
      setModalOpen(false);
    });
  }

  const inp: React.CSSProperties = {
    width: "100%", background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(245,182,30,0.14)", borderRadius: "0.5rem",
    padding: "0.6rem 0.9rem", color: "#F0EDE6", fontSize: "0.82rem", outline: "none",
  };

  return (
    <div style={{ padding: "1.25rem 1.75rem" }}>
      {/* Stock summary */}
      <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", marginBottom: "1.25rem" }}>
        <div>
          <p style={{ fontSize: "0.55rem", letterSpacing: "0.1em", color: "rgba(240,237,230,0.3)", marginBottom: "0.25rem" }}>
            STOCK ({item.stockUnit.toUpperCase()})
          </p>
          <p style={{ fontSize: "1.4rem", fontWeight: 800, color: isOut ? "#F87171" : isLow ? "#FBBF24" : "#4ADE80", margin: 0 }}>
            {item.currentStock.toFixed(item.currentStock % 1 === 0 ? 0 : 2)}
          </p>
        </div>
        <div style={{ borderLeft: "1px solid rgba(245,182,30,0.1)", paddingLeft: "1.5rem" }}>
          <p style={{ fontSize: "0.55rem", letterSpacing: "0.1em", color: "rgba(240,237,230,0.3)", marginBottom: "0.25rem" }}>MIN STOCK</p>
          <p style={{ fontSize: "1rem", color: "rgba(240,237,230,0.6)", margin: 0 }}>{item.minStock.toFixed(item.minStock % 1 === 0 ? 0 : 2)}</p>
        </div>
        {isOut && <span style={{ fontSize: "0.65rem", color: "#F87171", fontWeight: 700, letterSpacing: "0.07em" }}>OUT OF STOCK — reorder {item.stockUnit} needed</span>}
        {!isOut && isLow && <span style={{ fontSize: "0.65rem", color: "#FBBF24", fontWeight: 700, letterSpacing: "0.07em" }}>BELOW MINIMUM — reorder {item.stockUnit} needed</span>}
        <button
          onClick={() => setModalOpen(true)}
          className="cta-btn"
          style={{ marginLeft: "auto", fontSize: "0.68rem", padding: "0.4rem 0.85rem" }}
        >
          + Record Purchase
        </button>
      </div>

      {/* History */}
      <p style={{ fontSize: "0.55rem", letterSpacing: "0.1em", color: "rgba(240,237,230,0.3)", marginBottom: "0.6rem" }}>HISTORY</p>
      {item.stockEntries.length === 0 ? (
        <p style={{ fontSize: "0.75rem", color: "rgba(240,237,230,0.25)" }}>No stock history yet.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Date", "Type", "Change", "Note", "By"].map((h) => (
                <th key={h} style={{ fontSize: "0.58rem", letterSpacing: "0.08em", color: "rgba(240,237,230,0.25)", fontWeight: 600, padding: "0.35rem 0.6rem", textAlign: "left", borderBottom: "1px solid rgba(245,182,30,0.06)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {item.stockEntries.map((e) => (
              <tr key={e.id}>
                <td style={{ padding: "0.4rem 0.6rem", fontSize: "0.73rem", color: "rgba(240,237,230,0.45)" }}>
                  {new Date(e.changedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" })}
                </td>
                <td style={{ padding: "0.4rem 0.6rem" }}>
                  <span style={{ fontSize: "0.58rem", padding: "0.15rem 0.4rem", borderRadius: "0.2rem", fontWeight: 700, letterSpacing: "0.06em", color: TYPE_COLOR[e.type] ?? "#F0EDE6", background: `${TYPE_COLOR[e.type] ?? "#F0EDE6"}15` }}>
                    {TYPE_LABEL[e.type] ?? e.type}
                  </span>
                </td>
                <td style={{ padding: "0.4rem 0.6rem", fontSize: "0.8rem", fontWeight: 700, color: e.quantityChange > 0 ? "#4ADE80" : "#F87171" }}>
                  {e.quantityChange > 0 ? "+" : ""}{e.quantityChange.toFixed(e.quantityChange % 1 === 0 ? 0 : 2)}
                </td>
                <td style={{ padding: "0.4rem 0.6rem", fontSize: "0.72rem", color: "rgba(240,237,230,0.4)" }}>{e.note ?? "—"}</td>
                <td style={{ padding: "0.4rem 0.6rem", fontSize: "0.7rem", color: "rgba(240,237,230,0.3)" }}>{e.changedBy ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Purchase modal */}
      {modalOpen && (
        <>
          <div className="slide-overlay" onClick={() => setModalOpen(false)} />
          <div className="slide-panel">
            <div className="slide-header">
              <h2 className="slide-title">Record Purchase — {item.name}</h2>
              <button onClick={() => setModalOpen(false)} style={{ background: "none", border: "none", color: "rgba(240,237,230,0.4)", cursor: "pointer", padding: "0.25rem" }}>✕</button>
            </div>
            {error && <div className="form-error" style={{ marginBottom: "0.75rem" }}>{error}</div>}
            <form ref={formRef} onSubmit={handlePurchase} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ fontSize: "0.62rem", letterSpacing: "0.08em", color: "rgba(240,237,230,0.4)", display: "block", marginBottom: "0.4rem" }}>
                  QUANTITY ({item.stockUnit.toUpperCase()})
                </label>
                <input name="quantity" type="number" min="0.01" step="0.01" required autoFocus style={inp} />
              </div>
              <div>
                <label style={{ fontSize: "0.62rem", letterSpacing: "0.08em", color: "rgba(240,237,230,0.4)", display: "block", marginBottom: "0.4rem" }}>
                  NOTE (supplier, reference, etc.)
                </label>
                <input name="note" maxLength={255} placeholder="Optional" style={inp} />
              </div>
              <button type="submit" className="submit-btn" disabled={pending}>
                {pending ? "RECORDING…" : "RECORD PURCHASE"}
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Test the full stock items flow**

1. Navigate to `/stock-items`.
2. Create a stock item: code `CORRBOX-A4`, name `Corrugated Box A4`, unit `boxes`, price `150`, min stock `20`.
3. Expand the row — stock panel shows 0 boxes, history empty.
4. Click "Record Purchase" — enter qty 100, note "First batch". Submit.
5. Verify: current stock shows 100, history shows PURCHASE +100.
6. Low stock: create another item with `minStock: 50`, stock 0 — verify red "OUT OF STOCK" badge.

- [ ] **Step 4: Commit**

```bash
git add src/components/stock-items/StockItemSlideOver.tsx src/components/stock-items/StockItemExpandRow.tsx
git commit -m "feat: stock items slide-over, stock panel, and purchase recording UI"
```

---

### Task 8: Extend validation schema + OrderItemsEditor

**Files:**
- Modify: `src/lib/validations/order.ts`
- Modify: `src/components/orders/OrderItemsEditor.tsx`

- [ ] **Step 1: Update `orderItemInputSchema` in `src/lib/validations/order.ts`**

Find `orderItemInputSchema` and replace it:

```ts
export const orderItemInputSchema = z.object({
  boxDesignId: z.number().int().positive().optional(),
  stockItemId: z.number().int().positive().optional(),
  quantity:    z.number().int().min(1),
  unitPrice:   z.number().min(0),
}).refine(
  (d) => (d.boxDesignId !== undefined) !== (d.stockItemId !== undefined),
  { message: "Exactly one of boxDesignId or stockItemId must be provided" }
);
```

- [ ] **Step 2: Update `OrderItemsEditor.tsx` to support stock items**

Replace the `OrderItem` interface and add `StockItemOption`:

```ts
export interface StockItemOption {
  id:        number;
  code:      string;
  name:      string;
  stockUnit: string;
  unitPrice: number;
  currentStock: number;
}

export interface OrderItem {
  key:          string;
  boxDesignId:  number;    // 0 = unset
  stockItemId:  number;    // 0 = unset (exactly one of boxDesignId/stockItemId will be non-zero)
  designName:   string;
  designCode:   string;
  quantity:     number;
  unitPrice:    number;
  lineTotal:    number;
}
```

Update the `Props` interface to add `stockItems`:

```ts
interface Props {
  boxTypes:     BoxTypeOption[];
  boxDesigns:   BoxDesignOption[];
  designTypes:  DesignTypeOption[];
  materials:    MaterialOption[];
  stockItems:   StockItemOption[];
  isAdmin:      boolean;
  onChange:     (items: OrderItem[]) => void;
  initialItems?: OrderItem[];
}
```

Add `activeTab` state:

```ts
const [activeTab, setActiveTab] = useState<"designs" | "stock">("designs");
```

Add handler for stock item selection:

```ts
function handleStockItemChange(key: string, rawId: string) {
  const id = Number(rawId);
  const si = stockItems.find((s) => s.id === id);
  update(items.map((i) => {
    if (i.key !== key) return i;
    const unitPrice = si?.unitPrice ?? 0;
    return {
      ...i,
      boxDesignId: 0,
      stockItemId: id,
      designName:  si?.name  ?? "",
      designCode:  si?.code  ?? "",
      unitPrice,
      lineTotal: Math.round(unitPrice * i.quantity * 100) / 100,
    };
  }));
}
```

Replace `addItem` to default both IDs to 0:

```ts
function addItem() {
  const key = nextKey();
  update([...items, { key, boxDesignId: 0, stockItemId: 0, designName: "", designCode: "", quantity: 1, unitPrice: 0, lineTotal: 0 }]);
}
```

In the table, add a "ITEM TYPE" tab selector per row OR replace the single "BOX TYPE" + "BOX DESIGN" columns with a tab-based picker. The simplest approach: add a `type` select column before BOX TYPE:

```tsx
<th style={th}>ITEM TYPE</th>
<th style={th}>ITEM</th>
```

And in each row:
```tsx
<td style={td}>
  <select
    value={item.stockItemId > 0 ? "stock" : "design"}
    onChange={(e) => {
      const isStock = e.target.value === "stock";
      update(items.map((i) => i.key !== item.key ? i : {
        ...i,
        boxDesignId: 0, stockItemId: 0,
        designName: "", designCode: "", unitPrice: 0, lineTotal: 0,
      }));
    }}
    style={sel}
  >
    <option value="design">Box Design</option>
    <option value="stock">Stock Item</option>
  </select>
</td>
<td style={td}>
  {item.stockItemId > 0 ? (
    <Combobox
      name={`__stock_${item.key}`}
      placeholder="— Select Stock Item —"
      value={item.stockItemId || ""}
      options={stockItems.map((si) => ({ value: si.id, label: si.code, meta: `${si.name} (${si.currentStock} ${si.stockUnit})` }))}
      onChange={(v) => handleStockItemChange(item.key, String(v))}
    />
  ) : (
    <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
      <div style={{ flex: 1 }}>
        <Combobox
          name={`__design_${item.key}`}
          placeholder="— Select Design —"
          value={item.boxDesignId || ""}
          options={filteredDesigns.map((bd) => ({ value: bd.id, label: bd.code, meta: bd.name }))}
          onChange={(v) => handleBoxDesignChange(item.key, String(v))}
        />
      </div>
      <button type="button" onClick={() => setPanelOpenForKey(item.key)} ... >
        <Sparkles size={13} />
      </button>
    </div>
  )}
</td>
```

Remove the separate `BOX TYPE` column (type filtering via selectedTypes) since the type col is now "Item Type" (design vs stock).

- [ ] **Step 3: Commit**

```bash
git add src/lib/validations/order.ts src/components/orders/OrderItemsEditor.tsx
git commit -m "feat: extend OrderItemsEditor to support stock items alongside box designs"
```

---

### Task 9: Extend order server actions for stock items

**Files:**
- Modify: `src/actions/orders.ts`
- Modify: `src/app/(app)/orders/new/NewOrderForm.tsx` (pass stockItems prop)
- Modify: `src/app/(app)/orders/[id]/edit/EditOrderForm.tsx` (pass stockItems prop + load initialItems with stockItemId)

- [ ] **Step 1: Update `createOrder` in `src/actions/orders.ts`**

Replace the items parsing section to handle both item types:

```ts
// After schema parse, replace the items parsing block:
interface RawItem { boxDesignId?: number; stockItemId?: number; quantity: number; unitPrice: number; }
const items: RawItem[] = [];
for (const item of rawItems) {
  const p = orderItemInputSchema.safeParse(item);
  if (!p.success) return { error: p.error.issues[0]?.message ?? "Invalid item" };
  items.push(p.data as RawItem);
}

// Split into two groups
const bdItems  = items.filter((i) => i.boxDesignId);
const siItems  = items.filter((i) => i.stockItemId);

// Load box designs
const boxDesignIds = [...new Set(bdItems.map((i) => i.boxDesignId!))];
const boxDesigns   = boxDesignIds.length > 0
  ? await prisma.boxDesign.findMany({ where: { id: { in: boxDesignIds }, active: true }, select: { id: true, name: true, code: true } })
  : [];
const bdMap = new Map(boxDesigns.map((bd) => [bd.id, bd]));
for (const item of bdItems) {
  if (!bdMap.has(item.boxDesignId!)) return { error: `Box design ID ${item.boxDesignId} is inactive or does not exist` };
}

// Load stock items
const stockItemIds = [...new Set(siItems.map((i) => i.stockItemId!))];
const stockItems   = stockItemIds.length > 0
  ? await prisma.stockItem.findMany({ where: { id: { in: stockItemIds }, active: true }, select: { id: true, name: true, code: true } })
  : [];
const siMap = new Map(stockItems.map((si) => [si.id, si]));
for (const item of siItems) {
  if (!siMap.has(item.stockItemId!)) return { error: `Stock item ID ${item.stockItemId} is inactive or does not exist` };
}

// Replace items.map in prisma.order.create:
items: {
  create: items.map((item) => {
    if (item.boxDesignId) {
      const bd = bdMap.get(item.boxDesignId)!;
      return { boxDesignId: item.boxDesignId, stockItemId: null, designName: bd.name, designCode: bd.code, quantity: item.quantity, unitPrice: item.unitPrice, lineTotal: calculateLineTotal(item.unitPrice, item.quantity) };
    } else {
      const si = siMap.get(item.stockItemId!)!;
      return { boxDesignId: null, stockItemId: item.stockItemId, designName: si.name, designCode: si.code, quantity: item.quantity, unitPrice: item.unitPrice, lineTotal: calculateLineTotal(item.unitPrice, item.quantity) };
    }
  }),
},
```

Also update `calculateOrderTotals` call — it uses `item.boxDesignId` but actually only uses `quantity` and `unitPrice`, so no change needed.

- [ ] **Step 2: Apply the same dual-item handling to `updateOrderItems`**

The item-loading block in `updateOrderItems` also needs the same split: load box designs for `bdItems`, load stock items for `siItems`, validate both, and create with the correct FK set.

Mirror the logic from Step 1 — the `prisma.orderItem.create` calls inside `$transaction` need to set either `boxDesignId` or `stockItemId` and null the other.

- [ ] **Step 3: Update `NewOrderForm.tsx` to fetch and pass stock items**

In `src/app/(app)/orders/new/page.tsx` (the server component that renders `NewOrderForm`), add stock items fetch:

```ts
const stockItems = await prisma.stockItem.findMany({
  where:   { active: true },
  select:  { id: true, code: true, name: true, stockUnit: true, unitPrice: true, currentStock: true },
  orderBy: { name: "asc" },
});
const serialisedStockItems = stockItems.map((si) => ({
  ...si, unitPrice: Number(si.unitPrice), currentStock: Number(si.currentStock),
}));
```

Pass to `<NewOrderForm stockItems={serialisedStockItems} ... />`.

In `NewOrderForm.tsx`, add `stockItems: StockItemOption[]` to props and pass to `<OrderItemsEditor stockItems={stockItems} ... />`.

In `NewOrderForm.tsx`, update the JSON serialisation of items to include `stockItemId`:

```ts
// When building itemsJson from OrderItem[]:
items.map((i) => ({
  ...(i.stockItemId > 0 ? { stockItemId: i.stockItemId } : { boxDesignId: i.boxDesignId }),
  quantity:  i.quantity,
  unitPrice: i.unitPrice,
}))
```

- [ ] **Step 4: Update `EditOrderForm.tsx` similarly**

In the edit order page server component, fetch stock items the same way and pass to `EditOrderForm`.

In `EditOrderForm.tsx`, when constructing `initialItems` from the existing order items, include `stockItemId`:

```ts
initialItems={order.items.map((item) => ({
  key:         `item-${item.id}`,
  boxDesignId: item.boxDesignId ?? 0,
  stockItemId: item.stockItemId ?? 0,
  designName:  item.designName,
  designCode:  item.designCode,
  quantity:    item.quantity,
  unitPrice:   Number(item.unitPrice),
  lineTotal:   Number(item.lineTotal),
}))}
```

- [ ] **Step 5: Verify order creation with a stock item**

1. Go to `/orders/new`.
2. Add a line item — switch type to "Stock Item", pick "CORRBOX-A4".
3. Set qty 5, verify line total auto-calculates.
4. Complete the order. Verify it saves and shows on the order detail page with the stock item as a line.

- [ ] **Step 6: Commit**

```bash
git add src/actions/orders.ts src/app/(app)/orders/new/ src/app/(app)/orders/[id]/edit/
git commit -m "feat: extend createOrder and updateOrderItems to support stock items"
```

---

### Task 10: Status transition hooks

**Files:**
- Modify: `src/actions/orders.ts`

**Notes:** The existing `updateOrderStatus` already calls `deductStockForOrder` on `IN_PRODUCTION`. We need to also call `deductStockItemsForOrder` on `CONFIRMED`, and `restoreStockItemsForOrder` on `CANCELLED`.

- [ ] **Step 1: Import new functions in `orders.ts`**

```ts
import { deductStockForOrder, deductStockItemsForOrder, restoreStockItemsForOrder } from "@/actions/stock-items";
// Remove deductStockForOrder from the existing stock.ts import if it was there
import { deductStockForOrder as deductMaterialStock } from "@/actions/stock";
```

- [ ] **Step 2: Update `updateOrderStatus` — add CONFIRMED and CANCELLED hooks**

After the existing `$transaction` call, replace the current status-dispatch block:

```ts
await prisma.$transaction([
  prisma.order.update({ where: { id: orderId }, data: { status: newStatus as OrderStatus } }),
  prisma.orderStatusHistory.create({ data: { orderId, fromStatus: order.status as OrderStatus, toStatus: newStatus as OrderStatus, changedById: Number(session.user.id), note: note?.trim() || null } }),
]);

revalidatePath(`/orders/${orderId}`);
revalidatePath("/orders");

if (newStatus === "IN_PRODUCTION") {
  await deductMaterialStock(orderId, Number(session.user.id));
}

if (newStatus === "CONFIRMED") {
  const { warnings } = await deductStockItemsForOrder(orderId, Number(session.user.id));
  if (warnings.length > 0) {
    // Return success but include warnings — the UI will display them
    return { success: true as const, warnings };
  }
}

const cancelFromStatuses = ["CONFIRMED", "IN_PRODUCTION", "READY"];
if (newStatus === "CANCELLED" && cancelFromStatuses.includes(order.status)) {
  await restoreStockItemsForOrder(orderId, Number(session.user.id));
}

return { success: true as const };
```

- [ ] **Step 3: Update return type in `OrderStatusForm.tsx` to handle warnings**

In `src/app/(app)/orders/[id]/OrderStatusForm.tsx`, update the result handler:

```ts
const result = await updateOrderStatus(orderId, newStatus, note);
if (result.error) { setError(result.error); setLoading(false); }
else {
  const warn = "warnings" in result && result.warnings;
  setSuccess(
    warn && warn.length > 0
      ? `Status updated. Stock warning: ${warn.join("; ")}`
      : `Status updated to ${STATUS_LABELS[newStatus as OrderStatusKey]}`
  );
  setNote(""); setLoading(false);
}
```

- [ ] **Step 4: Verify stock deduction and restoration**

1. Create an order with a stock item (e.g., 10 corrugated boxes, currently 100 in stock).
2. Add a payment, then confirm the order — stock should drop from 100 to 90.
3. Navigate to `/stock-items` and expand the row — history should show SOLD −10 linked to the order.
4. Cancel the order — stock should restore to 100. History shows ADJUSTMENT +10.

- [ ] **Step 5: Commit**

```bash
git add src/actions/orders.ts src/app/(app)/orders/[id]/OrderStatusForm.tsx
git commit -m "feat: deduct stock items on CONFIRMED, restore on CANCELLED"
```

---

### Task 11: Sidebar link

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`
- Modify: `src/components/layout/BottomNav.tsx`

- [ ] **Step 1: Add Stock Items to `catalogNav` in `Sidebar.tsx`**

```ts
import {
  LayoutDashboard, Package, Users, BoxSelect, Archive, UserCog, Factory, Radio, FileText, Boxes,
} from "lucide-react";

const catalogNav = [
  { label: "Designs",      href: "/designs",      icon: BoxSelect },
  { label: "Materials",    href: "/materials",    icon: Archive },
  { label: "Stock Items",  href: "/stock-items",  icon: Boxes },
];
```

- [ ] **Step 2: Check if `BottomNav.tsx` needs the same link**

Open `src/components/layout/BottomNav.tsx`. If it has a catalog section, add Stock Items with `Boxes` icon and `/stock-items` href, following the same pattern as the sidebar.

- [ ] **Step 3: Verify sidebar renders correctly**

Start the dev server. Open any page. Confirm "Stock Items" appears in the CATALOG section of the sidebar with a Boxes icon, and clicking it navigates to `/stock-items`.

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/Sidebar.tsx src/components/layout/BottomNav.tsx
git commit -m "feat: add Stock Items to sidebar and bottom nav"
```

---

## Self-Review Checklist

- [x] **Invoice branding:** All 4 surfaces covered (Tasks 1–3). `buddiesicon-removebg.png` prerequisite noted.
- [x] **Watermark coordinates:** A4 595×842pt, image 245pt → top=299, left=175 (verified calculation).
- [x] **StockItem model:** code, name, description, stockUnit, unitPrice, currentStock, minStock, active.
- [x] **StockItemEntry model:** quantityChange Decimal, type enum, orderId?, changedById?.
- [x] **OrderItem nullable FK:** boxDesignId? and stockItemId?, mutual exclusivity via CHECK constraint + Zod refine.
- [x] **deductStockForOrder guard:** null check on `item.boxDesign` added in Task 4 Step 8.
- [x] **CONFIRMED hook:** deductStockItemsForOrder called on CONFIRMED.
- [x] **CANCELLED hook:** restoreStockItemsForOrder called only when previous status was CONFIRMED/IN_PRODUCTION/READY.
- [x] **Invoice rendering:** No changes needed — denormalised designCode/designName fields carry stock item data through.
- [x] **Sidebar + BottomNav:** Both updated in Task 11.
- [x] **EditOrderForm:** initialItems construction updated to include stockItemId in Task 9.
