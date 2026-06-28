# UI Fixes — Batch 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 9 UI/UX issues across Orders, Customers, Designs, and Stock Items pages in the Buddies OMS.

**Architecture:** All changes are purely client-side React + CSS — no new API routes, no schema migrations, no new dependencies. Each task is self-contained with a browser verification step.

**Tech Stack:** Next.js 16 App Router, React, TypeScript, Prisma (server components only), Lucide icons, inline styles + global CSS classes.

## Global Constraints

- Dark theme palette: background `rgba(255,255,255,0.04)`, border `rgba(245,182,30,0.14)`, text `#F0EDE6`, accent gold `#F5B61E`
- All selects/dropdowns must use `appearance: none` + absolute-positioned `ChevronDown` from lucide
- Combobox component: `src/components/ui/Combobox.tsx` — import and use for all searchable dropdowns
- Slide-overs must use existing CSS classes: `slide-over-backdrop`, `slide-over-panel open`, `slide-over-header`, `slide-over-body`, `slide-over-footer`
- No new packages. No new files unless explicitly listed.
- Dev server: `npm run dev` (port 3000)

---

### Task 1: globals.css — Add Missing Stock/Module CSS Classes

**Files:**
- Modify: `src/app/globals.css` (append after line 994)

**Interfaces:**
- Produces: `.module-root`, `.section-title`, `.empty-state`, `.filter-tab-bar`, `.edit-btn` — consumed by `StockItemsClient.tsx`

- [ ] **Step 1: Append missing classes to globals.css**

Open `src/app/globals.css` and append the following block at the very end of the file (after the existing `@keyframes fadeInDown`):

```css
/* ── Stock / module layout ─────────────────────────── */

.module-root { padding: 1.25rem 1.75rem; }

.section-title {
  font-size: 0.88rem;
  font-weight: 600;
  color: #F0EDE6;
  letter-spacing: 0.04em;
}

.empty-state {
  padding: 3rem 0;
  text-align: center;
  font-size: 0.8rem;
  color: rgba(240, 237, 230, 0.22);
}

.filter-tab-bar {
  display: flex;
  gap: 0.2rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.edit-btn {
  padding: 0.3rem 0.75rem;
  font-size: 0.65rem;
  letter-spacing: 0.06em;
  background: rgba(245, 182, 30, 0.07);
  border: 1px solid rgba(245, 182, 30, 0.2);
  border-radius: 0.35rem;
  color: #F5B61E;
  cursor: pointer;
  font-weight: 600;
  font-family: var(--font-jakarta, 'Plus Jakarta Sans', sans-serif);
}

.edit-btn:hover { background: rgba(245, 182, 30, 0.12); }
```

- [ ] **Step 2: Verify in browser**

Run `npm run dev`. Navigate to `/stock-items`. Confirm:
- Page is padded with `1.25rem 1.75rem` margins (not flush against edge)
- "Stock Items" heading renders in `#F0EDE6` (cream white), not unstyled black
- Filter tabs (All / In Stock / Low Stock / Out of Stock) are visible with gold active state
- Edit buttons render as gold-bordered small buttons, not plain `<button>` defaults

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "fix: add missing module/stock CSS classes to globals"
```

---

### Task 2: StockItemSlideOver — Fix Class Names to Use Existing Slide-Over Classes

**Files:**
- Modify: `src/components/stock-items/StockItemSlideOver.tsx`

**Context:** This component uses `slide-panel`, `slide-overlay`, `slide-header`, `slide-title`, `slide-close` — none of these exist in `globals.css`. The correct classes are `slide-over-backdrop`, `slide-over-panel open`, `slide-over-header`, `slide-over-body`, `slide-over-footer` (defined at line 625 of globals.css). The form inputs already have correct dark-theme styles.

**Interfaces:**
- Consumes: `slide-over-backdrop`, `slide-over-panel`, `slide-over-header`, `slide-over-body`, `slide-over-footer` (globals.css)
- Produces: working dark-theme slide-over for stock items

- [ ] **Step 1: Replace the entire file with corrected class names**

Replace the content of `src/components/stock-items/StockItemSlideOver.tsx`:

```tsx
"use client";

import { useRef, useTransition } from "react";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { createStockItem, updateStockItem, toggleStockItemActive } from "@/actions/stock-items";
import type { StockItemRow } from "./StockItemsClient";

interface Props {
  isOpen: boolean;
  editItem: StockItemRow | null;
  onClose: () => void;
}

