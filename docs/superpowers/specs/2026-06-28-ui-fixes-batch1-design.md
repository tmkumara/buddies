# UI Fixes — Batch 1

**Date:** 2026-06-28  
**Scope:** 9 targeted UI/UX fixes across Orders, Customers, Designs, and Stock Items pages.

---

## 1. Order Items Editor — Item Type Dropdown Theme (1a)

**File:** `src/components/orders/OrderItemsEditor.tsx`

The native `<select>` for "ITEM TYPE" (Box Design / Stock Item) uses browser default styling (blue highlight, white background). Replace it with a styled `<select>` that:
- Uses `appearance: none`, same `background/border/color/borderRadius` as the existing `sel` style object in that file
- Adds a custom chevron icon overlay (absolute-positioned `ChevronDown` from lucide)
- Also audit `OrderStatusForm.tsx` for the same issue and apply identical fix

---

## 2. Order Items Header Alignment (1b)

**File:** `src/components/orders/OrderItemsEditor.tsx`

The "ORDER ITEMS" header row with the "+ Add Item" button is already flex with `space-between` but the button uses inconsistent padding. Ensure:
- `cta-btn` class with `fontSize: "0.68rem"`, `padding: "0.4rem 0.85rem"`, `gap: "0.35rem"` (already correct — verify alignment is flush in practice)
- If the table row columns feel misaligned, fix column widths so ITEM TYPE column is exactly 130px and doesn't crowd the ITEM column

---

## 3. Order View Item Table — Size & Box Type (1c)

**File:** `src/app/(app)/orders/[id]/page.tsx`

Currently the items table shows CODE, DESIGN NAME, QTY, UNIT PRICE, LINE TOTAL. Add size and box type info under the design name as a subtitle line (same pattern used in the invoice page):

```tsx
<td style={{ color: "#F0EDE6" }}>
  <div>{item.designName}</div>
  {(item.boxTypeName || item.sizeStr) && (
    <div style={{ fontSize: "0.68rem", color: "rgba(240,237,230,0.3)", marginTop: "0.1rem" }}>
      {[item.boxTypeName, item.sizeStr].filter(Boolean).join("  ·  ")}
    </div>
  )}
</td>
```

The Prisma query for order items must include:
```ts
include: {
  boxDesign: {
    select: {
      designType: { select: { name: true } },  // "boxTypeName" in UI comes from designType.name
      lengthCm: true, widthCm: true, heightCm: true,
      lengthIn: true, widthIn: true, heightIn: true,
      material: { select: { status: true } },
    }
  }
}
```

No `sizeStr` field exists in the schema — compute it in the page server component from raw dimension fields (prefer `in` if available, else `cm`), same pattern as `src/lib/invoice-data.ts` lines 67–81. Pass `boxTypeName` (`item.boxDesign.designType.name`) and computed `sizeStr` into the render.

---

## 4. Delivery Method → Combobox Dropdown (1d)

**Files:**
- `src/app/(app)/orders/new/NewOrderForm.tsx`
- `src/app/(app)/orders/[id]/OrderDetailsForm.tsx`
- `src/app/(app)/orders/[id]/edit/EditOrderForm.tsx` (if it has delivery method)

Replace the pill-button toggle group for delivery method with a `<Combobox>` component:
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

The `deliveryMethodId` state remains `number | null`. When form submits, set `deliveryMethodId` in FormData as before.

---

## 5. Discount Override — % or Fixed Amount (1e)

**Files:**
- `src/app/(app)/orders/new/NewOrderForm.tsx`
- `src/app/(app)/orders/[id]/edit/EditOrderForm.tsx`

Add a `discountType` state: `"percent" | "fixed"`, defaulting to `"percent"`.

In the totals section, above the discount override input, render two radio buttons:
```
( ● ) %    ( ○ ) Fixed (Rs.)
```

When `discountType === "fixed"`:
- The input label changes to "Discount override (Rs.):"
- `effectiveRate = discountOverride / totalAmount` (clamped to [0,1])
- The displayed discount line still shows `(X%)` computed from the fixed amount

When submitting, pass the resolved `discountPercent` (as a percentage number) to the server action — the server action interface doesn't change.

---

## 6. WhatsApp Share — Send PDF File (1f)

**File:** `src/app/(app)/orders/[id]/WhatsAppShareButton.tsx`

Change the WHATSAPP button to fetch and share the PDF as a file:

