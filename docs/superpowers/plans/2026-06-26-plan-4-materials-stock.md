# Plan 4: Materials & Stock Management

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the Materials module with stock management: auto-deduct feedback in the UI when orders move to IN_PRODUCTION, manual stock adjustment form, and a stock history view per material.

**Architecture:** Stock deduction server action is already wired in Plan 1 (Task 6). This plan wires the UI to expose that capability: manual adjustment slide-over on the material detail page, and a stock history table with pagination. Materials list gains a low-stock badge.

**Tech Stack:** Next.js 16 App Router, Prisma 7, Server Actions, existing slide-over/stat-chip pattern

## Global Constraints

- `searchParams` is a Promise — must be awaited
- Prisma Decimal → `Number()` before passing to Client Components
- Server Actions return `{ error: string }` or `{ success: true }`
- `MaterialStatus` enum: ACTIVE / PENDING / INACTIVE
- `StockAdjustment` model added in Plan 1 — must be complete before this plan runs
- **Prerequisite: Plan 1 must be complete**

---

### Task 1: Manual stock adjustment action

**Files:**
- Create: `src/actions/stock-adjustments.ts`

- [ ] **Step 1: Create the action**

Create `src/actions/stock-adjustments.ts`:

```typescript
"use server";

import { requireAuth } from "@/lib/auth-guards";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { revalidatePath } from "next/cache";

const schema = z.object({
  materialId: z.coerce.number().int().positive(),
  delta:      z.coerce.number().refine((v) => v !== 0, "Quantity cannot be zero"),
  reason:     z.string().min(1, "Reason is required").max(255),
  referenceId: z.coerce.number().int().optional(),
});

export async function createManualStockAdjustment(formData: FormData) {
  const session = await requireAuth();

  const parsed = schema.safeParse({
    materialId:  formData.get("materialId"),
    delta:       formData.get("delta"),
    reason:      formData.get("reason"),
    referenceId: formData.get("referenceId") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Validation error" };

  const { materialId, delta, reason, referenceId } = parsed.data;

  const material = await prisma.material.findUnique({
    where:  { id: materialId },
    select: { id: true, stockQty: true },
  });
  if (!material) return { error: "Material not found" };

  const newStock = Number(material.stockQty) + delta;
  if (newStock < 0) return { error: `Insufficient stock. Current: ${Number(material.stockQty)}, Requested deduction: ${Math.abs(delta)}` };

  await prisma.$transaction([
    prisma.material.update({
      where: { id: materialId },
      data:  { stockQty: newStock },
    }),
    prisma.stockAdjustment.create({
      data: {
        materialId,
        delta,
        reason,
        adjustedById: Number(session.user.id),
        orderId:      referenceId ?? null,
      },
    }),
  ]);

  revalidatePath(`/materials/${materialId}`);
  revalidatePath("/materials");
  return { success: true as const };
}

export async function getMaterialStockHistory(materialId: number, page = 1, pageSize = 20) {
  const [adjustments, total] = await Promise.all([
    prisma.stockAdjustment.findMany({
      where:   { materialId },
      orderBy: { createdAt: "desc" },
      skip:    (page - 1) * pageSize,
      take:    pageSize,
      select: {
        id:          true,
        delta:       true,
        reason:      true,
        createdAt:   true,
        adjustedBy:  { select: { name: true } },
        order:       { select: { orderNo: true } },
      },
    }),
    prisma.stockAdjustment.count({ where: { materialId } }),
  ]);

  return {
    adjustments: adjustments.map((a) => ({
      ...a,
      delta:     Number(a.delta),
      createdAt: a.createdAt.toISOString(),
    })),
    total,
    pages: Math.ceil(total / pageSize),
  };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/actions/stock-adjustments.ts
git commit -m "feat: manual stock adjustment action + stock history query"
```

---

### Task 2: StockAdjustmentSlideOver component

**Files:**
- Create: `src/components/materials/StockAdjustmentSlideOver.tsx`

- [ ] **Step 1: Create the slide-over**

Create `src/components/materials/StockAdjustmentSlideOver.tsx`:

