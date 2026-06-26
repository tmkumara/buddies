# Materials UI Redesign — Design Spec
**Date:** 2026-06-26  
**Scope:** Materials module UI overhaul + system-wide dimension unit handling + searchable combobox component

---

## 1. Goals

- Replace the current 3-table list page with a scannable, action-dense layout
- Enable quick stock updates and status transitions directly from the list (no page navigation)
- Replace separate New/Edit pages with a slide-over panel
- Add a second price field (`unitPrice`) to Material
- Store sheet dimensions in both inches and cm as independent DB columns (no conversion logic)
- Apply the inch/cm dual-column pattern system-wide to all length fields
- Introduce a reusable searchable combobox for DB-loaded dropdown fields
- Ensure full responsiveness: desktop table view, tablet condensed table, mobile card view

---

## 2. Design System Context

Existing globals.css defines:
- Dark glassmorphic UI: `--bg: #080808`, `--glass-bg`, `--glass-border`
- Gold accent: `--gold: #F5B61E`, `--gold-dim`, `--gold-light`
- Font: Plus Jakarta Sans (`--font-jakarta`)
- Existing utility classes: `.content-card`, `.orders-table`, `.status-pill`, `.form-input`, `.form-label`, `.cta-btn`, `.submit-btn`

All new components must use these tokens and follow the existing aesthetic.

---

## 3. List Page — `src/app/(app)/materials/page.tsx`

### 3.1 Stats Strip
Four mini stat chips directly below TopBar:

| Chip | Value | Color |
|------|-------|-------|
| TOTAL | count of all materials | neutral |
| ACTIVE | count of ACTIVE | green (`#4ADE80`) |
| PENDING | count of PENDING | amber (`#FBBF24`) |
| LOW STOCK | count where `currentStockLevel ≤ minStockLevel` AND status = ACTIVE | red (`#F87171`), pulses when > 0 |

### 3.2 Controls Row
```
[Search input — filter by code or name]    [ALL][ACTIVE][PENDING][INACTIVE]    [+ New Material]
```
- Search: client-side, filters visible rows/cards by `code` or `name` substring
- Filter tabs: pill tabs, gold underline on active, client-side filter
- "New Material" opens the slide-over (no page navigation)

### 3.3 Table — Desktop (≥ 1024px)

Columns:
```
▸ | CODE | NAME | GSM | SHEET | BUY PRICE | UNIT PRICE | STOCK | STATUS
```

- `▸` chevron: rotates 90° when row is expanded
- **CODE**: gold, bold, monospace feel
- **SHEET**: shows whichever unit(s) are populated — `10 × 8 in` or `25 × 20 cm` or `10 × 8 in / 25 × 20 cm` if both
- **BUY PRICE**: `Rs. 180.00`
- **UNIT PRICE**: `Rs. 240.00`
- **STOCK**: mini progress bar + number. Bar color: green ≥ 100% of min, amber 50–99%, red < 50%. Shows `—` if minStockLevel = 0.
- **STATUS**: existing `.status-pill` classes

Pending materials: amber left border on the row (`border-left: 2px solid rgba(251,191,36,0.4)`).  
Low stock rows: red left border (`border-left: 2px solid rgba(248,113,113,0.35)`).

### 3.4 Table — Tablet (768–1023px)
Same table, GSM and SHEET columns hidden. All other columns visible.

### 3.5 Cards — Mobile (< 768px)
Each material renders as a `MaterialCard`:
```
┌─────────────────────────────────────┐
│ [ART-250]              [● ACTIVE] ▸ │
│ Art Board 250 GSM                   │
│ BUY Rs.180  ·  UNIT Rs.240  · 250g  │
│ [████████░░]  48 sheets  (min 20)   │
└─────────────────────────────────────┘
```
Cards are full-width, stacked vertically. Pending cards get amber left border; low-stock cards get red.

---

## 4. Row/Card Expand — Quick Actions

Clicking `▸` expands an inline sub-panel with smooth CSS height transition.

