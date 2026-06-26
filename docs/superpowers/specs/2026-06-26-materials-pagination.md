# Materials List Pagination — Design Spec (Addendum)
**Date:** 2026-06-26
**Scope:** Retrofit the existing Materials list with server-side pagination + URL-driven search/filter; introduce three shared UI atoms consumed by all four list modules.

---

## 1. Goals

- Add server-side pagination (configurable 20/50/100) to the Materials list
- Move search and status filter from client `useState` to URL params so pages are bookmarkable
- Build three shared UI atoms (`StatChip`, `PaginationBar`, `FilterTabBar`) that all four list modules reuse
- Retrofit `MaterialExpandRow` layout to the professional two-column grid standard defined below
- No changes to `MaterialSlideOver`, `MaterialCard`, or any server actions

---

## 2. Design System Context

Existing `globals.css` tokens apply: `--bg`, `--gold`, `--glass-bg`, `--glass-border`, `--font-jakarta`. New component styles may be added to `globals.css` as needed. No new CSS frameworks.

---

## 3. Shared UI Atoms

These three components are **prerequisites** for all four list modules. They live in `src/components/ui/` and must be built before any module redesign begins.

### 3.1 `StatChip.tsx`

```tsx
interface StatChipProps {
  label: string;
  value: number | string;
  color?: string;          // CSS color string, defaults to rgba(240,237,230,0.6)
  icon?: React.ReactNode;  // optional leading icon (e.g. AlertTriangle)
  pulse?: boolean;         // adds subtle CSS pulse animation when true
}
```

Renders a small pill with `value` (larger, colored) and `label` (small, muted caps). Background: `rgba(255,255,255,0.04)`, border: `rgba(245,182,30,0.1)`, border-radius `0.6rem`, padding `0.35rem 0.8rem`. Used in a flex row (the stat strip).

### 3.2 `PaginationBar.tsx`

```tsx
interface PaginationBarProps {
  total: number;      // total matching records (not page count)
  page: number;       // current page (1-indexed)
  size: number;       // current page size
}
```

Reads `page` and `size` from props. Writes `?page=N` and `?size=N` to URL via `useRouter` + `useSearchParams`. Preserves all other URL params (q, status) when navigating.

Layout:
```
[20][50][100]    ← 12 of 48    [‹ Prev]  1  2  3  …  5  [Next ›]
```

- Size buttons: pill group on the left, active size highlighted with gold border
- Record count: `X–Y of Z` in the center (muted)
- Page buttons: show first page, last page, current ± 1, ellipsis for gaps
- Prev/Next: disabled and dimmed when at boundary
- Changing size resets to page 1
- Hidden entirely when `total <= size` (no need for pagination)

### 3.3 `FilterTabBar.tsx`

```tsx
interface FilterTabBarProps {
  tabs: string[];         // e.g. ["ALL", "ACTIVE", "PENDING", "INACTIVE"]
  activeTab: string;
  paramName?: string;     // URL param name, defaults to "status"
}
```

Renders pill tabs. Active tab: gold bottom border + slightly brighter text. Click writes `?status=X` (or `?ALL` omits the param) to URL via `router.replace`, resets `page` to 1.

---

## 4. URL Param Schema

All four list modules use this consistent schema:

| Param | Values | Default |
|-------|--------|---------|
| `q` | search string | — (no filter) |
| `status` | `ACTIVE`, `PENDING`, `INACTIVE` | — (ALL) |
| `page` | integer ≥ 1 | `1` |
| `size` | `20`, `50`, `100` | `20` |

Modules that don't have a PENDING status (Customers, Box Designs, Design Types) simply don't use `status=PENDING`.

---

## 5. MaterialsPage Changes

`src/app/(app)/materials/page.tsx` — Server Component reading `searchParams`.

```typescript
interface SearchParams {
  q?: string;
  status?: string;   // "ACTIVE" | "PENDING" | "INACTIVE"
  page?: string;
  size?: string;
}
```

