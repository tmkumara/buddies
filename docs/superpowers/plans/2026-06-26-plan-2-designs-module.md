# Plan 2: Designs Module (Unified Box Types + Box Designs)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the separate `/design-types` and `/box-designs` pages with a single `/designs` module showing Box Types as collapsible groups with Box Designs nested underneath, deep search, and a price calculator helper on the Box Design slide-over.

**Architecture:** Server-rendered list page with client slide-overs. Box Types are collapsible groups (client component). Deep search filters both type and design levels simultaneously. Price calculator in the slide-over is a client-side computation using `src/lib/utils/pricing.ts` (Plan 1). Old routes (`/design-types`, `/box-designs`) redirect to `/designs`.

**Tech Stack:** Next.js 16 App Router, Prisma 7, lucide-react, existing slide-over pattern

## Global Constraints

- Next.js 16 App Router — `searchParams` is a Promise, must be awaited
- Prisma Decimal fields → `Number()` before passing to Client Components
- Server Actions return `{ error: string }` or `{ success: true }`
- Sidebar has "Designs" replacing "Box Designs" and "Design Types"
- `calculateBoxesPerSheet`, `calculateMaterialCostPerBox`, `calculateSuggestedUnitPrice` from `src/lib/utils/pricing.ts` (Plan 1)
- **Prerequisite: Plan 1 must be complete**

---

### Task 1: Create new design actions (replaces design-type and box-design actions)

**Files:**
- Create: `src/actions/designs.ts`
- Keep existing: `src/actions/design-types.ts`, `src/actions/box-designs.ts` (for backward compat, but new code uses `designs.ts`)

**Interfaces:**
- Produces:
  - `createBoxType(formData: FormData): Promise<{ success: true; data: BoxTypeRow } | { error: string }>`
  - `updateBoxType(id: number, formData: FormData): Promise<{ success: true } | { error: string }>`
  - `createBoxDesign(formData: FormData): Promise<{ success: true; data: BoxDesignRow } | { error: string }>`
  - `updateBoxDesign(id: number, formData: FormData): Promise<{ success: true } | { error: string }>`
  - `type BoxTypeRow = { id, code, name, description, imageUrl, active }`
  - `type BoxDesignRow = { id, code, name, boxTypeId, materialId, unitPrice, ... }`

- [ ] **Step 1: Create `src/actions/designs.ts`**

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth-guards";
import prisma from "@/lib/prisma";
import { z } from "zod";

const boxTypeSchema = z.object({
  code:        z.string().min(1).max(50),
  name:        z.string().min(1).max(100),
  description: z.string().max(255).optional(),
  active:      z.boolean().default(true),
});

const optDim = z.coerce.number().positive().optional().nullable();

const boxDesignSchema = z.object({
  code:        z.string().min(1).max(50),
  name:        z.string().min(1).max(150),
  boxTypeId:   z.coerce.number().int().positive("Box type required"),
  materialId:  z.coerce.number().int().positive("Material required"),
  lengthIn:    optDim,
  widthIn:     optDim,
  heightIn:    optDim,
  cutLengthIn: optDim,
  cutWidthIn:  optDim,
  lengthCm:    optDim,
  widthCm:     optDim,
  heightCm:    optDim,
  cutLengthCm: optDim,
  cutWidthCm:  optDim,
  unitPrice:   z.coerce.number().nonnegative("Unit price required"),
  custom:      z.boolean().default(false),
  active:      z.boolean().default(true),
});