### 4.1 Stock Control
```
CURRENT STOCK
[−]  [  48  ]  [+]          Min: 20
[████████████░░░░░░]  240% of minimum

                              [ Save Stock ]   ← visible only when value is dirty
```
- `+/−` buttons: nudge by 1, respect `min="0"`
- Number input: directly editable
- Progress bar: same color logic as table (green/amber/red)
- "Save Stock" calls a dedicated `updateMaterialStock(id, value)` server action, then `revalidatePath`

### 4.2 Status Toggle
```
STATUS
[ PENDING ]   [ ✓ ACTIVE ]   [ INACTIVE ]
```
Three pill buttons. Current status highlighted (gold ring + background). Click another to switch — optimistic UI (pill switches immediately), server action `updateMaterialStatus` fires in background, reverts on error with a brief shake animation.

### 4.3 Expand Footer
```
[ Full Edit ]                    [ ✕ Close ]
```
"Full Edit" opens the slide-over pre-populated with this material's data.

---

## 5. Slide-over Panel — New / Full Edit

### 5.1 Layout
- **Desktop/Tablet**: right-side panel, 480px wide, slides in over the list. Semi-transparent backdrop. Click backdrop to close if clean (unsaved changes → show discard confirmation).
- **Mobile**: full-width bottom sheet, 92vh, slides up from bottom. Drag handle at top.

### 5.2 Panel Sections

**Header (sticky)**
```
✕   New Material          (or "Edit — ART-250" for edit mode)
```

**IDENTITY**
```
[CODE *]              [GSM * (80–600)]
[NAME *                              ]
```

**DIMENSIONS**  
Unit toggle at section header: `[ in ✓ ]  [ cm ]` — default **inches**.  
Toggling switches which pair of fields is shown. No conversion. The other unit's DB columns retain their last saved value.
```
Selected: in
[LENGTH (in) *]    [WIDTH (in) *]

Selected: cm
[LENGTH (cm) *]    [WIDTH (cm) *]
```

**PRICING**
```
[BUY PRICE / sheet *]    [UNIT PRICE / sheet *]
 Rs. prefix, inline       Rs. prefix, inline
 (supplier cost)          (internal price)
```

**STOCK**
```
[MIN STOCK]    [CURRENT STOCK]
```

**STATUS**  
Three toggle chips (same style as expand panel): `[ PENDING ]  [ ACTIVE ✓ ]  [ INACTIVE ]`  
No dropdown, no searchable combobox — fixed 3 options.

**Footer (sticky)**
```
[CANCEL]                      [SAVE MATERIAL]
```
Cancel closes without saving (with discard confirmation if dirty). Save button: disabled + spinner while submitting. Error banner appears inline at top of content area on server error.

---

## 6. Searchable Combobox — `src/components/ui/Combobox.tsx`

**When to use:** Only for fields whose options load from the database — customer picker, design type picker, material selector in order forms, box design picker. **Not** for fixed-option enums (status, unit toggles).

### 6.1 Behaviour
- Text input with dropdown list below
- Options filter client-side as user types (substring match on label)
- Keyboard navigable (↑↓ to move, Enter to select, Escape to close)
- Selected value shows label in input; clears to re-search on re-focus if desired
- Dropdown styled: dark glass background (`rgba(10,10,10,0.95)`), gold border, max-height 240px with scroll
- Each option row: hover shows subtle gold background tint

### 6.2 Props Interface
```ts
interface ComboboxProps {
  options: { value: string | number; label: string; meta?: string }[];
  value: string | number | null;
  onChange: (value: string | number) => void;
  placeholder?: string;
  name?: string;        // for form submission
  disabled?: boolean;
}
```
`meta` is an optional secondary string shown dimmed beside the label (e.g., a material code next to its name).

---

## 7. Unit Input — `src/components/ui/UnitInput.tsx`

Reusable dimension input pair with cm/in toggle. Used in Materials slide-over, BoxDesign forms, and any future entity with length fields.

### 7.1 Props
```ts
interface UnitInputProps {
  labelPrefix: string;          // e.g. "LENGTH", "WIDTH", "HEIGHT"
  nameCm: string;               // form field name for cm column
  nameIn: string;               // form field name for in column
  defaultValueCm?: number | null;
  defaultValueIn?: number | null;
  required?: boolean;
  defaultUnit?: "in" | "cm";   // defaults to "in"
}
```

