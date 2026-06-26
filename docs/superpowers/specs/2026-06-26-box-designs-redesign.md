# Box Designs Module Redesign — Design Spec
**Date:** 2026-06-26
**Scope:** Full UX overhaul of the Box Designs list — slide-over new/edit (row click), stat strip, filter tabs (including CUSTOM), server-side pagination.

**Depends on:** Shared UI atoms (`StatChip`, `PaginationBar`, `FilterTabBar`) built in `2026-06-26-materials-pagination.md`.

---

## 1. Goals

- Replace separate New/Edit pages with a slide-over panel
- Row click opens the slide-over pre-populated (no inline expand panel)
- Add stat strip, filter tabs (ALL / ACTIVE / INACTIVE / CUSTOM), server-side pagination
- Reuse existing `BoxDesignForm` (UnitInput + Combobox already in place) inside the slide-over shell
- Maintain responsiveness: desktop table, tablet condensed, mobile cards

---

## 2. Design System Context

Inherits all tokens from `globals.css`. Reuses `UnitInput` (`src/components/ui/UnitInput.tsx`) and `Combobox` (`src/components/ui/Combobox.tsx`) from the Materials redesign.

Status pills: `status-fulfilled` (ACTIVE), `status-cancelled` (INACTIVE).

---

## 3. Schema Changes

None. All required fields (`lengthIn`, `widthIn`, `heightIn`, `cutLengthIn`, `cutWidthIn`, `custom`, etc.) already exist from the Materials redesign schema work.

---

## 4. List Page

### 4.1 Stat Strip

Four `StatChip` components:

| Chip | Value | Color |
|------|-------|-------|
| TOTAL | count of all box designs | neutral |
| ACTIVE | count where `active = true` | green (`#4ADE80`) |
| INACTIVE | count where `active = false` | red (`#F87171`) |
| CUSTOM | count where `custom = true` | gold (`#F5B61E`) |

Counts are global (not affected by current search/filter).

### 4.2 Controls Row

```
[Search code or name…]   [ALL][ACTIVE][INACTIVE][CUSTOM]   [+ New Design]
```

- Search: debounced 300ms, writes `?q=` to URL; searches `code` and `name` fields
- Filter tabs: `FilterTabBar` with tabs `["ALL", "ACTIVE", "INACTIVE", "CUSTOM"]`
  - CUSTOM tab: filters `custom = true` regardless of active status
  - ACTIVE/INACTIVE tabs: filter by `active` field regardless of `custom`
- "New Design" button: opens slide-over with empty form

### 4.3 Table — Desktop (≥ 1024px)

```
CODE    NAME             TYPE        MATERIAL      DIMS        PRICE      STATUS
BD-001  Hamper Large     Hamper      ART-250       12×8×6in    Rs.45.00   ● ACTIVE
```

Columns:
- **CODE**: gold, bold, `font-size: 0.72rem`, `letter-spacing: 0.06em`
- **NAME**: bold, `#F0EDE6`
- **TYPE**: design type name (from join), muted
- **MATERIAL**: material code (from join), muted
- **DIMS**: prefers inches if all three present (`{l}×{w}×{h}in`), falls back to cm, shows `—` if neither set
- **PRICE**: `Rs. {unitPrice.toFixed(2)}`
- **STATUS**: `.status-pill` + CUSTOM badge when `custom = true` (small gold pill beside status: `[● ACTIVE][CUSTOM]`)

Row click: opens `BoxDesignSlideOver` pre-populated with this design's data. No chevron, no expand panel.
On row hover: subtle gold left border appears (`border-left: 2px solid rgba(245,182,30,0.25)`).

Inactive rows: `opacity: 0.6`.

### 4.4 Table — Tablet (768–1023px)

TYPE and MATERIAL columns hidden (`hide-tablet`). CODE, NAME, DIMS, PRICE, STATUS remain.

### 4.5 Cards — Mobile (< 768px)

```
┌──────────────────────────────────────────┐
│ [BD-001]          [● ACTIVE] [CUSTOM]    │
│ Hamper Large                             │
│ Hamper  ·  ART-250  ·  12×8×6in         │
│ Rs. 45.00                                │
└──────────────────────────────────────────┘
```

Full-width stacked cards. Tap anywhere on card opens slide-over pre-populated. No expand.

### 4.6 Pagination

`PaginationBar` below the table/cards, receives `total={filteredTotal}`, `page`, `size`.

---

## 5. Slide-over Panel — BoxDesignSlideOver

### 5.1 Layout

- **Desktop/Tablet (≥ 768px):** 520px right-side panel (wider than others due to dimension fields). Semi-transparent backdrop. Click backdrop closes.
- **Mobile (< 768px):** Full-width bottom sheet, `92vh`, slides up. Drag handle at top.

Header (sticky):
```
✕   New Box Design     (or "Edit — BD-001 Hamper Large" for edit mode)
```

Footer (sticky):
```
[CANCEL]                              [SAVE DESIGN]
```
Save button: disabled + spinner while submitting. Error banner at top of content area on server error.

### 5.2 Implementation Strategy

`BoxDesignSlideOver` wraps the **existing `BoxDesignForm`** component. The form already has:
- `Combobox` for design type and material
- `UnitInput` for all 5 dimension pairs (LENGTH, WIDTH, HEIGHT, CUT LENGTH, CUT WIDTH)
- Status fields

