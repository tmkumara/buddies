# Buddies Gift Box OMS — Full Software Requirements Specification

**Date:** 2026-06-26  
**Status:** Approved for implementation planning  
**Scope:** Complete rewrite of all modules with new business logic

---

## 1. System Overview

Buddies Gift Box OMS is a fullstack Next.js 16 (App Router + Server Actions) + Prisma 7 + MySQL web application used internally by Buddies Craft staff to manage gift box orders from creation through delivery. It replaces a legacy Spring Boot/Thymeleaf system.

---

## 2. User Roles

| Role | Capabilities |
|---|---|
| **STAFF** | Full access to Orders, Customers, Designs, Materials, Production Queue, Reports (view) |
| **ADMIN** | Everything STAFF can do + Users management, Lead Sources management, delete cancelled orders, override unit prices, override discount %, export reports |

Both roles handle day-to-day operations. ADMIN has additional management and override capabilities.

---

## 3. Schema Changes

### 3.1 Modified Tables

#### `design_type` → conceptually renamed **Box Type** (UI label only, table/map name unchanged)
- Add `unit_price` field → **REMOVED from plan** (Box Types carry no price)
- Keep: id, code, name, description, image_url, is_active, created_at, updated_at

#### `box_design`
- `unit_price DECIMAL(10,2)` stays **NOT NULL** (definitive selling price, set at design creation)
- No other schema changes

#### `customer_order`
- Add `lead_source_id INT NULL` → FK to new `lead_source` table
- Add `public_token VARCHAR(64) UNIQUE NULL` → for public invoice URL (generated at order creation)

### 3.2 New Tables

#### `payment`
```
id              INT PK AUTO_INCREMENT
order_id        INT NOT NULL FK customer_order.id ON DELETE CASCADE
amount          DECIMAL(12,2) NOT NULL
payment_date    DATE NOT NULL
method          ENUM('CASH','BANK_TRANSFER','CHEQUE') NOT NULL
reference_no    VARCHAR(100) NULL
note            VARCHAR(255) NULL
created_by_id   INT NULL FK users.id
created_at      DATETIME DEFAULT NOW()

INDEX: order_id
```

#### `lead_source`
```
id        INT PK AUTO_INCREMENT
name      VARCHAR(100) NOT NULL
active    BOOLEAN DEFAULT TRUE
```
Seeded with: WhatsApp, Facebook, Instagram, Walk-in, Referral, Other

#### `stock_adjustment`
```
id              INT PK AUTO_INCREMENT
material_id     INT NOT NULL FK material.id
quantity_change DECIMAL(10,2) NOT NULL  -- positive = add, negative = deduct
reason          VARCHAR(255) NULL
type            ENUM('MANUAL','AUTO_PRODUCTION') NOT NULL
order_id        INT NULL FK customer_order.id
changed_by_id   INT NULL FK users.id
changed_at      DATETIME DEFAULT NOW()

INDEX: material_id, order_id
```

---

## 4. Pricing Formula

### 4.1 BoxDesign Unit Price Calculator (used at design creation time only)

```
Use inches if available, fall back to cm:
  sheetL = material.sheetLengthIn ?? material.sheetLengthCm
  sheetW = material.sheetWidthIn  ?? material.sheetWidthCm
  cutL   = boxDesign.cutLengthIn  ?? boxDesign.cutLengthCm
  cutW   = boxDesign.cutWidthIn   ?? boxDesign.cutWidthCm

boxes_per_sheet   = floor(sheetL / cutL) × floor(sheetW / cutW)
material_cost/box = material.unitPrice ÷ boxes_per_sheet
add_on_cost       = manually entered by staff (ribbon, transparent sheet, extras)

suggested_unit_price = material_cost/box + add_on_cost
```

Staff confirms or adjusts the suggested price. Saved value is `boxDesign.unitPrice` — fixed forever. Manual edit of BoxDesign required to change it later.

