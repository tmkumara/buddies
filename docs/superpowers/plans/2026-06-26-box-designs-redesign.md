# Box Designs Module Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Full UX overhaul of Box Designs — slide-over new/edit (row click opens slide-over directly, no expand panel), stat strip, filter tabs including CUSTOM, server-side pagination.

**Architecture:** Two new components (`BoxDesignSlideOver`, `BoxDesignsClient`) replace the current separate-pages approach. `BoxDesignSlideOver` is a standalone slide-over with all form fields (replicates `BoxDesignForm` logic in slide-over shell). `BoxDesignsClient` renders the list with row-click → slide-over. Server page reads `searchParams`, runs parallel queries, passes paginated data. New/edit pages redirect to `/box-designs`. The old `BoxDesignForm.tsx` is no longer used and can be deleted.

**Tech Stack:** Next.js 16.2.7 App Router, React 19, TypeScript, Prisma 7 + MySQL, Lucide React 1.17, `UnitInput` and `Combobox` components (already built).

## Global Constraints

- **Depends on:** `StatChip`, `FilterTabBar`, `PaginationBar` from `2026-06-26-materials-pagination.md` plan (must be built first).
- **Next.js 16**: `searchParams` is `Promise<{...}>` — always `await`. Read `node_modules/next/dist/docs/` before writing Next.js code.
- **Prisma 7**: `db push` ONLY — never `prisma migrate`. All `Decimal` fields → `number` before Client Components (use `!= null ? Number(x) : null` for nullable Decimals).
- **No new npm packages.**
- **Design tokens**: reuse `.slide-over-backdrop`, `.slide-over-panel`, `.slide-over-panel.open`, `.slide-over-header`, `.slide-over-body`, `.slide-over-footer`, `.form-section-label`, `.form-input`, `.form-label`, `.cta-btn`, `.submit-btn`, `.status-chip-btn`, `.status-chip-btn.active-ACTIVE/.active-INACTIVE`, `.stat-strip`, `.filter-tabs`, `.filter-tab`, `.filter-tab.active`, `.content-card`, `.orders-table`, `.row-chevron`.
- **`createBoxDesign` / `updateBoxDesign`**: accept `custom: formData.get("custom") === "true"` and `active: formData.get("active") === "true"`. Use hidden inputs for both.
- **`router.refresh()`** after successful slide-over save.
- **TypeScript strict**: no `any`.

---

### Task 1: BoxDesignSlideOver

**Files:**
- Create: `src/components/box-designs/BoxDesignSlideOver.tsx`

**Interfaces:**
- Consumes: `createBoxDesign`, `updateBoxDesign` from `@/actions/box-designs`; `UnitInput` from `@/components/ui/UnitInput`; `Combobox` from `@/components/ui/Combobox`
- Produces:
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

interface SelectOption { id: number; code: string; name: string; }

interface Props {
  open: boolean;
  onClose: () => void;
  existing?: BoxDesignData;
  designTypes: SelectOption[];
  materials: SelectOption[];
}

export default function BoxDesignSlideOver(props: Props): JSX.Element
```

- [ ] **Step 1: Create `src/components/box-designs/BoxDesignSlideOver.tsx`**

```tsx
"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { createBoxDesign, updateBoxDesign } from "@/actions/box-designs";
import UnitInput from "@/components/ui/UnitInput";
import Combobox from "@/components/ui/Combobox";

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

interface SelectOption { id: number; code: string; name: string; }

interface Props {
  open: boolean;
  onClose: () => void;
  existing?: BoxDesignData;
  designTypes: SelectOption[];
  materials: SelectOption[];
}

