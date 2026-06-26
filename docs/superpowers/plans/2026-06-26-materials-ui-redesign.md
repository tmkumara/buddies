# Materials UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Overhaul the Materials module UI with a scannable list + inline expand rows + slide-over form, add dual-unit (inch/cm) dimension fields system-wide, introduce a `unitPrice` field on Material, and add a searchable Combobox component for DB-loaded dropdowns.

**Architecture:** Server component page fetches all data and passes to a single `MaterialsClient` Client Component managing all UI state (search, filters, row expand, slide-over). New/edit handled inside a `MaterialSlideOver` panel rendered within `MaterialsClient`. Reusable `UnitInput` and `Combobox` components live in `src/components/ui/` and are shared with BoxDesign forms.

**Tech Stack:** Next.js 16.2.7, React 19, Prisma 7 + MySQL/MariaDB adapter, Zod v4, Lucide React 1.17, Plus Jakarta Sans, Tailwind CSS v4

## Global Constraints

- No test framework installed — verify each task with `npx tsc --noEmit`, then visual smoke test via `npm run dev`
- Zod v4: `z.coerce.number()`, `z.string().min()`, `z.enum()`, `.optional()`, `.nullable()` all work as expected
- All CSS uses existing design tokens: `--gold: #F5B61E`, `--bg: #080808`, `--text: #F0EDE6`
- No auto-conversion between inches and cm — both stored independently, both nullable
- Default unit toggle: inches (`in`) for all UnitInput instances
- Searchable Combobox only for DB-loaded data fields; fixed-option enums use chip toggle buttons
- `unitPrice` is required on Material (DB default `0.00` so existing rows are valid)
- Server actions: return `{ error: string }` or `{ success: true }` — never `redirect()` inside catch
- Decimal → number conversion required in all server pages before passing to Client Components
- `searchParams` must be `await`ed in page components (Next.js 16 breaking change)
- `"use client"` directive required on all interactive components
- Status pill CSS classes in globals.css: `status-fulfilled` (ACTIVE), `status-pending` (PENDING), `status-cancelled` (INACTIVE)

---

## File Map

### New
- `src/components/ui/Combobox.tsx` — searchable dropdown for DB-loaded options, extends Select pattern
- `src/components/ui/UnitInput.tsx` — dimension input with cm/in toggle, submits both DB columns
- `src/components/materials/MaterialsClient.tsx` — client wrapper: search, filter, expand state, slide-over state
- `src/components/materials/MaterialExpandRow.tsx` — inline expand: stock nudge + status chip toggles
- `src/components/materials/MaterialCard.tsx` — mobile card with expand
- `src/components/materials/MaterialSlideOver.tsx` — right-panel / bottom-sheet new/edit form

### Modified
- `prisma/schema.prisma` — add `sheetLengthIn`, `sheetWidthIn`, `unitPrice` on Material; `lengthIn`, `widthIn`, `heightIn`, `cutLengthIn`, `cutWidthIn` on BoxDesign; make all cm dimension fields nullable
- `src/lib/validations/material.ts` — add inch fields + `unitPrice`, make cm fields optional/nullable
- `src/lib/validations/box-design.ts` — make cm fields optional/nullable, add inch fields
- `src/lib/utils/calculations.ts` — update `calculateRawArea` to accept nullable values
- `src/actions/materials.ts` — add `updateMaterialStock`, pass inch fields + `unitPrice`
- `src/actions/quick-create.ts` — add `unitPrice` + inch fields to both quick-create actions
- `src/actions/box-designs.ts` — add inch fields to raw extraction
- `src/app/(app)/materials/page.tsx` — rewrite: server fetches, passes to MaterialsClient
- `src/app/(app)/materials/MaterialRow.tsx` — no longer needed (replaced by MaterialsClient table rows); keep file but clear it to a redirect stub
- `src/app/(app)/materials/new/page.tsx` — redirect to `/materials`
- `src/app/(app)/materials/[id]/edit/page.tsx` — redirect to `/materials`
- `src/app/(app)/materials/[id]/edit/EditMaterialForm.tsx` — no longer needed; can be left as-is (unused)
- `src/app/(app)/box-designs/BoxDesignForm.tsx` — replace cm-only inputs with `UnitInput`, use `Combobox` for DB dropdowns
- `src/app/(app)/box-designs/[id]/edit/page.tsx` — add null-coercion for new inch fields
- `src/app/globals.css` — add slide-over, bottom sheet, stat strip, unit toggle, expand row, card styles

---

## Task 1: Schema — Dual-unit fields + unitPrice

**Files:**
- Modify: `prisma/schema.prisma`

**Interfaces:**
- Produces: Prisma client types with `Material.sheetLengthIn`, `Material.sheetWidthIn`, `Material.unitPrice`; `BoxDesign.lengthIn`, `BoxDesign.widthIn`, `BoxDesign.heightIn`, `BoxDesign.cutLengthIn`, `BoxDesign.cutWidthIn`

- [ ] **Step 1: Update Material model in `prisma/schema.prisma`**

Replace the entire `model Material { ... }` block:

```prisma
model Material {
  id                Int            @id @default(autoincrement())
  code              String         @unique @db.VarChar(50)
  name              String         @db.VarChar(100)
  gsm               Int
  sheetLengthCm     Decimal?       @map("sheet_length_cm") @db.Decimal(8, 2)
  sheetWidthCm      Decimal?       @map("sheet_width_cm") @db.Decimal(8, 2)
  sheetLengthIn     Decimal?       @map("sheet_length_in") @db.Decimal(8, 4)
  sheetWidthIn      Decimal?       @map("sheet_width_in") @db.Decimal(8, 4)
  costPerSheet      Decimal        @map("cost_per_sheet") @db.Decimal(10, 2)
  unitPrice         Decimal        @default(0.00) @map("unit_price") @db.Decimal(10, 2)
  minStockLevel     Decimal        @default(0.00) @map("min_stock_level") @db.Decimal(10, 2)
  currentStockLevel Decimal        @default(0.00) @map("current_stock_level") @db.Decimal(10, 2)
  status            MaterialStatus @default(ACTIVE)
  createdAt         DateTime       @default(now()) @map("created_at") @db.DateTime
  updatedAt         DateTime       @updatedAt @map("updated_at") @db.DateTime
  boxDesigns        BoxDesign[]

  @@index([status])
  @@map("material")
}
```

- [ ] **Step 2: Update BoxDesign model in `prisma/schema.prisma`**

Replace the entire `model BoxDesign { ... }` block:

```prisma
model BoxDesign {
  id             Int        @id @default(autoincrement())
  code           String     @unique @db.VarChar(50)
  name           String     @db.VarChar(150)
  designTypeId   Int        @map("design_type_id")
  designType     DesignType @relation(fields: [designTypeId], references: [id])
  materialId     Int        @map("material_id")
  material       Material   @relation(fields: [materialId], references: [id])
  lengthCm       Decimal?   @map("length_cm") @db.Decimal(8, 2)
  widthCm        Decimal?   @map("width_cm") @db.Decimal(8, 2)
  heightCm       Decimal?   @map("height_cm") @db.Decimal(8, 2)
  lengthIn       Decimal?   @map("length_in") @db.Decimal(8, 4)
  widthIn        Decimal?   @map("width_in") @db.Decimal(8, 4)
  heightIn       Decimal?   @map("height_in") @db.Decimal(8, 4)
  cutLengthCm    Decimal?   @map("cut_length_cm") @db.Decimal(8, 2)
  cutWidthCm     Decimal?   @map("cut_width_cm") @db.Decimal(8, 2)
  cutLengthIn    Decimal?   @map("cut_length_in") @db.Decimal(8, 4)
  cutWidthIn     Decimal?   @map("cut_width_in") @db.Decimal(8, 4)
  rawAreaSqCm    Decimal?   @map("raw_area_sq_cm") @db.Decimal(12, 2)
  unitPrice      Decimal    @map("unit_price") @db.Decimal(10, 2)
  designFilePath String?    @map("design_file_path") @db.VarChar(255)
  custom         Boolean    @default(false) @map("is_custom")
  active         Boolean    @default(true) @map("is_active")
  createdAt      DateTime   @default(now()) @map("created_at") @db.DateTime
  updatedAt      DateTime   @updatedAt @map("updated_at") @db.DateTime
  orderItems     OrderItem[]

  @@index([active])
  @@index([designTypeId])
  @@index([materialId])
  @@map("box_design")
}
```

- [ ] **Step 3: Push schema to DB**

```bash
npx prisma db push
```

Expected output: `Your database is now in sync with your Prisma schema.`

- [ ] **Step 4: Verify generated client**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: add dual-unit dimension fields and unitPrice to Material and BoxDesign schema"
```

---

## Task 2: Validations + Actions — Material schema, updateMaterialStock

**Files:**
- Modify: `src/lib/validations/material.ts`
- Modify: `src/actions/materials.ts`

**Interfaces:**
- Produces:
  - `materialSchema` — Zod schema accepting both cm and in fields as optional/nullable, plus `unitPrice`
  - `updateMaterialStock(id: number, value: number): Promise<{ success: true } | { error: string }>`

- [ ] **Step 1: Rewrite `src/lib/validations/material.ts`**

```typescript
import { z } from "zod";