> `material.unitPrice` = working/calculation price (includes buy price + overhead per sheet)  
> `material.costPerSheet` = true buy price (used for profit reporting only)

### 4.2 Order Line Total

```
line_total = boxDesign.unitPrice × quantity
```

No formula at order time — unit price is always the stored BoxDesign price.

### 4.3 Order Totals & Discount

```
subtotal  = sum(all line_totals)
total_qty = sum(all item quantities)

discount_rate = 10%  if total_qty ≥ 100
                7%   if total_qty ≥ 50
                0%   otherwise

[ADMIN can override discount_rate manually]

discount_amount = subtotal × discount_rate
net_amount      = subtotal − discount_amount
```

### 4.4 Profit (for reports only)

```
boxes_per_sheet    = floor(sheetL / cutL) × floor(sheetW / cutW)
true_cost/box      = material.costPerSheet ÷ boxes_per_sheet
profit/item        = (boxDesign.unitPrice − true_cost/box) × quantity
order_profit       = sum(all item profits)
```

---

## 5. Modules

---

### 5.1 Dashboard

**Panels:**
- **Bar chart**: monthly order count and/or revenue (current year, switchable)
- **Pie chart**: order status distribution
- **Top customers**: by total revenue (top 5)
- **Top designs**: most ordered box designs (top 5)
- **Low stock materials**: materials where `currentStockLevel < minStockLevel`
- **Stats strip**: Total Orders, Active Orders, Fulfillment Rate, Total Customers

**Internal alerts (shown as banners/chips):**
- Orders with delivery date within 3 days and status ≠ DELIVERED/CANCELLED
- Orders with payment balance > 0 and status = READY (blocked from delivery)

**Quick actions:**
- New Order → `/orders/new`
- New Customer → `/customers/new`
- Export Report → opens report page

---

### 5.2 Orders Module

#### 5.2.1 Orders List (`/orders`)

**Filters:**
- Search: customer name, phone, or order number (single search field)
- Status filter tabs: All / Draft / Confirmed / In Production / Ready / Delivered / Cancelled
  - Cancelled tab hidden unless explicitly selected
- Date range: order date from / to
- Payment status: All / Unpaid / Partially Paid / Fully Paid

**Table columns:** Order No, Customer, Order Date, Delivery Date, Items, Net Amount, Payment Status, Status, Action

**Default view:** excludes CANCELLED orders

#### 5.2.2 New Order (`/orders/new`)

**Step-by-step form:**

1. **Customer** — searchable combobox (search by name or phone)
   - If no match: "Add new customer" option → opens CustomerQuickCreate slide-over
   - After creation, customer auto-selected
   - Once order is created, customer is locked (never editable)

2. **Order Date** — date picker, defaults to today

3. **Delivery Date** — date picker, defaults to today + 7 days

4. **Lead Source** — optional dropdown (WhatsApp / Facebook / Instagram / Walk-in / Referral / Other)

5. **Remarks** — optional textarea

6. **Order Items** — repeatable rows:
   - Select Box Type → dropdown (filters next field)
   - Select Box Design → searchable dropdown (only shows designs of selected type)
   - Quantity → number input (warn if < 10, do not block)
   - Unit Price → auto-fills from `boxDesign.unitPrice`, read-only for STAFF, editable for ADMIN
   - Line Total → auto-calculated, read-only

7. **Discount** — auto-calculated from total qty tiers, shown as %. ADMIN can override.

8. **Totals summary** — subtotal / discount / net amount

**On submit:**
- Order created with status DRAFT
- `public_token` generated and stored
- If customer has email → send order confirmation email with invoice PDF
- If customer has no email → show warning banner on order detail (do not block creation)
- Redirect to order detail page

#### 5.2.3 Order Detail (`/orders/[id]`)

