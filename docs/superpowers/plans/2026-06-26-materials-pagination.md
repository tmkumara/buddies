# Materials List Pagination — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retrofit the Materials list with server-side pagination (20/50/100), URL-driven search and filter, and a two-column professional expand-row layout; build three shared UI atoms used by all four list modules.

**Architecture:** Three new shared atoms (StatChip, FilterTabBar, PaginationBar) go in `src/components/ui/`. MaterialExpandRow gets a layout-only retrofit (all logic unchanged). MaterialsPage is rewritten to read `searchParams`, run parallel Prisma queries, and pass paginated data + stat totals to MaterialsClient. MaterialsClient drops `useState` search/filter, replaces inline stat markup with StatChip, adds PaginationBar at bottom.

**Tech Stack:** Next.js 16.2.7 App Router, React 19, TypeScript, Prisma 7 + MySQL, Lucide React 1.17

## Global Constraints

- **Next.js 16**: `searchParams` prop is `Promise<{...}>` — always `await` it. Read `node_modules/next/dist/docs/` before writing Next.js code.
- **Prisma 7**: `db push` ONLY — never run `prisma migrate`. `Decimal` fields → `number` before passing to Client Components.
- **No new npm packages.**
- **Design tokens**: `--bg: #080808`, `--gold: #F5B61E`, `--text: #F0EDE6`. Reuse existing CSS classes: `.stat-strip`, `.stat-strip-chip`, `.stat-strip-chip.low-stock`, `.filter-tabs`, `.filter-tab`, `.filter-tab.active`, `.expand-row`, `.stock-bar-track`, `.stock-bar-fill.green/.amber/.red`, `.status-chip-btn`, `.status-chip-btn.active-ACTIVE/PENDING/INACTIVE`, `.nudge-btn`, `.row-chevron`, `.row-chevron.expanded`, `.content-card`, `.orders-table`, `.form-input`, `.cta-btn`.
- **MySQL raw query COUNT**: returns `bigint` — always wrap with `Number()`.
- **`router.refresh()`** after successful slide-over save (unchanged — MaterialSlideOver already does this).
- **TypeScript strict**: no `any` types.

---

### Task 1: Shared UI Atoms — StatChip, FilterTabBar, PaginationBar

**Files:**
- Create: `src/components/ui/StatChip.tsx`
- Create: `src/components/ui/FilterTabBar.tsx`
- Create: `src/components/ui/PaginationBar.tsx`

**Interfaces:**
- Produces (consumed by Tasks 3, and all other module plans):
```typescript
// StatChip
interface StatChipProps {
  label: string;
  value: number | string;
  color?: string;       // overrides .value color
  icon?: React.ReactNode;
  pulse?: boolean;      // applies .low-stock class (red pulse animation)
}

// FilterTabBar
interface FilterTabBarProps {
  tabs: string[];
  activeTab: string;        // current active tab value
  currentParams: Record<string, string>; // existing URL params to preserve on navigate
  paramName?: string;       // defaults to "status"
}

// PaginationBar
interface PaginationBarProps {
  total: number;    // total matching records
  page: number;     // current page (1-indexed)
  size: number;     // current page size
  currentParams: Record<string, string>; // existing URL params to preserve (q, status)
}
```

- [ ] **Step 1: Create `src/components/ui/StatChip.tsx`**

```tsx
import React from "react";

interface StatChipProps {
  label: string;
  value: number | string;
  color?: string;
  icon?: React.ReactNode;
  pulse?: boolean;
}

export default function StatChip({ label, value, color, icon, pulse }: StatChipProps) {
  return (
    <div className={`stat-strip-chip${pulse ? " low-stock" : ""}`}>
      {icon}
      <span className="value" style={color ? { color } : undefined}>{value}</span>
      <span>{label}</span>
    </div>
  );
}
```

- [ ] **Step 2: Create `src/components/ui/FilterTabBar.tsx`**

