# Invoice Branding + Stock Items — Design Spec

**Date:** 2026-06-27
**Status:** Approved

---

## Overview

Two features planned and designed together because they share a natural implementation sequence — invoice branding is self-contained UI work, stock items introduces a new data model that the invoice already renders correctly without modification.

---

## Feature 1 — Invoice Branding

### Scope

All four invoice surfaces:

| Surface | File | Theme | Current state |
|---|---|---|---|
| Internal HTML invoice | `src/app/(app)/orders/[id]/invoice/page.tsx` | Dark luxury | Text-only header, no watermark, minimal footer |
| Internal PDF | `src/lib/invoice-order-pdf.tsx` | Dark luxury | Has logo already, no watermark, minimal footer |
| Customer HTML invoice | `src/app/invoice/[token]/page.tsx` | Light/white | Text-only header, no watermark, minimal footer |
| Customer PDF | `src/lib/invoice-pdf.tsx` | Light/white | Text-only header, no watermark, minimal footer |

### Logo

File: `public/buddiesicon-removebg.png` (transparent background — works on both dark and light surfaces).

Placement — all four surfaces:
- Header: logo image (48×48pt PDF / 52px HTML) left-aligned, beside company name + tagline + contact line
- Internal PDF already uses `buddiesicon.png` — swap to `buddiesicon-removebg.png`

Header layout (all surfaces):
```
[Logo 48pt]  BUDDIES                      INVOICE
             Your Vision, Our Mission     # ORD-001
             0783085081 / 0707490585      Date: ...
             hello.buddieslk@gmail.com    Delivery: ...
             www.buddiescraft.net
```

### Watermark

Centered ghost of `buddiesicon-removebg.png` behind all page content.

**react-pdf (both PDFs):**
```
position: "absolute"
top: 299, left: 175    ← visual centre of A4 (595×842pt) minus half image size (842−245)/2, (595−245)/2
width: 245, height: 245
opacity: 0.05 (light PDF) / 0.04 (dark PDF)
```
Rendered as a `<View>` containing `<Image>` placed before all content children so it sits behind.

**HTML pages:**
```css
.inv-watermark {
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  width: 260px; height: 260px;
  opacity: 0.05;          /* 0.04 on dark internal page */
  pointer-events: none;
  z-index: 0;
}
```
The `inv-sheet` wrapper gets `position: relative`. All content children get `position: relative; z-index: 1`.

### Footer

Replace single-line throwaway with a two-line structured close on all four surfaces:

```
──────────────────────────────────────────────
Thank you for choosing Buddies
0783085081 / 0707490585  ·  hello.buddieslk@gmail.com  ·  www.buddiescraft.net  ·  Athurugiriya, Sri Lanka
```

- Rule colour: `#C8940A` (gold at ~50% brightness) for dark surfaces, `#e5e7eb` for light
- Text: 7pt / 0.7rem, muted — `#7A7570` dark, `#9ca3af` light
- Sign-off line uses `Helvetica-Oblique` (PDF) / `font-style: italic` (HTML) for warmth

### COMPANY constant

Both HTML pages and both PDF files each define their own `COMPANY` object. The correct values to use across all four:

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

---

## Feature 2 — Stock Items Module

### Concept

A new first-class entity: `StockItem`. Covers anything the business **buys and sells directly** — corrugated boxes, glue, ribbon, any future consumable or accessory. Stock is tracked per item with a configurable unit label (admin-set, no code change needed to add new unit types).

This is distinct from:
- **Material stock** (`Material.currentStockLevel`) — sheets used to cut custom gift boxes. Already exists. Unchanged.
- **Box designs** (`BoxDesign`) — pure custom-box specifications. Unchanged.

### Schema Changes

#### New model: `StockItem`

```prisma
model StockItem {
  id            Int              @id @default(autoincrement())
  code          String           @unique @db.VarChar(50)
  name          String           @db.VarChar(150)
  description   String?          @db.VarChar(255)
  stockUnit     String           @map("stock_unit") @db.VarChar(50)  // "boxes", "liters", "meters", etc.
  unitPrice     Decimal          @map("unit_price") @db.Decimal(10, 2)
  currentStock  Decimal          @default(0) @map("current_stock") @db.Decimal(10, 2)
  minStock      Decimal          @default(0) @map("min_stock") @db.Decimal(10, 2)
  active        Boolean          @default(true) @map("is_active")
  createdAt     DateTime         @default(now()) @map("created_at") @db.DateTime
  updatedAt     DateTime         @updatedAt @map("updated_at") @db.DateTime
  orderItems    OrderItem[]
  stockEntries  StockItemEntry[]

  @@index([active])
  @@map("stock_item")
}
```

#### New enum + model: `StockItemEntry`