**Slide-over panel** containing:
- Order header: order number, status pill, lead source, created date
- Customer info: name, phone
- Dates: order date, delivery date
- Remarks
- Items table: code, design name, qty, unit price, line total
- Totals: subtotal, discount, net amount
- Payment summary: paid amount, balance, payment list
- Status history timeline
- Action buttons: Edit Order, Add Payment, Invoice, Update Status

**Edit Order button** → navigates to `/orders/[id]/edit` (separate page, same layout as New Order form but pre-filled)

#### 5.2.4 Edit Order (`/orders/[id]/edit`)

Editable fields by status:

| Field | DRAFT | CONFIRMED | IN_PRODUCTION | READY / DELIVERED |
|---|---|---|---|---|
| Customer | ✗ | ✗ | ✗ | ✗ |
| Items / qty | ✓ | ✓ | ✓ | ✗ |
| Unit price override | ADMIN | ADMIN | ADMIN | ✗ |
| Discount % | ✓ (ADMIN override) | ✓ | ✓ | ✗ |
| Delivery date | ✓ | ✓ | ✓ | ✗ |
| Remarks | ✓ | ✓ | ✓ | ✗ |

When items change → recalculate totals and discount automatically.

#### 5.2.5 Status Transitions

```
DRAFT ──(requires ≥1 payment)──► CONFIRMED
CONFIRMED ──────────────────────► IN_PRODUCTION  [triggers stock deduction]
IN_PRODUCTION ──────────────────► READY
READY ──(requires full payment)──► DELIVERED
Any active status ───────────────► CANCELLED
```

**CANCELLED behavior:**
- Hidden from default order list
- Only visible when CANCELLED filter tab explicitly selected
- Read-only (no editing allowed)
- ADMIN only can delete a cancelled order

#### 5.2.6 Payments

**Add Payment form** (on order detail):
- Amount (Rs.)
- Payment date
- Method: Cash / Bank Transfer / Cheque
- Reference number (optional, for cheque no. / transaction ID)
- Note (optional)

**Payment summary shows:**
- Total paid
- Outstanding balance
- Payment status: Unpaid / Partially Paid / Fully Paid

**Gates:**
- DRAFT → CONFIRMED: blocked if no payments recorded
- READY → DELIVERED: blocked if total paid < net amount

#### 5.2.7 Invoice

**Invoice page** (`/orders/[id]/invoice`):
- Professional print-ready layout (white background, company branding TBD)
- Includes: company header, customer info, order dates, items table, totals, payment summary, remarks
- Buttons: Download PDF, Send Email, Send via WhatsApp, Back

**Download PDF:** server-side PDF generation, browser downloads file

**Send Email:** sends PDF to customer's email address. If no email, shows warning.

**Send via WhatsApp:** opens `wa.me/[customerPhone]?text=[pre-filled message with invoice public URL]`

**Public invoice URL** (`/invoice/[publicToken]`):
- No authentication required
- Shows the invoice page with Download PDF option
- Token generated at order creation, never changes

---

### 5.3 Customers Module

**List page:** name, phone, email, active status, order count, total revenue, expand row
**Expand row:** shows last 5 orders with status and amount
**New/Edit:** name (required), phone (required), phone2, email, address, notes, active toggle
**Customer quick-create** (from order form): slide-over with same fields

---

### 5.4 Designs Module (unified Box Types + Box Designs)

**One module replaces the old separate "Box Designs" and "Design Types" pages.**

**URL:** `/designs`

**Layout:** grouped list — Box Types as collapsible headers, Box Designs nested underneath

```
DESIGNS                               [+ New Box Type]  [🔍 Search]

▼ Packing Mailer Box  PMB                               [Edit]  [+ Variant]
    BD-001 · 350gsm Gray Back  · 3×2×1 in · Rs.28       [Edit]
    BD-002 · 350gsm White Back · 3×2×1 in · Rs.36       [Edit]
    BD-003 · 350gsm Gray Back  · 5×3×2 in · Rs.65       [Edit]

▼ Corrugated Box  CRG                                   [Edit]  [+ Variant]
    BD-020 · 400gsm Kraft      · 10×8×4 in · Rs.220     [Edit]

▶ Bottle Box  BTL    [Expand]
```