```tsx
"use client";

import { useRouter } from "next/navigation";

interface FilterTabBarProps {
  tabs: string[];
  activeTab: string;
  currentParams: Record<string, string>;
  paramName?: string;
}

export default function FilterTabBar({
  tabs,
  activeTab,
  currentParams,
  paramName = "status",
}: FilterTabBarProps) {
  const router = useRouter();

  function handleClick(tab: string) {
    const params = new URLSearchParams(currentParams);
    if (tab === "ALL") {
      params.delete(paramName);
    } else {
      params.set(paramName, tab);
    }
    params.delete("page"); // reset to page 1 on filter change
    router.replace(`?${params.toString()}`);
  }

  return (
    <div className="filter-tabs">
      {tabs.map((tab) => (
        <button
          key={tab}
          type="button"
          className={`filter-tab${activeTab === tab ? " active" : ""}`}
          onClick={() => handleClick(tab)}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Create `src/components/ui/PaginationBar.tsx`**

```tsx
"use client";

import { useRouter } from "next/navigation";

interface PaginationBarProps {
  total: number;
  page: number;
  size: number;
  currentParams: Record<string, string>;
}

const SIZES = [20, 50, 100];

export default function PaginationBar({ total, page, size, currentParams }: PaginationBarProps) {
  const router = useRouter();

  if (total <= size) return null;

  const totalPages = Math.ceil(total / size);
  const start = (page - 1) * size + 1;
  const end = Math.min(page * size, total);

  function navigate(nextPage: number, nextSize = size) {
    const params = new URLSearchParams(currentParams);
    params.set("page", String(nextPage));
    params.set("size", String(nextSize));
    router.replace(`?${params.toString()}`);
  }

  function getPages(): (number | "...")[] {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | "...")[] = [1];
    if (page > 3) pages.push("...");
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      pages.push(i);
    }
    if (page < totalPages - 2) pages.push("...");
    pages.push(totalPages);
    return pages;
  }

  const btnBase: React.CSSProperties = {
    border: "1px solid rgba(245,182,30,0.12)",
    borderRadius: "0.35rem",
    background: "transparent",
    cursor: "pointer",
    fontFamily: "var(--font-jakarta, 'Plus Jakarta Sans', sans-serif)",
  };

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      flexWrap: "wrap",
      gap: "0.75rem",
      padding: "0.75rem 0",
      marginTop: "0.5rem",
    }}>
      {/* Size selector */}
      <div style={{ display: "flex", gap: "0.25rem" }}>
        {SIZES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => navigate(1, s)}
            style={{
              ...btnBase,
              padding: "0.25rem 0.6rem",
              fontSize: "0.68rem",
              border: `1px solid ${s === size ? "rgba(245,182,30,0.5)" : "rgba(245,182,30,0.12)"}`,
              background: s === size ? "rgba(245,182,30,0.1)" : "transparent",
              color: s === size ? "#F5B61E" : "rgba(240,237,230,0.4)",
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Record count */}
      <span style={{ fontSize: "0.68rem", color: "rgba(240,237,230,0.3)" }}>
        {start}–{end} of {total}
      </span>

      {/* Page navigation */}
      <div style={{ display: "flex", gap: "0.2rem", alignItems: "center" }}>
        <button
          type="button"
          disabled={page === 1}
          onClick={() => navigate(page - 1)}
          style={{
            ...btnBase,
            padding: "0.25rem 0.6rem",
            fontSize: "0.72rem",
            color: page === 1 ? "rgba(240,237,230,0.18)" : "rgba(240,237,230,0.55)",
            cursor: page === 1 ? "not-allowed" : "pointer",
          }}
        >
          ‹ Prev
        </button>

        {getPages().map((p, i) =>
          p === "..." ? (
            <span key={`e${i}`} style={{ padding: "0 0.2rem", color: "rgba(240,237,230,0.25)", fontSize: "0.72rem" }}>
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => navigate(p as number)}
              style={{
                ...btnBase,
                padding: "0.25rem 0.55rem",
                fontSize: "0.72rem",
                minWidth: "2rem",
                border: `1px solid ${p === page ? "rgba(245,182,30,0.5)" : "rgba(245,182,30,0.12)"}`,
                background: p === page ? "rgba(245,182,30,0.1)" : "transparent",
                color: p === page ? "#F5B61E" : "rgba(240,237,230,0.4)",
              }}
            >
              {p}
            </button>
          )
        )}

        <button
          type="button"
          disabled={page === totalPages}
          onClick={() => navigate(page + 1)}
          style={{
            ...btnBase,
            padding: "0.25rem 0.6rem",
            fontSize: "0.72rem",
            color: page === totalPages ? "rgba(240,237,230,0.18)" : "rgba(240,237,230,0.55)",
            cursor: page === totalPages ? "not-allowed" : "pointer",
          }}
        >
          Next ›
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/StatChip.tsx src/components/ui/FilterTabBar.tsx src/components/ui/PaginationBar.tsx
git commit -m "feat: add StatChip, FilterTabBar, PaginationBar shared UI atoms"
```

---

### Task 2: MaterialExpandRow — Two-Column Layout Retrofit

**Files:**
- Modify: `src/components/materials/MaterialExpandRow.tsx`

**Interfaces:**
- Consumes: unchanged — `{ material, onFullEdit: () => void, onClose: () => void }`
- Produces: same export, same props — layout only changes, zero logic changes

**Context:** `.expand-row` CSS class already provides `display: grid; grid-template-columns: 1fr 1fr` (1fr on mobile). The current layout puts the footer buttons (Full Edit + Close) inside the second column alongside the status chips. The retrofit moves them to a dedicated full-width footer row below the two-column body, and adds a vertical divider + polished section labels.

- [ ] **Step 1: Rewrite `src/components/materials/MaterialExpandRow.tsx`**

All state, transitions, and action calls are **identical** to the current file. Only the JSX layout changes.

```tsx
"use client";