export const materialSchema = z.object({
  code:              z.string().min(1, "Code is required").max(50),
  name:              z.string().min(1, "Name is required").max(100),
  gsm:               z.coerce.number().int().min(80, "GSM must be at least 80").max(600, "GSM must be at most 600"),
  sheetLengthCm:     z.coerce.number().positive("Sheet length must be positive").optional().nullable(),
  sheetWidthCm:      z.coerce.number().positive("Sheet width must be positive").optional().nullable(),
  sheetLengthIn:     z.coerce.number().positive("Sheet length must be positive").optional().nullable(),
  sheetWidthIn:      z.coerce.number().positive("Sheet width must be positive").optional().nullable(),
  costPerSheet:      z.coerce.number().nonnegative("Cost must be non-negative"),
  unitPrice:         z.coerce.number().nonnegative("Unit price must be non-negative"),
  minStockLevel:     z.coerce.number().nonnegative("Min stock must be non-negative").default(0),
  currentStockLevel: z.coerce.number().nonnegative("Stock level must be non-negative").default(0),
  status:            z.enum(["ACTIVE", "PENDING", "INACTIVE"]).default("ACTIVE"),
});

export type MaterialInput = z.infer<typeof materialSchema>;
```

- [ ] **Step 2: Rewrite `src/actions/materials.ts`**

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth-guards";
import prisma from "@/lib/prisma";
import { materialSchema } from "@/lib/validations/material";
import { MaterialStatus } from "@prisma/client";

export async function createMaterial(formData: FormData) {
  await requireAuth();

  const raw = {
    code:              formData.get("code") as string,
    name:              formData.get("name") as string,
    gsm:               formData.get("gsm"),
    sheetLengthCm:     formData.get("sheetLengthCm") || undefined,
    sheetWidthCm:      formData.get("sheetWidthCm")  || undefined,
    sheetLengthIn:     formData.get("sheetLengthIn") || undefined,
    sheetWidthIn:      formData.get("sheetWidthIn")  || undefined,
    costPerSheet:      formData.get("costPerSheet"),
    unitPrice:         formData.get("unitPrice"),
    minStockLevel:     formData.get("minStockLevel"),
    currentStockLevel: formData.get("currentStockLevel"),
    status:            formData.get("status") ?? "ACTIVE",
  };

  const parsed = materialSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Validation error" };

  try {
    await prisma.material.create({ data: parsed.data });
  } catch (e: unknown) {
    if ((e as { code?: string }).code === "P2002") return { error: "A material with this code already exists." };
    throw e;
  }

  revalidatePath("/materials");
  return { success: true };
}

export async function updateMaterial(id: number, formData: FormData) {
  await requireAuth();

  const raw = {
    code:              formData.get("code") as string,
    name:              formData.get("name") as string,
    gsm:               formData.get("gsm"),
    sheetLengthCm:     formData.get("sheetLengthCm") || undefined,
    sheetWidthCm:      formData.get("sheetWidthCm")  || undefined,
    sheetLengthIn:     formData.get("sheetLengthIn") || undefined,
    sheetWidthIn:      formData.get("sheetWidthIn")  || undefined,
    costPerSheet:      formData.get("costPerSheet"),
    unitPrice:         formData.get("unitPrice"),
    minStockLevel:     formData.get("minStockLevel"),
    currentStockLevel: formData.get("currentStockLevel"),
    status:            formData.get("status") ?? "ACTIVE",
  };

  const parsed = materialSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Validation error" };

  await prisma.material.update({ where: { id }, data: parsed.data });
  revalidatePath("/materials");
  return { success: true };
}

export async function updateMaterialStatus(id: number, status: MaterialStatus) {
  await requireAuth();
  await prisma.material.update({ where: { id }, data: { status } });
  revalidatePath("/materials");
  return { success: true };
}

export async function updateMaterialStock(id: number, value: number) {
  await requireAuth();
  if (value < 0) return { error: "Stock level cannot be negative." };
  await prisma.material.update({ where: { id }, data: { currentStockLevel: value } });
  revalidatePath("/materials");
  return { success: true };
}
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/validations/material.ts src/actions/materials.ts
git commit -m "feat: add inch fields, unitPrice, and updateMaterialStock to material validation and actions"
```

---

## Task 3: Validations + Actions — BoxDesign schema + calculations + actions

**Files:**
- Modify: `src/lib/validations/box-design.ts`
- Modify: `src/lib/utils/calculations.ts`
- Modify: `src/actions/box-designs.ts`
- Modify: `src/actions/quick-create.ts`

**Interfaces:**
- Produces:
  - `boxDesignSchema` — all cm fields optional/nullable, inch fields optional/nullable
  - `calculateRawArea(l: number | null | undefined, w: number | null | undefined): number | null`

- [ ] **Step 1: Rewrite `src/lib/validations/box-design.ts`**

```typescript
import { z } from "zod";

const optDim = z.coerce.number().positive().optional().nullable();

export const boxDesignSchema = z.object({
  code:         z.string().min(1, "Code is required").max(50),
  name:         z.string().min(1, "Name is required").max(150),
  designTypeId: z.coerce.number().int().positive("Design type is required"),
  materialId:   z.coerce.number().int().positive("Material is required"),
  lengthCm:     optDim,
  widthCm:      optDim,
  heightCm:     optDim,
  lengthIn:     optDim,
  widthIn:      optDim,
  heightIn:     optDim,
  cutLengthCm:  optDim,
  cutWidthCm:   optDim,
  cutLengthIn:  optDim,
  cutWidthIn:   optDim,
  unitPrice:    z.coerce.number().nonnegative("Unit price must be non-negative"),
  custom:       z.boolean().default(false),
  active:       z.boolean().default(true),
});

export type BoxDesignInput = z.infer<typeof boxDesignSchema>;
```

- [ ] **Step 2: Update `src/lib/utils/calculations.ts`**

Replace the `calculateRawArea` function:

```typescript
export function calculateRawArea(
  cutLengthCm: number | null | undefined,
  cutWidthCm: number | null | undefined,
): number | null {
  if (cutLengthCm == null || cutWidthCm == null) return null;
  return cutLengthCm * cutWidthCm;
}
```

Leave `calculateLineTotal`, `calculateOrderTotals`, and `toNumber` unchanged.

- [ ] **Step 3: Rewrite `src/actions/box-designs.ts`**

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth-guards";
import prisma from "@/lib/prisma";
import { boxDesignSchema } from "@/lib/validations/box-design";
import { calculateRawArea } from "@/lib/utils/calculations";

function extractRaw(formData: FormData, includeActive: boolean) {
  return {
    code:         formData.get("code") as string,
    name:         formData.get("name") as string,
    designTypeId: formData.get("designTypeId"),
    materialId:   formData.get("materialId"),
    lengthCm:     formData.get("lengthCm")    || undefined,
    widthCm:      formData.get("widthCm")     || undefined,
    heightCm:     formData.get("heightCm")    || undefined,
    lengthIn:     formData.get("lengthIn")    || undefined,
    widthIn:      formData.get("widthIn")     || undefined,
    heightIn:     formData.get("heightIn")    || undefined,
    cutLengthCm:  formData.get("cutLengthCm") || undefined,
    cutWidthCm:   formData.get("cutWidthCm")  || undefined,
    cutLengthIn:  formData.get("cutLengthIn") || undefined,
    cutWidthIn:   formData.get("cutWidthIn")  || undefined,
    unitPrice:    formData.get("unitPrice"),
    custom:       formData.get("custom") === "true",
    ...(includeActive ? { active: formData.get("active") === "true" } : { active: true }),
  };
}

export async function createBoxDesign(formData: FormData) {
  await requireAuth();

  const parsed = boxDesignSchema.safeParse(extractRaw(formData, false));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Validation error" };

  const rawAreaSqCm = calculateRawArea(parsed.data.cutLengthCm, parsed.data.cutWidthCm);

  try {
    await prisma.boxDesign.create({ data: { ...parsed.data, rawAreaSqCm } });
  } catch (e: unknown) {
    if ((e as { code?: string }).code === "P2002") return { error: "A box design with this code already exists." };
    throw e;
  }

  revalidatePath("/box-designs");
  return { success: true };
}

export async function updateBoxDesign(id: number, formData: FormData) {
  await requireAuth();

  const parsed = boxDesignSchema.safeParse(extractRaw(formData, true));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Validation error" };

  const rawAreaSqCm = calculateRawArea(parsed.data.cutLengthCm, parsed.data.cutWidthCm);

  await prisma.boxDesign.update({ where: { id }, data: { ...parsed.data, rawAreaSqCm } });
  revalidatePath("/box-designs");
  return { success: true };
}