```prisma
enum StockItemEntryType {
  PURCHASE
  SOLD
  ADJUSTMENT
}

model StockItemEntry {
  id             Int                @id @default(autoincrement())
  stockItemId    Int                @map("stock_item_id")
  stockItem      StockItem          @relation(fields: [stockItemId], references: [id])
  quantityChange Decimal            @map("quantity_change") @db.Decimal(10, 2)  // negative for SOLD
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

#### `OrderItem` — add nullable `stockItemId`

```prisma
model OrderItem {
  // ...existing fields...
  boxDesignId   Int?       @map("box_design_id")   // was non-nullable — becomes nullable
  boxDesign     BoxDesign? @relation(...)
  stockItemId   Int?       @map("stock_item_id")
  stockItem     StockItem? @relation(...)
  // designName, designCode, quantity, unitPrice, lineTotal unchanged
}
```

**Constraint:** exactly one of `boxDesignId` / `stockItemId` must be set. Enforced at two layers:
1. DB: `CHECK ((box_design_id IS NULL) != (stock_item_id IS NULL))`  — added in migration SQL
2. Application: server action validates before insert

`Order` gains `stockItemEntries StockItemEntry[]` relation.

#### `BoxDesign` — `materialId` stays non-nullable

`BoxDesign` remains unchanged. `materialId` stays required. Corrugated boxes and other directly-stocked items are `StockItem` records, not `BoxDesign` records.

### `DesignType` — unchanged

No `stockUnit` or `requiresMaterial` fields. DesignType stays pure custom-box categorisation.

### Stock Item CRUD Module

New page group: `src/app/(app)/stock-items/`

**List page** (`/stock-items`):
- Stat strip: Total SKUs · In Stock · Low Stock · Out of Stock
- Table columns: Code · Name · Unit · Current Stock · Min Stock · Unit Price · Status
- Low-stock rows: amber badge
- Out-of-stock rows: red badge
- Filter tabs: All · In Stock · Low Stock · Out of Stock
- Actions: Edit (slide-over), Deactivate

**Create / Edit slide-over:**
- Code (auto-suggested from name, editable)
- Name
- Description (optional)
- Stock Unit — text input, e.g. "boxes", "liters", "meters". Helper text: "Used as the label throughout the stock UI — leave this intentional, e.g. 'boxes' not 'box'"
- Unit Price
- Min Stock (threshold for low-stock warning)
- Active toggle (edit only)

**Detail / Stock panel** (expand row, following the materials/customers pattern):
```
STOCK (boxes)                          [+ Record Purchase]

  145 boxes current    Min: 50    ● In Stock

  ── History ──────────────────────────────────────────
  Jun 27  PURCHASE   +200  →  345   Supplier: ABC Co
  Jun 26  SOLD        −55  →  145   Order ORD-20260626-001
  Jun 25  ADJUSTMENT  +10  →  200   Stock count correction
```

- Low stock: badge turns red, warning "Below minimum — reorder {stockUnit} needed"
- **Record Purchase modal:** Date (defaults today) · Quantity · Cost per unit (optional, for records) · Supplier note

### Order Form — Item Picker Extension

The existing "Add Item" flow in the New Order form currently shows only BoxDesigns. It becomes a two-tab picker:

```
[ Box Designs ]  [ Stock Items ]
```

- **Box Designs tab:** existing behaviour unchanged
- **Stock Items tab:** lists active StockItems — code, name, unit price, current stock badge
  - Low/out-of-stock items shown with amber/red badge but still selectable (don't block the sale)

On selection, the line item populates `designCode`, `designName`, `quantity`, `unitPrice` identically to a BoxDesign item. `stockItemId` is set, `boxDesignId` is null.

A shared helper resolves either FK to `{ code, name, unitPrice }` for all downstream consumers (invoice, PDF, totals).

### Auto Stock Deduction — Order Status Transitions

**On → CONFIRMED:**
1. Find all `OrderItem`s in the order where `stockItemId IS NOT NULL`
2. For each: `stockItem.currentStock -= item.quantity`, create `StockItemEntry { type: SOLD, quantityChange: -qty, orderId }`
3. If stock would go negative: **warn but allow** — show a low-stock warning banner on the order detail page, do not block the status transition

**On → CANCELLED** (from CONFIRMED, IN_PRODUCTION, or READY):
1. Find `StockItemEntry` records where `orderId = this order AND type = SOLD`
2. For each: create `StockItemEntry { type: ADJUSTMENT, quantityChange: +qty, note: "Restored — Order #X cancelled" }`, increment `stockItem.currentStock`

**On → DELIVERED, READY, IN_PRODUCTION:** no stock action.

### Invoice + PDF — No Changes Required

`OrderItem` already carries `designCode`, `designName`, `quantity`, `unitPrice`, `lineTotal` as denormalised fields. Both invoice surfaces and both PDFs read these fields directly — stock items appear as line items identically to box design items. Zero changes needed to invoice rendering code.

### Sidebar Navigation

Add "Stock Items" link to the sidebar, grouped with or after "Box Designs". Icon: a box or warehouse symbol.

---

## Implementation Order

1. **Invoice Branding** — self-contained, no schema change. Ship first.
2. **Schema migration** — add `StockItem`, `StockItemEntry`, alter `OrderItem`, add CHECK constraint.
3. **Stock Items CRUD** — list, create/edit slide-over, stock panel, purchase modal.
4. **Order form item picker** — two-tab extension.
5. **Status transition hooks** — CONFIRMED deduction, CANCELLED restoration.
6. **Sidebar link.**

---

## Out of Scope

- Email/notification of invoices (planned separately using Resend + `hello.buddieslk@gmail.com`)
- Material sheet stock changes (existing `StockAdjustment` system untouched)
- Dashboard analytics for stock items