import { useState, useTransition } from "react";
import { Pencil, X } from "lucide-react";
import { MaterialStatus } from "@prisma/client";
import { updateMaterialStatus, updateMaterialStock } from "@/actions/materials";

interface Props {
  material: {
    id: number;
    status: MaterialStatus;
    currentStockLevel: number;
    minStockLevel: number;
  };
  onFullEdit: () => void;
  onClose: () => void;
}

const STATUSES: MaterialStatus[] = ["PENDING", "ACTIVE", "INACTIVE"];

export default function MaterialExpandRow({ material, onFullEdit, onClose }: Props) {
  const [stock, setStock] = useState(material.currentStockLevel);
  const [optimisticStatus, setOptimisticStatus] = useState<MaterialStatus>(material.status);
  const [stockPending, startStock] = useTransition();
  const [statusPending, startStatus] = useTransition();
  const isDirty = stock !== material.currentStockLevel;

  const min = material.minStockLevel;
  const pct = min > 0 ? Math.min((stock / min) * 100, 100) : 100;
  const barColor: "green" | "amber" | "red" = pct >= 100 ? "green" : pct >= 50 ? "amber" : "red";

  function handleSaveStock() {
    startStock(async () => { await updateMaterialStock(material.id, stock); });
  }

  function handleStatus(s: MaterialStatus) {
    if (s === optimisticStatus) return;
    const prev = optimisticStatus;
    setOptimisticStatus(s);
    startStatus(async () => {
      const res = await updateMaterialStatus(material.id, s);
      if ("error" in res) setOptimisticStatus(prev);
    });
  }

  const sectionLabel: React.CSSProperties = {
    fontSize: "0.62rem",
    letterSpacing: "0.1em",
    color: "rgba(240,237,230,0.35)",
    textTransform: "uppercase",
    marginBottom: "0.6rem",
  };

  return (
    <div>
      {/* Two-column body */}
      <div className="expand-row" style={{ padding: 0 }}>
        {/* Left column: Stock Control */}
        <div style={{ padding: "1rem 1.25rem", borderRight: "1px solid rgba(245,182,30,0.08)" }}>
          <p style={sectionLabel}>Stock Control</p>
          <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginBottom: "0.5rem" }}>
            <button type="button" className="nudge-btn" onClick={() => setStock((v) => Math.max(0, v - 1))}>−</button>
            <input
              type="number"
              min="0"
              value={stock}
              onChange={(e) => setStock(Math.max(0, Number(e.target.value)))}
              style={{
                width: "68px",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(245,182,30,0.2)",
                borderRadius: "0.4rem",
                padding: "0.3rem 0.4rem",
                color: "#F0EDE6",
                fontSize: "0.875rem",
                textAlign: "center",
                outline: "none",
                fontFamily: "var(--font-jakarta, 'Plus Jakarta Sans', sans-serif)",
              }}
            />
            <button type="button" className="nudge-btn" onClick={() => setStock((v) => v + 1)}>+</button>
            {isDirty && (
              <button
                type="button"
                onClick={handleSaveStock}
                disabled={stockPending}
                style={{
                  padding: "0.3rem 0.7rem",
                  background: "rgba(245,182,30,0.12)",
                  border: "1px solid rgba(245,182,30,0.3)",
                  borderRadius: "0.4rem",
                  color: "#F5B61E",
                  fontSize: "0.6rem",
                  letterSpacing: "0.08em",
                  cursor: "pointer",
                  opacity: stockPending ? 0.55 : 1,
                  fontFamily: "var(--font-jakarta, 'Plus Jakarta Sans', sans-serif)",
                }}
              >
                {stockPending ? "SAVING…" : "SAVE"}
              </button>
            )}
          </div>
          {min > 0 && (
            <div>
              <div className="stock-bar-track">
                <div className={`stock-bar-fill ${barColor}`} style={{ width: `${pct}%` }} />
              </div>
              <p style={{ fontSize: "0.56rem", color: "rgba(240,237,230,0.28)", marginTop: "0.3rem" }}>
                Min: {min} · {Math.round(pct)}% of minimum
              </p>
            </div>
          )}
        </div>

        {/* Right column: Status */}
        <div style={{ padding: "1rem 1.25rem" }}>
          <p style={sectionLabel}>Status</p>
          <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
            {STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                className={`status-chip-btn${optimisticStatus === s ? ` active-${s}` : ""}`}
                onClick={() => handleStatus(s)}
                disabled={statusPending}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Full-width footer */}
      <div style={{
        borderTop: "1px solid rgba(245,182,30,0.08)",
        padding: "0.65rem 1.25rem",
        display: "flex",
        justifyContent: "flex-end",
        gap: "0.6rem",
        background: "rgba(245,182,30,0.01)",
      }}>
        <button
          type="button"
          onClick={onFullEdit}
          style={{
            display: "flex", alignItems: "center", gap: "0.3rem",
            padding: "0.3rem 0.8rem",
            background: "rgba(245,182,30,0.08)",
            border: "1px solid rgba(245,182,30,0.2)",
            borderRadius: "0.4rem",
            color: "rgba(240,237,230,0.7)",
            fontSize: "0.6rem",
            letterSpacing: "0.08em",
            cursor: "pointer",
            fontFamily: "var(--font-jakarta, 'Plus Jakarta Sans', sans-serif)",
          }}
        >
          <Pencil size={10} /> FULL EDIT
        </button>
        <button
          type="button"
          onClick={onClose}
          style={{
            display: "flex", alignItems: "center", gap: "0.3rem",
            padding: "0.3rem 0.8rem",
            background: "transparent",
            border: "1px solid rgba(240,237,230,0.1)",
            borderRadius: "0.4rem",
            color: "rgba(240,237,230,0.28)",
            fontSize: "0.6rem",
            letterSpacing: "0.08em",
            cursor: "pointer",
            fontFamily: "var(--font-jakarta, 'Plus Jakarta Sans', sans-serif)",
          }}
        >
          <X size={10} /> CLOSE
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Smoke-test expand row in browser**