export async function createBoxType(formData: FormData) {
  await requireAuth();

  const parsed = boxTypeSchema.safeParse({
    code:        formData.get("code"),
    name:        formData.get("name"),
    description: (formData.get("description") as string) || undefined,
    active:      formData.get("active") !== "false",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Validation error" };

  try {
    const bt = await prisma.designType.create({
      data: parsed.data,
      select: { id: true, code: true, name: true, description: true, imageUrl: true, active: true },
    });
    revalidatePath("/designs");
    return { success: true as const, data: bt };
  } catch (e: unknown) {
    if ((e as { code?: string }).code === "P2002") return { error: "A box type with this code already exists." };
    throw e;
  }
}

export async function updateBoxType(id: number, formData: FormData) {
  await requireAuth();

  const parsed = boxTypeSchema.safeParse({
    code:        formData.get("code"),
    name:        formData.get("name"),
    description: (formData.get("description") as string) || undefined,
    active:      formData.get("active") !== "false",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Validation error" };

  try {
    await prisma.designType.update({ where: { id }, data: parsed.data });
    revalidatePath("/designs");
    return { success: true as const };
  } catch (e: unknown) {
    if ((e as { code?: string }).code === "P2002") return { error: "A box type with this code already exists." };
    throw e;
  }
}

export async function createBoxDesign(formData: FormData) {
  await requireAuth();

  const raw = {
    code:        formData.get("code") as string,
    name:        formData.get("name") as string,
    boxTypeId:   formData.get("boxTypeId"),
    materialId:  formData.get("materialId"),
    lengthIn:    formData.get("lengthIn")    || undefined,
    widthIn:     formData.get("widthIn")     || undefined,
    heightIn:    formData.get("heightIn")    || undefined,
    cutLengthIn: formData.get("cutLengthIn") || undefined,
    cutWidthIn:  formData.get("cutWidthIn")  || undefined,
    lengthCm:    formData.get("lengthCm")    || undefined,
    widthCm:     formData.get("widthCm")     || undefined,
    heightCm:    formData.get("heightCm")    || undefined,
    cutLengthCm: formData.get("cutLengthCm") || undefined,
    cutWidthCm:  formData.get("cutWidthCm")  || undefined,
    unitPrice:   formData.get("unitPrice"),
    custom:      formData.get("custom") === "true",
    active:      formData.get("active") !== "false",
  };

  const parsed = boxDesignSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Validation error" };

  const { boxTypeId, ...rest } = parsed.data;

  try {
    const bd = await prisma.boxDesign.create({
      data: {
        ...rest,
        designTypeId: boxTypeId,
        rawAreaSqCm: rest.cutLengthCm && rest.cutWidthCm
          ? rest.cutLengthCm * rest.cutWidthCm
          : null,
      },
      select: {
        id: true, code: true, name: true, unitPrice: true,
        designType: { select: { id: true, name: true } },
        material:   { select: { id: true, name: true } },
      },
    });
    revalidatePath("/designs");
    return {
      success: true as const,
      data: {
        id:          bd.id,
        code:        bd.code,
        name:        bd.name,
        unitPrice:   Number(bd.unitPrice),
        boxTypeId:   bd.designType.id,
        boxTypeName: bd.designType.name,
        materialId:  bd.material.id,
        materialName: bd.material.name,
      },
    };
  } catch (e: unknown) {
    if ((e as { code?: string }).code === "P2002") return { error: "A box design with this code already exists." };
    throw e;
  }
}

export async function updateBoxDesign(id: number, formData: FormData) {
  await requireAuth();

  const raw = {
    code:        formData.get("code") as string,
    name:        formData.get("name") as string,
    boxTypeId:   formData.get("boxTypeId"),
    materialId:  formData.get("materialId"),
    lengthIn:    formData.get("lengthIn")    || undefined,
    widthIn:     formData.get("widthIn")     || undefined,
    heightIn:    formData.get("heightIn")    || undefined,
    cutLengthIn: formData.get("cutLengthIn") || undefined,
    cutWidthIn:  formData.get("cutWidthIn")  || undefined,
    lengthCm:    formData.get("lengthCm")    || undefined,
    widthCm:     formData.get("widthCm")     || undefined,
    heightCm:    formData.get("heightCm")    || undefined,
    cutLengthCm: formData.get("cutLengthCm") || undefined,
    cutWidthCm:  formData.get("cutWidthCm")  || undefined,
    unitPrice:   formData.get("unitPrice"),
    custom:      formData.get("custom") === "true",
    active:      formData.get("active") !== "false",
  };

  const parsed = boxDesignSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Validation error" };

  const { boxTypeId, ...rest } = parsed.data;

  try {
    await prisma.boxDesign.update({
      where: { id },
      data: {
        ...rest,
        designTypeId: boxTypeId,
        rawAreaSqCm: rest.cutLengthCm && rest.cutWidthCm
          ? rest.cutLengthCm * rest.cutWidthCm
          : null,
      },
    });
    revalidatePath("/designs");
    return { success: true as const };
  } catch (e: unknown) {
    if ((e as { code?: string }).code === "P2002") return { error: "A box design with this code already exists." };
    throw e;
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/actions/designs.ts
git commit -m "feat: box type and box design server actions for unified designs module"
```

---

### Task 2: Designs page — server component with grouped data

**Files:**
- Create: `src/app/(app)/designs/page.tsx`
- Create: `src/app/(app)/designs/DesignsClient.tsx`

**Interfaces:**
- Consumes: Prisma `designType` with nested `boxDesigns` including material name
- Produces: grouped list rendered by `DesignsClient`

- [ ] **Step 1: Create `src/app/(app)/designs/page.tsx`**

```typescript
import { requireAuth } from "@/lib/auth-guards";
import prisma from "@/lib/prisma";
import TopBar from "@/components/layout/TopBar";
import DesignsClient from "./DesignsClient";

export default async function DesignsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireAuth();
  const { q } = await searchParams;

  const boxTypes = await prisma.designType.findMany({
    orderBy: { code: "asc" },
    include: {
      boxDesigns: {
        orderBy: { code: "asc" },
        include: { material: { select: { id: true, code: true, name: true } } },
      },
    },
  });

  // Serialize decimals
  const serialized = boxTypes.map((bt) => ({
    ...bt,
    boxDesigns: bt.boxDesigns.map((bd) => ({
      ...bd,
      unitPrice:   Number(bd.unitPrice),
      lengthIn:    bd.lengthIn    ? Number(bd.lengthIn)    : null,
      widthIn:     bd.widthIn     ? Number(bd.widthIn)     : null,
      heightIn:    bd.heightIn    ? Number(bd.heightIn)    : null,
      cutLengthIn: bd.cutLengthIn ? Number(bd.cutLengthIn) : null,
      cutWidthIn:  bd.cutWidthIn  ? Number(bd.cutWidthIn)  : null,
      lengthCm:    bd.lengthCm    ? Number(bd.lengthCm)    : null,
      widthCm:     bd.widthCm     ? Number(bd.widthCm)     : null,
      heightCm:    bd.heightCm    ? Number(bd.heightCm)    : null,
      cutLengthCm: bd.cutLengthCm ? Number(bd.cutLengthCm) : null,
      cutWidthCm:  bd.cutWidthCm  ? Number(bd.cutWidthCm)  : null,
      rawAreaSqCm: bd.rawAreaSqCm ? Number(bd.rawAreaSqCm) : null,
    })),
  }));

  // Fetch materials for slide-over dropdowns
  const materials = await prisma.material.findMany({
    where:   { status: { not: "INACTIVE" } },
    orderBy: { code: "asc" },
    select:  {
      id: true, code: true, name: true, status: true,
      unitPrice: true, costPerSheet: true,
      sheetLengthIn: true, sheetWidthIn: true,
      sheetLengthCm: true, sheetWidthCm: true,
    },
  });

  const serializedMaterials = materials.map((m) => ({
    ...m,
    unitPrice:     Number(m.unitPrice),
    costPerSheet:  Number(m.costPerSheet),
    sheetLengthIn: m.sheetLengthIn ? Number(m.sheetLengthIn) : null,
    sheetWidthIn:  m.sheetWidthIn  ? Number(m.sheetWidthIn)  : null,
    sheetLengthCm: m.sheetLengthCm ? Number(m.sheetLengthCm) : null,
    sheetWidthCm:  m.sheetWidthCm  ? Number(m.sheetWidthCm)  : null,
  }));

  return (
    <>
      <TopBar title="Designs" />
      <DesignsClient
        boxTypes={serialized}
        materials={serializedMaterials}
        initialSearch={q ?? ""}
      />
    </>
  );
}
```

- [ ] **Step 2: Create `src/app/(app)/designs/DesignsClient.tsx`**

This is a large client component. Create `src/app/(app)/designs/DesignsClient.tsx`:

```typescript
"use client";

import { useState, useMemo } from "react";
import { ChevronDown, ChevronRight, Plus, Edit2 } from "lucide-react";
import BoxTypeSlideOver from "./BoxTypeSlideOver";
import BoxDesignSlideOver from "./BoxDesignSlideOver";

export interface MaterialOption {
  id: number; code: string; name: string; status: string;
  unitPrice: number; costPerSheet: number;
  sheetLengthIn: number | null; sheetWidthIn: number | null;
  sheetLengthCm: number | null; sheetWidthCm: number | null;
}

export interface BoxDesignData {
  id: number; code: string; name: string; active: boolean; custom: boolean;
  unitPrice: number;
  lengthIn: number | null; widthIn: number | null; heightIn: number | null;
  cutLengthIn: number | null; cutWidthIn: number | null;
  lengthCm: number | null; widthCm: number | null; heightCm: number | null;
  cutLengthCm: number | null; cutWidthCm: number | null;
  rawAreaSqCm: number | null;
  material: { id: number; code: string; name: string };
}

export interface BoxTypeData {
  id: number; code: string; name: string;
  description: string | null; imageUrl: string | null; active: boolean;
  boxDesigns: BoxDesignData[];
}

interface Props {
  boxTypes:      BoxTypeData[];
  materials:     MaterialOption[];
  initialSearch: string;
}

export default function DesignsClient({ boxTypes, materials, initialSearch }: Props) {
  const [search,        setSearch]        = useState(initialSearch);
  const [expanded,      setExpanded]      = useState<Set<number>>(new Set(boxTypes.map((bt) => bt.id)));
  const [editingType,   setEditingType]   = useState<BoxTypeData | null>(null);
  const [creatingType,  setCreatingType]  = useState(false);
  const [editingDesign, setEditingDesign] = useState<BoxDesignData | null>(null);
  const [addingToType,  setAddingToType]  = useState<BoxTypeData | null>(null);

  const q = search.toLowerCase().trim();

  const filtered = useMemo(() => {
    if (!q) return boxTypes;
    return boxTypes
      .map((bt) => {
        const typeMatch =
          bt.code.toLowerCase().includes(q) ||
          bt.name.toLowerCase().includes(q);
        const matchingDesigns = bt.boxDesigns.filter(
          (bd) =>
            bd.code.toLowerCase().includes(q) ||
            bd.name.toLowerCase().includes(q) ||
            bd.material.name.toLowerCase().includes(q) ||
            bd.material.code.toLowerCase().includes(q),
        );
        if (typeMatch) return bt;
        if (matchingDesigns.length > 0) return { ...bt, boxDesigns: matchingDesigns };
        return null;
      })
      .filter(Boolean) as BoxTypeData[];
  }, [boxTypes, q]);

  function toggleExpand(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <div style={{ padding: "1.5rem 1.75rem" }}>
      {/* Header row */}
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.25rem", alignItems: "center" }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search box types, designs, materials…"
          style={{
            flex: 1, background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(245,182,30,0.14)", borderRadius: "0.5rem",
            padding: "0.55rem 0.9rem", color: "#F0EDE6", fontSize: "0.8rem", outline: "none",
          }}
        />
        <button
          onClick={() => setCreatingType(true)}
          className="cta-btn"
          style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.72rem", whiteSpace: "nowrap" }}
        >
          <Plus size={14} /> New Box Type
        </button>
      </div>

      {/* Grouped list */}
      <div className="content-card" style={{ overflow: "clip" }}>
        {filtered.length === 0 && (
          <div style={{ padding: "3rem", textAlign: "center", fontSize: "0.8rem", color: "rgba(240,237,230,0.25)" }}>
            {q ? "No designs match your search." : "No box types yet."}
          </div>
        )}

        {filtered.map((bt, btIdx) => (
          <div key={bt.id} style={{ borderBottom: btIdx < filtered.length - 1 ? "1px solid rgba(245,182,30,0.07)" : "none" }}>
            {/* Box Type header row */}
            <div
              style={{
                display: "flex", alignItems: "center", gap: "0.75rem",
                padding: "0.85rem 1rem", cursor: "pointer",
                background: "rgba(245,182,30,0.02)",
              }}
              onClick={() => toggleExpand(bt.id)}
            >
              {expanded.has(bt.id)
                ? <ChevronDown size={14} color="rgba(245,182,30,0.5)" />
                : <ChevronRight size={14} color="rgba(245,182,30,0.5)" />
              }
              <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#F5B61E", letterSpacing: "0.06em" }}>
                {bt.name}
              </span>
              <span style={{ fontSize: "0.62rem", color: "rgba(240,237,230,0.3)", letterSpacing: "0.06em" }}>
                {bt.code}
              </span>
              {!bt.active && (
                <span style={{ fontSize: "0.55rem", color: "#F87171", background: "rgba(248,113,113,0.1)", padding: "0.1rem 0.4rem", borderRadius: "0.25rem", border: "1px solid rgba(248,113,113,0.25)" }}>
                  INACTIVE
                </span>
              )}
              <span style={{ fontSize: "0.62rem", color: "rgba(240,237,230,0.25)", marginLeft: "auto" }}>
                {bt.boxDesigns.length} variant{bt.boxDesigns.length !== 1 ? "s" : ""}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); setEditingType(bt); }}
                style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(240,237,230,0.3)", padding: "0.2rem 0.4rem" }}
                title="Edit box type"
              >
                <Edit2 size={13} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setAddingToType(bt); }}
                style={{
                  background: "rgba(245,182,30,0.08)", border: "1px solid rgba(245,182,30,0.2)",
                  borderRadius: "0.35rem", padding: "0.2rem 0.6rem",
                  fontSize: "0.6rem", color: "#F5B61E", cursor: "pointer", letterSpacing: "0.06em",
                }}
              >
                + Variant
              </button>
            </div>

            {/* Box Design rows */}
            {expanded.has(bt.id) && bt.boxDesigns.map((bd) => (
              <div
                key={bd.id}
                style={{
                  display: "flex", alignItems: "center", gap: "1rem",
                  padding: "0.6rem 1rem 0.6rem 2.75rem",
                  borderTop: "1px solid rgba(245,182,30,0.04)",
                  background: bd.active ? "transparent" : "rgba(248,113,113,0.02)",
                }}
              >
                <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#F5B61E", minWidth: "80px", letterSpacing: "0.05em" }}>
                  {bd.code}
                </span>
                <span style={{ fontSize: "0.78rem", color: "#F0EDE6", flex: 1 }}>{bd.name}</span>
                <span style={{ fontSize: "0.68rem", color: "rgba(240,237,230,0.4)", minWidth: "140px" }}>
                  {bd.material.code} · {bd.material.name}
                </span>
                {(bd.lengthIn || bd.lengthCm) && (
                  <span style={{ fontSize: "0.68rem", color: "rgba(240,237,230,0.35)", minWidth: "100px" }}>
                    {bd.lengthIn && bd.widthIn && bd.heightIn
                      ? `${bd.lengthIn}×${bd.widthIn}×${bd.heightIn} in`
                      : `${bd.lengthCm}×${bd.widthCm}×${bd.heightCm} cm`}
                  </span>
                )}
                <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#F0EDE6", minWidth: "70px", textAlign: "right" }}>
                  Rs. {bd.unitPrice.toFixed(2)}
                </span>
                {bd.custom && (
                  <span style={{ fontSize: "0.55rem", color: "#A78BFA", background: "rgba(167,139,250,0.1)", padding: "0.1rem 0.4rem", borderRadius: "0.25rem", border: "1px solid rgba(167,139,250,0.25)" }}>
                    CUSTOM
                  </span>
                )}
                {!bd.active && (
                  <span style={{ fontSize: "0.55rem", color: "#F87171", background: "rgba(248,113,113,0.1)", padding: "0.1rem 0.4rem", borderRadius: "0.25rem", border: "1px solid rgba(248,113,113,0.25)" }}>
                    INACTIVE
                  </span>
                )}
                <button
                  onClick={() => setEditingDesign(bd)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(240,237,230,0.3)", padding: "0.2rem 0.4rem" }}
                  title="Edit design"
                >
                  <Edit2 size={12} />
                </button>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Slide-overs */}
      <BoxTypeSlideOver
        isOpen={creatingType || editingType !== null}
        existing={editingType}
        onClose={() => { setCreatingType(false); setEditingType(null); }}
      />
      <BoxDesignSlideOver
        isOpen={editingDesign !== null || addingToType !== null}
        existing={editingDesign}
        defaultBoxType={addingToType}
        boxTypes={boxTypes}
        materials={materials}
        onClose={() => { setEditingDesign(null); setAddingToType(null); }}
      />
    </div>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/app/(app)/designs/
git commit -m "feat: designs page — server component with grouped box types and client list"
```

---

### Task 3: BoxTypeSlideOver component

**Files:**
- Create: `src/app/(app)/designs/BoxTypeSlideOver.tsx`

**Interfaces:**
- Consumes: `BoxTypeData` from `DesignsClient`
- Produces: calls `createBoxType` / `updateBoxType` from `src/actions/designs.ts`

- [ ] **Step 1: Create BoxTypeSlideOver**

Create `src/app/(app)/designs/BoxTypeSlideOver.tsx`:

```typescript
"use client";

import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { createBoxType, updateBoxType } from "@/actions/designs";
import type { BoxTypeData } from "./DesignsClient";

interface Props {
  isOpen:   boolean;
  existing: BoxTypeData | null;
  onClose:  () => void;
}

const inp: React.CSSProperties = {
  width: "100%", background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(245,182,30,0.18)", borderRadius: "0.45rem",
  padding: "0.6rem 0.85rem", color: "#F0EDE6", fontSize: "0.82rem", outline: "none",
};
const lbl: React.CSSProperties = {
  fontSize: "0.6rem", letterSpacing: "0.09em",
  color: "rgba(240,237,230,0.4)", display: "block", marginBottom: "0.3rem", fontWeight: 600,
};

export default function BoxTypeSlideOver({ isOpen, existing, onClose }: Props) {
  const [code,    setCode]    = useState("");
  const [name,    setName]    = useState("");
  const [desc,    setDesc]    = useState("");
  const [active,  setActive]  = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");

  useEffect(() => {
    if (isOpen) {
      setCode(existing?.code ?? "");
      setName(existing?.name ?? "");
      setDesc(existing?.description ?? "");
      setActive(existing?.active ?? true);
      setError("");
    }
  }, [isOpen, existing]);

  async function handleSave() {
    setSaving(true); setError("");
    const fd = new FormData();
    fd.set("code",   code);
    fd.set("name",   name);
    fd.set("description", desc);
    fd.set("active", String(active));

    const result = existing
      ? await updateBoxType(existing.id, fd)
      : await createBoxType(fd);

    setSaving(false);
    if ("error" in result) { setError(result.error); return; }
    onClose();
  }

  if (!isOpen) return null;

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 49, backdropFilter: "blur(2px)" }} />
      <div style={{
        position: "fixed", top: 0, right: 0, height: "100%", width: "min(420px, 100vw)",
        background: "#141414", borderLeft: "1px solid rgba(245,182,30,0.18)",
        boxShadow: "-12px 0 48px rgba(0,0,0,0.7)", zIndex: 50,
        display: "flex", flexDirection: "column",
        animation: "slideInRight 0.22s ease-out",
      }}>
        <style>{`@keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 1.25rem", borderBottom: "1px solid rgba(245,182,30,0.1)", flexShrink: 0 }}>
          <div>
            <h2 style={{ fontSize: "0.9rem", fontWeight: 700, color: "#F5B61E", margin: 0 }}>
              {existing ? "Edit Box Type" : "New Box Type"}
            </h2>
            <p style={{ fontSize: "0.62rem", color: "rgba(240,237,230,0.35)", margin: "0.2rem 0 0", letterSpacing: "0.06em" }}>BOX TYPE</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(240,237,230,0.4)" }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "1.1rem 1.25rem" }}>
          {error && (
            <div style={{ padding: "0.55rem 0.75rem", background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)", borderRadius: "0.4rem", fontSize: "0.72rem", color: "#F87171", marginBottom: "0.75rem" }}>
              {error}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "0.6rem", marginBottom: "0.6rem" }}>
            <div>
              <label style={lbl}>CODE *</label>
              <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="PMB" style={inp} />
            </div>
            <div>
              <label style={lbl}>NAME *</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Packing Mailer Box" style={inp} />
            </div>
          </div>

          <div style={{ marginBottom: "0.6rem" }}>
            <label style={lbl}>DESCRIPTION</label>
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} style={{ ...inp, resize: "vertical" }} />
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", marginBottom: "0.6rem" }}>
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} style={{ accentColor: "#F5B61E", width: 14, height: 14 }} />
            <span style={{ fontSize: "0.75rem", color: "rgba(240,237,230,0.7)" }}>Active</span>
          </label>
        </div>

        <div style={{ padding: "0.9rem 1.25rem", borderTop: "1px solid rgba(245,182,30,0.1)", display: "flex", gap: "0.6rem", flexShrink: 0 }}>
          <button onClick={handleSave} disabled={saving} style={{
            flex: 1, padding: "0.65rem 0",
            background: "rgba(245,182,30,0.18)", border: "1px solid rgba(245,182,30,0.35)",
            borderRadius: "0.5rem", color: "#F5B61E", fontSize: "0.75rem",
            letterSpacing: "0.08em", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer",
            opacity: saving ? 0.7 : 1,
          }}>
            {saving ? "SAVING…" : existing ? "SAVE CHANGES" : "CREATE BOX TYPE"}
          </button>
          <button onClick={onClose} style={{
            padding: "0.65rem 1rem", background: "none",
            border: "1px solid rgba(245,182,30,0.15)", borderRadius: "0.5rem",
            color: "rgba(240,237,230,0.4)", fontSize: "0.72rem", cursor: "pointer",
          }}>
            Cancel
          </button>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/app/(app)/designs/BoxTypeSlideOver.tsx
git commit -m "feat: BoxTypeSlideOver — create/edit box type with code, name, description"
```

---

### Task 4: BoxDesignSlideOver with price calculator

**Files:**
- Create: `src/app/(app)/designs/BoxDesignSlideOver.tsx`

**Interfaces:**
- Consumes: `BoxTypeData[]`, `MaterialOption[]`, optional `existing: BoxDesignData`, optional `defaultBoxType: BoxTypeData`
- Uses: `calculateBoxesPerSheet`, `calculateMaterialCostPerBox`, `calculateSuggestedUnitPrice` from `src/lib/utils/pricing.ts`
- Produces: calls `createBoxDesign` / `updateBoxDesign` from `src/actions/designs.ts`

- [ ] **Step 1: Create BoxDesignSlideOver**

Create `src/app/(app)/designs/BoxDesignSlideOver.tsx`:

```typescript
"use client";

import { useState, useEffect, useMemo } from "react";
import { X, AlertTriangle } from "lucide-react";
import { createBoxDesign, updateBoxDesign } from "@/actions/designs";
import { calculateBoxesPerSheet, calculateMaterialCostPerBox, calculateSuggestedUnitPrice } from "@/lib/utils/pricing";
import type { BoxTypeData, BoxDesignData, MaterialOption } from "./DesignsClient";

interface Props {
  isOpen:         boolean;
  existing:       BoxDesignData | null;
  defaultBoxType: BoxTypeData | null;
  boxTypes:       BoxTypeData[];
  materials:      MaterialOption[];
  onClose:        () => void;
}

const inp: React.CSSProperties = {
  width: "100%", background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(245,182,30,0.18)", borderRadius: "0.45rem",
  padding: "0.55rem 0.8rem", color: "#F0EDE6", fontSize: "0.8rem", outline: "none",
};
const lbl: React.CSSProperties = {
  fontSize: "0.6rem", letterSpacing: "0.09em",
  color: "rgba(240,237,230,0.4)", display: "block", marginBottom: "0.3rem", fontWeight: 600,
};

export default function BoxDesignSlideOver({ isOpen, existing, defaultBoxType, boxTypes, materials, onClose }: Props) {
  const [boxTypeId, setBoxTypeId] = useState("");
  const [materialId, setMaterialId] = useState("");
  const [code,    setCode]    = useState("");
  const [name,    setName]    = useState("");
  const [lIn,     setLIn]     = useState("");
  const [wIn,     setWIn]     = useState("");
  const [hIn,     setHIn]     = useState("");
  const [clIn,    setClIn]    = useState("");
  const [cwIn,    setCwIn]    = useState("");
  const [lCm,     setLCm]     = useState("");
  const [wCm,     setWCm]     = useState("");
  const [hCm,     setHCm]     = useState("");
  const [clCm,    setClCm]    = useState("");
  const [cwCm,    setCwCm]    = useState("");
  const [addOn,   setAddOn]   = useState("0");
  const [price,   setPrice]   = useState("");
  const [custom,  setCustom]  = useState(false);
  const [active,  setActive]  = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");

  useEffect(() => {
    if (!isOpen) return;
    if (existing) {
      setBoxTypeId(String(existing.material?.id ?? ""));
      setMaterialId(String(existing.material.id));
      setCode(existing.code);
      setName(existing.name);
      setLIn(existing.lengthIn?.toString() ?? "");
      setWIn(existing.widthIn?.toString() ?? "");
      setHIn(existing.heightIn?.toString() ?? "");
      setClIn(existing.cutLengthIn?.toString() ?? "");
      setCwIn(existing.cutWidthIn?.toString() ?? "");
      setLCm(existing.lengthCm?.toString() ?? "");
      setWCm(existing.widthCm?.toString() ?? "");
      setHCm(existing.heightCm?.toString() ?? "");
      setClCm(existing.cutLengthCm?.toString() ?? "");
      setCwCm(existing.cutWidthCm?.toString() ?? "");
      setPrice(existing.unitPrice.toString());
      setCustom(existing.custom);
      setActive(existing.active);
      setAddOn("0");
      // Find the boxTypeId from boxDesign — existing doesn't carry it directly
      // We need to pass it; for now look it up from boxTypes
    } else {
      setBoxTypeId(defaultBoxType ? String(defaultBoxType.id) : "");
      setMaterialId(""); setCode(""); setName("");
      setLIn(""); setWIn(""); setHIn(""); setClIn(""); setCwIn("");
      setLCm(""); setWCm(""); setHCm(""); setClCm(""); setCwCm("");
      setAddOn("0"); setPrice(""); setCustom(false); setActive(true);
    }
    setError("");
  }, [isOpen, existing, defaultBoxType]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedMaterial = useMemo(
    () => materials.find((m) => m.id === Number(materialId)) ?? null,
    [materials, materialId],
  );

  const { boxesPerSheet, materialCostPerBox, suggested } = useMemo(() => {
    if (!selectedMaterial) return { boxesPerSheet: 0, materialCostPerBox: 0, suggested: 0 };
    const bps = calculateBoxesPerSheet({
      sheetLengthIn: selectedMaterial.sheetLengthIn,
      sheetWidthIn:  selectedMaterial.sheetWidthIn,
      sheetLengthCm: selectedMaterial.sheetLengthCm,
      sheetWidthCm:  selectedMaterial.sheetWidthCm,
      cutLengthIn:   clIn ? parseFloat(clIn) : null,
      cutWidthIn:    cwIn ? parseFloat(cwIn) : null,
      cutLengthCm:   clCm ? parseFloat(clCm) : null,
      cutWidthCm:    cwCm ? parseFloat(cwCm) : null,
    });
    const mcb = calculateMaterialCostPerBox(selectedMaterial.unitPrice, bps);
    const sug = calculateSuggestedUnitPrice(mcb, parseFloat(addOn) || 0);
    return { boxesPerSheet: bps, materialCostPerBox: mcb, suggested: sug };
  }, [selectedMaterial, clIn, cwIn, clCm, cwCm, addOn]);

  function applySuggested() { setPrice(suggested.toFixed(2)); }

  async function handleSave() {
    setSaving(true); setError("");
    const fd = new FormData();
    fd.set("code", code); fd.set("name", name);
    fd.set("boxTypeId",   boxTypeId);
    fd.set("materialId",  materialId);
    fd.set("lengthIn",    lIn);  fd.set("widthIn",  wIn);  fd.set("heightIn",  hIn);
    fd.set("cutLengthIn", clIn); fd.set("cutWidthIn", cwIn);
    fd.set("lengthCm",    lCm);  fd.set("widthCm",  wCm);  fd.set("heightCm",  hCm);
    fd.set("cutLengthCm", clCm); fd.set("cutWidthCm", cwCm);
    fd.set("unitPrice",   price);
    fd.set("custom",      String(custom));
    fd.set("active",      String(active));

    const result = existing
      ? await updateBoxDesign(existing.id, fd)
      : await createBoxDesign(fd);

    setSaving(false);
    if ("error" in result) { setError(result.error); return; }
    onClose();
  }

  if (!isOpen) return null;

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 49, backdropFilter: "blur(2px)" }} />
      <div style={{
        position: "fixed", top: 0, right: 0, height: "100%", width: "min(520px, 100vw)",
        background: "#141414", borderLeft: "1px solid rgba(245,182,30,0.18)",
        boxShadow: "-12px 0 48px rgba(0,0,0,0.7)", zIndex: 50,
        display: "flex", flexDirection: "column",
        animation: "slideInRight 0.22s ease-out",
      }}>
        <style>{`@keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 1.25rem", borderBottom: "1px solid rgba(245,182,30,0.1)", flexShrink: 0 }}>
          <div>
            <h2 style={{ fontSize: "0.9rem", fontWeight: 700, color: "#F5B61E", margin: 0 }}>
              {existing ? "Edit Box Design" : "New Box Design"}
            </h2>
            <p style={{ fontSize: "0.62rem", color: "rgba(240,237,230,0.35)", margin: "0.2rem 0 0", letterSpacing: "0.06em" }}>BOX DESIGN</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(240,237,230,0.4)" }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "1.1rem 1.25rem" }}>
          {error && (
            <div style={{ padding: "0.55rem 0.75rem", background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)", borderRadius: "0.4rem", fontSize: "0.72rem", color: "#F87171", marginBottom: "0.75rem" }}>
              {error}
            </div>
          )}

          {/* Code + Name */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "0.6rem", marginBottom: "0.6rem" }}>
            <div><label style={lbl}>CODE *</label><input value={code} onChange={(e) => setCode(e.target.value)} placeholder="BD-001" style={inp} /></div>
            <div><label style={lbl}>NAME *</label><input value={name} onChange={(e) => setName(e.target.value)} placeholder="3×2×1 Mailer" style={inp} /></div>
          </div>

          {/* Box Type + Material */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem", marginBottom: "0.6rem" }}>
            <div>
              <label style={lbl}>BOX TYPE *</label>
              <select value={boxTypeId} onChange={(e) => setBoxTypeId(e.target.value)} style={{ ...inp, color: boxTypeId ? "#F0EDE6" : "rgba(240,237,230,0.3)" }} disabled={!!existing}>
                <option value="" disabled>— Select —</option>
                {boxTypes.map((bt) => <option key={bt.id} value={bt.id} style={{ background: "#141414" }}>{bt.code} — {bt.name}</option>)}
              </select>
              {existing && <p style={{ fontSize: "0.6rem", color: "rgba(240,237,230,0.3)", marginTop: "0.2rem" }}>Box type cannot be changed after creation.</p>}
            </div>
            <div>
              <label style={lbl}>MATERIAL *</label>
              <select value={materialId} onChange={(e) => setMaterialId(e.target.value)} style={{ ...inp, color: materialId ? "#F0EDE6" : "rgba(240,237,230,0.3)" }}>
                <option value="" disabled>— Select —</option>
                {materials.map((m) => <option key={m.id} value={m.id} style={{ background: "#141414" }}>{m.code} — {m.name}{m.status === "PENDING" ? " ⚠" : ""}</option>)}
              </select>
              {selectedMaterial?.status === "PENDING" && (
                <p style={{ fontSize: "0.6rem", color: "#FBBF24", marginTop: "0.2rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                  <AlertTriangle size={10} /> Pending purchase
                </p>
              )}
            </div>
          </div>

          {/* Dimensions — inches (primary) */}
          <div style={{ borderTop: "1px solid rgba(245,182,30,0.07)", paddingTop: "0.75rem", marginBottom: "0.6rem" }}>
            <p style={{ ...lbl, marginBottom: "0.5rem" }}>DIMENSIONS — INCHES (primary)</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.6rem", marginBottom: "0.5rem" }}>
              <div><label style={lbl}>L</label><input type="number" step="0.001" min="0" value={lIn} onChange={(e) => setLIn(e.target.value)} style={inp} /></div>
              <div><label style={lbl}>W</label><input type="number" step="0.001" min="0" value={wIn} onChange={(e) => setWIn(e.target.value)} style={inp} /></div>
              <div><label style={lbl}>H</label><input type="number" step="0.001" min="0" value={hIn} onChange={(e) => setHIn(e.target.value)} style={inp} /></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
              <div><label style={lbl}>CUT L</label><input type="number" step="0.001" min="0" value={clIn} onChange={(e) => setClIn(e.target.value)} style={inp} /></div>
              <div><label style={lbl}>CUT W</label><input type="number" step="0.001" min="0" value={cwIn} onChange={(e) => setCwIn(e.target.value)} style={inp} /></div>
            </div>
          </div>

          {/* Dimensions — cm (optional) */}
          <div style={{ marginBottom: "0.75rem" }}>
            <p style={{ ...lbl, marginBottom: "0.5rem" }}>DIMENSIONS — CM (optional)</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.6rem", marginBottom: "0.5rem" }}>
              <div><label style={lbl}>L</label><input type="number" step="0.01" min="0" value={lCm} onChange={(e) => setLCm(e.target.value)} style={inp} /></div>
              <div><label style={lbl}>W</label><input type="number" step="0.01" min="0" value={wCm} onChange={(e) => setWCm(e.target.value)} style={inp} /></div>
              <div><label style={lbl}>H</label><input type="number" step="0.01" min="0" value={hCm} onChange={(e) => setHCm(e.target.value)} style={inp} /></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
              <div><label style={lbl}>CUT L</label><input type="number" step="0.01" min="0" value={clCm} onChange={(e) => setClCm(e.target.value)} style={inp} /></div>
              <div><label style={lbl}>CUT W</label><input type="number" step="0.01" min="0" value={cwCm} onChange={(e) => setCwCm(e.target.value)} style={inp} /></div>
            </div>
          </div>

          {/* Price calculator */}
          {selectedMaterial && (
            <div style={{ background: "rgba(245,182,30,0.04)", border: "1px solid rgba(245,182,30,0.12)", borderRadius: "0.5rem", padding: "0.85rem 1rem", marginBottom: "0.75rem" }}>
              <p style={{ ...lbl, color: "#F5B61E", marginBottom: "0.6rem" }}>PRICE CALCULATOR</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "0.5rem", fontSize: "0.72rem", color: "rgba(240,237,230,0.55)" }}>
                <span>Boxes/sheet:</span>
                <span style={{ color: "#F0EDE6", fontWeight: 600 }}>{boxesPerSheet || "—"}</span>
                <span>Material cost/box:</span>
                <span style={{ color: "#F0EDE6", fontWeight: 600 }}>Rs. {materialCostPerBox.toFixed(2)}</span>
              </div>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-end" }}>
                <div style={{ flex: 1 }}>
                  <label style={lbl}>ADD-ON COST (ribbon, etc.)</label>
                  <input type="number" step="0.01" min="0" value={addOn} onChange={(e) => setAddOn(e.target.value)} style={inp} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ ...lbl, color: "#4ADE80" }}>SUGGESTED</p>
                  <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                    <span style={{ fontSize: "1rem", fontWeight: 700, color: "#4ADE80" }}>Rs. {suggested.toFixed(2)}</span>
                    <button type="button" onClick={applySuggested} style={{ fontSize: "0.6rem", color: "#F5B61E", background: "rgba(245,182,30,0.1)", border: "1px solid rgba(245,182,30,0.25)", borderRadius: "0.3rem", padding: "0.2rem 0.5rem", cursor: "pointer" }}>
                      USE
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Unit price */}
          <div style={{ marginBottom: "0.6rem" }}>
            <label style={lbl}>UNIT PRICE (Rs.) *</label>
            <input type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" style={inp} />
          </div>

          {/* Custom + Active toggles */}
          <div style={{ display: "flex", gap: "1.5rem", marginBottom: "0.6rem" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "0.45rem", cursor: "pointer" }}>
              <input type="checkbox" checked={custom} onChange={(e) => setCustom(e.target.checked)} style={{ accentColor: "#F5B61E" }} />
              <span style={{ fontSize: "0.72rem", color: "rgba(240,237,230,0.6)" }}>Custom design</span>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "0.45rem", cursor: "pointer" }}>
              <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} style={{ accentColor: "#F5B61E" }} />
              <span style={{ fontSize: "0.72rem", color: "rgba(240,237,230,0.6)" }}>Active</span>
            </label>
          </div>
        </div>

        <div style={{ padding: "0.9rem 1.25rem", borderTop: "1px solid rgba(245,182,30,0.1)", display: "flex", gap: "0.6rem", flexShrink: 0 }}>
          <button onClick={handleSave} disabled={saving} style={{
            flex: 1, padding: "0.65rem 0",
            background: "rgba(245,182,30,0.18)", border: "1px solid rgba(245,182,30,0.35)",
            borderRadius: "0.5rem", color: "#F5B61E", fontSize: "0.75rem",
            letterSpacing: "0.08em", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer",
            opacity: saving ? 0.7 : 1,
          }}>
            {saving ? "SAVING…" : existing ? "SAVE CHANGES" : "CREATE DESIGN"}
          </button>
          <button onClick={onClose} style={{
            padding: "0.65rem 1rem", background: "none",
            border: "1px solid rgba(245,182,30,0.15)", borderRadius: "0.5rem",
            color: "rgba(240,237,230,0.4)", fontSize: "0.72rem", cursor: "pointer",
          }}>
            Cancel
          </button>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/app/(app)/designs/BoxDesignSlideOver.tsx
git commit -m "feat: BoxDesignSlideOver — create/edit box design with inline price calculator"
```

---

### Task 5: Update sidebar + add redirect routes

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`
- Create: `src/app/(app)/design-types/page.tsx` (redirect)
- Create: `src/app/(app)/box-designs/page.tsx` (redirect)

- [ ] **Step 1: Update Sidebar catalogNav**

In `src/components/layout/Sidebar.tsx`, change `catalogNav`:

```typescript
const catalogNav = [
  { label: "Box Designs",  href: "/designs",      icon: BoxSelect },  // ← was /box-designs
  { label: "Design Types", href: "/designs",      icon: Layers },     // ← remove this line
  { label: "Materials",    href: "/materials",    icon: Archive },
];
```

Replace the entire `catalogNav` with:

```typescript
const catalogNav = [
  { label: "Designs",   href: "/designs",   icon: BoxSelect },
  { label: "Materials", href: "/materials", icon: Archive },
];
```

Remove `Layers` from the import if it is no longer used.

- [ ] **Step 2: Add redirect pages for old routes**

Create `src/app/(app)/design-types/page.tsx`:

```typescript
import { redirect } from "next/navigation";
export default function DesignTypesRedirect() {
  redirect("/designs");
}
```

Create `src/app/(app)/box-designs/page.tsx`:

```typescript
import { redirect } from "next/navigation";
export default function BoxDesignsRedirect() {
  redirect("/designs");
}
```

- [ ] **Step 3: Verify TypeScript compiles and test**

```bash
npx tsc --noEmit
npm run dev
```

Manual test:
1. Navigate to `/designs` — grouped list loads with all box types
2. Expand a box type — variants visible
3. Search "mailer" — only matching types/designs shown
4. Click "New Box Type" → slide-over opens, fill and save → page updates
5. Click "+ Variant" on a type → BoxDesignSlideOver opens with that type pre-selected
6. Fill dimensions + select material → price calculator updates live → click USE → price fills in
7. Navigate to `/box-designs` → redirects to `/designs`
8. Navigate to `/design-types` → redirects to `/designs`

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/Sidebar.tsx src/app/(app)/design-types/ src/app/(app)/box-designs/
git commit -m "feat: unified Designs module — sidebar updated, old routes redirect to /designs"
```