export async function toggleBoxDesignActive(id: number, active: boolean) {
  await requireAuth();
  await prisma.boxDesign.update({ where: { id }, data: { active } });
  revalidatePath("/box-designs");
  return { success: true };
}
```

- [ ] **Step 4: Rewrite `src/actions/quick-create.ts`**

```typescript
"use server";

import { requireAuth } from "@/lib/auth-guards";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { calculateRawArea } from "@/lib/utils/calculations";

const optDim = z.coerce.number().positive().optional().nullable();

const quickMaterialSchema = z.object({
  code:          z.string().min(1, "Code is required").max(50),
  name:          z.string().min(1, "Name is required").max(100),
  gsm:           z.coerce.number().int().min(80).max(600),
  sheetLengthCm: optDim,
  sheetWidthCm:  optDim,
  sheetLengthIn: optDim,
  sheetWidthIn:  optDim,
  costPerSheet:  z.coerce.number().nonnegative(),
  unitPrice:     z.coerce.number().nonnegative().default(0),
  status:        z.enum(["ACTIVE", "PENDING"]).default("ACTIVE"),
});

const quickDesignSchema = z.object({
  code:         z.string().min(1, "Code is required").max(50),
  name:         z.string().min(1, "Name is required").max(150),
  designTypeId: z.coerce.number().int().positive("Design type required"),
  materialId:   z.coerce.number().int().positive("Material required"),
  lengthCm:     optDim,
  widthCm:      optDim,
  heightCm:     optDim,
  lengthIn:     optDim,
  widthIn:      optDim,
  heightIn:     optDim,
  cutLengthCm:  optDim,
  cutWidthCm:   optDim,
  cutLengthIn:  optDim,
  cutWidthIn:   optDim,
  unitPrice:    z.coerce.number().nonnegative("Unit price required"),
  custom:       z.boolean().default(false),
});

export async function quickCreateMaterial(formData: FormData) {
  await requireAuth();

  const raw = {
    code:          formData.get("code") as string,
    name:          formData.get("name") as string,
    gsm:           formData.get("gsm"),
    sheetLengthCm: formData.get("sheetLengthCm") || undefined,
    sheetWidthCm:  formData.get("sheetWidthCm")  || undefined,
    sheetLengthIn: formData.get("sheetLengthIn") || undefined,
    sheetWidthIn:  formData.get("sheetWidthIn")  || undefined,
    costPerSheet:  formData.get("costPerSheet"),
    unitPrice:     formData.get("unitPrice") ?? "0",
    status:        formData.get("isPending") === "true" ? "PENDING" : "ACTIVE",
  };

  const parsed = quickMaterialSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Validation error" };

  try {
    const m = await prisma.material.create({
      data: { ...parsed.data, minStockLevel: 0, currentStockLevel: 0 },
      select: { id: true, code: true, name: true, status: true },
    });
    return { data: m };
  } catch (e: unknown) {
    if ((e as { code?: string }).code === "P2002") return { error: "A material with this code already exists." };
    throw e;
  }
}

export async function quickCreateBoxDesign(formData: FormData) {
  await requireAuth();

  const raw = {
    code:         formData.get("code") as string,
    name:         formData.get("name") as string,
    designTypeId: formData.get("designTypeId"),
    materialId:   formData.get("materialId"),
    lengthCm:     formData.get("lengthCm")    || undefined,
    widthCm:      formData.get("widthCm")     || undefined,
    heightCm:     formData.get("heightCm")    || undefined,
    lengthIn:     formData.get("lengthIn")    || undefined,
    widthIn:      formData.get("widthIn")     || undefined,
    heightIn:     formData.get("heightIn")    || undefined,
    cutLengthCm:  formData.get("cutLengthCm") || undefined,
    cutWidthCm:   formData.get("cutWidthCm")  || undefined,
    cutLengthIn:  formData.get("cutLengthIn") || undefined,
    cutWidthIn:   formData.get("cutWidthIn")  || undefined,
    unitPrice:    formData.get("unitPrice"),
    custom:       formData.get("custom") === "true",
  };

  const parsed = quickDesignSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Validation error" };

  const rawAreaSqCm = calculateRawArea(parsed.data.cutLengthCm, parsed.data.cutWidthCm);

  try {
    const bd = await prisma.boxDesign.create({
      data: { ...parsed.data, rawAreaSqCm },
      select: {
        id: true, code: true, name: true, unitPrice: true,
        designType: { select: { name: true } },
      },
    });
    return {
      data: {
        id:             bd.id,
        code:           bd.code,
        name:           bd.name,
        unitPrice:      Number(bd.unitPrice),
        designTypeName: bd.designType.name,
      },
    };
  } catch (e: unknown) {
    if ((e as { code?: string }).code === "P2002") return { error: "A box design with this code already exists." };
    throw e;
  }
}
```

- [ ] **Step 5: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/validations/box-design.ts src/lib/utils/calculations.ts src/actions/box-designs.ts src/actions/quick-create.ts
git commit -m "feat: add inch fields to BoxDesign validation, actions, and quick-create; handle nullable rawAreaSqCm"
```

---

## Task 4: CSS — Slide-over, expand row, stat strip, unit toggle, card styles

**Files:**
- Modify: `src/app/globals.css`

**Interfaces:**
- Produces CSS classes: `.slide-over-backdrop`, `.slide-over-panel`, `.slide-over-panel.open`, `.slide-over-header`, `.slide-over-body`, `.slide-over-footer`, `.slide-over-drag-handle`, `.form-section-label`, `.unit-toggle`, `.unit-toggle-btn`, `.unit-toggle-btn.active`, `.expand-row`, `.stock-bar-track`, `.stock-bar-fill.green/.amber/.red`, `.status-chip-btn`, `.status-chip-btn.active-ACTIVE/.active-PENDING/.active-INACTIVE`, `.stat-strip`, `.stat-strip-chip`, `.stat-strip-chip.low-stock`, `.filter-tabs`, `.filter-tab`, `.filter-tab.active`, `.material-card`, `.material-card.pending`, `.material-card.low-stock`, `.material-card-face`, `.material-card-expand`, `.row-chevron`, `.row-chevron.expanded`, `.price-input-wrapper`, `.price-prefix`, `.nudge-btn`, `#materials-table-view`, `#materials-card-view`, `.hide-tablet`

- [ ] **Step 1: Append to `src/app/globals.css`**

Add at the very end of the file:

