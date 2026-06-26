# Customers Module Redesign — Design Spec
**Date:** 2026-06-26
**Scope:** Full UX overhaul of the Customers list — slide-over new/edit, inline expand row with contact details + linked orders, stat strip, filter tabs, server-side pagination.

**Depends on:** Shared UI atoms (`StatChip`, `PaginationBar`, `FilterTabBar`) built in `2026-06-26-materials-pagination.md`.

---

## 1. Goals

- Replace the current form-submit search with URL-driven search + filter tabs
- Replace separate New/Edit pages with a slide-over panel
- Add an expand row per customer showing contact details and recent orders
- Add server-side pagination (20/50/100)
- Add a second phone field (`phone2`) to Customer schema
- Maintain full responsiveness: desktop table, tablet condensed, mobile cards

---

## 2. Design System Context

Inherits all tokens from `globals.css`: `--bg`, `--gold`, `--text`, `--font-jakarta`, existing `.content-card`, `.orders-table`, `.status-pill`, `.form-input`, `.cta-btn`, `.submit-btn`.

Status pills: `status-fulfilled` (active), `status-cancelled` (inactive).

---

## 3. Schema Changes

`prisma/schema.prisma` — Customer model:

```prisma
model Customer {
  // existing fields...
  phone   String
  phone2  String?   // NEW — secondary phone number, optional
  // ...
}
```

`db push` applies the change. No data migration needed (nullable field).