export default function StockItemSlideOver({ isOpen, editItem, onClose }: Props) {
  const router  = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();

  const inp: React.CSSProperties = {
    width: "100%", background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(245,182,30,0.14)", borderRadius: "0.5rem",
    padding: "0.6rem 0.9rem", color: "#F0EDE6", fontSize: "0.82rem", outline: "none",
  };
  const lbl: React.CSSProperties = {
    fontSize: "0.62rem", letterSpacing: "0.08em", color: "rgba(240,237,230,0.4)",
    display: "block", marginBottom: "0.4rem",
  };

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData(formRef.current!);
    startTransition(async () => {
      const result = editItem
        ? await updateStockItem(editItem.id, fd)
        : await createStockItem(fd);
      if ("error" in result && result.error) {
        alert(result.error);
        return;
      }
      router.refresh();
      onClose();
    });
  }

  async function handleToggleActive() {
    if (!editItem) return;
    await toggleStockItemActive(editItem.id, !editItem.active);
    router.refresh();
    onClose();
  }

  if (!isOpen) return null;

  return (
    <>
      <div className="slide-over-backdrop" onClick={onClose} />
      <div className="slide-over-panel open">
        <div className="slide-over-header">
          <button
            type="button"
            onClick={onClose}
            style={{ background: "none", border: "none", color: "rgba(240,237,230,0.45)", cursor: "pointer", padding: "0.25rem" }}
          >
            <X size={16} />
          </button>
          <span style={{ fontWeight: 600, fontSize: "0.85rem", color: "#F0EDE6" }}>
            {editItem ? "Edit Stock Item" : "New Stock Item"}
          </span>
        </div>

        <form ref={formRef} onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
          <div className="slide-over-body" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label style={lbl}>CODE</label>
              <input name="code" required maxLength={50} defaultValue={editItem?.code ?? ""} style={inp} />
            </div>
            <div>
              <label style={lbl}>NAME</label>
              <input name="name" required maxLength={150} defaultValue={editItem?.name ?? ""} style={inp} />
            </div>
            <div>
              <label style={lbl}>DESCRIPTION (optional)</label>
              <input name="description" maxLength={255} defaultValue={editItem?.description ?? ""} style={inp} />
            </div>
            <div>
              <label style={lbl}>STOCK UNIT</label>
              <input name="stockUnit" required maxLength={50} placeholder="e.g. boxes, liters, meters" defaultValue={editItem?.stockUnit ?? ""} style={inp} />
              <p style={{ fontSize: "0.6rem", color: "rgba(240,237,230,0.3)", marginTop: "0.3rem" }}>
                Used as the label throughout the stock UI — be precise (e.g. "boxes" not "box")
              </p>
            </div>
            <div>
              <label style={lbl}>UNIT PRICE (Rs.)</label>
              <input name="unitPrice" type="number" min="0" step="0.01" required defaultValue={editItem?.unitPrice ?? 0} style={inp} />
            </div>
            <div>
              <label style={lbl}>MIN STOCK (low-stock threshold)</label>
              <input name="minStock" type="number" min="0" step="0.01" defaultValue={editItem?.minStock ?? 0} style={inp} />
            </div>
          </div>

          <div className="slide-over-footer">
            {editItem && (
              <button
                type="button"
                onClick={handleToggleActive}
                style={{
                  background: "none",
                  border: `1px solid ${editItem.active ? "rgba(248,113,113,0.3)" : "rgba(74,222,128,0.3)"}`,
                  borderRadius: "0.5rem", padding: "0.6rem 1rem",
                  color: editItem.active ? "#F87171" : "#4ADE80",
                  fontSize: "0.72rem", letterSpacing: "0.07em", cursor: "pointer",
                }}
              >
                {editItem.active ? "DEACTIVATE" : "REACTIVATE"}
              </button>
            )}
            <button type="button" onClick={onClose} style={{
              padding: "0.6rem 1.25rem", background: "none",
              border: "1px solid rgba(245,182,30,0.18)", borderRadius: "0.5rem",
              color: "rgba(240,237,230,0.45)", fontSize: "0.72rem",
              letterSpacing: "0.08em", cursor: "pointer",
              fontFamily: "var(--font-jakarta, 'Plus Jakarta Sans', sans-serif)",
            }}>
              CANCEL
            </button>
            <button type="submit" className="submit-btn" disabled={pending} style={{ flex: 1 }}>
              {pending ? "SAVING…" : editItem ? "SAVE CHANGES" : "CREATE STOCK ITEM"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Verify in browser**

Navigate to `/stock-items`. Click `+ New Stock Item`. Confirm:
- Slide-over panel appears from the right with dark background (not white)
- Form fields render with gold border on dark background
- Close button (X) and CANCEL/CREATE buttons visible in footer
- Clicking backdrop closes the panel

- [ ] **Step 3: Commit**

```bash
git add src/components/stock-items/StockItemSlideOver.tsx
git commit -m "fix: rewrite StockItemSlideOver to use existing slide-over CSS classes"
```

---

### Task 3: OrderItemsEditor + OrderStatusForm — Themed Native Select Dropdowns

**Files:**
- Modify: `src/components/orders/OrderItemsEditor.tsx`
- Modify: `src/app/(app)/orders/[id]/OrderStatusForm.tsx`

**Context:** Both files have native `<select>` elements that show browser default styling (white background, blue highlight). Fix by adding `appearance: "none"`, `paddingRight: "1.75rem"` and wrapping with a relative div + absolute `ChevronDown` icon.

**Interfaces:**
- Produces: themed selects matching the dark gold palette

- [ ] **Step 1: Fix OrderItemsEditor item-type select**

In `src/components/orders/OrderItemsEditor.tsx`, add `ChevronDown` to the existing lucide import line:
```tsx
import { Plus, Trash2, Sparkles, AlertTriangle, ChevronDown } from "lucide-react";
```

Find the `<td style={td}>` block containing the `<select>` for item type (around line 198) and replace it:

```tsx
{/* ITEM TYPE selector */}
<td style={td}>
  <div style={{ position: "relative" }}>
    <select
      value={itemType}
      onChange={(e) => handleItemTypeChange(item.key, e.target.value as "design" | "stock")}
      style={{ ...sel, appearance: "none", paddingRight: "1.75rem" }}
    >
      <option value="design">Box Design</option>
      <option value="stock">Stock Item</option>
    </select>
    <ChevronDown
      size={12}
      style={{ position: "absolute", right: "0.5rem", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "rgba(245,182,30,0.5)" }}
    />
  </div>
</td>
```

- [ ] **Step 2: Fix OrderStatusForm select**

In `src/app/(app)/orders/[id]/OrderStatusForm.tsx`, add `ChevronDown` to imports:
```tsx
import { ChevronDown } from "lucide-react";
```

Find the `<select>` for new status (around line 55) and replace the surrounding `<div>`:

```tsx
<div style={{ flex: 1, minWidth: "140px" }}>
  <label style={{ fontSize: "0.62rem", letterSpacing: "0.08em", color: "rgba(240,237,230,0.3)", display: "block", marginBottom: "0.4rem" }}>
    NEW STATUS
  </label>
  <div style={{ position: "relative" }}>
    <select
      value={newStatus}
      onChange={(e) => setNewStatus(e.target.value as OrderStatusKey)}
      style={{ ...input, appearance: "none", paddingRight: "1.75rem" }}
    >
      {allowed.map((s) => (
        <option key={s} value={s} style={{ background: "#0d0d0d" }}>{STATUS_LABELS[s]}</option>
      ))}
    </select>
    <ChevronDown
      size={12}
      style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "rgba(245,182,30,0.5)" }}
    />
  </div>
</div>
```

- [ ] **Step 3: Verify in browser**

1. Navigate to `/orders/new`. Confirm the ITEM TYPE dropdown (Box Design / Stock Item) has dark background, gold border, no browser-default blue highlight. Click it to confirm the chevron rotates (it won't — it's not the Combobox — but confirm no blue flash).
2. Navigate to an order detail page. Confirm the UPDATE STATUS select has dark background, gold border, and a gold chevron icon.

- [ ] **Step 4: Commit**

```bash
git add src/components/orders/OrderItemsEditor.tsx src/app/(app)/orders/[id]/OrderStatusForm.tsx
git commit -m "fix: apply dark theme to native select dropdowns in OrderItemsEditor and OrderStatusForm"
```

---

### Task 4: NewOrderForm — Delivery Method Combobox + Discount Type Toggle

**Files:**
- Modify: `src/app/(app)/orders/new/NewOrderForm.tsx`

**Interfaces:**
- Consumes: `Combobox` from `@/components/ui/Combobox`
- Produces: working delivery method dropdown + % / Rs. discount toggle

- [ ] **Step 1: Replace NewOrderForm delivery method section and add discount type state**

Replace the entire content of `src/app/(app)/orders/new/NewOrderForm.tsx` with:

```tsx
"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { createOrder } from "@/actions/orders";
import CustomerSearchCombobox from "@/components/orders/CustomerSearchCombobox";
import { type CustomerOption } from "@/components/orders/CustomerQuickCreate";
import OrderItemsEditor, { type BoxTypeOption, type BoxDesignOption, type OrderItem, type StockItemOption } from "@/components/orders/OrderItemsEditor";
import { calculateQuantityDiscount } from "@/lib/utils/calculations";
import type { DesignTypeOption, MaterialOption } from "@/components/orders/QuickCreateDesignPanel";
import { useSession } from "next-auth/react";
import Combobox from "@/components/ui/Combobox";

interface LeadSource    { id: number; name: string; }
interface DeliveryMethodOption { id: number; name: string; }

interface Props {
  customers:       CustomerOption[];
  boxTypes:        BoxTypeOption[];
  boxDesigns:      BoxDesignOption[];
  designTypes:     DesignTypeOption[];
  materials:       MaterialOption[];
  leadSources:     LeadSource[];
  stockItems:      StockItemOption[];
  deliveryMethods: DeliveryMethodOption[];
}

const today           = new Date().toISOString().split("T")[0];
const defaultDelivery = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];

export default function NewOrderForm({ customers, boxTypes, boxDesigns, designTypes, materials, leadSources, stockItems, deliveryMethods }: Props) {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  const [customerId,        setCustomerId]        = useState<number | null>(null);
  const [error,             setError]             = useState("");
  const [loading,           setLoading]           = useState(false);
  const [items,             setItems]             = useState<OrderItem[]>([]);
  const [discountOverride,  setDiscountOverride]  = useState<string>("");
  const [discountType,      setDiscountType]      = useState<"percent" | "fixed">("percent");
  const [leadSourceId,      setLeadSourceId]      = useState<string>("");
  const [deliveryMethodId,  setDeliveryMethodId]  = useState<number | null>(null);
  const [deliveryChargeStr, setDeliveryChargeStr] = useState<string>("");

  const totalQty       = items.reduce((s, i) => s + i.quantity, 0);
  const totalAmount    = items.reduce((s, i) => s + i.lineTotal, 0);
  const autoRate       = calculateQuantityDiscount(totalQty);
  const effectiveRate  = discountOverride !== "" && isAdmin
    ? (discountType === "fixed"
        ? Math.min(1, parseFloat(discountOverride) / (totalAmount || 1))
        : parseFloat(discountOverride) / 100)
    : autoRate;
  const discountAmount  = Math.round(totalAmount * effectiveRate * 100) / 100;
  const deliveryCharge  = parseFloat(deliveryChargeStr || "0") || 0;
  const netAmount       = Math.round((totalAmount - discountAmount + deliveryCharge) * 100) / 100;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!customerId) { setError("Please select a customer."); return; }
    if (items.length === 0) { setError("Add at least one order item."); return; }
    if (items.some((i) => (!i.boxDesignId && !i.stockItemId) || i.quantity < 1)) {
      setError("All items must have a box design or stock item selected, and quantity ≥ 1."); return;
    }

    setLoading(true); setError("");
    const fd = new FormData(e.currentTarget);
    fd.set("customerId", String(customerId));
    fd.set("itemsJson", JSON.stringify(items.map((i) => ({
      ...(i.stockItemId > 0 ? { stockItemId: i.stockItemId } : { boxDesignId: i.boxDesignId }),
      quantity:  i.quantity,
      unitPrice: i.unitPrice,
    }))));
    if (leadSourceId) fd.set("leadSourceId", leadSourceId);
    if (discountOverride !== "" && isAdmin) {
      const resolvedPercent = discountType === "fixed"
        ? Math.min(100, (parseFloat(discountOverride) / (totalAmount || 1)) * 100)
        : parseFloat(discountOverride);
      fd.set("discountPercent", String(resolvedPercent));
    }
    if (deliveryMethodId) fd.set("deliveryMethodId", String(deliveryMethodId));
    fd.set("deliveryCharge", String(deliveryCharge));

    const result = await createOrder(fd);
    if (result?.error) { setError(result.error); setLoading(false); }
  }

  const label: React.CSSProperties = {
    fontSize: "0.62rem", letterSpacing: "0.1em", color: "rgba(240,237,230,0.35)", fontWeight: 600,
    display: "block", marginBottom: "0.4rem",
  };
  const input: React.CSSProperties = {
    width: "100%", background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(245,182,30,0.14)", borderRadius: "0.5rem",
    padding: "0.7rem 1rem", color: "#F0EDE6", fontSize: "0.875rem", outline: "none",
  };

  return (
    <>
      <Link href="/orders" className="nav-link" style={{ fontSize: "0.68rem", display: "inline-block", marginBottom: "1.25rem" }}>
        ← Back to Orders
      </Link>

      <div className="content-card">
        <h2 style={{ fontSize: "1rem", fontWeight: 600, color: "#F5B61E", letterSpacing: "0.04em", marginBottom: "1.5rem" }}>
          New Order
        </h2>

        {error && <div className="form-error" style={{ marginBottom: "1rem" }}>{error}</div>}

        <form onSubmit={handleSubmit} noValidate>
          {/* Customer */}
          <div style={{ marginBottom: "1rem" }}>
            <label style={label}>CUSTOMER *</label>
            <CustomerSearchCombobox
              customers={customers}
              value={customerId}
              onChange={(id) => setCustomerId(id)}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
            <div>
              <label style={label}>ORDER DATE *</label>
              <input name="orderDate" type="date" defaultValue={today} required style={input} />
            </div>
            <div>
              <label style={label}>DELIVERY DATE</label>
              <input name="deliveryDate" type="date" defaultValue={defaultDelivery} style={input} />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
            <div>
              <label style={label}>LEAD SOURCE</label>
              <Combobox
                name="__leadSource"
                placeholder="— None —"
                value={leadSourceId}
                options={[
                  { value: "", label: "— None —" },
                  ...leadSources.map((ls) => ({ value: ls.id, label: ls.name })),
                ]}
                onChange={(v) => setLeadSourceId(String(v))}
              />
            </div>
            <div></div>
          </div>

          {/* Delivery */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
            <div>
              <label style={label}>DELIVERY METHOD</label>
              <Combobox
                name="__deliveryMethod"
                placeholder="— None —"
                value={deliveryMethodId ?? ""}
                options={[
                  { value: "", label: "— None —" },
                  ...deliveryMethods.map((m) => ({ value: m.id, label: m.name })),
                ]}
                onChange={(v) => setDeliveryMethodId(v === "" ? null : Number(v))}
              />
            </div>
            <div>
              <label style={label}>DELIVERY CHARGE (Rs.)</label>
              <input
                type="number" min="0" step="0.01"
                value={deliveryChargeStr}
                onChange={(e) => setDeliveryChargeStr(e.target.value)}
                placeholder="0.00"
                style={input}
              />
            </div>
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <label style={label}>REMARKS</label>
            <textarea name="remarks" rows={2} style={{ ...input, resize: "vertical" }} />
          </div>

          {/* Items */}
          <div style={{ borderTop: "1px solid rgba(245,182,30,0.08)", paddingTop: "1.25rem", marginBottom: "1.25rem" }}>
            <OrderItemsEditor
              boxTypes={boxTypes}
              boxDesigns={boxDesigns}
              designTypes={designTypes}
              materials={materials}
              stockItems={stockItems}
              isAdmin={isAdmin}
              onChange={setItems}
            />
          </div>

          {/* Totals */}
          {items.length > 0 && (
            <div style={{ background: "rgba(245,182,30,0.04)", border: "1px solid rgba(245,182,30,0.1)", borderRadius: "0.5rem", padding: "1rem 1.25rem", marginBottom: "1.5rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem", alignItems: "flex-end" }}>
                <div style={{ display: "flex", justifyContent: "space-between", width: "300px", fontSize: "0.82rem", color: "rgba(240,237,230,0.55)" }}>
                  <span>Subtotal</span><span>Rs. {totalAmount.toFixed(2)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", width: "300px", fontSize: "0.78rem", color: "rgba(240,237,230,0.4)" }}>
                  <span>Total Qty: {totalQty}</span>
                  <span style={{ color: autoRate > 0 ? "#4ADE80" : "rgba(240,237,230,0.3)" }}>
                    Auto discount: {(autoRate * 100).toFixed(0)}%
                  </span>
                </div>
                {isAdmin && (
                  <div style={{ display: "flex", justifyContent: "space-between", width: "300px", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ fontSize: "0.72rem", color: "rgba(240,237,230,0.4)", flexShrink: 0 }}>Discount override:</span>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: "0.2rem", fontSize: "0.7rem", color: "rgba(240,237,230,0.5)", cursor: "pointer" }}>
                        <input type="radio" name="discountTypeNew" value="percent" checked={discountType === "percent"} onChange={() => setDiscountType("percent")} style={{ accentColor: "#F5B61E" }} />
                        %
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: "0.2rem", fontSize: "0.7rem", color: "rgba(240,237,230,0.5)", cursor: "pointer" }}>
                        <input type="radio" name="discountTypeNew" value="fixed" checked={discountType === "fixed"} onChange={() => setDiscountType("fixed")} style={{ accentColor: "#F5B61E" }} />
                        Rs.
                      </label>
                      <input
                        type="number" min="0" step="0.01"
                        value={discountOverride}
                        onChange={(e) => setDiscountOverride(e.target.value)}
                        placeholder={discountType === "percent" ? String((autoRate * 100).toFixed(0)) : "0.00"}
                        style={{ width: "80px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(245,182,30,0.2)", borderRadius: "0.35rem", padding: "0.3rem 0.5rem", color: "#F5B61E", fontSize: "0.78rem", outline: "none" }}
                      />
                    </div>
                  </div>
                )}
                {discountAmount > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", width: "300px", fontSize: "0.82rem", color: "#F87171" }}>
                    <span>Discount ({(effectiveRate * 100).toFixed(1)}%)</span>
                    <span>− Rs. {discountAmount.toFixed(2)}</span>
                  </div>
                )}
                {deliveryCharge > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", width: "300px", fontSize: "0.82rem", color: "rgba(240,237,230,0.55)" }}>
                    <span>{deliveryMethods.find((m) => m.id === deliveryMethodId)?.name ?? "Delivery"}</span>
                    <span>+ Rs. {deliveryCharge.toFixed(2)}</span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", width: "300px", fontSize: "1rem", fontWeight: 700, color: "#F5B61E", borderTop: "1px solid rgba(245,182,30,0.15)", paddingTop: "0.45rem", marginTop: "0.2rem" }}>
                  <span>Net Amount</span><span>Rs. {netAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button type="submit" className="submit-btn" disabled={loading} style={{ flex: 1 }}>
              {loading ? "CREATING ORDER…" : "CREATE ORDER"}
            </button>
            <Link href="/orders">
              <button type="button" style={{ padding: "0.7rem 1.25rem", background: "none", border: "1px solid rgba(245,182,30,0.18)", borderRadius: "0.5rem", color: "rgba(240,237,230,0.45)", fontSize: "0.72rem", letterSpacing: "0.08em", cursor: "pointer" }}>
                CANCEL
              </button>
            </Link>
          </div>
        </form>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Verify in browser**

Navigate to `/orders/new`. Confirm:
- DELIVERY METHOD shows a gold-themed Combobox dropdown (searchable), not pill buttons
- Add an item, then check the totals section: two radio buttons `%` and `Rs.` appear for admin users before the discount input
- Switching to `Rs.` radio changes the placeholder and computes discount correctly as a fixed amount
- Switching back to `%` reverts to percentage mode

- [ ] **Step 3: Commit**

```bash
git add src/app/(app)/orders/new/NewOrderForm.tsx
git commit -m "feat: delivery method Combobox + percent/fixed discount toggle in new order form"
```

---

### Task 5: EditOrderForm — Delivery Method Combobox + Discount Type Toggle

**Files:**
- Modify: `src/app/(app)/orders/[id]/edit/EditOrderForm.tsx`

**Interfaces:**
- Consumes: `Combobox` (already imported)
- Produces: same delivery Combobox + discount type toggle as Task 4 but initialized from `order.discountPercent`

- [ ] **Step 1: Replace EditOrderForm delivery method and discount sections**

Replace the entire content of `src/app/(app)/orders/[id]/edit/EditOrderForm.tsx` with:

```tsx
"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { updateOrderItems } from "@/actions/orders";
import OrderItemsEditor, { type BoxTypeOption, type BoxDesignOption, type OrderItem, type StockItemOption } from "@/components/orders/OrderItemsEditor";
import { calculateQuantityDiscount } from "@/lib/utils/calculations";
import type { DesignTypeOption, MaterialOption } from "@/components/orders/QuickCreateDesignPanel";
import Combobox from "@/components/ui/Combobox";

interface Props {
  order: {
    id: number; status: string; deliveryDate: string | null;
    remarks: string | null; leadSourceId: number | null;
    discountPercent: number;
    deliveryCharge:   number;
    deliveryMethodId: number | null;
    items: OrderItem[];
  };
  boxTypes:        BoxTypeOption[];
  boxDesigns:      BoxDesignOption[];
  designTypes:     DesignTypeOption[];
  materials:       MaterialOption[];
  leadSources:     { id: number; name: string }[];
  stockItems:      StockItemOption[];
  deliveryMethods: { id: number; name: string }[];
  isAdmin:         boolean;
}

export default function EditOrderForm({ order, boxTypes, boxDesigns, designTypes, materials, leadSources, stockItems, deliveryMethods, isAdmin }: Props) {
  const router = useRouter();
  const [error,             setError]             = useState("");
  const [loading,           setLoading]           = useState(false);
  const [items,             setItems]             = useState<OrderItem[]>(order.items);
  const [discountOverride,  setDiscountOverride]  = useState(
    order.discountPercent > 0 ? String(order.discountPercent) : ""
  );
  const [discountType,      setDiscountType]      = useState<"percent" | "fixed">("percent");
  const [deliveryMethodId,  setDeliveryMethodId]  = useState<number | null>(order.deliveryMethodId);
  const [deliveryChargeStr, setDeliveryChargeStr] = useState<string>(
    order.deliveryCharge > 0 ? String(order.deliveryCharge) : ""
  );

  const canEditDiscount = ["DRAFT", "CONFIRMED", "IN_PRODUCTION"].includes(order.status);

  const totalQty       = items.reduce((s, i) => s + i.quantity, 0);
  const totalAmount    = items.reduce((s, i) => s + i.lineTotal, 0);
  const autoRate       = calculateQuantityDiscount(totalQty);
  const effectiveRate  = discountOverride !== "" && isAdmin
    ? (discountType === "fixed"
        ? Math.min(1, parseFloat(discountOverride) / (totalAmount || 1))
        : parseFloat(discountOverride) / 100)
    : autoRate;
  const discountAmount = Math.round(totalAmount * effectiveRate * 100) / 100;
  const deliveryCharge = parseFloat(deliveryChargeStr || "0") || 0;
  const netAmount      = Math.round((totalAmount - discountAmount + deliveryCharge) * 100) / 100;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (items.length === 0) { setError("At least one item required."); return; }

    setLoading(true); setError("");
    const fd = new FormData(e.currentTarget);
    fd.set("itemsJson", JSON.stringify(items.map((i) => ({
      ...(i.stockItemId > 0 ? { stockItemId: i.stockItemId } : { boxDesignId: i.boxDesignId }),
      quantity:  i.quantity,
      unitPrice: i.unitPrice,
    }))));
    if (discountOverride !== "" && isAdmin) {
      const resolvedPercent = discountType === "fixed"
        ? Math.min(100, (parseFloat(discountOverride) / (totalAmount || 1)) * 100)
        : parseFloat(discountOverride);
      fd.set("discountPercent", String(resolvedPercent));
    }
    if (deliveryMethodId) fd.set("deliveryMethodId", String(deliveryMethodId));
    fd.set("deliveryCharge", String(deliveryCharge));

    const result = await updateOrderItems(order.id, fd);
    if (result?.error) { setError(result.error); setLoading(false); return; }
    router.push(`/orders/${order.id}`);
  }

  const label: React.CSSProperties = {
    fontSize: "0.62rem", letterSpacing: "0.1em", color: "rgba(240,237,230,0.35)",
    fontWeight: 600, display: "block", marginBottom: "0.4rem",
  };
  const input: React.CSSProperties = {
    width: "100%", background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(245,182,30,0.14)", borderRadius: "0.5rem",
    padding: "0.7rem 1rem", color: "#F0EDE6", fontSize: "0.875rem", outline: "none",
  };

  return (
    <>
      <Link href={`/orders/${order.id}`} className="nav-link" style={{ fontSize: "0.68rem", display: "inline-block", marginBottom: "1.25rem" }}>
        ← Back to Order
      </Link>

      <div className="content-card">
        <h2 style={{ fontSize: "1rem", fontWeight: 600, color: "#F5B61E", marginBottom: "1.5rem" }}>
          Edit Order
        </h2>

        {error && <div className="form-error" style={{ marginBottom: "1rem" }}>{error}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
            <div>
              <label style={label}>DELIVERY DATE</label>
              <input name="deliveryDate" type="date" defaultValue={order.deliveryDate ?? ""} style={input} />
            </div>
            <div>
              <label style={label}>LEAD SOURCE</label>
              <Combobox
                name="leadSourceId"
                placeholder="— None —"
                defaultValue={order.leadSourceId ?? ""}
                options={[
                  { value: "", label: "— None —" },
                  ...leadSources.map((ls) => ({ value: ls.id, label: ls.name })),
                ]}
              />
            </div>
          </div>

          {/* Delivery */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
            <div>
              <label style={label}>DELIVERY METHOD</label>
              <Combobox
                name="__deliveryMethod"
                placeholder="— None —"
                value={deliveryMethodId ?? ""}
                options={[
                  { value: "", label: "— None —" },
                  ...deliveryMethods.map((m) => ({ value: m.id, label: m.name })),
                ]}
                onChange={(v) => setDeliveryMethodId(v === "" ? null : Number(v))}
              />
            </div>
            <div>
              <label style={label}>DELIVERY CHARGE (Rs.)</label>
              <input
                type="number" min="0" step="0.01"
                value={deliveryChargeStr}
                onChange={(e) => setDeliveryChargeStr(e.target.value)}
                placeholder="0.00"
                style={input}
              />
            </div>
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <label style={label}>REMARKS</label>
            <textarea name="remarks" rows={2} defaultValue={order.remarks ?? ""} style={{ ...input, resize: "vertical" }} />
          </div>

          <div style={{ borderTop: "1px solid rgba(245,182,30,0.08)", paddingTop: "1.25rem", marginBottom: "1.25rem" }}>
            <OrderItemsEditor
              boxTypes={boxTypes}
              boxDesigns={boxDesigns}
              designTypes={designTypes}
              materials={materials}
              stockItems={stockItems}
              isAdmin={isAdmin}
              onChange={setItems}
              initialItems={order.items}
            />
          </div>

          {/* Totals */}
          {items.length > 0 && (
            <div style={{ background: "rgba(245,182,30,0.04)", border: "1px solid rgba(245,182,30,0.1)", borderRadius: "0.5rem", padding: "1rem 1.25rem", marginBottom: "1.5rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem", alignItems: "flex-end" }}>
                <div style={{ display: "flex", justifyContent: "space-between", width: "300px", fontSize: "0.82rem", color: "rgba(240,237,230,0.55)" }}>
                  <span>Subtotal</span><span>Rs. {totalAmount.toFixed(2)}</span>
                </div>
                {isAdmin && canEditDiscount && (
                  <div style={{ display: "flex", justifyContent: "space-between", width: "300px", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ fontSize: "0.72rem", color: "rgba(240,237,230,0.4)", flexShrink: 0 }}>Discount override:</span>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: "0.2rem", fontSize: "0.7rem", color: "rgba(240,237,230,0.5)", cursor: "pointer" }}>
                        <input type="radio" name="discountTypeEdit" value="percent" checked={discountType === "percent"} onChange={() => setDiscountType("percent")} style={{ accentColor: "#F5B61E" }} />
                        %
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: "0.2rem", fontSize: "0.7rem", color: "rgba(240,237,230,0.5)", cursor: "pointer" }}>
                        <input type="radio" name="discountTypeEdit" value="fixed" checked={discountType === "fixed"} onChange={() => setDiscountType("fixed")} style={{ accentColor: "#F5B61E" }} />
                        Rs.
                      </label>
                      <input
                        type="number" min="0" step="0.01"
                        value={discountOverride}
                        onChange={(e) => setDiscountOverride(e.target.value)}
                        placeholder={discountType === "percent" ? String((autoRate * 100).toFixed(0)) : "0.00"}
                        style={{ width: "80px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(245,182,30,0.2)", borderRadius: "0.35rem", padding: "0.3rem 0.5rem", color: "#F5B61E", fontSize: "0.78rem", outline: "none" }}
                      />
                    </div>
                  </div>
                )}
                {discountAmount > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", width: "300px", fontSize: "0.82rem", color: "#F87171" }}>
                    <span>Discount ({(effectiveRate * 100).toFixed(1)}%)</span>
                    <span>− Rs. {discountAmount.toFixed(2)}</span>
                  </div>
                )}
                {deliveryCharge > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", width: "300px", fontSize: "0.82rem", color: "rgba(240,237,230,0.55)" }}>
                    <span>{deliveryMethods.find((m) => m.id === deliveryMethodId)?.name ?? "Delivery"}</span>
                    <span>+ Rs. {deliveryCharge.toFixed(2)}</span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", width: "300px", fontSize: "1rem", fontWeight: 700, color: "#F5B61E", borderTop: "1px solid rgba(245,182,30,0.15)", paddingTop: "0.45rem", marginTop: "0.2rem" }}>
                  <span>Net Amount</span><span>Rs. {netAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button type="submit" className="submit-btn" disabled={loading} style={{ flex: 1 }}>
              {loading ? "SAVING…" : "SAVE CHANGES"}
            </button>
            <Link href={`/orders/${order.id}`}>
              <button type="button" style={{ padding: "0.7rem 1.25rem", background: "none", border: "1px solid rgba(245,182,30,0.18)", borderRadius: "0.5rem", color: "rgba(240,237,230,0.45)", fontSize: "0.72rem", letterSpacing: "0.08em", cursor: "pointer" }}>
                CANCEL
              </button>
            </Link>
          </div>
        </form>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Verify in browser**

Navigate to an editable order, click EDIT ORDER. Confirm:
- DELIVERY METHOD shows a Combobox (not pill buttons) with current method pre-selected
- Discount type radio buttons appear for admin
- Net amount recalculates correctly when switching between % and Rs. discount modes

- [ ] **Step 3: Commit**

```bash
git add src/app/(app)/orders/[id]/edit/EditOrderForm.tsx
git commit -m "feat: delivery method Combobox + percent/fixed discount toggle in edit order form"
```

---

### Task 6: OrderDetailsForm — Delivery Method Combobox

**Files:**
- Modify: `src/app/(app)/orders/[id]/OrderDetailsForm.tsx`

**Interfaces:**
- Consumes: `Combobox` from `@/components/ui/Combobox`

- [ ] **Step 1: Replace pill buttons with Combobox**

In `src/app/(app)/orders/[id]/OrderDetailsForm.tsx`, add the Combobox import at the top:
```tsx
import Combobox from "@/components/ui/Combobox";
```

Then replace the delivery method `<div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>` block and its `{deliveryMethods.map(...)}` content with:

```tsx
<Combobox
  name="__deliveryMethod"
  placeholder="— None —"
  value={deliveryMethodId ?? ""}
  options={[
    { value: "", label: "— None —" },
    ...deliveryMethods.map((m) => ({ value: m.id, label: m.name })),
  ]}
  onChange={(v) => setDeliveryMethodId(v === "" ? null : Number(v))}
/>
```

Remove the `{deliveryMethods.length === 0 && (...)}` fallback span — the Combobox handles empty options gracefully.

- [ ] **Step 2: Verify in browser**

Navigate to an order detail page. Scroll to the EDIT DETAILS section. Confirm DELIVERY METHOD is now a Combobox dropdown (not pill buttons) with the existing value pre-selected.

- [ ] **Step 3: Commit**

```bash
git add src/app/(app)/orders/[id]/OrderDetailsForm.tsx
git commit -m "fix: replace delivery method pill buttons with Combobox in OrderDetailsForm"
```

---

### Task 7: Order View Page — Remove Edit Details Section + Add Size/Type to Items Table

**Files:**
- Modify: `src/app/(app)/orders/[id]/page.tsx`

**Interfaces:**
- Produces: items table rows with subtitle line showing `boxTypeName · sizeStr`

- [ ] **Step 1: Update the Prisma query to include design dimensions**

In `src/app/(app)/orders/[id]/page.tsx`, find the `include: { ... items: { ... include: { boxDesign: ... } } }` block. Replace:

```ts
include: {
  boxDesign: { select: { material: { select: { status: true } } } },
},
```

with:

```ts
include: {
  boxDesign: {
    select: {
      material:   { select: { status: true } },
      designType: { select: { name: true } },
      lengthCm: true, widthCm: true, heightCm: true,
      lengthIn: true, widthIn: true, heightIn: true,
    },
  },
},
```

- [ ] **Step 2: Add sizeStr helper and remove OrderDetailsForm**

After the `if (!order) notFound();` line, add the helper function:

```ts
function itemSizeStr(bd: NonNullable<typeof order.items[number]["boxDesign"]> | null): string | undefined {
  if (!bd) return undefined;
  const inDims = [bd.lengthIn, bd.widthIn, bd.heightIn].filter((v): v is NonNullable<typeof v> => v != null).map((v) => Number(v).toFixed(0));
  if (inDims.length === 3) return `${inDims.join("×")} in`;
  const cmDims = [bd.lengthCm, bd.widthCm, bd.heightCm].filter((v): v is NonNullable<typeof v> => v != null).map((v) => Number(v).toFixed(0));
  if (cmDims.length === 3) return `${cmDims.join("×")} cm`;
  return undefined;
}
```

Remove the `deliveryMethods` Prisma query block (the one after `if (!order) notFound();`):
```ts
// DELETE THIS ENTIRE BLOCK:
const deliveryMethods = await prisma.deliveryMethod.findMany({
  where: { active: true }, orderBy: { id: "asc" }, select: { id: true, name: true },
});
```

Remove the `OrderDetailsForm` import at the top of the file.

- [ ] **Step 3: Update items table render to show subtitle**

Find the `{order.items.map((item) => (` block in the items table. Replace:

```tsx
{order.items.map((item) => (
  <tr key={item.id}>
    <td style={{ fontWeight: 700, color: "#F5B61E", fontSize: "0.72rem", letterSpacing: "0.06em" }}>{item.designCode}</td>
    <td style={{ color: "#F0EDE6" }}>{item.designName}</td>
    <td style={{ textAlign: "right", color: "rgba(240,237,230,0.7)" }}>{item.quantity.toLocaleString()}</td>
    <td style={{ textAlign: "right", color: "rgba(240,237,230,0.7)" }}>Rs. {Number(item.unitPrice).toFixed(2)}</td>
    <td style={{ textAlign: "right", fontWeight: 600, color: "#F0EDE6" }}>Rs. {Number(item.lineTotal).toFixed(2)}</td>
  </tr>
))}
```

with:

```tsx
{order.items.map((item) => {
  const boxTypeName = item.boxDesign?.designType?.name;
  const sizeStr     = itemSizeStr(item.boxDesign ?? null);
  return (
    <tr key={item.id}>
      <td style={{ fontWeight: 700, color: "#F5B61E", fontSize: "0.72rem", letterSpacing: "0.06em" }}>{item.designCode}</td>
      <td style={{ color: "#F0EDE6" }}>
        <div>{item.designName}</div>
        {(boxTypeName || sizeStr) && (
          <div style={{ fontSize: "0.68rem", color: "rgba(240,237,230,0.3)", marginTop: "0.1rem" }}>
            {[boxTypeName, sizeStr].filter(Boolean).join("  ·  ")}
          </div>
        )}
      </td>
      <td style={{ textAlign: "right", color: "rgba(240,237,230,0.7)" }}>{item.quantity.toLocaleString()}</td>
      <td style={{ textAlign: "right", color: "rgba(240,237,230,0.7)" }}>Rs. {Number(item.unitPrice).toFixed(2)}</td>
      <td style={{ textAlign: "right", fontWeight: 600, color: "#F0EDE6" }}>Rs. {Number(item.lineTotal).toFixed(2)}</td>
    </tr>
  );
})}
```

- [ ] **Step 4: Remove the OrderDetailsForm section block from JSX**

Find and delete this entire block from the JSX:
```tsx
{/* ── Details Edit ── */}
<div style={section}>
  <OrderDetailsForm
    orderId={order.id}
    deliveryDate={deliveryDate}
    remarks={order.remarks}
    deliveryMethodId={order.deliveryMethodId}
    deliveryCharge={deliveryCharge}
    deliveryMethods={deliveryMethods}
  />
</div>
```

- [ ] **Step 5: Verify in browser**

Navigate to an order detail page. Confirm:
- Items table shows design name with dimmed subtitle (e.g. `Normal · 4×1×1 cm`) for box designs that have dimensions set
- The "EDIT DETAILS" section (delivery date, remarks, delivery method, save button) is gone from the bottom of the page
- The "EDIT ORDER" button still navigates to the edit page

- [ ] **Step 6: Commit**

```bash
git add src/app/(app)/orders/[id]/page.tsx
git commit -m "feat: add size/type subtitle to order items table; remove redundant edit-details section from order view"
```

---

### Task 8: WhatsAppShareButton — Share PDF File

**Files:**
- Modify: `src/app/(app)/orders/[id]/WhatsAppShareButton.tsx`

**Interfaces:**
- Consumes: `/api/invoice/${publicToken}/pdf` (existing route)
- Consumes: `useToast` from `@/lib/toast-context`
- Produces: button that fetches PDF and shares via Web Share API, or downloads as fallback

- [ ] **Step 1: Replace WhatsAppShareButton with file-share version**

Replace the entire content of `src/app/(app)/orders/[id]/WhatsAppShareButton.tsx`:

```tsx
"use client";

import { useState } from "react";
import { MessageCircle, Link2 } from "lucide-react";
import { useToast } from "@/lib/toast-context";

interface Props {
  orderNo:      string;
  customerName: string;
  netAmount:    number;
  balance:      number;
  publicToken:  string | null;
}

export default function WhatsAppShareButton({ orderNo, publicToken }: Props) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  if (!publicToken) return null;

  async function handleShare() {
    setLoading(true);
    try {
      const res  = await fetch(`/api/invoice/${publicToken}/pdf`);
      const blob = await res.blob();
      const file = new File([blob], `${orderNo}-invoice.pdf`, { type: "application/pdf" });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `Invoice ${orderNo}` });
      } else {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `${orderNo}-invoice.pdf`;
        a.click();
        URL.revokeObjectURL(a.href);
        showToast("PDF downloaded — share it manually via WhatsApp");
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        showToast("Could not share PDF — check your connection");
      }
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    const url = `${window.location.origin}/invoice/${publicToken}`;
    navigator.clipboard.writeText(url).catch(() => {});
  }

  return (
    <>
      <button
        type="button"
        onClick={handleShare}
        disabled={loading}
        style={{
          display: "flex", alignItems: "center", gap: "0.4rem",
          background: "rgba(37,211,102,0.1)", border: "1px solid rgba(37,211,102,0.3)",
          borderRadius: "0.5rem", padding: "0.5rem 0.9rem",
          color: "#25D366", fontSize: "0.68rem", letterSpacing: "0.07em",
          cursor: loading ? "wait" : "pointer", opacity: loading ? 0.7 : 1,
        }}
      >
        <MessageCircle size={13} /> {loading ? "LOADING…" : "WHATSAPP"}
      </button>
      <button
        type="button"
        onClick={handleCopy}
        style={{
          display: "flex", alignItems: "center", gap: "0.4rem",
          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(245,182,30,0.12)",
          borderRadius: "0.5rem", padding: "0.5rem 0.9rem",
          color: "rgba(240,237,230,0.45)", fontSize: "0.68rem", letterSpacing: "0.07em", cursor: "pointer",
        }}
      >
        <Link2 size={13} /> COPY LINK
      </button>
    </>
  );
}
```

- [ ] **Step 2: Verify in browser (mobile)**

On a mobile device (or Chrome DevTools mobile emulation), navigate to an order detail page. Click WHATSAPP:
- Button shows "LOADING…" while fetching
- On mobile with WhatsApp installed: OS share sheet opens with the PDF file attached
- On desktop: PDF downloads automatically and a toast appears saying "PDF downloaded — share it manually via WhatsApp"

- [ ] **Step 3: Commit**

```bash
git add src/app/(app)/orders/[id]/WhatsAppShareButton.tsx
git commit -m "feat: WhatsApp button now shares/downloads PDF file instead of text link"
```

---

### Task 9: CustomersClient — Remove Duplicate Mobile Card View

**Files:**
- Modify: `src/components/customers/CustomersClient.tsx`

**Context:** The file renders both `#customers-table-view` and `#customers-card-view`. No CSS media query hides either — both show simultaneously. Remove the card view entirely.

- [ ] **Step 1: Delete the mobile cards block**

In `src/components/customers/CustomersClient.tsx`, find and delete the entire second conditional block — from `{/* Mobile cards */}` (or the second `{customers.length > 0 && (`) through its closing `)}`. This is lines 188–215 in the original file.

The block to remove looks like:
```tsx
{/* Mobile cards */}
{customers.length > 0 && (
  <div id="customers-card-view">
    {customers.map((c) => (
      <div
        key={c.id}
        className="material-card"
        ...
      >
        ...
      </div>
    ))}
    <PaginationBar total={filteredTotal} page={page} size={size} currentParams={currentParams} />
  </div>
)}
```

- [ ] **Step 2: Verify in browser**

Navigate to `/customers`. Confirm only one list renders — the table with NAME, PHONE, EMAIL, STATUS columns. Scroll to the bottom; confirm no duplicate card list appears below the pagination bar.

- [ ] **Step 3: Commit**

```bash
git add src/components/customers/CustomersClient.tsx
git commit -m "fix: remove duplicate mobile card view from customers list"
```

---

### Task 10: DesignsClient — Size Search Input

**Files:**
- Modify: `src/app/(app)/designs/DesignsClient.tsx`

**Interfaces:**
- Consumes: `BoxDesignData` (already has `lengthCm`, `widthCm`, `heightCm`, `lengthIn`, `widthIn`, `heightIn` fields)
- Produces: second search input with datalist autocomplete for size filtering

- [ ] **Step 1: Add sizeSearch state, sizeOptions memo, helper function, and updated filter**

Replace the entire content of `src/app/(app)/designs/DesignsClient.tsx`:

```tsx
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
  designTypeId: number;
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

function designSizeStr(bd: BoxDesignData): string {
  if (bd.lengthIn && bd.widthIn && bd.heightIn)
    return `${bd.lengthIn}×${bd.widthIn}×${bd.heightIn} in`;
  if (bd.lengthCm && bd.widthCm && bd.heightCm)
    return `${bd.lengthCm}×${bd.widthCm}×${bd.heightCm} cm`;
  return "";
}

export default function DesignsClient({ boxTypes, materials, initialSearch }: Props) {
  const [search,        setSearch]        = useState(initialSearch);
  const [sizeSearch,    setSizeSearch]    = useState("");
  const [expanded,      setExpanded]      = useState<Set<number>>(new Set(boxTypes.map((bt) => bt.id)));
  const [editingType,   setEditingType]   = useState<BoxTypeData | null>(null);
  const [creatingType,  setCreatingType]  = useState(false);
  const [editingDesign, setEditingDesign] = useState<BoxDesignData | null>(null);
  const [addingToType,  setAddingToType]  = useState<BoxTypeData | null>(null);

  const q  = search.toLowerCase().trim();
  const qs = sizeSearch.toLowerCase().trim();

  const sizeOptions = useMemo(() => {
    const set = new Set<string>();
    boxTypes.forEach((bt) =>
      bt.boxDesigns.forEach((bd) => {
        const s = designSizeStr(bd);
        if (s) set.add(s);
      })
    );
    return [...set].sort();
  }, [boxTypes]);

  const filtered = useMemo(() => {
    if (!q && !qs) return boxTypes;
    return boxTypes
      .map((bt) => {
        const typeTextMatch = !q || bt.code.toLowerCase().includes(q) || bt.name.toLowerCase().includes(q);
        const matchingDesigns = bt.boxDesigns.filter((bd) => {
          const textMatch = !q || typeTextMatch || (
            bd.code.toLowerCase().includes(q) ||
            bd.name.toLowerCase().includes(q) ||
            bd.material.name.toLowerCase().includes(q) ||
            bd.material.code.toLowerCase().includes(q)
          );
          const sizeMatch = !qs || designSizeStr(bd).toLowerCase().includes(qs);
          return textMatch && sizeMatch;
        });
        if (matchingDesigns.length > 0) return { ...bt, boxDesigns: matchingDesigns };
        return null;
      })
      .filter(Boolean) as BoxTypeData[];
  }, [boxTypes, q, qs]);

  function toggleExpand(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const inputStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(245,182,30,0.14)", borderRadius: "0.5rem",
    padding: "0.55rem 0.9rem", color: "#F0EDE6", fontSize: "0.8rem", outline: "none",
  };

  return (
    <div style={{ padding: "1.5rem 1.75rem" }}>
      {/* Header row */}
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.25rem", alignItems: "center", flexWrap: "wrap" }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search box types, designs, materials…"
          style={{ flex: "2 1 180px", ...inputStyle }}
        />
        <div style={{ position: "relative", flex: "1 1 140px" }}>
          <input
            value={sizeSearch}
            onChange={(e) => setSizeSearch(e.target.value)}
            placeholder="Size (L×W×H cm/in)"
            list="size-options"
            style={{ width: "100%", ...inputStyle }}
          />
          <datalist id="size-options">
            {sizeOptions.map((s) => <option key={s} value={s} />)}
          </datalist>
        </div>
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
            {q || qs ? "No designs match your search." : "No box types yet."}
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
                    {designSizeStr(bd)}
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

- [ ] **Step 2: Verify in browser**

Navigate to `/designs`. Confirm:
- Two inputs appear side by side: the existing name/code search, and a new "Size (L×W×H cm/in)" input
- Clicking or typing in the size input shows a native browser autocomplete dropdown with size strings like `4×1×1 cm`, `10×8×6 in`
- Selecting a size filters the list to only show designs with that size
- Clearing the size input restores the full list
- The existing name/material search still works independently and in combination with size search

- [ ] **Step 3: Commit**

```bash
git add src/app/(app)/designs/DesignsClient.tsx
git commit -m "feat: add size autofill search to designs page"
```