```css
/* ── Slide-over backdrop ───────────────────────────── */

.slide-over-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  z-index: 100;
  animation: fade-in-up 0.15s ease both;
}

/* ── Slide-over panel (desktop/tablet — right side) ── */

.slide-over-panel {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 480px;
  max-width: 100vw;
  background: rgba(10, 10, 10, 0.97);
  backdrop-filter: blur(24px) saturate(160%);
  -webkit-backdrop-filter: blur(24px) saturate(160%);
  border-left: 1px solid rgba(245, 182, 30, 0.18);
  box-shadow: -8px 0 64px rgba(0, 0, 0, 0.7);
  z-index: 101;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transform: translateX(100%);
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.slide-over-panel.open {
  transform: translateX(0);
}

.slide-over-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid rgba(245, 182, 30, 0.1);
  flex-shrink: 0;
}

.slide-over-body {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
  scrollbar-width: thin;
  scrollbar-color: rgba(245, 182, 30, 0.2) transparent;
}

.slide-over-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid rgba(245, 182, 30, 0.1);
  display: flex;
  gap: 0.75rem;
  flex-shrink: 0;
  background: rgba(10, 10, 10, 0.97);
}

/* ── Drag handle (mobile only) ─────────────────────── */

.slide-over-drag-handle { display: none; }

@media (max-width: 767px) {
  .slide-over-panel {
    top: auto;
    left: 0;
    right: 0;
    bottom: 0;
    width: 100%;
    max-height: 92vh;
    border-left: none;
    border-top: 1px solid rgba(245, 182, 30, 0.18);
    border-radius: 1.25rem 1.25rem 0 0;
    box-shadow: 0 -8px 64px rgba(0, 0, 0, 0.7);
    transform: translateY(100%);
    transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .slide-over-panel.open {
    transform: translateY(0);
  }

  .slide-over-drag-handle {
    display: block;
    width: 40px;
    height: 4px;
    background: rgba(245, 182, 30, 0.25);
    border-radius: 2px;
    margin: 0.75rem auto 0;
    flex-shrink: 0;
  }
}

/* ── Form section dividers ─────────────────────────── */

.form-section-label {
  font-size: 0.56rem;
  letter-spacing: 0.2em;
  color: rgba(245, 182, 30, 0.45);
  font-weight: 600;
  padding-bottom: 0.6rem;
  border-bottom: 1px solid rgba(245, 182, 30, 0.1);
  margin-bottom: 0.75rem;
  margin-top: 0;
}

/* ── Unit toggle ───────────────────────────────────── */

.unit-toggle {
  display: inline-flex;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(245, 182, 30, 0.14);
  border-radius: 0.4rem;
  overflow: hidden;
}

.unit-toggle-btn {
  padding: 0.25rem 0.65rem;
  font-size: 0.6rem;
  letter-spacing: 0.1em;
  font-weight: 600;
  cursor: pointer;
  background: transparent;
  border: none;
  color: rgba(240, 237, 230, 0.3);
  transition: background 0.15s ease, color 0.15s ease;
  font-family: var(--font-jakarta, 'Plus Jakarta Sans', sans-serif);
}

.unit-toggle-btn.active {
  background: rgba(245, 182, 30, 0.18);
  color: #F5B61E;
}

/* ── Inline expand row ─────────────────────────────── */

.expand-row {
  background: rgba(245, 182, 30, 0.02);
  border-top: 1px solid rgba(245, 182, 30, 0.06);
  border-bottom: 1px solid rgba(245, 182, 30, 0.06);
  padding: 1rem 1.25rem;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.25rem;
}

@media (max-width: 767px) {
  .expand-row { grid-template-columns: 1fr; }
}

/* ── Stock bar ─────────────────────────────────────── */

.stock-bar-track {
  height: 4px;
  background: rgba(255, 255, 255, 0.07);
  border-radius: 2px;
  overflow: hidden;
  margin-top: 0.4rem;
}

.stock-bar-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s ease;
}

.stock-bar-fill.green { background: #4ADE80; }
.stock-bar-fill.amber { background: #FBBF24; }
.stock-bar-fill.red   { background: #F87171; }

/* ── Status chip toggle buttons ────────────────────── */

.status-chip-btn {
  padding: 0.3rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.58rem;
  letter-spacing: 0.1em;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
  background: transparent;
  color: rgba(240, 237, 230, 0.3);
  transition: all 0.15s ease;
  font-family: var(--font-jakarta, 'Plus Jakarta Sans', sans-serif);
}

.status-chip-btn:hover:not(:disabled) {
  color: rgba(240, 237, 230, 0.65);
  border-color: rgba(240, 237, 230, 0.15);
}

.status-chip-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.status-chip-btn.active-ACTIVE   { background: rgba(74,222,128,0.1);   color: #4ADE80; border-color: rgba(74,222,128,0.3); }
.status-chip-btn.active-PENDING  { background: rgba(251,191,36,0.1);   color: #FBBF24; border-color: rgba(251,191,36,0.3); }
.status-chip-btn.active-INACTIVE { background: rgba(248,113,113,0.1);  color: #F87171; border-color: rgba(248,113,113,0.3); }

/* ── Stat strip ────────────────────────────────────── */

.stat-strip {
  display: flex;
  gap: 0.65rem;
  flex-wrap: wrap;
}

.stat-strip-chip {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.35rem 0.8rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(245, 182, 30, 0.12);
  border-radius: 9999px;
  font-size: 0.6rem;
  letter-spacing: 0.08em;
  color: rgba(240, 237, 230, 0.4);
}

.stat-strip-chip .value {
  font-size: 0.78rem;
  font-weight: 700;
  color: #F0EDE6;
}

.stat-strip-chip.low-stock { border-color: rgba(248, 113, 113, 0.25); animation: pulse-red 2s ease-in-out infinite; }
.stat-strip-chip.low-stock .value { color: #F87171; }

@keyframes pulse-red {
  0%, 100% { box-shadow: 0 0 0 0 rgba(248,113,113,0); }
  50%       { box-shadow: 0 0 0 4px rgba(248,113,113,0.12); }
}

/* ── Filter tabs ───────────────────────────────────── */

.filter-tabs {
  display: flex;
  gap: 0.2rem;
  flex-wrap: wrap;
}

.filter-tab {
  padding: 0.3rem 0.8rem;
  font-size: 0.6rem;
  letter-spacing: 0.1em;
  font-weight: 600;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 9999px;
  cursor: pointer;
  color: rgba(240, 237, 230, 0.32);
  transition: all 0.15s ease;
  font-family: var(--font-jakarta, 'Plus Jakarta Sans', sans-serif);
}

.filter-tab:hover { color: rgba(240,237,230,0.6); border-color: rgba(245,182,30,0.15); }
.filter-tab.active { color: #F5B61E; border-color: rgba(245,182,30,0.35); background: rgba(245,182,30,0.07); }

/* ── Material card (mobile) ────────────────────────── */

.material-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(245, 182, 30, 0.12);
  border-radius: 0.875rem;
  overflow: hidden;
}

.material-card.pending   { border-left: 3px solid rgba(251, 191, 36, 0.5); }
.material-card.low-stock { border-left: 3px solid rgba(248, 113, 113, 0.5); }

.material-card-face {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.85rem 1rem;
  cursor: pointer;
  user-select: none;
}

.material-card-expand {
  border-top: 1px solid rgba(245, 182, 30, 0.07);
}

/* ── Chevron ───────────────────────────────────────── */

.row-chevron {
  color: rgba(240, 237, 230, 0.22);
  transition: transform 0.2s ease, color 0.2s ease;
  cursor: pointer;
  flex-shrink: 0;
}

.row-chevron.expanded {
  transform: rotate(90deg);
  color: #F5B61E;
}

/* ── Price prefix input ────────────────────────────── */

.price-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.price-prefix {
  position: absolute;
  left: 0.9rem;
  font-size: 0.72rem;
  color: rgba(240, 237, 230, 0.35);
  pointer-events: none;
  z-index: 1;
  font-weight: 500;
}

.price-input-wrapper .form-input { padding-left: 2.6rem; }

/* ── Nudge buttons (stock ±) ───────────────────────── */

.nudge-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(245, 182, 30, 0.07);
  border: 1px solid rgba(245, 182, 30, 0.18);
  border-radius: 0.35rem;
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
  color: rgba(240, 237, 230, 0.5);
  transition: background 0.15s ease, color 0.15s ease;
  font-family: var(--font-jakarta, 'Plus Jakarta Sans', sans-serif);
  flex-shrink: 0;
}

.nudge-btn:hover { background: rgba(245, 182, 30, 0.15); color: #F5B61E; }

/* ── Materials responsive table / card switch ──────── */

#materials-table-view { display: block; }
#materials-card-view  { display: none;  }

@media (max-width: 767px) {
  #materials-table-view { display: none;  }
  #materials-card-view  { display: flex; flex-direction: column; gap: 0.75rem; }
}

@media (max-width: 1023px) {
  .hide-tablet { display: none; }
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: add slide-over, expand row, unit toggle, stat strip, and card CSS"
```

---

## Task 5: Component — UnitInput

**Files:**
- Create: `src/components/ui/UnitInput.tsx`

**Interfaces:**
- Produces:
```typescript
export interface UnitInputProps {
  labelPrefix: string;       // e.g. "LENGTH", "WIDTH"
  nameCm: string;            // form field name for cm column
  nameIn: string;            // form field name for in column
  defaultValueCm?: number | null;
  defaultValueIn?: number | null;
  required?: boolean;
  step?: string;             // default "0.01"
}
export default function UnitInput(props: UnitInputProps): JSX.Element
```

- [ ] **Step 1: Create `src/components/ui/UnitInput.tsx`**

```typescript
"use client";

import { useState } from "react";

export interface UnitInputProps {
  labelPrefix: string;
  nameCm: string;
  nameIn: string;
  defaultValueCm?: number | null;
  defaultValueIn?: number | null;
  required?: boolean;
  step?: string;
}

export default function UnitInput({
  labelPrefix,
  nameCm,
  nameIn,
  defaultValueCm,
  defaultValueIn,
  required,
  step = "0.01",
}: UnitInputProps) {
  const [unit, setUnit] = useState<"in" | "cm">(
    defaultValueIn != null ? "in" : defaultValueCm != null ? "cm" : "in"
  );

  const isIn = unit === "in";

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.45rem" }}>
        <label className="form-label" style={{ margin: 0 }}>
          {labelPrefix}{required && " *"}
        </label>
        <div className="unit-toggle">
          <button
            type="button"
            className={`unit-toggle-btn${isIn ? " active" : ""}`}
            onClick={() => setUnit("in")}
          >
            IN
          </button>
          <button
            type="button"
            className={`unit-toggle-btn${!isIn ? " active" : ""}`}
            onClick={() => setUnit("cm")}
          >
            CM
          </button>
        </div>
      </div>

      {isIn ? (
        <>
          <input
            name={nameIn}
            type="number"
            step={step}
            min="0"
            className="form-input"
            defaultValue={defaultValueIn ?? undefined}
            required={required}
            placeholder="0.00"
          />
          <input type="hidden" name={nameCm} value={defaultValueCm ?? ""} />
        </>
      ) : (
        <>
          <input
            name={nameCm}
            type="number"
            step={step}
            min="0"
            className="form-input"
            defaultValue={defaultValueCm ?? undefined}
            required={required}
            placeholder="0.00"
          />
          <input type="hidden" name={nameIn} value={defaultValueIn ?? ""} />
        </>
      )}
    </div>
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
git add src/components/ui/UnitInput.tsx
git commit -m "feat: add UnitInput component with cm/in toggle, default inches"
```

