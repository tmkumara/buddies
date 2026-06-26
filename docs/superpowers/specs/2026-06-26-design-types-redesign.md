# Design Types Module Redesign — Design Spec
**Date:** 2026-06-26
**Scope:** Full UX overhaul of the Design Types list — slide-over new/edit (row click), stat strip, filter tabs, server-side pagination, image thumbnail in list, image preview in slide-over.

**Depends on:** Shared UI atoms (`StatChip`, `PaginationBar`, `FilterTabBar`) built in `2026-06-26-materials-pagination.md`.

---

## 1. Goals

- Replace separate New/Edit pages with a slide-over panel
- Row click opens the slide-over pre-populated (no inline expand panel)
- Add stat strip, filter tabs (ALL / ACTIVE / INACTIVE), server-side pagination
- Show image thumbnail in table row when `imageUrl` is present
- Show live image preview in slide-over when URL is entered
- `imageUrl` is optional throughout

---

## 2. Design System Context

Inherits all tokens from `globals.css`. Simplest module — no special components needed beyond the shared atoms.

Status pills: `status-fulfilled` (ACTIVE), `status-cancelled` (INACTIVE).

---

## 3. Schema Changes

None. All fields (`code`, `name`, `description`, `imageUrl`, `active`) already exist.

---

## 4. List Page

### 4.1 Stat Strip

Three `StatChip` components:

| Chip | Value | Color |
|------|-------|-------|
| TOTAL | count of all design types | neutral |
| ACTIVE | count where `active = true` | green (`#4ADE80`) |
| INACTIVE | count where `active = false` | red (`#F87171`) |

Counts are global (not affected by search/filter).

### 4.2 Controls Row

```
[Search code or name…]   [ALL][ACTIVE][INACTIVE]   [+ New Type]
```

- Search: debounced 300ms, writes `?q=` to URL; searches `code` and `name` fields
- Filter tabs: `FilterTabBar` with tabs `["ALL", "ACTIVE", "INACTIVE"]`
- "New Type" button: opens slide-over with empty form

### 4.3 Table — Desktop (≥ 768px)

```
[img]  CODE     NAME          DESCRIPTION                 STATUS
[▣]    HAMPER   Hamper        Premium gift hamper boxes   ● ACTIVE
[  ]   PLAIN    Plain Box     Standard flat-pack boxes    ● ACTIVE
```

Columns:
- **[img]**: 36×36px image thumbnail, `object-fit: cover`, `border-radius: 6px`. When `imageUrl` is null/empty: neutral placeholder icon (e.g. `ImageOff` from Lucide, 20px, muted). When URL fails to load: same placeholder icon (via `onError` handler).
- **CODE**: gold, bold, `font-size: 0.72rem`, `letter-spacing: 0.06em`
- **NAME**: bold, `#F0EDE6`
- **DESCRIPTION**: muted, clamped to 1 line with ellipsis; hidden on tablet
- **STATUS**: `.status-pill`

Row click (anywhere on row): opens `DesignTypeSlideOver` pre-populated. On hover: subtle gold left border (`border-left: 2px solid rgba(245,182,30,0.25)`).

Inactive rows: `opacity: 0.6`.

### 4.4 Table — Tablet (768–1023px)

DESCRIPTION column hidden (`hide-tablet`). IMAGE, CODE, NAME, STATUS remain.

### 4.5 Cards — Mobile (< 768px)

```
┌────────────────────────────────────────────┐
│ [36×36 img]  HAMPER           ● ACTIVE     │
│              Hamper                        │
│              Premium gift hamper boxes     │
└────────────────────────────────────────────┘
```

Full-width stacked cards. Tap anywhere opens slide-over. Image on left, text on right (flex row). When no image: placeholder icon same size.

### 4.6 Pagination

`PaginationBar` below the table/cards, receives `total={filteredTotal}`, `page`, `size`.

---

## 5. Slide-over Panel — DesignTypeSlideOver

### 5.1 Layout

- **Desktop/Tablet (≥ 768px):** 440px right-side panel, slides in from right. Semi-transparent backdrop. Click backdrop closes.
- **Mobile (< 768px):** Full-width bottom sheet, `92vh`, slides up. Drag handle at top.