`src/lib/validations/customer.ts` — add `phone2: z.string().optional()` to schema (create if file doesn't exist, or update existing).

---

## 4. List Page

### 4.1 Stat Strip

Three `StatChip` components in a flex row:

| Chip | Value | Color |
|------|-------|-------|
| TOTAL | count of all customers | neutral (`rgba(240,237,230,0.6)`) |
| ACTIVE | count of active customers | green (`#4ADE80`) |
| INACTIVE | count of inactive customers | muted red (`#F87171`) |

Counts are always global (not affected by search/filter).

### 4.2 Controls Row

```
[Search name, phone, email…]   [ALL][ACTIVE][INACTIVE]   [+ New Customer]
```

- Search: debounced 300ms, writes `?q=` to URL via `router.replace` with `useTransition`; searches `name`, `phone`, `phone2`, `email` fields
- Filter tabs: `FilterTabBar` with tabs `["ALL", "ACTIVE", "INACTIVE"]`, writes `?status=`
- "New Customer" button: opens slide-over with empty form

### 4.3 Table — Desktop (≥ 1024px)

```
▸  NAME          PHONE        EMAIL               STATUS
──────────────────────────────────────────────────────
▸  Kasun Silva   077-123…     kasun@gmail.com     ● ACTIVE
```

Columns:
- `▸` chevron: rotates 90° when expanded; CSS class `row-chevron` / `row-chevron expanded`
- **NAME**: bold, `#F0EDE6`
- **PHONE**: primary phone only
- **EMAIL**: muted, truncated with ellipsis if long
- **STATUS**: `.status-pill` (status-fulfilled / status-cancelled)

Inactive rows: `opacity: 0.55` on the row.
Row click on chevron cell expands; clicking elsewhere on the row does NOT expand (to avoid accidental opens).

### 4.4 Table — Tablet (768–1023px)

EMAIL column hidden (class `hide-tablet`). All other columns visible.

### 4.5 Cards — Mobile (< 768px)

```
┌──────────────────────────────────────┐
│ Kasun Silva               ● ACTIVE ▸ │
│ 077-123-4567                         │
│ kasun@gmail.com                      │
└──────────────────────────────────────┘
```

Full-width stacked cards. Tap chevron to expand (same CustomerExpandRow component). Inactive cards: `opacity: 0.55`.

### 4.6 Pagination

`PaginationBar` below the table/cards, receives `total={filteredTotal}`, `page`, `size`.

---

## 5. Expand Row — CustomerExpandRow

Follows the **professional two-column grid standard** (defined in `2026-06-26-materials-pagination.md` §7).

```
┌──────────────────────────────┬───────────────────────────────┐
│  CONTACT DETAILS             │  RECENT ORDERS                │
│  Phone 1   077-123-4567      │  #1042  20 Jun  ● PENDING     │
│  Phone 2   011-234-5678      │  #1038  15 Jun  ✓ FULFILLED   │
│  Address   123 Main St,      │  #1031  10 Jun  ✓ FULFILLED   │
│            Colombo 05        │  + 4 more →                   │
│  Notes     Prefers morning   │                               │
│            delivery          │  (loading spinner on mount)   │
├──────────────────────────────┴───────────────────────────────┤
│                               [ Full Edit ]   [ ✕ Close ]   │
└──────────────────────────────────────────────────────────────┘
```

**Left column — CONTACT DETAILS:**
- Field rows: label (`0.65rem`, muted, min-width `72px`) + value (normal weight)
- Phone 2 row: hidden when `phone2` is null/empty
- Address row: hidden when `addressLine` is null/empty; long values wrap
- Notes row: hidden when `notes` is null/empty; clamped to 2 lines with ellipsis
- All-empty state (no address, no notes, no phone2): left column shows only phone 1

**Right column — RECENT ORDERS (lazy fetch):**
- On mount: calls server action `getCustomerRecentOrders(customerId)`, shows spinner
- Shows last 3 orders: `#ORDER_NUM`, date (day Mon format), status pill
- Order number links to `/orders/[id]` (opens in same tab)
- "+ N more →" link: navigates to `/orders?customer=[id]`; hidden when total ≤ 3
- Empty state: "No orders yet." in muted italic

**Footer:**
- Right-aligned: `[ Full Edit ]` (cta-btn) + `[ ✕ Close ]` (muted text button)
- Full Edit opens CustomerSlideOver pre-populated with this customer's data; closes expand row

---

## 6. Slide-over Panel — CustomerSlideOver

### 6.1 Layout

- **Desktop/Tablet (≥ 768px):** 480px right-side panel, slides in from right. Semi-transparent backdrop (`rgba(0,0,0,0.45)`). Click backdrop closes (no unsaved-change guard needed for MVP).
- **Mobile (< 768px):** Full-width bottom sheet, `92vh`, slides up from bottom. Drag handle at top (decorative bar).

Header (sticky):
```
✕   New Customer     (or "Edit — Kasun Silva" for edit mode)
```

Footer (sticky):
```
[CANCEL]                          [SAVE CUSTOMER]
```
Save button: disabled + spinner while submitting. Error banner at top of content area on server error.

### 6.2 Form Sections

**IDENTITY**
```
[NAME *                              ]
[PRIMARY PHONE *  ]   [SECONDARY PHONE]
```

**CONTACT**
```
[EMAIL                               ]
[ADDRESS LINE                        ]
[NOTES — textarea, 3 rows            ]
```

**STATUS**
```
[ ✓ ACTIVE ]   [ INACTIVE ]
```
Chip toggle style (same as MaterialSlideOver status section). Default for new customers: ACTIVE.

### 6.3 Behaviour

- New: calls `createCustomer(formData)` server action
- Edit: calls `updateCustomer(id, formData)` server action
- On success: `onClose()` then `router.refresh()` to revalidate server component data
- Cancel: closes without saving

---

## 7. Server Actions

`src/actions/customers.ts`:

**Modify `createCustomer`:** add `phone2` optional field
```typescript
phone2: formData.get("phone2") as string || undefined
```

**Modify `updateCustomer`:** add `phone2` optional field

**Add `getCustomerRecentOrders`:**
```typescript
export async function getCustomerRecentOrders(customerId: number): Promise<{
  id: number;
  orderNumber: string;
  createdAt: string;   // ISO string, formatted in component
  status: string;
}[]>
```
Fetches last 5 orders for customer ordered by `createdAt desc`. Returns plain objects (no Prisma types crossing the server/client boundary).

---

## 8. Page — `src/app/(app)/customers/page.tsx`

Rewritten as a paginated Server Component:

```typescript
searchParams: { q?, status?, page?, size? }
```

Parallel queries:
1. `prisma.customer.findMany({ where, skip, take, orderBy: { name: "asc" } })` — current page
2. `prisma.customer.count({ where })` — filtered total for PaginationBar
3. `prisma.customer.count()` — global total for StatChip
4. `prisma.customer.count({ where: { active: true } })` — active count
5. `prisma.customer.count({ where: { active: false } })` — inactive count

Where clause:
```typescript
{
  active: status === "ACTIVE" ? true : status === "INACTIVE" ? false : undefined,
  OR: q ? [
    { name:   { contains: q } },
    { phone:  { contains: q } },
    { phone2: { contains: q } },
    { email:  { contains: q } },
  ] : undefined,
}
```

Passes `{ customers, filteredTotal, page, size, statTotals }` to `CustomersClient`.

---

## 9. Redirects

- `src/app/(app)/customers/new/page.tsx` → `redirect("/customers")`
- `src/app/(app)/customers/[id]/edit/page.tsx` → `redirect("/customers")`

---

## 10. Responsive Breakpoints

| Breakpoint | Layout |
|------------|--------|
| ≥ 1024px | Full table (4 cols + chevron), slide-over 480px right panel |
| 768–1023px | Condensed table (3 cols, EMAIL hidden), slide-over full-width bottom sheet? No — still right panel at 768px+ |
| < 768px | Card stack, slide-over becomes bottom sheet (92vh) |

---

## 11. Files Affected

### New
- `src/components/customers/CustomerExpandRow.tsx`
- `src/components/customers/CustomerSlideOver.tsx`
- `src/components/customers/CustomersClient.tsx`

### Modified
- `prisma/schema.prisma` — add `phone2 String?` to Customer
- `src/lib/validations/customer.ts` — add phone2 (create if not exists)
- `src/actions/customers.ts` — add phone2 to create/update, add getCustomerRecentOrders
- `src/app/(app)/customers/page.tsx` — full rewrite as paginated server component
- `src/app/(app)/customers/new/page.tsx` — replace with redirect
- `src/app/(app)/customers/[id]/edit/page.tsx` — replace with redirect

### Untouched
- `src/app/(app)/customers/CustomerRow.tsx` — no longer used (replaced by CustomersClient inline rows), can be deleted
- `src/app/(app)/customers/[id]/edit/EditCustomerForm.tsx` — no longer used, can be deleted

---

## 12. Out of Scope

- Order creation from the Customer expand row
- Customer merge / deduplication
- SMS / email contact integration
- Orders module UI redesign (separate spec)