```bash
npm run dev
```

Navigate to `http://localhost:3000/materials`. Click a row chevron. Verify:
- [ ] Two columns side-by-side: STOCK CONTROL on left, STATUS on right
- [ ] Vertical divider line between columns
- [ ] Full Edit + Close in a separate footer row spanning full width
- [ ] Stock nudge, save, status toggle all still work identically

- [ ] **Step 4: Commit**

```bash
git add src/components/materials/MaterialExpandRow.tsx
git commit -m "refactor: retrofit MaterialExpandRow to two-column grid layout with footer row"
```

---

### Task 3: MaterialsPage + MaterialsClient — Pagination Retrofit

**Files:**
- Modify: `src/app/(app)/materials/page.tsx`
- Modify: `src/components/materials/MaterialsClient.tsx`

**Interfaces:**
- Consumes: `StatChip` from `@/components/ui/StatChip`, `FilterTabBar` from `@/components/ui/FilterTabBar`, `PaginationBar` from `@/components/ui/PaginationBar` (Task 1)
- Produces: `MaterialsClient` now accepts `{ materials, filteredTotal, page, size, currentQ, currentStatus, statTotals }`

- [ ] **Step 1: Rewrite `src/app/(app)/materials/page.tsx`**

```tsx
import { Suspense } from "react";
import { requireAuth } from "@/lib/auth-guards";
import prisma from "@/lib/prisma";
import TopBar from "@/components/layout/TopBar";
import MaterialsClient from "@/components/materials/MaterialsClient";
import { MaterialStatus } from "@prisma/client";

const VALID_STATUSES: MaterialStatus[] = ["ACTIVE", "PENDING", "INACTIVE"];
const VALID_SIZES = [20, 50, 100];

export default async function MaterialsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string; size?: string }>;
}) {
  await requireAuth();
  const { q, status, page: pageParam, size: sizeParam } = await searchParams;

  const currentStatus = VALID_STATUSES.includes(status as MaterialStatus)
    ? (status as MaterialStatus)
    : undefined;
  const size = VALID_SIZES.includes(parseInt(sizeParam ?? "")) ? parseInt(sizeParam!) : 20;
  const page = Math.max(1, parseInt(pageParam ?? "1") || 1);
  const skip = (page - 1) * size;

  const where = {
    status: currentStatus,
    OR: q
      ? [{ code: { contains: q } }, { name: { contains: q } }]
      : undefined,
  };

  const [raw, filteredTotal, totalAll, totalActive, totalPending, lowStockResult] =
    await Promise.all([
      prisma.material.findMany({ where, skip, take: size, orderBy: { code: "asc" } }),
      prisma.material.count({ where }),
      prisma.material.count(),
      prisma.material.count({ where: { status: "ACTIVE" } }),
      prisma.material.count({ where: { status: "PENDING" } }),
      prisma.$queryRaw<{ cnt: bigint }[]>`
        SELECT COUNT(*) AS cnt FROM \`material\`
        WHERE \`status\` = 'ACTIVE'
          AND \`min_stock_level\` > 0
          AND \`current_stock_level\` <= \`min_stock_level\`
      `,
    ]);

  const materials = raw.map((m) => ({
    id:                m.id,
    code:              m.code,
    name:              m.name,
    gsm:               m.gsm,
    sheetLengthCm:     m.sheetLengthCm  != null ? Number(m.sheetLengthCm)  : null,
    sheetWidthCm:      m.sheetWidthCm   != null ? Number(m.sheetWidthCm)   : null,
    sheetLengthIn:     m.sheetLengthIn  != null ? Number(m.sheetLengthIn)  : null,
    sheetWidthIn:      m.sheetWidthIn   != null ? Number(m.sheetWidthIn)   : null,
    costPerSheet:      Number(m.costPerSheet),
    unitPrice:         Number(m.unitPrice),
    minStockLevel:     Number(m.minStockLevel),
    currentStockLevel: Number(m.currentStockLevel),
    status:            m.status as MaterialStatus,
  }));

  return (
    <>
      <TopBar title="Materials" />
      <MaterialsClient
        materials={materials}
        filteredTotal={filteredTotal}
        page={page}
        size={size}
        currentQ={q ?? ""}
        currentStatus={currentStatus ?? "ALL"}
        statTotals={{
          total:    totalAll,
          active:   totalActive,
          pending:  totalPending,
          lowStock: Number(lowStockResult[0]?.cnt ?? 0),
        }}
      />
    </>
  );
}
```

- [ ] **Step 2: Rewrite `src/components/materials/MaterialsClient.tsx`**

Read the current file before editing. Then replace its full content:

```tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, AlertTriangle } from "lucide-react";
import { ChevronRight } from "lucide-react";
import { MaterialStatus } from "@prisma/client";
import StatChip from "@/components/ui/StatChip";
import FilterTabBar from "@/components/ui/FilterTabBar";
import PaginationBar from "@/components/ui/PaginationBar";
import MaterialSlideOver, { MaterialData } from "./MaterialSlideOver";
import MaterialExpandRow from "./MaterialExpandRow";
import MaterialCard, { MaterialRow } from "./MaterialCard";