**Search:** deep search across both Box Type names/codes AND Box Design codes/names — shows matching items with their parent type visible.

**New Box Type slide-over:** code, name, description, image upload, active toggle

**New/Edit Box Design slide-over:**
- Box Type (parent — locked once created)
- Material (dropdown)
- Dimensions: L × W × H (inches preferred, cm optional)
- Cut dimensions: cut L × cut W (inches preferred, cm optional)
- **Price calculator helper** (shown inline):
  - Boxes per sheet: auto-calculated from dimensions
  - Material cost/box: auto-calculated from material.unitPrice
  - Add-on cost: manual input (ribbon, transparent sheet, extras)
  - Suggested price = material cost/box + add-on
- Unit Price: editable field, pre-filled with suggested price
- Custom toggle (is this a custom one-off design?)
- Active toggle

**BoxDesign.unitPrice is fixed once saved.** Changing material price does NOT update existing BoxDesigns. Staff must manually edit the BoxDesign.

---

### 5.5 Materials Module

**List page:** code, name, gsm, sheet dimensions, cost/sheet, unit price (calc price), current stock, min stock, status (Active/Pending/Inactive)

**Stock indicator:** color-coded — green (above min), amber (at min), red (below min)

**New/Edit form:** code, name, gsm, sheet length/width (inches + cm), cost per sheet (buy price), unit price (calc price), min stock level, current stock level, status

**Manual stock adjustment** (button on material row or detail):
- Quantity change (positive = add, negative = remove)
- Reason (text, required for manual)
- Saved to `stock_adjustment` with type=MANUAL

**Stock history:** list of all adjustments (auto-production + manual) with date, qty change, reason, order link if applicable

---

### 5.6 Production Queue (`/production`)

**View:** all orders with status = IN_PRODUCTION, sorted by delivery date ascending

**Columns:** Order No, Customer, Delivery Date, Days Remaining, Items count, Net Amount

**Color coding:** delivery date today or past = red, within 3 days = amber, otherwise normal

---

### 5.7 Users Module (ADMIN only, `/users`)

**List:** username, role, status (active/inactive), last updated

**Create user:** username, role (ADMIN/STAFF), temporary password, must_change_password = true

**Edit user actions:**
- Change role
- Activate / Deactivate
- Reset password (set new temp password)
- Force "must change password on next login"

---

### 5.8 Lead Sources (ADMIN, `/settings/lead-sources`)

Simple CRUD for the lead source list. Fields: name, active.
Pre-seeded: WhatsApp, Facebook, Instagram, Walk-in, Referral, Other.

---

### 5.9 Reports (`/reports`)

**Available reports:**
- Monthly revenue (by month, current year default)
- Orders by customer (date range filter)
- Outstanding payments (orders with balance > 0)
- Profit report (requires material.costPerSheet data)

**Export formats:** PDF (printable) and CSV/Excel

---

## 6. Stock Auto-Deduction Logic

Triggered when order transitions from CONFIRMED → IN_PRODUCTION.

For each order item:
```
1. Read BoxDesign.cutLengthIn, BoxDesign.cutWidthIn
   (fall back to cutLengthCm, cutWidthCm if inches not set)

2. Read Material.sheetLengthIn, Material.sheetWidthIn
   (fall back to cm if inches not set)

3. boxes_per_sheet = floor(sheetL / cutL) × floor(sheetW / cutW)
   (if boxes_per_sheet = 0, skip deduction and flag a warning)

4. sheets_needed = CEIL(quantity / boxes_per_sheet)

5. UPDATE material SET currentStockLevel = currentStockLevel - sheets_needed

6. INSERT stock_adjustment:
     material_id     = item.boxDesign.materialId
     quantity_change = -sheets_needed
     type            = AUTO_PRODUCTION
     order_id        = order.id
     reason          = "Auto-deducted for Order #{orderNo}"
     changed_by_id   = current user
```