---

## Task 6: Component — Combobox

**Files:**
- Create: `src/components/ui/Combobox.tsx`
- Modify: `src/app/(app)/box-designs/BoxDesignForm.tsx`

**Interfaces:**
- Produces:
```typescript
export interface ComboboxOption {
  value: string | number;
  label: string;
  meta?: string;   // optional dim text shown beside label
}
export interface ComboboxProps {
  name: string;
  options: ComboboxOption[];
  defaultValue?: string | number;
  value?: string | number;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  onChange?: (value: string | number) => void;
}
export default function Combobox(props: ComboboxProps): JSX.Element
```

- [ ] **Step 1: Create `src/components/ui/Combobox.tsx`**

```typescript
"use client";

import { useState, useRef, useEffect, useId } from "react";
import { ChevronDown, Check, Search } from "lucide-react";

export interface ComboboxOption {
  value: string | number;
  label: string;
  meta?: string;
}

export interface ComboboxProps {
  name: string;
  options: ComboboxOption[];
  defaultValue?: string | number;
  value?: string | number;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  onChange?: (value: string | number) => void;
}

export default function Combobox({
  name, options, defaultValue, value: controlledValue,
  placeholder = "— Search or select —",
  required, disabled, onChange,
}: ComboboxProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | number>(controlledValue ?? defaultValue ?? "");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (controlledValue !== undefined) setSelected(controlledValue);
  }, [controlledValue]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => searchRef.current?.focus(), 40);
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => { clearTimeout(t); document.removeEventListener("mousedown", handleOutside); };
  }, [open]);

  const filtered = query
    ? options.filter(
        (o) =>
          o.label.toLowerCase().includes(query.toLowerCase()) ||
          (o.meta ?? "").toLowerCase().includes(query.toLowerCase())
      )
    : options;

  function handleSelect(opt: ComboboxOption) {
    setSelected(opt.value);
    setOpen(false);
    setQuery("");
    onChange?.(opt.value);
  }

  const selectedLabel = options.find((o) => String(o.value) === String(selected))?.label;

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%" }}>
      <input type="hidden" name={name} value={selected} required={required} />

      <button
        id={id}
        type="button"
        role="combobox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.5rem",
          background: open ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.04)",
          border: `1px solid ${open ? "rgba(245,182,30,0.5)" : "rgba(245,182,30,0.14)"}`,
          borderRadius: open ? "0.5rem 0.5rem 0 0" : "0.5rem",
          padding: "0.75rem 1rem",
          color: selectedLabel ? "#F0EDE6" : "rgba(240,237,230,0.2)",
          fontSize: "0.875rem",
          fontFamily: "var(--font-jakarta, 'Plus Jakarta Sans', sans-serif)",
          cursor: disabled ? "not-allowed" : "pointer",
          outline: "none",
          textAlign: "left",
          boxShadow: open ? "0 0 0 3px rgba(245,182,30,0.07)" : "none",
          transition: "border-color 0.2s ease, background 0.2s ease",
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {selectedLabel ?? placeholder}
        </span>
        <ChevronDown
          size={14}
          style={{
            flexShrink: 0,
            color: open ? "#F5B61E" : "rgba(240,237,230,0.28)",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease, color 0.2s ease",
          }}
        />
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0, zIndex: 200,
          background: "#0d0d0d",
          border: "1px solid rgba(245,182,30,0.28)",
          borderTop: "1px solid rgba(245,182,30,0.08)",
          borderRadius: "0 0 0.5rem 0.5rem",
          boxShadow: "0 16px 48px rgba(0,0,0,0.75)",
        }}>
          <div style={{ padding: "0.45rem 0.75rem", borderBottom: "1px solid rgba(245,182,30,0.08)", display: "flex", alignItems: "center", gap: "0.45rem" }}>
            <Search size={11} style={{ color: "rgba(240,237,230,0.22)", flexShrink: 0 }} />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                color: "#F0EDE6",
                fontSize: "0.78rem",
                fontFamily: "var(--font-jakarta, 'Plus Jakarta Sans', sans-serif)",
              }}
            />
          </div>
          <ul role="listbox" style={{
            maxHeight: "220px", overflowY: "auto", listStyle: "none", margin: 0, padding: "0.25rem 0",
            scrollbarWidth: "thin", scrollbarColor: "rgba(245,182,30,0.2) transparent",
          }}>
            {filtered.map((opt) => {
              const isSel = String(opt.value) === String(selected);
              return (
                <li
                  key={opt.value}
                  role="option"
                  aria-selected={isSel}
                  onClick={() => handleSelect(opt)}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "0.55rem 1rem", fontSize: "0.82rem", cursor: "pointer",
                    color: isSel ? "#F5B61E" : "rgba(240,237,230,0.62)",
                    background: isSel ? "rgba(245,182,30,0.1)" : "transparent",
                    borderLeft: isSel ? "2px solid #F5B61E" : "2px solid transparent",
                    transition: "background 0.12s ease",
                    fontFamily: "var(--font-jakarta, 'Plus Jakarta Sans', sans-serif)",
                  }}
                  onMouseEnter={(e) => { if (!isSel) { (e.currentTarget as HTMLElement).style.background = "rgba(245,182,30,0.06)"; (e.currentTarget as HTMLElement).style.color = "rgba(240,237,230,0.9)"; } }}
                  onMouseLeave={(e) => { if (!isSel) { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "rgba(240,237,230,0.62)"; } }}
                >
                  <span>
                    {opt.label}
                    {opt.meta && <span style={{ marginLeft: "0.4rem", fontSize: "0.7rem", color: "rgba(240,237,230,0.28)" }}>{opt.meta}</span>}
                  </span>
                  {isSel && <Check size={11} style={{ color: "#F5B61E", flexShrink: 0 }} />}
                </li>
              );
            })}
            {filtered.length === 0 && (
              <li style={{ padding: "0.7rem 1rem", fontSize: "0.76rem", color: "rgba(240,237,230,0.22)", fontStyle: "italic" }}>
                No results for "{query}"
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Update `src/app/(app)/box-designs/BoxDesignForm.tsx`** — swap `Select` for `Combobox`

Change the import at the top:
```typescript
// Remove:
import Select from "@/components/ui/Select";
// Add:
import Combobox from "@/components/ui/Combobox";
```

Change both `<Select` usages to `<Combobox` — identical props, drop-in replacement.

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/Combobox.tsx src/app/(app)/box-designs/BoxDesignForm.tsx
git commit -m "feat: add searchable Combobox component; use in BoxDesignForm"
```

---

## Task 7: Component — MaterialExpandRow

**Files:**
- Create: `src/components/materials/MaterialExpandRow.tsx`

**Interfaces:**
- Consumes: `updateMaterialStatus(id, status)` and `updateMaterialStock(id, value)` from `@/actions/materials`
- Produces:
```typescript
interface MaterialExpandRowProps {
  material: {
    id: number;
    status: "ACTIVE" | "PENDING" | "INACTIVE";
    currentStockLevel: number;
    minStockLevel: number;
  };
  onFullEdit: () => void;
  onClose: () => void;
}
export default function MaterialExpandRow(props: MaterialExpandRowProps): JSX.Element
```

- [ ] **Step 1: Create `src/components/materials/MaterialExpandRow.tsx`**