export default function BoxDesignSlideOver({ open, onClose, existing, designTypes, materials }: Props) {
  const router = useRouter();
  const [active, setActive] = useState(existing?.active ?? true);
  const [custom, setCustom] = useState(existing?.custom ?? false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setActive(existing?.active ?? true);
    setCustom(existing?.custom ?? false);
    setError("");
  }, [open, existing?.id]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = existing
        ? await updateBoxDesign(existing.id, fd)
        : await createBoxDesign(fd);
      if (result?.error) {
        setError(result.error);
      } else {
        onClose();
        router.refresh();
      }
    });
  }

  if (!open) return null;

  const sectionLabel: React.CSSProperties = {
    fontSize: "0.62rem",
    letterSpacing: "0.1em",
    color: "rgba(240,237,230,0.35)",
    textTransform: "uppercase",
    marginBottom: "0.75rem",
    marginTop: "0.25rem",
  };

  const designTypeOptions = designTypes.map((dt) => ({
    value: dt.id,
    label: `${dt.code} — ${dt.name}`,
  }));

  const materialOptions = materials.map((m) => ({
    value: m.id,
    label: m.name,
    meta: m.code,
  }));

  return (
    <>
      <div className="slide-over-backdrop" onClick={onClose} />
      <div className="slide-over-panel open" style={{ width: "min(520px, 100vw)" }}>
        <div className="slide-over-header">
          <button
            type="button"
            onClick={onClose}
            style={{ background: "none", border: "none", color: "rgba(240,237,230,0.45)", cursor: "pointer", padding: "0.25rem" }}
          >
            <X size={16} />
          </button>
          <span style={{ fontWeight: 600, fontSize: "0.85rem", color: "#F0EDE6" }}>
            {existing ? `Edit — ${existing.code} ${existing.name}` : "New Box Design"}
          </span>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
          <div className="slide-over-body">
            {error && (
              <div style={{
                background: "rgba(248,113,113,0.08)",
                border: "1px solid rgba(248,113,113,0.25)",
                borderRadius: "0.4rem",
                padding: "0.6rem 0.9rem",
                fontSize: "0.72rem",
                color: "#F87171",
                marginBottom: "1rem",
              }}>
                {error}
              </div>
            )}

            {/* Hidden fields for boolean state */}
            <input type="hidden" name="active" value={active ? "true" : "false"} />
            <input type="hidden" name="custom" value={custom ? "true" : "false"} />

            {/* IDENTITY */}
            <p className="form-section-label" style={{ marginBottom: "0.75rem" }}>IDENTITY</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
              <div className="form-field">
                <label className="form-label">CODE *</label>
                <input name="code" type="text" className="form-input" defaultValue={existing?.code ?? ""} required />
              </div>
              <div className="form-field">
                <label className="form-label">NAME *</label>
                <input name="name" type="text" className="form-input" defaultValue={existing?.name ?? ""} required />
              </div>
            </div>
            <div style={{ marginBottom: "0.75rem" }}>
              <button
                type="button"
                className={`status-chip-btn${custom ? " active-ACTIVE" : ""}`}
                onClick={() => setCustom((v) => !v)}
                style={{ fontSize: "0.65rem" }}
              >
                {custom ? "✓ CUSTOM" : "STANDARD"}
              </button>
              <span style={{ fontSize: "0.65rem", color: "rgba(240,237,230,0.3)", marginLeft: "0.6rem" }}>
                {custom ? "Marked as custom design" : "Mark as custom design"}
              </span>
            </div>

            {/* LINKED */}
            <p className="form-section-label" style={{ marginBottom: "0.75rem" }}>LINKED</p>
            <div style={{ marginBottom: "0.75rem" }}>
              <label className="form-label">DESIGN TYPE *</label>
              <Combobox
                name="designTypeId"
                placeholder="— Select Design Type —"
                defaultValue={existing?.designTypeId}
                required
                options={designTypeOptions}
              />
            </div>
            <div style={{ marginBottom: "0.75rem" }}>
              <label className="form-label">MATERIAL *</label>
              <Combobox
                name="materialId"
                placeholder="— Select Material —"
                defaultValue={existing?.materialId}
                required
                options={materialOptions}
              />
            </div>

            {/* BOX DIMENSIONS */}
            <p className="form-section-label" style={{ marginBottom: "0.75rem" }}>BOX DIMENSIONS</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
              <UnitInput labelPrefix="LENGTH" nameCm="lengthCm" nameIn="lengthIn"
                defaultValueCm={existing?.lengthCm} defaultValueIn={existing?.lengthIn} required />
              <UnitInput labelPrefix="WIDTH"  nameCm="widthCm"  nameIn="widthIn"
                defaultValueCm={existing?.widthCm}  defaultValueIn={existing?.widthIn}  required />
              <UnitInput labelPrefix="HEIGHT" nameCm="heightCm" nameIn="heightIn"
                defaultValueCm={existing?.heightCm} defaultValueIn={existing?.heightIn} required />
            </div>

            {/* CUT SHEET */}
            <p className="form-section-label" style={{ marginBottom: "0.75rem" }}>CUT SHEET</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
              <UnitInput labelPrefix="CUT LENGTH" nameCm="cutLengthCm" nameIn="cutLengthIn"
                defaultValueCm={existing?.cutLengthCm} defaultValueIn={existing?.cutLengthIn} required />
              <UnitInput labelPrefix="CUT WIDTH"  nameCm="cutWidthCm"  nameIn="cutWidthIn"
                defaultValueCm={existing?.cutWidthCm}  defaultValueIn={existing?.cutWidthIn}  required />
            </div>

            {/* PRICING */}
            <p className="form-section-label" style={{ marginBottom: "0.75rem" }}>PRICING</p>
            <div className="form-field" style={{ marginBottom: "0.75rem" }}>
              <label className="form-label">UNIT PRICE *</label>
              <div className="price-input-wrapper">
                <span className="price-prefix">Rs.</span>
                <input
                  name="unitPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  className="form-input"
                  defaultValue={existing?.unitPrice ?? ""}
                  required
                  style={{ paddingLeft: "2.8rem" }}
                />
              </div>
            </div>

            {/* STATUS */}
            <p className="form-section-label" style={{ marginBottom: "0.6rem" }}>STATUS</p>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button type="button" className={`status-chip-btn${active ? " active-ACTIVE" : ""}`} onClick={() => setActive(true)}>ACTIVE</button>
              <button type="button" className={`status-chip-btn${!active ? " active-INACTIVE" : ""}`} onClick={() => setActive(false)}>INACTIVE</button>
            </div>
          </div>

          <div className="slide-over-footer">
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "0.6rem 1.25rem",
                background: "none",
                border: "1px solid rgba(245,182,30,0.18)",
                borderRadius: "0.5rem",
                color: "rgba(240,237,230,0.45)",
                fontSize: "0.72rem",
                letterSpacing: "0.08em",
                cursor: "pointer",
                fontFamily: "var(--font-jakarta, 'Plus Jakarta Sans', sans-serif)",
              }}
            >
              CANCEL
            </button>
            <button type="submit" className="submit-btn" disabled={pending} style={{ flex: 1 }}>
              {pending ? "SAVING…" : "SAVE DESIGN"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/box-designs/BoxDesignSlideOver.tsx
git commit -m "feat: add BoxDesignSlideOver component with all dimension and pricing fields"
```

---

### Task 2: BoxDesignsClient + Page Overhaul + Redirects

**Files:**
- Create: `src/components/box-designs/BoxDesignsClient.tsx`
- Modify: `src/app/(app)/box-designs/page.tsx`
- Modify: `src/app/(app)/box-designs/new/page.tsx`
- Modify: `src/app/(app)/box-designs/[id]/edit/page.tsx`

**Interfaces:**
- Consumes: `BoxDesignSlideOver`, `BoxDesignData` from `./BoxDesignSlideOver` (Task 1); `StatChip`, `FilterTabBar`, `PaginationBar` from `@/components/ui/`

- [ ] **Step 1: Create `src/components/box-designs/BoxDesignsClient.tsx`**

```tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";
import StatChip from "@/components/ui/StatChip";
import FilterTabBar from "@/components/ui/FilterTabBar";
import PaginationBar from "@/components/ui/PaginationBar";
import BoxDesignSlideOver, { BoxDesignData } from "./BoxDesignSlideOver";

export interface BoxDesignRow {
  id: number;
  code: string;
  name: string;
  designTypeName: string;
  materialCode: string;
  lengthCm: number | null; widthCm: number | null; heightCm: number | null;
  lengthIn: number | null; widthIn: number | null; heightIn: number | null;
  cutLengthCm: number | null; cutWidthCm: number | null;
  cutLengthIn: number | null; cutWidthIn: number | null;
  unitPrice: number;
  custom: boolean;
  active: boolean;
  // for slide-over
  designTypeId: number;
  materialId: number;
}

interface SelectOption { id: number; code: string; name: string; }

interface StatTotals { total: number; active: number; inactive: number; custom: number; }

interface Props {
  designs: BoxDesignRow[];
  filteredTotal: number;
  page: number;
  size: number;
  currentQ: string;
  currentStatus: string;
  statTotals: StatTotals;
  designTypes: SelectOption[];
  materials: SelectOption[];
}

const TABS = ["ALL", "ACTIVE", "INACTIVE", "CUSTOM"];

export default function BoxDesignsClient({
  designs,
  filteredTotal,
  page,
  size,
  currentQ,
  currentStatus,
  statTotals,
  designTypes,
  materials,
}: Props) {
  const router = useRouter();
  const [searchValue, setSearchValue] = useState(currentQ);
  const [slideOpen, setSlideOpen]   = useState(false);
  const [editTarget, setEditTarget] = useState<BoxDesignData | undefined>(undefined);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    const timer = setTimeout(() => {
      const params = new URLSearchParams();
      if (searchValue) params.set("q", searchValue);
      if (currentStatus && currentStatus !== "ALL") params.set("status", currentStatus);
      params.set("size", String(size));
      router.replace(`?${params.toString()}`);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchValue]);

  const currentParams: Record<string, string> = {};
  if (searchValue) currentParams.q = searchValue;
  if (currentStatus && currentStatus !== "ALL") currentParams.status = currentStatus;
  currentParams.size = String(size);

  function openNew() { setEditTarget(undefined); setSlideOpen(true); }
  function openEdit(design: BoxDesignRow) {
    setEditTarget({
      id: design.id, code: design.code, name: design.name,
      designTypeId: design.designTypeId, materialId: design.materialId,
      custom: design.custom, active: design.active, unitPrice: design.unitPrice,
      lengthCm: design.lengthCm, widthCm: design.widthCm, heightCm: design.heightCm,
      lengthIn: design.lengthIn, widthIn: design.widthIn, heightIn: design.heightIn,
      cutLengthCm: design.cutLengthCm, cutWidthCm: design.cutWidthCm,
      cutLengthIn: design.cutLengthIn, cutWidthIn: design.cutWidthIn,
    });
    setSlideOpen(true);
  }
  function closeSlide() { setSlideOpen(false); setEditTarget(undefined); }

  function formatDims(d: BoxDesignRow) {
    if (d.lengthIn != null && d.widthIn != null && d.heightIn != null)
      return `${d.lengthIn}×${d.widthIn}×${d.heightIn}in`;
    if (d.lengthCm != null && d.widthCm != null && d.heightCm != null)
      return `${d.lengthCm}×${d.widthCm}×${d.heightCm}cm`;
    return "—";
  }

  return (
    <div style={{ padding: "1.25rem 1.75rem" }}>
      {/* Stat strip */}
      <div className="stat-strip" style={{ marginBottom: "1rem" }}>
        <StatChip label="TOTAL"    value={statTotals.total} />
        <StatChip label="ACTIVE"   value={statTotals.active}   color="#4ADE80" />
        <StatChip label="INACTIVE" value={statTotals.inactive} color="#F87171" />
        <StatChip label="CUSTOM"   value={statTotals.custom}   color="#F5B61E" />
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
        <FilterTabBar tabs={TABS} activeTab={currentStatus || "ALL"} currentParams={currentParams} />
        <button
          type="button"
          className="cta-btn"
          onClick={openNew}
          style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.68rem", padding: "0.48rem 1rem", marginLeft: "auto" }}
        >
          <Plus size={12} /> New Design
        </button>
      </div>

      {designs.length === 0 && (
        <div className="content-card" style={{ padding: "3rem 0", textAlign: "center", fontSize: "0.8rem", color: "rgba(240,237,230,0.22)" }}>
          {searchValue || currentStatus !== "ALL" ? "No designs match your filter." : "No box designs yet."}
        </div>
      )}

      {designs.length > 0 && (
        <>
          <div className="content-card" style={{ padding: 0, overflow: "hidden" }}>
            <table className="orders-table">
              <thead>
                <tr>
                  <th>CODE</th>
                  <th>NAME</th>
                  <th className="hide-tablet">TYPE</th>
                  <th className="hide-tablet">MATERIAL</th>
                  <th>DIMS</th>
                  <th>PRICE</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {designs.map((d) => (
                  <tr
                    key={d.id}
                    style={{
                      cursor: "pointer",
                      opacity: d.active ? 1 : 0.6,
                      borderLeft: "2px solid transparent",
                    }}
                    onClick={() => openEdit(d)}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderLeftColor = "rgba(245,182,30,0.25)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderLeftColor = "transparent"; }}
                  >
                    <td style={{ fontWeight: 700, color: "#F5B61E", fontSize: "0.72rem", letterSpacing: "0.06em" }}>{d.code}</td>
                    <td style={{ fontWeight: 600, color: "#F0EDE6" }}>
                      {d.name}
                      {d.custom && (
                        <span style={{ marginLeft: "0.4rem", fontSize: "0.58rem", color: "#F5B61E", border: "1px solid rgba(245,182,30,0.3)", borderRadius: "0.25rem", padding: "0 0.3rem", verticalAlign: "middle" }}>
                          CUSTOM
                        </span>
                      )}
                    </td>
                    <td className="hide-tablet" style={{ color: "rgba(240,237,230,0.5)" }}>{d.designTypeName}</td>
                    <td className="hide-tablet" style={{ color: "rgba(240,237,230,0.42)", fontSize: "0.72rem" }}>{d.materialCode}</td>
                    <td style={{ color: "rgba(240,237,230,0.55)", fontSize: "0.72rem" }}>{formatDims(d)}</td>
                    <td style={{ color: "rgba(240,237,230,0.68)" }}>Rs. {d.unitPrice.toFixed(2)}</td>
                    <td>
                      <span className={`status-pill ${d.active ? "status-fulfilled" : "status-cancelled"}`}>
                        {d.active ? "ACTIVE" : "INACTIVE"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PaginationBar total={filteredTotal} page={page} size={size} currentParams={currentParams} />
        </>
      )}

      <BoxDesignSlideOver
        open={slideOpen}
        onClose={closeSlide}
        existing={editTarget}
        designTypes={designTypes}
        materials={materials}
      />
    </div>
  );
}
```

- [ ] **Step 2: Rewrite `src/app/(app)/box-designs/page.tsx`**

```tsx
import { requireAuth } from "@/lib/auth-guards";
import prisma from "@/lib/prisma";
import TopBar from "@/components/layout/TopBar";
import BoxDesignsClient from "@/components/box-designs/BoxDesignsClient";

export default async function BoxDesignsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string; size?: string }>;
}) {
  await requireAuth();
  const { q, status, page: pageParam, size: sizeParam } = await searchParams;

  const VALID_SIZES = [20, 50, 100];
  const size = VALID_SIZES.includes(parseInt(sizeParam ?? "")) ? parseInt(sizeParam!) : 20;
  const page = Math.max(1, parseInt(pageParam ?? "1") || 1);
  const skip = (page - 1) * size;

  const where =
    status === "ACTIVE"   ? { active: true,  ...(q ? { OR: [{ code: { contains: q } }, { name: { contains: q } }] } : {}) } :
    status === "INACTIVE" ? { active: false, ...(q ? { OR: [{ code: { contains: q } }, { name: { contains: q } }] } : {}) } :
    status === "CUSTOM"   ? { custom: true,  ...(q ? { OR: [{ code: { contains: q } }, { name: { contains: q } }] } : {}) } :
    q ? { OR: [{ code: { contains: q } }, { name: { contains: q } }] } : {};

  const [raw, filteredTotal, totalAll, totalActive, totalInactive, totalCustom, designTypes, materials] =
    await Promise.all([
      prisma.boxDesign.findMany({
        where,
        skip,
        take: size,
        include: { designType: { select: { name: true } }, material: { select: { code: true } } },
        orderBy: { code: "asc" },
      }),
      prisma.boxDesign.count({ where }),
      prisma.boxDesign.count(),
      prisma.boxDesign.count({ where: { active: true } }),
      prisma.boxDesign.count({ where: { active: false } }),
      prisma.boxDesign.count({ where: { custom: true } }),
      prisma.designType.findMany({ where: { active: true }, select: { id: true, code: true, name: true }, orderBy: { code: "asc" } }),
      prisma.material.findMany({ where: { status: "ACTIVE" }, select: { id: true, code: true, name: true }, orderBy: { code: "asc" } }),
    ]);

  const designs = raw.map((d) => ({
    id:             d.id,
    code:           d.code,
    name:           d.name,
    designTypeId:   d.designTypeId,
    designTypeName: d.designType.name,
    materialId:     d.materialId,
    materialCode:   d.material.code,
    lengthCm:    d.lengthCm    != null ? Number(d.lengthCm)    : null,
    widthCm:     d.widthCm     != null ? Number(d.widthCm)     : null,
    heightCm:    d.heightCm    != null ? Number(d.heightCm)    : null,
    lengthIn:    d.lengthIn    != null ? Number(d.lengthIn)    : null,
    widthIn:     d.widthIn     != null ? Number(d.widthIn)     : null,
    heightIn:    d.heightIn    != null ? Number(d.heightIn)    : null,
    cutLengthCm: d.cutLengthCm != null ? Number(d.cutLengthCm) : null,
    cutWidthCm:  d.cutWidthCm  != null ? Number(d.cutWidthCm)  : null,
    cutLengthIn: d.cutLengthIn != null ? Number(d.cutLengthIn) : null,
    cutWidthIn:  d.cutWidthIn  != null ? Number(d.cutWidthIn)  : null,
    unitPrice:   Number(d.unitPrice),
    custom:      d.custom,
    active:      d.active,
  }));

  return (
    <>
      <TopBar title="Box Designs" />
      <BoxDesignsClient
        designs={designs}
        filteredTotal={filteredTotal}
        page={page}
        size={size}
        currentQ={q ?? ""}
        currentStatus={status && ["ACTIVE", "INACTIVE", "CUSTOM"].includes(status) ? status : "ALL"}
        statTotals={{ total: totalAll, active: totalActive, inactive: totalInactive, custom: totalCustom }}
        designTypes={designTypes}
        materials={materials}
      />
    </>
  );
}
```

- [ ] **Step 3: Redirect new/edit pages**

Replace `src/app/(app)/box-designs/new/page.tsx`:
```tsx
import { redirect } from "next/navigation";
export default function NewBoxDesignPage() {
  redirect("/box-designs");
}
```

Replace `src/app/(app)/box-designs/[id]/edit/page.tsx`:
```tsx
import { redirect } from "next/navigation";
export default function EditBoxDesignPage() {
  redirect("/box-designs");
}
```

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Smoke-test in browser**

```bash
npm run dev
```

Navigate to `http://localhost:3000/box-designs`. Verify:
- [ ] Stat strip: TOTAL, ACTIVE, INACTIVE, CUSTOM counts correct
- [ ] Search filters by code/name; URL updates with `?q=`
- [ ] Filter tabs ALL/ACTIVE/INACTIVE/CUSTOM work correctly
- [ ] CUSTOM tab shows designs where `custom = true` regardless of active
- [ ] Pagination bar works; size selector works
- [ ] Clicking any row opens the slide-over pre-populated with that design's data
- [ ] Editing fields and saving updates the design; slide-over closes; list refreshes
- [ ] CUSTOM toggle chip works in slide-over
- [ ] STATUS chips (ACTIVE/INACTIVE) work in slide-over
- [ ] UnitInput toggles (in/cm) work for all 5 dimension pairs
- [ ] "New Design" opens empty slide-over; saving creates new design
- [ ] Navigate to `/box-designs/new` → redirects to `/box-designs`
- [ ] Navigate to `/box-designs/1/edit` → redirects to `/box-designs`

- [ ] **Step 6: Commit**

```bash
git add src/components/box-designs/BoxDesignsClient.tsx src/app/(app)/box-designs/page.tsx "src/app/(app)/box-designs/new/page.tsx" "src/app/(app)/box-designs/[id]/edit/page.tsx"
git commit -m "feat: overhaul Box Designs module with row-click slide-over, stat strip, CUSTOM filter, and pagination"
```