**Query logic:**
```typescript
const page = Math.max(1, parseInt(params.page ?? "1"));
const size = [20, 50, 100].includes(parseInt(params.size ?? "")) ? parseInt(params.size!) : 20;
const skip = (page - 1) * size;

const where = {
  status: validStatus ? status : undefined,
  OR: q ? [{ code: { contains: q } }, { name: { contains: q } }] : undefined,
};

const [raw, filteredTotal, totalAll, totalActive, totalPending] = await Promise.all([
  prisma.material.findMany({ where, skip, take: size, orderBy: { code: "asc" } }),
  prisma.material.count({ where }),
  prisma.material.count(),
  prisma.material.count({ where: { status: "ACTIVE" } }),
  prisma.material.count({ where: { status: "PENDING" } }),
]);

// Low stock count — column comparison requires raw SQL
const [{ lowStockCount }] = await prisma.$queryRaw`
  SELECT COUNT(*) AS lowStockCount FROM Material
  WHERE status = 'ACTIVE' AND minStockLevel > 0 AND currentStockLevel <= minStockLevel
`;
```

Passes to `MaterialsClient`:
```typescript
{
  materials,           // current page, Decimal→number converted
  filteredTotal,       // for PaginationBar
  page,
  size,
  statTotals: { total: totalAll, active: totalActive, pending: totalPending, lowStock: Number(lowStockCount) }
}
```

---

## 6. MaterialsClient Changes

`src/components/materials/MaterialsClient.tsx`

**Remove:**
- `search` useState + `setSearch`
- `filter` useState + `setFilter`
- `useMemo` filtered list
- Inline stat strip markup
- Inline filter tab markup

**Add:**
- `useSearchParams()` to read current URL state
- Debounced search: `useTransition` + 300ms debounce on `router.replace` when search input changes
- `FilterTabBar` component (replaces inline tab buttons)
- `StatChip` components in stat strip (replaces inline markup)
- `PaginationBar` at bottom of table/cards (receives `total={filteredTotal}`, `page`, `size`)

**Props interface update:**
```typescript
interface Props {
  materials: MaterialRow[];
  filteredTotal: number;
  page: number;
  size: number;
  statTotals: { total: number; active: number; pending: number; lowStock: number };
}
```

`expandedId`, `slideOpen`, `editTarget` state stays local — unchanged.

---

## 7. MaterialExpandRow Layout Retrofit

`src/components/materials/MaterialExpandRow.tsx` — layout update only, no logic changes.

**Current layout:** ad-hoc stacked rows.

**New layout:** Professional two-column grid (the standard for all expand rows):

```
┌──────────────────────────────┬───────────────────────────────┐
│  STOCK CONTROL               │  STATUS                       │
│  [−]  [ 48 ]  [+]            │  [ PENDING ] [✓ ACTIVE ]      │
│  Min: 20                     │  [ INACTIVE ]                 │
│  [████████░░░]  240% of min  │                               │
│           [ Save Stock ]     │                               │
├──────────────────────────────┴───────────────────────────────┤
│                               [ Full Edit ]   [ ✕ Close ]   │
└──────────────────────────────────────────────────────────────┘
```

Layout rules (apply to ALL expand rows in the project):
- Two equal columns, `display: grid; grid-template-columns: 1fr 1fr`
- Vertical divider: `border-right: 1px solid rgba(245,182,30,0.08)` on left column
- Section label: `font-size: 0.62rem; letter-spacing: 0.1em; color: rgba(240,237,230,0.35); text-transform: uppercase; margin-bottom: 0.6rem`
- Footer row: `border-top: 1px solid rgba(245,182,30,0.08); padding: 0.75rem 1.25rem; display: flex; justify-content: flex-end; gap: 0.75rem`
- Full Edit button: `cta-btn` class; Close button: muted text button
- Expand panel background: `rgba(255,255,255,0.02)`; left border: `3px solid rgba(245,182,30,0.18)`

---

## 8. Files Affected

### New
- `src/components/ui/StatChip.tsx`
- `src/components/ui/PaginationBar.tsx`
- `src/components/ui/FilterTabBar.tsx`

### Modified
- `src/app/(app)/materials/page.tsx` — paginated query, parallel stat counts
- `src/components/materials/MaterialsClient.tsx` — URL-driven search/filter, PaginationBar, StatChip
- `src/components/materials/MaterialExpandRow.tsx` — layout retrofit only

---

## 9. Out of Scope

- Any changes to `MaterialSlideOver`, `MaterialCard`, `MaterialExpandRow` logic/actions
- Orders module
- Any other module (handled in their own specs)