```typescript
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

  return (
    <div className="expand-row">
      {/* Stock */}
      <div>
        <p style={{ fontSize: "0.58rem", letterSpacing: "0.12em", color: "rgba(240,237,230,0.28)", marginBottom: "0.5rem" }}>
          CURRENT STOCK
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
          <button type="button" className="nudge-btn" onClick={() => setStock((v) => Math.max(0, v - 1))}>−</button>
          <input
            type="number"
            min="0"
            value={stock}
            onChange={(e) => setStock(Math.max(0, Number(e.target.value)))}
            style={{
              width: "68px", background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(245,182,30,0.2)", borderRadius: "0.4rem",
              padding: "0.3rem 0.4rem", color: "#F0EDE6", fontSize: "0.875rem",
              textAlign: "center", outline: "none",
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
          <div style={{ marginTop: "0.5rem" }}>
            <div className="stock-bar-track">
              <div className={`stock-bar-fill ${barColor}`} style={{ width: `${pct}%` }} />
            </div>
            <p style={{ fontSize: "0.56rem", color: "rgba(240,237,230,0.28)", marginTop: "0.3rem" }}>Min: {min}</p>
          </div>
        )}
      </div>

      {/* Status + actions */}
      <div>
        <p style={{ fontSize: "0.58rem", letterSpacing: "0.12em", color: "rgba(240,237,230,0.28)", marginBottom: "0.5rem" }}>
          STATUS
        </p>
        <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", marginBottom: "0.875rem" }}>
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
        <div style={{ display: "flex", gap: "0.6rem" }}>
          <button
            type="button"
            onClick={onFullEdit}
            style={{
              display: "flex", alignItems: "center", gap: "0.3rem",
              padding: "0.3rem 0.7rem",
              background: "rgba(245,182,30,0.06)",
              border: "1px solid rgba(245,182,30,0.2)",
              borderRadius: "0.4rem",
              color: "rgba(240,237,230,0.55)",
              fontSize: "0.6rem", letterSpacing: "0.08em", cursor: "pointer",
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
              padding: "0.3rem 0.7rem",
              background: "transparent",
              border: "1px solid rgba(240,237,230,0.1)",
              borderRadius: "0.4rem",
              color: "rgba(240,237,230,0.28)",
              fontSize: "0.6rem", letterSpacing: "0.08em", cursor: "pointer",
              fontFamily: "var(--font-jakarta, 'Plus Jakarta Sans', sans-serif)",
            }}
          >
            <X size={10} /> CLOSE
          </button>
        </div>
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

- [ ] **Step 3: Commit**

```bash
git add src/components/materials/MaterialExpandRow.tsx
git commit -m "feat: add MaterialExpandRow with stock nudge and optimistic status chips"
```

---

## Task 8: Component — MaterialSlideOver

**Files:**
- Create: `src/components/materials/MaterialSlideOver.tsx`

**Interfaces:**
- Consumes: `createMaterial` and `updateMaterial` from `@/actions/materials`; `UnitInput` from `@/components/ui/UnitInput`
- Produces:
```typescript
export interface MaterialData {
  id: number; code: string; name: string; gsm: number;
  sheetLengthCm: number | null; sheetWidthCm: number | null;
  sheetLengthIn: number | null; sheetWidthIn: number | null;
  costPerSheet: number; unitPrice: number;
  minStockLevel: number; currentStockLevel: number;
  status: "ACTIVE" | "PENDING" | "INACTIVE";
}
interface MaterialSlideOverProps {
  open: boolean;
  onClose: () => void;
  existing?: MaterialData;
}
export default function MaterialSlideOver(props: MaterialSlideOverProps): JSX.Element
```

- [ ] **Step 1: Create `src/components/materials/MaterialSlideOver.tsx`**

```typescript
"use client";

import { useState, FormEvent, useEffect } from "react";
import { X } from "lucide-react";
import { MaterialStatus } from "@prisma/client";
import { createMaterial, updateMaterial } from "@/actions/materials";
import UnitInput from "@/components/ui/UnitInput";

export interface MaterialData {
  id: number; code: string; name: string; gsm: number;
  sheetLengthCm: number | null; sheetWidthCm: number | null;
  sheetLengthIn: number | null; sheetWidthIn: number | null;
  costPerSheet: number; unitPrice: number;
  minStockLevel: number; currentStockLevel: number;
  status: MaterialStatus;
}

interface Props {
  open: boolean;
  onClose: () => void;
  existing?: MaterialData;
}

const STATUS_OPTIONS: MaterialStatus[] = ["ACTIVE", "PENDING", "INACTIVE"];