Header (sticky):
```
✕   New Design Type     (or "Edit — HAMPER Hamper" for edit mode)
```

Footer (sticky):
```
[CANCEL]                         [SAVE TYPE]
```
Save button: disabled + spinner while submitting. Error banner at top of content area on server error.

### 5.2 Form Sections

**IDENTITY**
```
[CODE * — auto-uppercased]   [NAME *          ]
```
`code` field: `onChange` handler uppercases value in real time (same behaviour as existing `createDesignType` action which auto-uppercases on server — client-side uppercase is for visual feedback only).

**DESCRIPTION**
```
[DESCRIPTION — textarea, 3 rows, optional     ]
```

**IMAGE**
```
[IMAGE URL — optional                         ]

┌──────────────────────────────────────────────┐
│                                              │
│   [image preview — 120px height,             │
│    object-fit: cover, border-radius: 8px]    │
│                                              │
└──────────────────────────────────────────────┘
```

Image preview behaviour:
- Hidden when `imageUrl` input is empty
- Renders `<img src={imageUrl} ...>` as soon as the field has any value
- On load error: hide the preview container entirely (do not show broken image icon in the preview area)
- No validation of URL format — the field is a free-text input; broken URLs simply show no preview

**STATUS**
```
[ ✓ ACTIVE ]   [ INACTIVE ]
```
Chip toggle. Default for new types: ACTIVE.

---

## 6. Server Actions

`src/actions/design-types.ts` — existing `createDesignType` and `updateDesignType` already handle all fields. No new actions needed.

Verify that both actions handle `imageUrl` as an optional field (pass `|| undefined` if empty string).

`toggleDesignTypeActive` is no longer called from the list (no expand row) — it remains available but won't be wired to new UI. It can stay unused for now.

---

## 7. Page — `src/app/(app)/design-types/page.tsx`

Rewritten as a paginated Server Component:

```typescript
searchParams: { q?, status?, page?, size? }
```

Where clause:
```typescript
{
  active: status === "ACTIVE" ? true : status === "INACTIVE" ? false : undefined,
  OR: q ? [{ code: { contains: q } }, { name: { contains: q } }] : undefined,
}
```

Parallel queries:
1. `prisma.designType.findMany({ where, skip, take, orderBy: { code: "asc" } })` — current page
2. `prisma.designType.count({ where })` — filtered total for PaginationBar
3. `prisma.designType.count()` — global total
4. `prisma.designType.count({ where: { active: true } })` — active count
5. `prisma.designType.count({ where: { active: false } })` — inactive count

Passes `{ designTypes, filteredTotal, page, size, statTotals }` to `DesignTypesClient`.

---

## 8. DesignTypeSlideOver Data Interface

```typescript
export interface DesignTypeData {
  id: number;
  code: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  active: boolean;
}
```

---

## 9. Redirects

- `src/app/(app)/design-types/new/page.tsx` → `redirect("/design-types")`
- `src/app/(app)/design-types/[id]/edit/page.tsx` → `redirect("/design-types")`

---

## 10. Responsive Breakpoints

| Breakpoint | Layout |
|------------|--------|
| ≥ 768px | Full table (5 cols), slide-over 440px right panel |
| < 768px | Card stack, slide-over becomes bottom sheet (92vh) |

---

## 11. Files Affected

### New
- `src/components/design-types/DesignTypeSlideOver.tsx`
- `src/components/design-types/DesignTypesClient.tsx`

### Modified
- `src/app/(app)/design-types/page.tsx` — full rewrite as paginated server component
- `src/app/(app)/design-types/new/page.tsx` — replace with redirect
- `src/app/(app)/design-types/[id]/edit/page.tsx` — replace with redirect

### Can be deleted
- `src/app/(app)/design-types/DesignTypeRow.tsx` — replaced by DesignTypesClient inline rows

---

## 12. Out of Scope

- Image file upload (imageUrl is a URL string only — no file upload in this spec)
- Design type merging or bulk operations
- Orders module UI redesign (separate spec)