type FilterTab = "ALL" | MaterialStatus;

const STATUS_PILL: Record<MaterialStatus, string> = {
  ACTIVE:   "status-fulfilled",
  PENDING:  "status-pending",
  INACTIVE: "status-cancelled",
};

const TABS: FilterTab[] = ["ALL", "ACTIVE", "PENDING", "INACTIVE"];

interface StatTotals {
  total: number;
  active: number;
  pending: number;
  lowStock: number;
}

interface Props {
  materials: MaterialRow[];
  filteredTotal: number;
  page: number;
  size: number;
  currentQ: string;
  currentStatus: string;
  statTotals: StatTotals;
}

export default function MaterialsClient({
  materials,
  filteredTotal,
  page,
  size,
  currentQ,
  currentStatus,
  statTotals,
}: Props) {
  const router = useRouter();
  const [searchValue, setSearchValue] = useState(currentQ);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [slideOpen, setSlideOpen]   = useState(false);
  const [editTarget, setEditTarget] = useState<MaterialData | undefined>(undefined);
  const isFirstRender = useRef(true);

  // Debounced URL update when search value changes
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const timer = setTimeout(() => {
      const params = new URLSearchParams();
      if (searchValue) params.set("q", searchValue);
      if (currentStatus && currentStatus !== "ALL") params.set("status", currentStatus);
      params.set("size", String(size));
      // page intentionally omitted → resets to 1
      router.replace(`?${params.toString()}`);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchValue]);

  // currentParams passed to FilterTabBar and PaginationBar so they preserve other params
  const currentParams: Record<string, string> = {};
  if (searchValue) currentParams.q = searchValue;
  if (currentStatus && currentStatus !== "ALL") currentParams.status = currentStatus;
  currentParams.size = String(size);

  function openNew()  { setEditTarget(undefined); setSlideOpen(true); }
  function openEdit(id: number) {
    const m = materials.find((x) => x.id === id);
    if (m) { setEditTarget(m as MaterialData); setSlideOpen(true); }
  }
  function closeSlide() { setSlideOpen(false); setEditTarget(undefined); }

  function formatDim(m: MaterialRow) {
    if (m.sheetLengthIn != null && m.sheetWidthIn != null)
      return `${m.sheetLengthIn} × ${m.sheetWidthIn} in`;
    if (m.sheetLengthCm != null && m.sheetWidthCm != null)
      return `${m.sheetLengthCm} × ${m.sheetWidthCm} cm`;
    return "—";
  }

  return (
    <div style={{ padding: "1.25rem 1.75rem" }}>
      {/* Stat strip */}
      <div className="stat-strip" style={{ marginBottom: "1rem" }}>
        <StatChip label="TOTAL"   value={statTotals.total} />
        <StatChip label="ACTIVE"  value={statTotals.active}  color="#4ADE80" />
        <StatChip label="PENDING" value={statTotals.pending} color="#FBBF24" />
        {statTotals.lowStock > 0 && (
          <StatChip
            label="LOW STOCK"
            value={statTotals.lowStock}
            color="#F87171"
            icon={<AlertTriangle size={11} style={{ color: "#F87171" }} />}
            pulse
          />
        )}
      </div>

      {/* Controls */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        <div style={{ position: "relative", flex: "1 1 180px", maxWidth: "280px" }}>
          <Search size={12} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "rgba(240,237,230,0.22)", pointerEvents: "none" }} />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search code or name…"
            className="form-input"
            style={{ paddingLeft: "2.1rem", fontSize: "0.76rem" }}
          />
        </div>
        <FilterTabBar
          tabs={TABS}
          activeTab={currentStatus || "ALL"}
          currentParams={currentParams}
        />
        <button
          type="button"
          className="cta-btn"
          onClick={openNew}
          style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.68rem", padding: "0.48rem 1rem", marginLeft: "auto" }}
        >
          <Plus size={12} /> New Material
        </button>
      </div>

      {materials.length === 0 && (
        <div className="content-card" style={{ padding: "3rem 0", textAlign: "center", fontSize: "0.8rem", color: "rgba(240,237,230,0.22)" }}>
          {searchValue || currentStatus !== "ALL"
            ? "No materials match your filter."
            : "No materials yet."}
        </div>
      )}

      {/* Desktop/tablet table */}
      {materials.length > 0 && (
        <div id="materials-table-view">
          <div className="content-card" style={{ padding: 0, overflow: "hidden" }}>
            <table className="orders-table">
              <thead>
                <tr>
                  <th style={{ width: "2rem" }} />
                  <th>CODE</th>
                  <th>NAME</th>
                  <th className="hide-tablet">GSM</th>
                  <th className="hide-tablet">SHEET</th>
                  <th>BUY PRICE</th>
                  <th>UNIT PRICE</th>
                  <th>STOCK</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {materials.map((m) => {
                  const isExpanded = expandedId === m.id;
                  const lowStock = m.status === "ACTIVE" && m.minStockLevel > 0 && m.currentStockLevel <= m.minStockLevel;
                  const pct = m.minStockLevel > 0 ? Math.min((m.currentStockLevel / m.minStockLevel) * 100, 100) : 100;
                  const barColor = pct >= 100 ? "#4ADE80" : pct >= 50 ? "#FBBF24" : "#F87171";

                  return (
                    <React.Fragment key={m.id}>
                      <tr
                        style={{
                          borderLeft: m.status === "PENDING"
                            ? "2px solid rgba(251,191,36,0.4)"
                            : lowStock
                            ? "2px solid rgba(248,113,113,0.35)"
                            : "2px solid transparent",
                          cursor: "pointer",
                        }}
                        onClick={() => setExpandedId(isExpanded ? null : m.id)}
                      >
                        <td style={{ paddingRight: 0 }}>
                          <ChevronRight size={14} className={`row-chevron${isExpanded ? " expanded" : ""}`} />
                        </td>
                        <td style={{ fontWeight: 700, color: "#F5B61E", fontSize: "0.72rem", letterSpacing: "0.06em" }}>{m.code}</td>
                        <td style={{ fontWeight: 600, color: "#F0EDE6" }}>{m.name}</td>
                        <td className="hide-tablet" style={{ color: "rgba(240,237,230,0.5)" }}>{m.gsm}</td>
                        <td className="hide-tablet" style={{ color: "rgba(240,237,230,0.42)", fontSize: "0.72rem" }}>{formatDim(m)}</td>
                        <td style={{ color: "rgba(240,237,230,0.68)" }}>Rs. {m.costPerSheet.toFixed(2)}</td>
                        <td style={{ color: "rgba(240,237,230,0.68)" }}>Rs. {m.unitPrice.toFixed(2)}</td>
                        <td>
                          <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem", minWidth: "56px" }}>
                            <span style={{ color: lowStock ? "#F87171" : "rgba(240,237,230,0.6)", fontSize: "0.76rem", fontWeight: 600 }}>
                              {m.currentStockLevel}
                            </span>
                            <div className="stock-bar-track">
                              <div style={{ height: "100%", width: `${pct}%`, background: barColor, borderRadius: "2px", transition: "width 0.3s ease" }} />
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`status-pill ${STATUS_PILL[m.status]}`}>{m.status}</span>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={9} style={{ padding: 0 }}>
                            <MaterialExpandRow
                              material={m}
                              onFullEdit={() => { setExpandedId(null); openEdit(m.id); }}
                              onClose={() => setExpandedId(null)}
                            />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          <PaginationBar
            total={filteredTotal}
            page={page}
            size={size}
            currentParams={currentParams}
          />
        </div>
      )}

      {/* Mobile cards */}
      {materials.length > 0 && (
        <div id="materials-card-view">
          {materials.map((m) => (
            <MaterialCard key={m.id} material={m} onFullEdit={openEdit} />
          ))}
          <PaginationBar
            total={filteredTotal}
            page={page}
            size={size}
            currentParams={currentParams}
          />
        </div>
      )}

      <MaterialSlideOver open={slideOpen} onClose={closeSlide} existing={editTarget} />
    </div>
  );
}
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Smoke-test in browser**

```bash
npm run dev
```

Navigate to `http://localhost:3000/materials`. Verify:
- [ ] Stat strip shows correct global totals (total, active, pending, low-stock)
- [ ] Search input filters results; URL updates after 300ms pause; `?q=` appears in address bar
- [ ] Filter tabs update `?status=` in URL; switching tabs changes visible rows
- [ ] Pagination bar appears when total > page size; Prev/Next/page numbers work
- [ ] Size selector (20/50/100) changes rows per page and resets to page 1
- [ ] Expand row still works: stock nudge, save, status chips, Full Edit, Close
- [ ] Slide-over still opens for New and Full Edit

- [ ] **Step 5: Commit**

```bash
git add src/app/(app)/materials/page.tsx src/components/materials/MaterialsClient.tsx
git commit -m "feat: retrofit Materials list with server-side pagination and URL-driven search/filter"
```