The slide-over shell provides the panel, backdrop, header, and footer. The form's submit button is removed in slide-over context — the footer's SAVE DESIGN button submits the form via a `ref` or wraps the form action.

**Form submission approach:** `BoxDesignSlideOver` renders a `<form>` wrapping the slide-over body. The footer SAVE DESIGN button is `type="submit"` inside this form. On success: `onClose()` then `router.refresh()`.

### 5.3 Form Sections

**IDENTITY**
```
[CODE *          ]   [NAME *                        ]
[✓] Custom design
```
`custom` field: checkbox with label "Custom design" — renders as a gold-tinted toggle chip in the form: `[ ] STANDARD` / `[✓] CUSTOM`.

**LINKED**
```
[DESIGN TYPE *   — Combobox]
[MATERIAL *      — Combobox with material code as meta]
```

**BOX DIMENSIONS**
Unit toggle at section header: `[ in ✓ ] [ cm ]` (default inches, `UnitInput` handles this).
```
LENGTH *   WIDTH *   HEIGHT *
(UnitInput pairs — all three on one row desktop, stacked mobile)
```

**CUT SHEET**
```
CUT LENGTH *   CUT WIDTH *
(UnitInput pairs)
```

**PRICING**
```
[UNIT PRICE * — Rs. prefix]
```

**STATUS**
```
[ ✓ ACTIVE ]   [ INACTIVE ]
```
Default for new designs: ACTIVE.

---

## 6. Server Actions

`src/actions/box-designs.ts` — already has `createBoxDesign` and `updateBoxDesign`. No new actions needed.

Verify that both actions handle all fields including the `custom` boolean and all 10 dimension fields (cm + in pairs).

---

## 7. Page — `src/app/(app)/box-designs/page.tsx`

Rewritten as a paginated Server Component:

```typescript
searchParams: { q?, status?, page?, size? }
```

Where clause logic:
```typescript
const statusFilter = status === "ACTIVE" ? { active: true, custom: undefined }
                   : status === "INACTIVE" ? { active: false, custom: undefined }
                   : status === "CUSTOM" ? { custom: true }
                   : {};

const where = {
  ...statusFilter,
  OR: q ? [{ code: { contains: q } }, { name: { contains: q } }] : undefined,
};
```

Include design type and material in the query for display:
```typescript
prisma.boxDesign.findMany({
  where,
  skip,
  take: size,
  include: { designType: { select: { name: true } }, material: { select: { code: true } } },
  orderBy: { code: "asc" },
})
```

Parallel stat counts:
1. `prisma.boxDesign.count()` — total
2. `prisma.boxDesign.count({ where: { active: true } })` — active
3. `prisma.boxDesign.count({ where: { active: false } })` — inactive
4. `prisma.boxDesign.count({ where: { custom: true } })` — custom
5. `prisma.boxDesign.count({ where })` — filtered total for PaginationBar

All `Decimal` fields converted to `number` before passing to client (same null-safe pattern as existing `page.tsx`).

---

## 8. BoxDesignSlideOver Data Interface

```typescript
export interface BoxDesignData {
  id: number;
  code: string;
  name: string;
  designTypeId: number;
  materialId: number;
  custom: boolean;
  active: boolean;
  unitPrice: number;
  lengthCm: number | null; widthCm: number | null; heightCm: number | null;
  lengthIn: number | null; widthIn: number | null; heightIn: number | null;
  cutLengthCm: number | null; cutWidthCm: number | null;
  cutLengthIn: number | null; cutWidthIn: number | null;
}
```

---

## 9. Redirects

- `src/app/(app)/box-designs/new/page.tsx` → `redirect("/box-designs")`
- `src/app/(app)/box-designs/[id]/edit/page.tsx` → `redirect("/box-designs")`

---

## 10. Responsive Breakpoints

| Breakpoint | Layout |
|------------|--------|
| ≥ 1024px | Full table (7 cols), slide-over 520px right panel |
| 768–1023px | Condensed table (5 cols), slide-over right panel |
| < 768px | Card stack, slide-over becomes bottom sheet (92vh) |

---

## 11. Files Affected

### New
- `src/components/box-designs/BoxDesignSlideOver.tsx`
- `src/components/box-designs/BoxDesignsClient.tsx`

### Modified
- `src/app/(app)/box-designs/page.tsx` — full rewrite as paginated server component
- `src/app/(app)/box-designs/new/page.tsx` — replace with redirect
- `src/app/(app)/box-designs/[id]/edit/page.tsx` — replace with redirect

### Moved
- `src/app/(app)/box-designs/BoxDesignForm.tsx` → `src/components/box-designs/BoxDesignForm.tsx`
  The new/edit pages that imported it will be redirected anyway; moving it keeps `components/` as the home for reusable UI and avoids `components/` importing from `app/`.

### Untouched
- `src/actions/box-designs.ts` — no changes
- `src/components/ui/UnitInput.tsx` — no changes
- `src/components/ui/Combobox.tsx` — no changes

### Can be deleted
- `src/app/(app)/box-designs/BoxDesignRow.tsx` — replaced by BoxDesignsClient inline rows

---

## 12. Out of Scope

- Box design duplication / clone
- DFX file upload
- Linking box designs to orders from this page
- Orders module UI redesign (separate spec)