```typescript
"use client";

import { useState, FormEvent } from "react";
import { X, TrendingUp, TrendingDown } from "lucide-react";
import { createManualStockAdjustment } from "@/actions/stock-adjustments";

interface Props {
  materialId:   number;
  materialName: string;
  currentStock: number;
  isOpen:       boolean;
  onClose:      () => void;
  onSaved:      (newStock: number) => void;
}

const inp: React.CSSProperties = {
  width: "100%", background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(245,182,30,0.14)", borderRadius: "0.45rem",
  padding: "0.65rem 0.85rem", color: "#F0EDE6", fontSize: "0.83rem", outline: "none",
};
const lbl: React.CSSProperties = {
  fontSize: "0.6rem", letterSpacing: "0.09em",
  color: "rgba(240,237,230,0.4)", display: "block", marginBottom: "0.3rem", fontWeight: 600,
};

export default function StockAdjustmentSlideOver({ materialId, materialName, currentStock, isOpen, onClose, onSaved }: Props) {
  const [mode,    setMode]    = useState<"add" | "remove">("add");
  const [qty,     setQty]     = useState("");
  const [reason,  setReason]  = useState("");
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");

  const delta     = Number(qty) || 0;
  const newStock  = mode === "add" ? currentStock + delta : currentStock - delta;
  const isNegResult = newStock < 0;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!qty || delta <= 0) { setError("Enter a positive quantity."); return; }
    if (!reason.trim()) { setError("Reason is required."); return; }
    if (isNegResult) { setError("Adjustment would result in negative stock."); return; }

    setSaving(true); setError("");
    const fd = new FormData();
    fd.set("materialId", String(materialId));
    fd.set("delta", String(mode === "add" ? delta : -delta));
    fd.set("reason", reason);

    const result = await createManualStockAdjustment(fd);
    setSaving(false);
    if ("error" in result) { setError(result.error); return; }
    onSaved(newStock);
    setQty(""); setReason("");
    onClose();
  }

  if (!isOpen) return null;

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 59, backdropFilter: "blur(2px)" }} />
      <div style={{
        position: "fixed", top: 0, right: 0, height: "100%", width: "min(400px, 100vw)",
        background: "#141414", borderLeft: "1px solid rgba(245,182,30,0.18)",
        boxShadow: "-12px 0 48px rgba(0,0,0,0.7)", zIndex: 60,
        display: "flex", flexDirection: "column",
        animation: "slideInRight 0.22s ease-out",
      }}>
        <style>{`@keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 1.25rem", borderBottom: "1px solid rgba(245,182,30,0.1)", flexShrink: 0 }}>
          <div>
            <h2 style={{ fontSize: "0.9rem", fontWeight: 700, color: "#F5B61E", margin: 0 }}>Stock Adjustment</h2>
            <p style={{ fontSize: "0.62rem", color: "rgba(240,237,230,0.35)", margin: "0.2rem 0 0", letterSpacing: "0.06em" }}>{materialName.toUpperCase()}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(240,237,230,0.4)" }}><X size={18} /></button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "1.1rem 1.25rem", flex: 1 }}>
            {/* Current stock */}
            <div style={{ textAlign: "center", marginBottom: "1.25rem", padding: "0.85rem", background: "rgba(245,182,30,0.04)", borderRadius: "0.5rem", border: "1px solid rgba(245,182,30,0.1)" }}>
              <p style={{ fontSize: "0.6rem", letterSpacing: "0.09em", color: "rgba(240,237,230,0.35)", marginBottom: "0.25rem" }}>CURRENT STOCK</p>
              <p style={{ fontSize: "1.75rem", fontWeight: 800, color: currentStock <= 10 ? "#F87171" : "#F5B61E", letterSpacing: "-0.02em" }}>{currentStock}</p>
              <p style={{ fontSize: "0.65rem", color: "rgba(240,237,230,0.35)" }}>sheets</p>
            </div>

            {/* Mode toggle */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "1rem" }}>
              {(["add", "remove"] as const).map((m) => (
                <button
                  key={m} type="button" onClick={() => setMode(m)}
                  style={{
                    padding: "0.65rem", borderRadius: "0.45rem",
                    background: mode === m ? (m === "add" ? "rgba(74,222,128,0.12)" : "rgba(248,113,113,0.12)") : "rgba(255,255,255,0.03)",
                    border: `1px solid ${mode === m ? (m === "add" ? "rgba(74,222,128,0.35)" : "rgba(248,113,113,0.35)") : "rgba(245,182,30,0.1)"}`,
                    color: mode === m ? (m === "add" ? "#4ADE80" : "#F87171") : "rgba(240,237,230,0.4)",
                    fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.07em", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem",
                  }}
                >
                  {m === "add" ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                  {m === "add" ? "ADD STOCK" : "REMOVE STOCK"}
                </button>
              ))}
            </div>

            {error && <div style={{ padding: "0.55rem 0.75rem", background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)", borderRadius: "0.4rem", fontSize: "0.72rem", color: "#F87171", marginBottom: "0.75rem" }}>{error}</div>}

            <div style={{ marginBottom: "0.75rem" }}>
              <label style={lbl}>QUANTITY (SHEETS) *</label>
              <input type="number" min="1" step="1" value={qty} onChange={(e) => setQty(e.target.value)} required style={inp} />
            </div>

            <div style={{ marginBottom: "0.75rem" }}>
              <label style={lbl}>REASON *</label>
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="e.g. New delivery from supplier, Damaged sheets written off" required style={{ ...inp, resize: "vertical" }} />
            </div>

            {/* Preview */}
            {delta > 0 && (
              <div style={{ padding: "0.6rem 0.75rem", background: "rgba(255,255,255,0.03)", borderRadius: "0.4rem", border: "1px solid rgba(245,182,30,0.08)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.72rem", color: "rgba(240,237,230,0.4)" }}>After adjustment:</span>
                <span style={{ fontSize: "0.9rem", fontWeight: 700, color: isNegResult ? "#F87171" : "#4ADE80" }}>
                  {newStock} sheets {isNegResult ? "(INVALID)" : ""}
                </span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{ padding: "0.9rem 1.25rem", borderTop: "1px solid rgba(245,182,30,0.1)", display: "flex", gap: "0.6rem", flexShrink: 0 }}>
            <button type="submit" disabled={saving || isNegResult} style={{ flex: 1, padding: "0.65rem", background: "rgba(245,182,30,0.15)", border: "1px solid rgba(245,182,30,0.3)", borderRadius: "0.5rem", color: "#F5B61E", fontSize: "0.75rem", letterSpacing: "0.08em", fontWeight: 700, cursor: saving || isNegResult ? "not-allowed" : "pointer", opacity: saving || isNegResult ? 0.6 : 1 }}>
              {saving ? "SAVING…" : "SAVE ADJUSTMENT"}
            </button>
            <button type="button" onClick={onClose} style={{ padding: "0.65rem 1rem", background: "none", border: "1px solid rgba(245,182,30,0.12)", borderRadius: "0.5rem", color: "rgba(240,237,230,0.4)", fontSize: "0.72rem", cursor: "pointer" }}>Cancel</button>
          </div>
        </form>
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
git add src/components/materials/StockAdjustmentSlideOver.tsx
git commit -m "feat: StockAdjustmentSlideOver component — add/remove stock with preview"
```

---

### Task 3: Stock history view + wire into material detail page

**Files:**
- Create: `src/components/materials/StockHistoryTable.tsx`
- Modify: `src/app/(app)/materials/[id]/page.tsx` (or equivalent material detail page)

**Note:** If there is no material detail page, add stock history + adjustment button directly to the expand-row in the materials list. Check the existing codebase first.

- [ ] **Step 1: Create StockHistoryTable**

Create `src/components/materials/StockHistoryTable.tsx`:

```typescript
interface StockHistoryEntry {
  id:          number;
  delta:       number;
  reason:      string;
  createdAt:   string;
  adjustedBy:  { name: string };
  order:       { orderNo: string } | null;
}

interface Props { entries: StockHistoryEntry[]; }

export default function StockHistoryTable({ entries }: Props) {
  const th: React.CSSProperties = {
    padding: "0.45rem 0.65rem", fontSize: "0.58rem", letterSpacing: "0.1em",
    color: "rgba(240,237,230,0.3)", fontWeight: 600, textAlign: "left",
    borderBottom: "1px solid rgba(245,182,30,0.08)",
  };
  const td: React.CSSProperties = {
    padding: "0.5rem 0.65rem", fontSize: "0.75rem",
    borderBottom: "1px solid rgba(245,182,30,0.04)", verticalAlign: "middle",
  };

  if (entries.length === 0) {
    return <p style={{ fontSize: "0.72rem", color: "rgba(240,237,230,0.2)", padding: "0.5rem 0" }}>No stock adjustments recorded.</p>;
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={th}>DATE</th>
            <th style={{ ...th, textAlign: "center" }}>CHANGE</th>
            <th style={th}>REASON</th>
            <th style={th}>BY</th>
            <th style={th}>ORDER</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.id}>
              <td style={{ ...td, color: "rgba(240,237,230,0.45)", whiteSpace: "nowrap" }}>
                {new Date(e.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
              </td>
              <td style={{ ...td, textAlign: "center" }}>
                <span style={{ fontWeight: 700, color: e.delta > 0 ? "#4ADE80" : "#F87171", fontSize: "0.82rem" }}>
                  {e.delta > 0 ? `+${e.delta}` : e.delta}
                </span>
              </td>
              <td style={{ ...td, color: "#F0EDE6" }}>{e.reason}</td>
              <td style={{ ...td, color: "rgba(240,237,230,0.5)" }}>{e.adjustedBy.name}</td>
              <td style={{ ...td, color: "rgba(240,237,230,0.4)", fontSize: "0.68rem" }}>
                {e.order ? e.order.orderNo : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Add stock section to material detail / expand row**

In the existing materials expanded row (within the materials list client component), add after the material info:

```typescript
// Add imports:
import { useState } from "react";
import StockAdjustmentSlideOver from "@/components/materials/StockAdjustmentSlideOver";
import StockHistoryTable from "@/components/materials/StockHistoryTable";

// In the expanded row content, add:
const [stockSlideOpen, setStockSlideOpen] = useState(false);
const [localStock, setLocalStock] = useState(Number(material.stockQty));

// Render the stock section:
<div style={{ borderTop: "1px solid rgba(245,182,30,0.06)", paddingTop: "0.75rem", marginTop: "0.75rem" }}>
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
    <span style={{ fontSize: "0.62rem", letterSpacing: "0.1em", color: "rgba(240,237,230,0.3)" }}>STOCK</span>
    <button
      type="button"
      onClick={() => setStockSlideOpen(true)}
      style={{
        display: "flex", alignItems: "center", gap: "0.3rem",
        background: "rgba(245,182,30,0.07)", border: "1px solid rgba(245,182,30,0.2)",
        borderRadius: "0.35rem", padding: "0.25rem 0.65rem",
        color: "#F5B61E", fontSize: "0.62rem", letterSpacing: "0.07em", cursor: "pointer",
      }}
    >
      + Adjust Stock
    </button>
  </div>
  <p style={{ fontSize: "1.15rem", fontWeight: 700, color: localStock <= 10 ? "#F87171" : "#F5B61E", margin: "0 0 0.4rem" }}>
    {localStock} <span style={{ fontSize: "0.65rem", color: "rgba(240,237,230,0.35)", fontWeight: 400 }}>sheets on hand</span>
    {localStock <= 10 && <span style={{ fontSize: "0.62rem", color: "#F87171", marginLeft: "0.5rem" }}>⚠ LOW STOCK</span>}
  </p>
  <StockHistoryTable entries={material.stockAdjustments ?? []} />
</div>

<StockAdjustmentSlideOver
  materialId={material.id}
  materialName={material.name}
  currentStock={localStock}
  isOpen={stockSlideOpen}
  onClose={() => setStockSlideOpen(false)}
  onSaved={(newStock) => setLocalStock(newStock)}
/>
```

- [ ] **Step 3: Pass stockAdjustments from server query**

In the materials page server component, include stock adjustments in the Prisma query for expanded rows:

```typescript
stockAdjustments: {
  orderBy: { createdAt: "desc" },
  take: 20,
  select: {
    id: true, delta: true, reason: true, createdAt: true,
    adjustedBy: { select: { name: true } },
    order: { select: { orderNo: true } },
  },
},
```

Then serialize:
```typescript
stockAdjustments: m.stockAdjustments.map((a) => ({
  ...a,
  delta: Number(a.delta),
  createdAt: a.createdAt.toISOString(),
})),
```

- [ ] **Step 4: Add low-stock badge to materials list table**

In the materials list table, add a low-stock badge next to the stock qty cell:

```typescript
// In the stock qty cell:
<td style={td}>
  <span style={{ fontWeight: 600, color: Number(m.stockQty) <= 10 ? "#F87171" : "#F0EDE6" }}>
    {Number(m.stockQty)}
  </span>
  {Number(m.stockQty) <= 10 && (
    <span style={{ marginLeft: "0.4rem", fontSize: "0.55rem", color: "#F87171", background: "rgba(248,113,113,0.1)", padding: "0.1rem 0.4rem", borderRadius: "0.25rem", border: "1px solid rgba(248,113,113,0.2)", verticalAlign: "middle" }}>
      LOW
    </span>
  )}
</td>
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 6: Manual test**

```bash
npm run dev
```

1. Open /materials
2. Expand a material row → see current stock, "Adjust Stock" button, history table
3. Click "Adjust Stock" → add 10 sheets, reason "Test delivery" → save
4. Stock updates in slide-over preview AND in list row
5. History table shows new entry with your name, timestamp, +10
6. Try removing more than available → error "Insufficient stock"
7. Material with stock ≤ 10 shows LOW badge in list

- [ ] **Step 7: Commit**

```bash
git add src/components/materials/ src/app/(app)/materials/
git commit -m "feat: stock adjustment slide-over, stock history table, low-stock badge on materials list"
```