export default function MaterialSlideOver({ open, onClose, existing }: Props) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<MaterialStatus>(existing?.status ?? "ACTIVE");
  const isEdit = !!existing;

  useEffect(() => {
    setStatus(existing?.status ?? "ACTIVE");
    setError("");
  }, [existing, open]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    fd.set("status", status);
    const result = isEdit ? await updateMaterial(existing!.id, fd) : await createMaterial(fd);
    setLoading(false);
    if ("error" in result) { setError(result.error); return; }
    onClose();
  }

  return (
    <>
      {open && <div className="slide-over-backdrop" onClick={() => !loading && onClose()} />}

      <div className={`slide-over-panel${open ? " open" : ""}`} role="dialog" aria-modal="true" aria-label={isEdit ? "Edit material" : "New material"}>
        <div className="slide-over-drag-handle" />

        <div className="slide-over-header">
          <h2 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#F5B61E", letterSpacing: "0.04em", margin: 0 }}>
            {isEdit ? `Edit — ${existing!.code}` : "New Material"}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(240,237,230,0.38)", display: "flex", padding: "0.25rem" }}>
            <X size={18} />
          </button>
        </div>

        <form id="material-slide-form" onSubmit={handleSubmit} noValidate style={{ display: "contents" }}>
          <div className="slide-over-body">
            {error && <div className="form-error" style={{ marginBottom: "1rem" }}>{error}</div>}

            <p className="form-section-label">IDENTITY</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem", marginBottom: "1.25rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div className="form-field">
                  <label className="form-label">CODE *</label>
                  <input name="code" type="text" className="form-input" defaultValue={existing?.code} required placeholder="ART-250" />
                </div>
                <div className="form-field">
                  <label className="form-label">GSM * <span style={{ color: "rgba(240,237,230,0.22)", fontSize: "0.56rem" }}>(80–600)</span></label>
                  <input name="gsm" type="number" min="80" max="600" className="form-input" defaultValue={existing?.gsm} required placeholder="250" />
                </div>
              </div>
              <div className="form-field">
                <label className="form-label">NAME *</label>
                <input name="name" type="text" className="form-input" defaultValue={existing?.name} required placeholder="Art Board 250 GSM" />
              </div>
            </div>

            <p className="form-section-label">DIMENSIONS</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1.25rem" }}>
              <UnitInput labelPrefix="LENGTH" nameCm="sheetLengthCm" nameIn="sheetLengthIn"
                defaultValueCm={existing?.sheetLengthCm} defaultValueIn={existing?.sheetLengthIn} required />
              <UnitInput labelPrefix="WIDTH" nameCm="sheetWidthCm" nameIn="sheetWidthIn"
                defaultValueCm={existing?.sheetWidthCm} defaultValueIn={existing?.sheetWidthIn} required />
            </div>

            <p className="form-section-label">PRICING</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1.25rem" }}>
              <div className="form-field">
                <label className="form-label">BUY PRICE / SHEET *</label>
                <div className="price-input-wrapper">
                  <span className="price-prefix">Rs.</span>
                  <input name="costPerSheet" type="number" step="0.01" min="0" className="form-input" defaultValue={existing?.costPerSheet} required placeholder="0.00" />
                </div>
              </div>
              <div className="form-field">
                <label className="form-label">UNIT PRICE / SHEET *</label>
                <div className="price-input-wrapper">
                  <span className="price-prefix">Rs.</span>
                  <input name="unitPrice" type="number" step="0.01" min="0" className="form-input" defaultValue={existing?.unitPrice} required placeholder="0.00" />
                </div>
              </div>
            </div>

            <p className="form-section-label">STOCK</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1.25rem" }}>
              <div className="form-field">
                <label className="form-label">MIN STOCK</label>
                <input name="minStockLevel" type="number" step="1" min="0" className="form-input" defaultValue={existing?.minStockLevel ?? 0} />
              </div>
              <div className="form-field">
                <label className="form-label">CURRENT STOCK</label>
                <input name="currentStockLevel" type="number" step="1" min="0" className="form-input" defaultValue={existing?.currentStockLevel ?? 0} />
              </div>
            </div>

            <p className="form-section-label">STATUS</p>
            <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap" }}>
              {STATUS_OPTIONS.map((s) => (
                <button key={s} type="button" className={`status-chip-btn${status === s ? ` active-${s}` : ""}`} onClick={() => setStatus(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="slide-over-footer">
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "0.7rem 1.25rem", background: "none",
                border: "1px solid rgba(245,182,30,0.18)", borderRadius: "0.5rem",
                color: "rgba(240,237,230,0.42)", fontSize: "0.7rem",
                letterSpacing: "0.08em", cursor: "pointer",
                fontFamily: "var(--font-jakarta, 'Plus Jakarta Sans', sans-serif)",
              }}
            >
              CANCEL
            </button>
            <button type="submit" form="material-slide-form" className="submit-btn" disabled={loading} style={{ flex: 1 }}>
              {loading ? "SAVING…" : isEdit ? "SAVE CHANGES" : "SAVE MATERIAL"}
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
git add src/components/materials/MaterialSlideOver.tsx
git commit -m "feat: add MaterialSlideOver panel (right rail desktop, bottom sheet mobile)"
```

---

## Task 9: Component — MaterialCard (mobile)

**Files:**
- Create: `src/components/materials/MaterialCard.tsx`

**Interfaces:**
- Consumes: `MaterialExpandRow` from `./MaterialExpandRow`
- Produces:
```typescript
export interface MaterialRow {
  id: number; code: string; name: string; gsm: number;
  sheetLengthCm: number | null; sheetWidthCm: number | null;
  sheetLengthIn: number | null; sheetWidthIn: number | null;
  costPerSheet: number; unitPrice: number;
  minStockLevel: number; currentStockLevel: number;
  status: "ACTIVE" | "PENDING" | "INACTIVE";
}
interface MaterialCardProps {
  material: MaterialRow;
  onFullEdit: (id: number) => void;
}
export default function MaterialCard(props: MaterialCardProps): JSX.Element
```

- [ ] **Step 1: Create `src/components/materials/MaterialCard.tsx`**

```typescript
"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { MaterialStatus } from "@prisma/client";
import MaterialExpandRow from "./MaterialExpandRow";

export interface MaterialRow {
  id: number; code: string; name: string; gsm: number;
  sheetLengthCm: number | null; sheetWidthCm: number | null;
  sheetLengthIn: number | null; sheetWidthIn: number | null;
  costPerSheet: number; unitPrice: number;
  minStockLevel: number; currentStockLevel: number;
  status: MaterialStatus;
}

const STATUS_PILL: Record<MaterialStatus, string> = {
  ACTIVE:   "status-fulfilled",
  PENDING:  "status-pending",
  INACTIVE: "status-cancelled",
};

interface Props {
  material: MaterialRow;
  onFullEdit: (id: number) => void;
}

export default function MaterialCard({ material: m, onFullEdit }: Props) {
  const [expanded, setExpanded] = useState(false);
  const lowStock = m.status === "ACTIVE" && m.minStockLevel > 0 && m.currentStockLevel <= m.minStockLevel;

  const dimStr = m.sheetLengthIn != null && m.sheetWidthIn != null
    ? `${m.sheetLengthIn} × ${m.sheetWidthIn} in`
    : m.sheetLengthCm != null && m.sheetWidthCm != null
    ? `${m.sheetLengthCm} × ${m.sheetWidthCm} cm`
    : null;

  return (
    <div className={`material-card${m.status === "PENDING" ? " pending" : lowStock ? " low-stock" : ""}`}>
      <div className="material-card-face" onClick={() => setExpanded((v) => !v)}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginBottom: "0.25rem" }}>
            <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "#F5B61E", letterSpacing: "0.06em" }}>{m.code}</span>
            <span className={`status-pill ${STATUS_PILL[m.status]}`}>{m.status}</span>
          </div>
          <p style={{ fontSize: "0.86rem", fontWeight: 600, color: "#F0EDE6", margin: "0 0 0.2rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name}</p>
          <p style={{ fontSize: "0.66rem", color: "rgba(240,237,230,0.38)", margin: 0 }}>
            BUY Rs.{m.costPerSheet.toFixed(2)} · UNIT Rs.{m.unitPrice.toFixed(2)}{dimStr && ` · ${dimStr}`}
          </p>
        </div>
        <ChevronRight size={15} className={`row-chevron${expanded ? " expanded" : ""}`} />
      </div>

      {expanded && (
        <div className="material-card-expand">
          <MaterialExpandRow
            material={m}
            onFullEdit={() => { setExpanded(false); onFullEdit(m.id); }}
            onClose={() => setExpanded(false)}
          />
        </div>
      )}
    </div>
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
git add src/components/materials/MaterialCard.tsx
git commit -m "feat: add MaterialCard mobile component with expand"
```

---

## Task 10: Page — Materials list overhaul

**Files:**
- Create: `src/components/materials/MaterialsClient.tsx`
- Modify: `src/app/(app)/materials/page.tsx`
- Modify: `src/app/(app)/materials/new/page.tsx`
- Modify: `src/app/(app)/materials/[id]/edit/page.tsx`

**Interfaces:**
- Consumes: `MaterialCard` and `MaterialRow` from `./MaterialCard`; `MaterialSlideOver` and `MaterialData` from `./MaterialSlideOver`; `MaterialExpandRow` from `./MaterialExpandRow`

- [ ] **Step 1: Create `src/components/materials/MaterialsClient.tsx`**

```typescript
"use client";

import React, { useState, useMemo } from "react";
import { Plus, Search, AlertTriangle } from "lucide-react";
import { ChevronRight } from "lucide-react";
import { MaterialStatus } from "@prisma/client";
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

interface Props { materials: MaterialRow[]; }

export default function MaterialsClient({ materials }: Props) {
  const [search, setSearch]         = useState("");
  const [filter, setFilter]         = useState<FilterTab>("ALL");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [slideOpen, setSlideOpen]   = useState(false);
  const [editTarget, setEditTarget] = useState<MaterialData | undefined>(undefined);

  const lowStockCount = materials.filter(
    (m) => m.status === "ACTIVE" && m.minStockLevel > 0 && m.currentStockLevel <= m.minStockLevel
  ).length;

  const filtered = useMemo(() => materials.filter((m) => {
    if (filter !== "ALL" && m.status !== filter) return false;
    const q = search.toLowerCase();
    return !q || m.code.toLowerCase().includes(q) || m.name.toLowerCase().includes(q);
  }), [materials, filter, search]);

  function openNew() { setEditTarget(undefined); setSlideOpen(true); }
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
        <div className="stat-strip-chip">
          <span className="value">{materials.length}</span><span>TOTAL</span>
        </div>
        <div className="stat-strip-chip">
          <span className="value" style={{ color: "#4ADE80" }}>{materials.filter((m) => m.status === "ACTIVE").length}</span><span>ACTIVE</span>
        </div>
        <div className="stat-strip-chip">
          <span className="value" style={{ color: "#FBBF24" }}>{materials.filter((m) => m.status === "PENDING").length}</span><span>PENDING</span>
        </div>
        {lowStockCount > 0 && (
          <div className="stat-strip-chip low-stock">
            <AlertTriangle size={11} style={{ color: "#F87171" }} />
            <span className="value">{lowStockCount}</span><span>LOW STOCK</span>
          </div>
        )}
      </div>

      {/* Controls */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        <div style={{ position: "relative", flex: "1 1 180px", maxWidth: "280px" }}>
          <Search size={12} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "rgba(240,237,230,0.22)", pointerEvents: "none" }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search code or name…"
            className="form-input"
            style={{ paddingLeft: "2.1rem", fontSize: "0.76rem" }}
          />
        </div>
        <div className="filter-tabs">
          {TABS.map((t) => (
            <button key={t} type="button" className={`filter-tab${filter === t ? " active" : ""}`} onClick={() => setFilter(t)}>{t}</button>
          ))}
        </div>
        <button type="button" className="cta-btn" onClick={openNew}
          style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.68rem", padding: "0.48rem 1rem", marginLeft: "auto" }}>
          <Plus size={12} />New Material
        </button>
      </div>

      {filtered.length === 0 && (
        <div className="content-card" style={{ padding: "3rem 0", textAlign: "center", fontSize: "0.8rem", color: "rgba(240,237,230,0.22)" }}>
          {search || filter !== "ALL" ? "No materials match your filter." : "No materials yet."}
        </div>
      )}

      {/* Desktop/tablet table */}
      {filtered.length > 0 && (
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
                {filtered.map((m) => {
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
        </div>
      )}

      {/* Mobile cards */}
      {filtered.length > 0 && (
        <div id="materials-card-view">
          {filtered.map((m) => (
            <MaterialCard key={m.id} material={m} onFullEdit={openEdit} />
          ))}
        </div>
      )}

      <MaterialSlideOver open={slideOpen} onClose={closeSlide} existing={editTarget} />
    </div>
  );
}
```

- [ ] **Step 2: Rewrite `src/app/(app)/materials/page.tsx`**

```typescript
import { requireAuth } from "@/lib/auth-guards";
import prisma from "@/lib/prisma";
import TopBar from "@/components/layout/TopBar";
import MaterialsClient from "@/components/materials/MaterialsClient";
import { MaterialStatus } from "@prisma/client";

export default async function MaterialsPage() {
  await requireAuth();

  const raw = await prisma.material.findMany({ orderBy: { code: "asc" } });
  const materials = raw.map((m) => ({
    id:                m.id,
    code:              m.code,
    name:              m.name,
    gsm:               m.gsm,
    sheetLengthCm:     m.sheetLengthCm != null ? Number(m.sheetLengthCm) : null,
    sheetWidthCm:      m.sheetWidthCm  != null ? Number(m.sheetWidthCm)  : null,
    sheetLengthIn:     m.sheetLengthIn != null ? Number(m.sheetLengthIn) : null,
    sheetWidthIn:      m.sheetWidthIn  != null ? Number(m.sheetWidthIn)  : null,
    costPerSheet:      Number(m.costPerSheet),
    unitPrice:         Number(m.unitPrice),
    minStockLevel:     Number(m.minStockLevel),
    currentStockLevel: Number(m.currentStockLevel),
    status:            m.status as MaterialStatus,
  }));

  return (
    <>
      <TopBar title="Materials" />
      <MaterialsClient materials={materials} />
    </>
  );
}
```

- [ ] **Step 3: Redirect `/materials/new` to list**

Replace all content of `src/app/(app)/materials/new/page.tsx`:

```typescript
import { redirect } from "next/navigation";
export default function NewMaterialPage() {
  redirect("/materials");
}
```

- [ ] **Step 4: Redirect `/materials/[id]/edit` to list**

Replace all content of `src/app/(app)/materials/[id]/edit/page.tsx`:

```typescript
import { redirect } from "next/navigation";
export default function EditMaterialPage() {
  redirect("/materials");
}
```

- [ ] **Step 5: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Smoke test in browser**

```bash
npm run dev
```

Navigate to `http://localhost:3000/materials`. Verify:
- [ ] Stat strip shows correct total, active, pending counts; low-stock chip pulses when any active material is at/below min
- [ ] Search input filters rows in real time by code or name
- [ ] Filter tabs (ALL / ACTIVE / PENDING / INACTIVE) show correct subsets
- [ ] Clicking a row chevron expands in-place showing stock nudge + status chips
- [ ] Changing stock value and clicking SAVE updates the stock level
- [ ] Clicking a status chip transitions status optimistically
- [ ] Clicking "New Material" opens slide-over from right (desktop) or bottom (mobile)
- [ ] Form saves a new material successfully; slide-over closes; list updates
- [ ] "FULL EDIT" from expand row opens slide-over pre-populated with that material's data
- [ ] Editing and saving updates the material
- [ ] At < 768px width: table disappears, cards appear; expand works in cards; slide-over becomes a bottom sheet
- [ ] Navigating to `/materials/new` redirects to `/materials`

- [ ] **Step 7: Commit**

```bash
git add src/components/materials/MaterialsClient.tsx src/app/(app)/materials/page.tsx src/app/(app)/materials/new/page.tsx "src/app/(app)/materials/[id]/edit/page.tsx"
git commit -m "feat: overhaul materials list with stat strip, filter tabs, expand rows, slide-over, and mobile cards"
```

---

## Task 11: BoxDesign forms — UnitInput + Combobox integration

**Files:**
- Modify: `src/app/(app)/box-designs/BoxDesignForm.tsx`
- Modify: `src/app/(app)/box-designs/[id]/edit/page.tsx`

**Interfaces:**
- Consumes: `UnitInput` from `@/components/ui/UnitInput`; updated `BoxDesign` Prisma type with inch fields

- [ ] **Step 1: Update `BoxDesign` interface and imports in `src/app/(app)/box-designs/BoxDesignForm.tsx`**

Replace the import block at top:
```typescript
import Combobox from "@/components/ui/Combobox";
import UnitInput from "@/components/ui/UnitInput";
```
(Remove the `Select` import — it was replaced by `Combobox` in Task 6.)

Replace the `interface BoxDesign` declaration:
```typescript
interface BoxDesign {
  id: number; code: string; name: string; designTypeId: number; materialId: number;
  lengthCm: number | null; widthCm: number | null; heightCm: number | null;
  lengthIn: number | null; widthIn: number | null; heightIn: number | null;
  cutLengthCm: number | null; cutWidthCm: number | null;
  cutLengthIn: number | null; cutWidthIn: number | null;
  unitPrice: number; custom: boolean; active: boolean;
}
```

- [ ] **Step 2: Replace the BOX DIMENSIONS section in `BoxDesignForm.tsx`**

Replace the div starting with `<p className="form-label" style={{ marginBottom: "0.75rem" }}>BOX DIMENSIONS (cm)</p>`:
```tsx
<div style={{ borderTop: "1px solid rgba(245,182,30,0.08)", paddingTop: "1rem" }}>
  <p className="form-section-label" style={{ marginBottom: "0.75rem" }}>BOX DIMENSIONS</p>
  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
    <UnitInput labelPrefix="LENGTH" nameCm="lengthCm" nameIn="lengthIn"
      defaultValueCm={existing?.lengthCm} defaultValueIn={existing?.lengthIn} required />
    <UnitInput labelPrefix="WIDTH" nameCm="widthCm" nameIn="widthIn"
      defaultValueCm={existing?.widthCm} defaultValueIn={existing?.widthIn} required />
    <UnitInput labelPrefix="HEIGHT" nameCm="heightCm" nameIn="heightIn"
      defaultValueCm={existing?.heightCm} defaultValueIn={existing?.heightIn} required />
  </div>
</div>
```

- [ ] **Step 3: Replace the CUT SHEET section in `BoxDesignForm.tsx`**

Replace the div starting with `<p className="form-label" style={{ marginBottom: "0.75rem" }}>CUT SHEET (cm)`:
```tsx
<div>
  <p className="form-section-label" style={{ marginBottom: "0.75rem" }}>CUT SHEET — used to compute raw area</p>
  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
    <UnitInput labelPrefix="CUT LENGTH" nameCm="cutLengthCm" nameIn="cutLengthIn"
      defaultValueCm={existing?.cutLengthCm} defaultValueIn={existing?.cutLengthIn} required />
    <UnitInput labelPrefix="CUT WIDTH" nameCm="cutWidthCm" nameIn="cutWidthIn"
      defaultValueCm={existing?.cutWidthCm} defaultValueIn={existing?.cutWidthIn} required />
  </div>
</div>
```

- [ ] **Step 4: Update `src/app/(app)/box-designs/[id]/edit/page.tsx`** — add null-coercion for inch fields

In the `.map()` call that converts Decimals, add:
```typescript
lengthIn:    bd.lengthIn    != null ? Number(bd.lengthIn)    : null,
widthIn:     bd.widthIn     != null ? Number(bd.widthIn)     : null,
heightIn:    bd.heightIn    != null ? Number(bd.heightIn)    : null,
cutLengthIn: bd.cutLengthIn != null ? Number(bd.cutLengthIn) : null,
cutWidthIn:  bd.cutWidthIn  != null ? Number(bd.cutWidthIn)  : null,
lengthCm:    bd.lengthCm    != null ? Number(bd.lengthCm)    : null,
widthCm:     bd.widthCm     != null ? Number(bd.widthCm)     : null,
heightCm:    bd.heightCm    != null ? Number(bd.heightCm)    : null,
cutLengthCm: bd.cutLengthCm != null ? Number(bd.cutLengthCm) : null,
cutWidthCm:  bd.cutWidthCm  != null ? Number(bd.cutWidthCm)  : null,
```

- [ ] **Step 5: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Smoke test in browser**

Navigate to `/box-designs/new`. Verify:
- [ ] BOX DIMENSIONS section shows three `UnitInput` components defaulting to inches
- [ ] CUT SHEET section shows two `UnitInput` components
- [ ] Toggle between IN/CM works for each pair independently
- [ ] Design Type and Material pickers show search input when open (Combobox)
- [ ] Form submits and saves correctly

- [ ] **Step 7: Commit**

```bash
git add src/app/(app)/box-designs/BoxDesignForm.tsx "src/app/(app)/box-designs/[id]/edit/page.tsx"
git commit -m "feat: replace cm-only dimension inputs with UnitInput in BoxDesignForm"
```

---

## Self-Review

### Spec Coverage

| Spec requirement | Task |
|---|---|
| Stats strip — total, active, pending, low-stock chip | Task 10 (MaterialsClient) |
| Filter tabs ALL/ACTIVE/PENDING/INACTIVE | Task 10 (MaterialsClient) |
| Search by code/name | Task 10 (MaterialsClient) |
| Desktop table 8 columns | Task 10 (MaterialsClient) |
| Tablet: hide GSM + SHEET columns | Task 4 (`.hide-tablet` CSS) |
| Mobile cards | Task 9 (MaterialCard) |
| Row expand: stock nudge + bar | Task 7 (MaterialExpandRow) |
| Row expand: status chips | Task 7 (MaterialExpandRow) |
| Optimistic status update | Task 7 (MaterialExpandRow `useTransition`) |
| Slide-over: right rail desktop | Task 4 (CSS) + Task 8 (MaterialSlideOver) |
| Slide-over: bottom sheet mobile | Task 4 (CSS `@media`) |
| UnitInput cm/in toggle, default inches | Task 5 |
| Both DB columns stored independently | Task 1 (schema) + Task 5 (hidden input) |
| Combobox with search for DB fields | Task 6 (Combobox) |
| Material `unitPrice` field | Task 1 (schema) + Task 2 (validation/action) |
| `updateMaterialStock` dedicated action | Task 2 |
| BoxDesign inch dimension fields | Task 1 + Task 3 + Task 11 |
| `calculateRawArea` handles nullable | Task 3 |
| New/edit pages redirect to list | Task 10 |
| quick-create inch + unitPrice fields | Task 3 |
| Pending row amber border | Task 10 (MaterialsClient inline style) |
| Low-stock row red border | Task 10 (MaterialsClient inline style) |

### Type Consistency

- `MaterialRow` is exported from `MaterialCard.tsx` and imported in `MaterialsClient.tsx` — consistent
- `MaterialData` is exported from `MaterialSlideOver.tsx` and imported in `MaterialsClient.tsx` — consistent
- `MaterialExpandRow` props: same shape used in both `MaterialsClient.tsx` (table expand) and `MaterialCard.tsx` — consistent
- `updateMaterialStock(id: number, value: number)` called in `MaterialExpandRow.tsx` matches signature in `materials.ts`
- `calculateRawArea` return type is now `number | null` — `prisma.boxDesign.create({ data: { rawAreaSqCm } })` accepts `null` since the field is `Decimal?` — consistent

### No Placeholder Check

All steps contain concrete code. No TBDs, no "similar to above", no vague instructions.