```ts
async function handleShare() {
  setLoading(true);
  try {
    const pdfUrl = `/api/invoice/${publicToken}/pdf`;
    const res = await fetch(pdfUrl);
    const blob = await res.blob();
    const file = new File([blob], `${orderNo}-invoice.pdf`, { type: "application/pdf" });

    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: `Invoice ${orderNo}` });
    } else {
      // Fallback: download the PDF
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${orderNo}-invoice.pdf`;
      a.click();
      URL.revokeObjectURL(a.href);
      showToast?.("PDF downloaded — share it manually via WhatsApp");
    }
  } catch (err) {
    if ((err as Error).name !== "AbortError") {
      showToast?.("Could not share PDF");
    }
  } finally {
    setLoading(false);
  }
}
```

Add `loading` state to show a spinner/disabled state on the button while fetching. The `showToast` comes from `useToast()` hook already available in the app.

---

## 7. Remove Delivery Details Form from Order View (1g)

**File:** `src/app/(app)/orders/[id]/page.tsx`

Remove:
1. The `deliveryMethods` Prisma query (lines ~43–45)
2. The `<OrderDetailsForm>` import
3. The entire `{/* ── Details Edit ── */}` section block (including its wrapping `<div style={section}>`)

Delivery/date edits remain available on the Edit Order page only.

---

## 8. Customer List — Remove Duplicate Mobile Cards (2a)

**File:** `src/components/customers/CustomersClient.tsx`

Remove the entire "Mobile cards" block (the second `{customers.length > 0 && (...)}` block rendering `#customers-card-view` divs). No CSS rule exists to hide it on larger screens, so both lists always display simultaneously.

Keep only the `#customers-table-view` table — it already works well on all screen sizes.

---

## 9. Designs Page — Size Search Input (3a)

**File:** `src/app/(app)/designs/DesignsClient.tsx`

Add a `sizeSearch` state alongside the existing `search` state. Add a second input with `<datalist>`:

```tsx
const sizeOptions = useMemo(() => {
  const set = new Set<string>();
  boxTypes.forEach((bt) =>
    bt.boxDesigns.forEach((bd) => {
      if (bd.lengthCm && bd.widthCm && bd.heightCm)
        set.add(`${bd.lengthCm}×${bd.widthCm}×${bd.heightCm} cm`);
      if (bd.lengthIn && bd.widthIn && bd.heightIn)
        set.add(`${bd.lengthIn}×${bd.widthIn}×${bd.heightIn} in`);
    })
  );
  return [...set].sort();
}, [boxTypes]);
```

Filter: when `sizeSearch` is non-empty, additionally filter `matchingDesigns` to those whose computed size string includes the query.

The input is placed next to the text search input, labelled "Size (L×W×H cm/in)", styled identically (same background, border, borderRadius, padding, color), with `list="size-options"` and a `<datalist id="size-options">`.

---

## 10. Stock Items Page — Theme Fix (4a)

**Files:**
- `src/app/globals.css`
- `src/components/stock-items/StockItemsClient.tsx`
- `src/components/stock-items/StockItemSlideOver.tsx`

`StockItemsClient` uses CSS class names that don't exist in `globals.css`: `module-root`, `section-title`, `empty-state`, `filter-tab-bar`, `edit-btn`. Add them to `globals.css` following the dark theme:

```css
.module-root { padding: 1.25rem 1.75rem; }
.section-title { font-size: 0.88rem; font-weight: 600; color: #F0EDE6; letter-spacing: 0.04em; }
.empty-state { padding: 3rem 0; text-align: center; font-size: 0.8rem; color: rgba(240,237,230,0.22); }
.filter-tab-bar { display: flex; gap: 0.2rem; margin-bottom: 1rem; }
.edit-btn {
  padding: 0.3rem 0.75rem; font-size: 0.65rem; letter-spacing: 0.06em;
  background: rgba(245,182,30,0.07); border: 1px solid rgba(245,182,30,0.2);
  border-radius: 0.35rem; color: #F5B61E; cursor: pointer; font-weight: 600;
}
.edit-btn:hover { background: rgba(245,182,30,0.12); }
```

For `StockItemSlideOver`: ensure all form inputs use the dark-theme `inp` style pattern (`background: rgba(255,255,255,0.04)`, `border: 1px solid rgba(245,182,30,0.14)`, `color: #F0EDE6`) and labels use the small-caps style.

---

## Implementation Order

1. globals.css — stock theme classes (unblocks stock page)
2. OrderItemsEditor — item type select theme + header alignment
3. OrderStatusForm — select theme audit
4. NewOrderForm — delivery method Combobox + discount type toggle
5. EditOrderForm — same as above
6. OrderDetailsForm — delivery method Combobox (remove from order view)
7. Order view page — remove OrderDetailsForm section + add size/boxtype to items table
8. WhatsAppShareButton — PDF file share
9. CustomersClient — remove mobile card view
10. DesignsClient — size search input
11. StockItemSlideOver — input styling