If `currentStockLevel` would go negative, still deduct (allow negative stock) but show warning on the order detail and dashboard.

---

## 7. Notifications

### 7.1 Email Notifications

**Trigger: Order Created (DRAFT)**
- Recipient: customer email (if present)
- Content: order summary, items, totals, invoice PDF attached (or public invoice link)
- If no email: show warning banner on order detail — do not block

**Trigger: Status Changed**
- Recipient: customer email (if present)
- Content: "Your order #X has been updated to [status]" + relevant message per status
- Skip silently if no customer email

### 7.2 WhatsApp (no API)
- "Send via WhatsApp" opens: `https://wa.me/[customerPhone]?text=[encoded message]`
- Message includes: order number, net amount, public invoice URL

### 7.3 Internal Dashboard Alerts
- Orders where delivery date ≤ today + 3 days AND status ∉ {DELIVERED, CANCELLED}
- Orders in READY status with outstanding payment balance

---

## 8. Mobile Navigation

On screens ≤ 767px:
- Sidebar is hidden
- **Bottom navigation bar** replaces sidebar with icon + label tabs:
  - Dashboard, Orders, Customers, Designs, Materials
- Top bar remains visible
- ADMIN-only items (Users, Settings) accessible via a "More" tab or profile menu

---

## 9. Order Quick-Create Design Panel

Triggered from the order item row (✦ button).

**Slide-over: New Box Design**

```
[+ Add New Material] (collapsible)
  code, name, gsm, sheet dims (in/cm), cost/sheet, unit price, pending? toggle
  [CREATE MATERIAL] → auto-selected below

DESIGN DETAILS
  Box Type:    [dropdown — select existing]
  Material:    [dropdown — includes newly created material]
  Dimensions:  L × W × H (inches)
  Cut sheet:   cut L × cut W (inches)

  ── Price calculator ──────────────
  Boxes/sheet:      [auto-calculated, read-only]
  Material cost/box: [auto-calculated, read-only]
  Add-on cost:       [manual input]
  Unit price:        [auto-filled, editable]
  ──────────────────────────────────

  [CREATE DESIGN] → closes panel, design auto-selected on item row
```

---

## 10. Designs Module — Unified UI (Box Types + Box Designs)

Replaces separate `/design-types` and `/box-designs` pages.

- Sidebar: one "Designs" link (removes two old links)
- URL: `/designs`
- New Box Type: slide-over (code, name, description, image, active)
- New Variant (Box Design): slide-over as described in §5.4
- Edit either: opens respective slide-over
- Deep search: searches type codes, type names, design codes, design names simultaneously

---

## 11. Entity Relationships Summary

```
LeadSource (ADMIN)
    └── referenced by Order.leadSourceId

Customer
    └── has many Orders

Order
    ├── has many OrderItems
    │       └── each item references BoxDesign (name/code snapshotted at creation)
    ├── has many Payments
    ├── has many StatusHistory entries
    └── has one public_token (for invoice URL)

BoxType (design_type)
    └── has many BoxDesigns

Material
    ├── has many BoxDesigns
    └── has many StockAdjustments

BoxDesign
    ├── belongs to BoxType
    ├── belongs to Material
    └── referenced by OrderItems

StockAdjustment
    ├── belongs to Material
    └── optionally linked to Order (AUTO_PRODUCTION type)
```

---

## 12. Scope Exclusions (future, not in this SRS)

- Public order tracking page for customers
- Public product catalog page
- WhatsApp Business API integration
- DFX / cutting template file upload
- Multi-location / multi-branch support

---

## 13. Open Items

- Business name, address, phone, email for invoice header — **TBD (fill in before go-live)**
- Email service provider (SMTP config) — **TBD**
- Minimum order quantity (10 pcs) — **warn only, do not block**