### 7.2 Behaviour
- Renders `[ in ✓ ] [ cm ]` toggle + one visible input at a time
- Selected unit's field is submitted; hidden field for the other unit carries its last known value (or null)
- Both values are stored in DB — no conversion, no coupling

---

## 8. Schema Changes — `prisma/schema.prisma`

### 8.1 Material
```prisma
model Material {
  // existing fields ...
  sheetLengthCm  Decimal?  @db.Decimal(10, 4)   // was non-null, becomes nullable
  sheetWidthCm   Decimal?  @db.Decimal(10, 4)   // was non-null, becomes nullable
  sheetLengthIn  Decimal?  @db.Decimal(10, 4)   // NEW
  sheetWidthIn   Decimal?  @db.Decimal(10, 4)   // NEW
  unitPrice      Decimal   @db.Decimal(10, 2)   // NEW — required, our internal price
  // ...
}
```

### 8.2 BoxDesign
```prisma
model BoxDesign {
  // existing fields (likely have lengthCm, widthCm, heightCm) ...
  lengthIn  Decimal?  @db.Decimal(10, 4)   // NEW
  widthIn   Decimal?  @db.Decimal(10, 4)   // NEW
  heightIn  Decimal?  @db.Decimal(10, 4)   // NEW
}
```

**Migration notes:**
- New columns are nullable — no data migration needed for existing rows
- `sheetLengthCm` / `sheetWidthCm` changing from required to nullable is a non-breaking DB change
- `unitPrice` on Material is required — existing rows need a default value in the migration (e.g., `DEFAULT 0.00`)

---

## 9. Server Actions

### Modified: `src/actions/materials.ts`
- `createMaterial`: accept `sheetLengthIn`, `sheetWidthIn`, `unitPrice`; write active unit's cm or in columns based on form toggle value
- `updateMaterial`: same
- `updateMaterialStock(id, value)`: dedicated action for quick stock update from expand panel
- `updateMaterialStatus`: existing, unchanged

### Modified: `src/actions/quick-create.ts`
- `quickCreateMaterial`: add `unitPrice`, unit fields

### Modified: `src/lib/validations/material.ts`
- Add `sheetLengthIn`, `sheetWidthIn`, `unitPrice` to Zod schema
- Make `sheetLengthCm`/`sheetWidthCm` optional

### Modified: BoxDesign actions
- Add `lengthIn`, `widthIn`, `heightIn` fields

---

## 10. Responsive Breakpoints Summary

| Breakpoint | Layout |
|------------|--------|
| ≥ 1024px | Full table (8 cols), slide-over 480px right panel |
| 768–1023px | Condensed table (6 cols, hide GSM + SHEET), slide-over full-width |
| < 768px | Card stack, bottom sheet slide-over (92vh) |

---

## 11. Files Affected

### New
- `src/components/ui/Combobox.tsx`
- `src/components/ui/UnitInput.tsx`
- `src/components/materials/MaterialSlideOver.tsx`
- `src/components/materials/MaterialExpandRow.tsx`
- `src/components/materials/MaterialCard.tsx`

### Modified
- `prisma/schema.prisma`
- `src/actions/materials.ts`
- `src/actions/quick-create.ts`
- `src/lib/validations/material.ts`
- `src/app/(app)/materials/page.tsx`
- `src/app/(app)/materials/MaterialRow.tsx`
- `src/app/(app)/materials/new/page.tsx` (replace with slide-over redirect)
- `src/app/(app)/materials/[id]/edit/EditMaterialForm.tsx`
- `src/app/(app)/materials/[id]/edit/page.tsx`
- `src/app/(app)/box-designs/new/page.tsx`
- `src/app/(app)/box-designs/[id]/edit/page.tsx`
- `src/app/globals.css` (slide-over, bottom sheet, unit toggle styles)

---

## 12. Out of Scope

- Orders module UI redesign (separate spec)
- Dashboard charts
- PDF invoice export
- DFX file upload in QuickCreateDesignPanel
