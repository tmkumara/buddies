# Plan 3: Orders Module Overhaul

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Overhaul the orders module with: searchable customer combobox + inline customer creation, Box Type → Box Design two-step item picker with auto-price, quantity-based auto-discount, order detail as slide-over, edit order page (status-gated), payment UI, status transition gates (payment-enforced), and updated QuickCreate panel.

**Architecture:** `NewOrderForm` and `EditOrderForm` share an `OrderFormBody` client component. Order detail becomes a slide-over triggered from the list. Payment section rendered inline on the detail slide-over. Status transition gates enforced in the `updateOrderStatus` server action (Plan 1 already wired stock deduction).

**Tech Stack:** Next.js 16 App Router, Prisma 7, Server Actions, existing slide-over pattern

## Global Constraints

- `searchParams` is a Promise — must be awaited in page components
- Prisma Decimal → `Number()` before passing to Client Components
- Server Actions return `{ error: string }` or `{ success: true }` — redirect outside try-catch
- Customer is LOCKED after order creation — never editable
- Unit price override: ADMIN only; discount override: ADMIN only
- Payment gate: DRAFT→CONFIRMED requires ≥1 payment; READY→DELIVERED requires full payment
- **Prerequisite: Plans 1 and 2 must be complete**

---

### Task 1: Update `updateOrderStatus` to enforce payment gates

**Files:**
- Modify: `src/actions/orders.ts`

- [ ] **Step 1: Add payment gate checks to `updateOrderStatus`**

In `src/actions/orders.ts`, update `updateOrderStatus`:

```typescript
export async function updateOrderStatus(
  orderId: number,
  newStatus: string,
  note?: string,
) {
  const session = await requireAuth();

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      status: true,
      netAmount: true,
      payments: { select: { amount: true } },
    },
  });
  if (!order) return { error: "Order not found" };

  if (!isValidTransition(order.status as OrderStatusKey, newStatus as OrderStatusKey)) {
    return { error: `Cannot transition from ${order.status} to ${newStatus}` };
  }

  // Payment gate: DRAFT → CONFIRMED requires at least one payment
  if (newStatus === "CONFIRMED" && order.payments.length === 0) {
    return { error: "At least one payment must be recorded before confirming the order." };
  }

  // Payment gate: READY → DELIVERED requires full payment
  if (newStatus === "DELIVERED") {
    const totalPaid = order.payments.reduce((s, p) => s + Number(p.amount), 0);
    const netAmount = Number(order.netAmount);
    if (totalPaid < netAmount - 0.01) {
      return { error: `Full payment required before delivery. Balance: Rs. ${(netAmount - totalPaid).toFixed(2)}` };
    }
  }

  await prisma.$transaction([
    prisma.order.update({
      where: { id: orderId },
      data:  { status: newStatus as OrderStatus },
    }),
    prisma.orderStatusHistory.create({
      data: {
        orderId,
        fromStatus:  order.status as OrderStatus,
        toStatus:    newStatus as OrderStatus,
        changedById: Number(session.user.id),
        note:        note?.trim() || null,
      },
    }),
  ]);

  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/orders");

  if (newStatus === "IN_PRODUCTION") {
    await deductStockForOrder(orderId, Number(session.user.id));
  }

  return { success: true as const };
}
```

- [ ] **Step 2: Add `updateOrderItems` action for editing orders**

Append to `src/actions/orders.ts`:

```typescript
export async function updateOrderItems(orderId: number, formData: FormData) {
  const session = await requireAuth();

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { status: true },
  });
  if (!order) return { error: "Order not found" };

  const editableStatuses = ["DRAFT", "CONFIRMED", "IN_PRODUCTION"];
  if (!editableStatuses.includes(order.status)) {
    return { error: "Order cannot be edited at this stage." };
  }

  let rawItems: unknown;
  try { rawItems = JSON.parse((formData.get("itemsJson") as string) ?? "[]"); }
  catch { return { error: "Invalid items data" }; }

  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return { error: "At least one order item is required" };
  }

  const items: { boxDesignId: number; quantity: number; unitPrice: number }[] = [];
  for (const item of rawItems) {
    const p = orderItemInputSchema.safeParse(item);
    if (!p.success) return { error: p.error.issues[0]?.message ?? "Invalid item" };
    items.push(p.data);
  }

  const boxDesignIds = [...new Set(items.map((i) => i.boxDesignId))];
  const boxDesigns = await prisma.boxDesign.findMany({
    where:  { id: { in: boxDesignIds }, active: true },
    select: { id: true, name: true, code: true },
  });
  const bdMap = new Map(boxDesigns.map((bd) => [bd.id, bd]));
  for (const item of items) {
    if (!bdMap.has(item.boxDesignId)) return { error: `Box design ID ${item.boxDesignId} not found` };
  }

  // Read optional discount override from formData
  const discountOverrideRaw = formData.get("discountPercent") as string | null;
  const discountOverride = discountOverrideRaw ? parseFloat(discountOverrideRaw) : null;

  const totals = calculateOrderTotals(items, discountOverride);

  await prisma.$transaction([
    prisma.orderItem.deleteMany({ where: { orderId } }),
    prisma.order.update({
      where: { id: orderId },
      data: {
        totalAmount:    totals.totalAmount,
        discountAmount: totals.discountAmount,
        netAmount:      totals.netAmount,
        discountPercent: totals.discountPercent,
        deliveryDate: formData.get("deliveryDate")
          ? new Date(formData.get("deliveryDate") as string)
          : null,
        remarks: (formData.get("remarks") as string) || null,
        leadSourceId: formData.get("leadSourceId")
          ? Number(formData.get("leadSourceId"))
          : null,
      },
    }),
    ...items.map((item) => {
      const bd = bdMap.get(item.boxDesignId)!;
      return prisma.orderItem.create({
        data: {
          orderId,
          boxDesignId: item.boxDesignId,
          designName:  bd.name,
          designCode:  bd.code,
          quantity:    item.quantity,
          unitPrice:   item.unitPrice,
          lineTotal:   calculateLineTotal(item.unitPrice, item.quantity),
        },
      });
    }),
  ]);

  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/orders");
  return { success: true as const };
}
```

Also import `calculateLineTotal` at the top of orders.ts:
```typescript
import { calculateOrderTotals, calculateLineTotal } from "@/lib/utils/calculations";
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/actions/orders.ts
git commit -m "feat: order status payment gates (deposit for CONFIRMED, full payment for DELIVERED) + updateOrderItems action"
```

---

### Task 2: CustomerSearchCombobox + CustomerQuickCreate slide-over

**Files:**
- Create: `src/components/orders/CustomerSearchCombobox.tsx`
- Create: `src/components/orders/CustomerQuickCreate.tsx`
- Create: `src/actions/customers-inline.ts`

**Interfaces:**
- Produces:
  - `<CustomerSearchCombobox customers={...} value={id} onChange={(id) => void} />`
  - `<CustomerQuickCreate isOpen onClose onCreated={(customer) => void} />`

- [ ] **Step 1: Create inline customer create action**

Create `src/actions/customers-inline.ts`:

```typescript
"use server";

import { requireAuth } from "@/lib/auth-guards";
import prisma from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  name:        z.string().min(1, "Name is required").max(150),
  phone:       z.string().min(1, "Phone is required").max(30),
  phone2:      z.string().max(30).optional(),
  email:       z.string().email().max(150).optional().or(z.literal("")),
  addressLine: z.string().max(255).optional(),
  notes:       z.string().max(255).optional(),
});

export async function quickCreateCustomer(formData: FormData) {
  await requireAuth();

  const parsed = schema.safeParse({
    name:        formData.get("name"),
    phone:       formData.get("phone"),
    phone2:      (formData.get("phone2") as string) || undefined,
    email:       (formData.get("email") as string)  || undefined,
    addressLine: (formData.get("addressLine") as string) || undefined,
    notes:       (formData.get("notes") as string) || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Validation error" };

  const customer = await prisma.customer.create({
    data: {
      name:        parsed.data.name,
      phone:       parsed.data.phone,
      phone2:      parsed.data.phone2 ?? null,
      email:       parsed.data.email  || null,
      addressLine: parsed.data.addressLine ?? null,
      notes:       parsed.data.notes ?? null,
      active:      true,
    },
    select: { id: true, name: true, phone: true, email: true },
  });

  return { success: true as const, data: customer };
}
```

- [ ] **Step 2: Create CustomerQuickCreate slide-over**

Create `src/components/orders/CustomerQuickCreate.tsx`:

```typescript
"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { quickCreateCustomer } from "@/actions/customers-inline";

export interface CustomerOption { id: number; name: string; phone: string; email: string | null; }

interface Props {
  isOpen:    boolean;
  onClose:   () => void;
  onCreated: (customer: CustomerOption) => void;
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

export default function CustomerQuickCreate({ isOpen, onClose, onCreated }: Props) {
  const [name,    setName]    = useState("");
  const [phone,   setPhone]   = useState("");
  const [phone2,  setPhone2]  = useState("");
  const [email,   setEmail]   = useState("");
  const [address, setAddress] = useState("");
  const [notes,   setNotes]   = useState("");
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");

  async function handleSave() {
    setSaving(true); setError("");
    const fd = new FormData();
    fd.set("name", name); fd.set("phone", phone);
    if (phone2)  fd.set("phone2", phone2);
    if (email)   fd.set("email", email);
    if (address) fd.set("addressLine", address);
    if (notes)   fd.set("notes", notes);

    const result = await quickCreateCustomer(fd);
    setSaving(false);
    if ("error" in result) { setError(result.error); return; }
    onCreated(result.data);
    setName(""); setPhone(""); setPhone2(""); setEmail(""); setAddress(""); setNotes("");
    onClose();
  }

  if (!isOpen) return null;

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 59, backdropFilter: "blur(2px)" }} />
      <div style={{
        position: "fixed", top: 0, right: 0, height: "100%", width: "min(420px, 100vw)",
        background: "#141414", borderLeft: "1px solid rgba(245,182,30,0.18)",
        boxShadow: "-12px 0 48px rgba(0,0,0,0.7)", zIndex: 60,
        display: "flex", flexDirection: "column",
        animation: "slideInRight 0.22s ease-out",
      }}>
        <style>{`@keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 1.25rem", borderBottom: "1px solid rgba(245,182,30,0.1)", flexShrink: 0 }}>
          <div>
            <h2 style={{ fontSize: "0.9rem", fontWeight: 700, color: "#F5B61E", margin: 0 }}>New Customer</h2>
            <p style={{ fontSize: "0.62rem", color: "rgba(240,237,230,0.35)", margin: "0.2rem 0 0", letterSpacing: "0.06em" }}>QUICK CREATE</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(240,237,230,0.4)" }}><X size={18} /></button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "1.1rem 1.25rem" }}>
          {error && <div style={{ padding: "0.55rem 0.75rem", background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)", borderRadius: "0.4rem", fontSize: "0.72rem", color: "#F87171", marginBottom: "0.75rem" }}>{error}</div>}
          <div style={{ marginBottom: "0.6rem" }}><label style={lbl}>NAME *</label><input value={name} onChange={(e) => setName(e.target.value)} placeholder="John Silva" style={inp} /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem", marginBottom: "0.6rem" }}>
            <div><label style={lbl}>PHONE *</label><input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0771234567" style={inp} /></div>
            <div><label style={lbl}>PHONE 2</label><input value={phone2} onChange={(e) => setPhone2(e.target.value)} placeholder="0112345678" style={inp} /></div>
          </div>
          <div style={{ marginBottom: "0.6rem" }}><label style={lbl}>EMAIL</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="john@example.com" style={inp} /></div>
          <div style={{ marginBottom: "0.6rem" }}><label style={lbl}>ADDRESS</label><input value={address} onChange={(e) => setAddress(e.target.value)} style={inp} /></div>
          <div style={{ marginBottom: "0.6rem" }}><label style={lbl}>NOTES</label><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} style={{ ...inp, resize: "vertical" }} /></div>
        </div>
        <div style={{ padding: "0.9rem 1.25rem", borderTop: "1px solid rgba(245,182,30,0.1)", display: "flex", gap: "0.6rem", flexShrink: 0 }}>
          <button onClick={handleSave} disabled={saving} style={{ flex: 1, padding: "0.65rem 0", background: "rgba(245,182,30,0.18)", border: "1px solid rgba(245,182,30,0.35)", borderRadius: "0.5rem", color: "#F5B61E", fontSize: "0.75rem", letterSpacing: "0.08em", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
            {saving ? "CREATING…" : "CREATE CUSTOMER"}
          </button>
          <button onClick={onClose} style={{ padding: "0.65rem 1rem", background: "none", border: "1px solid rgba(245,182,30,0.15)", borderRadius: "0.5rem", color: "rgba(240,237,230,0.4)", fontSize: "0.72rem", cursor: "pointer" }}>Cancel</button>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 3: Create CustomerSearchCombobox**

Create `src/components/orders/CustomerSearchCombobox.tsx`:

```typescript
"use client";

import { useState, useRef, useEffect } from "react";
import { User, Plus, Search } from "lucide-react";
import CustomerQuickCreate, { type CustomerOption } from "./CustomerQuickCreate";

interface Props {
  customers: CustomerOption[];
  value:     number | null;
  onChange:  (id: number, customer: CustomerOption) => void;
}

export default function CustomerSearchCombobox({ customers: initialCustomers, value, onChange }: Props) {
  const [customers,   setCustomers]  = useState<CustomerOption[]>(initialCustomers);
  const [query,       setQuery]      = useState("");
  const [open,        setOpen]       = useState(false);
  const [showCreate,  setShowCreate] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = customers.find((c) => c.id === value) ?? null;

  const filtered = query.length < 1 ? customers : customers.filter(
    (c) =>
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      c.phone.includes(query),
  );

  function selectCustomer(c: CustomerOption) {
    onChange(c.id, c);
    setQuery("");
    setOpen(false);
  }

  function handleCustomerCreated(c: CustomerOption) {
    setCustomers((prev) => [...prev, c]);
    selectCustomer(c);
    setShowCreate(false);
  }

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const inp: React.CSSProperties = {
    width: "100%", background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(245,182,30,0.14)", borderRadius: "0.5rem",
    padding: "0.7rem 1rem", color: "#F0EDE6", fontSize: "0.875rem", outline: "none",
    cursor: "pointer",
  };

  return (
    <>
      <div style={{ position: "relative" }}>
        {/* Trigger */}
        <div
          onClick={() => setOpen((v) => !v)}
          style={{ ...inp, display: "flex", alignItems: "center", gap: "0.5rem" }}
        >
          <User size={14} color="rgba(240,237,230,0.35)" />
          {selected
            ? <span style={{ flex: 1 }}>{selected.name} <span style={{ color: "rgba(240,237,230,0.4)", fontSize: "0.78rem" }}>({selected.phone})</span></span>
            : <span style={{ flex: 1, color: "rgba(240,237,230,0.3)" }}>— Select Customer —</span>
          }
          <span style={{ fontSize: "0.6rem", color: "rgba(240,237,230,0.3)" }}>▼</span>
        </div>

        {/* Dropdown */}
        {open && (
          <div style={{
            position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 30,
            background: "#1a1a1a", border: "1px solid rgba(245,182,30,0.2)", borderRadius: "0.5rem",
            boxShadow: "0 8px 32px rgba(0,0,0,0.6)", maxHeight: "280px", display: "flex", flexDirection: "column",
          }}>
            {/* Search input */}
            <div style={{ padding: "0.5rem", borderBottom: "1px solid rgba(245,182,30,0.08)", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", background: "rgba(255,255,255,0.04)", borderRadius: "0.35rem", padding: "0.4rem 0.6rem" }}>
                <Search size={12} color="rgba(240,237,230,0.3)" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search name or phone…"
                  style={{ background: "none", border: "none", outline: "none", color: "#F0EDE6", fontSize: "0.8rem", flex: 1 }}
                />
              </div>
            </div>
            {/* Options */}
            <div style={{ overflowY: "auto", flex: 1 }}>
              {filtered.map((c) => (
                <div
                  key={c.id}
                  onClick={() => selectCustomer(c)}
                  style={{
                    padding: "0.65rem 0.9rem", cursor: "pointer",
                    background: c.id === value ? "rgba(245,182,30,0.08)" : "transparent",
                    borderBottom: "1px solid rgba(245,182,30,0.04)",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "rgba(245,182,30,0.06)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = c.id === value ? "rgba(245,182,30,0.08)" : "transparent"; }}
                >
                  <div style={{ fontSize: "0.82rem", color: "#F0EDE6", fontWeight: 500 }}>{c.name}</div>
                  <div style={{ fontSize: "0.68rem", color: "rgba(240,237,230,0.4)" }}>{c.phone}</div>
                </div>
              ))}
              {filtered.length === 0 && (
                <div style={{ padding: "0.75rem 0.9rem", fontSize: "0.75rem", color: "rgba(240,237,230,0.3)" }}>
                  No customers match "{query}"
                </div>
              )}
              {/* Add new customer option */}
              <div
                onClick={() => { setOpen(false); setShowCreate(true); }}
                style={{
                  padding: "0.65rem 0.9rem", cursor: "pointer",
                  borderTop: "1px solid rgba(245,182,30,0.1)",
                  display: "flex", alignItems: "center", gap: "0.5rem",
                  color: "#F5B61E", fontSize: "0.78rem",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "rgba(245,182,30,0.06)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
              >
                <Plus size={13} /> Add new customer
              </div>
            </div>
          </div>
        )}
      </div>

      <CustomerQuickCreate
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={handleCustomerCreated}
      />
    </>
  );
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/actions/customers-inline.ts src/components/orders/CustomerSearchCombobox.tsx src/components/orders/CustomerQuickCreate.tsx
git commit -m "feat: customer search combobox + inline quick-create slide-over for order form"
```

---

### Task 3: Update OrderItemsEditor — Box Type filter + auto-price

**Files:**
- Modify: `src/components/orders/OrderItemsEditor.tsx`

**Interfaces:**
- New prop: `boxTypes: BoxTypeOption[]`
- Modified: Each item row now has a Box Type selector that filters the Box Design dropdown
- Auto-fills unit price from selected BoxDesign

- [ ] **Step 1: Add BoxTypeOption interface and update OrderItemsEditor**

Replace `src/components/orders/OrderItemsEditor.tsx` with:

```typescript
"use client";

import { useState } from "react";
import { Plus, Trash2, Sparkles, AlertTriangle } from "lucide-react";
import QuickCreateDesignPanel, { type DesignTypeOption, type MaterialOption } from "./QuickCreateDesignPanel";

export interface BoxTypeOption {
  id: number;
  code: string;
  name: string;
}

export interface BoxDesignOption {
  id:             number;
  code:           string;
  name:           string;
  unitPrice:      number;
  boxTypeId:      number;
  boxTypeName:    string;
}

export interface OrderItem {
  key:          string;
  boxDesignId:  number;
  designName:   string;
  designCode:   string;
  quantity:     number;
  unitPrice:    number;
  lineTotal:    number;
}

interface Props {
  boxTypes:     BoxTypeOption[];
  boxDesigns:   BoxDesignOption[];
  designTypes:  DesignTypeOption[];
  materials:    MaterialOption[];
  isAdmin:      boolean;
  onChange:     (items: OrderItem[]) => void;
  initialItems?: OrderItem[];
}

let keyCounter = 0;
function nextKey() { return `item-${++keyCounter}`; }

export default function OrderItemsEditor({
  boxTypes, boxDesigns, designTypes, materials, isAdmin, onChange, initialItems,
}: Props) {
  const [items,           setItems]           = useState<OrderItem[]>(initialItems ?? []);
  const [localDesigns,    setLocalDesigns]    = useState<BoxDesignOption[]>(boxDesigns);
  const [panelOpenForKey, setPanelOpenForKey] = useState<string | null>(null);
  const [selectedTypes,   setSelectedTypes]   = useState<Record<string, number>>({});

  const bdMap = new Map(localDesigns.map((bd) => [bd.id, bd]));

  function update(next: OrderItem[]) { setItems(next); onChange(next); }

  function addItem() {
    const key = nextKey();
    update([...items, { key, boxDesignId: 0, designName: "", designCode: "", quantity: 1, unitPrice: 0, lineTotal: 0 }]);
  }

  function removeItem(key: string) { update(items.filter((i) => i.key !== key)); }

  function handleTypeChange(key: string, typeId: string) {
    setSelectedTypes((prev) => ({ ...prev, [key]: Number(typeId) }));
    // Reset design when type changes
    update(items.map((i) => i.key !== key ? i : {
      ...i, boxDesignId: 0, designName: "", designCode: "", unitPrice: 0, lineTotal: 0,
    }));
  }

  function handleBoxDesignChange(key: string, rawId: string) {
    const id = Number(rawId);
    const bd = bdMap.get(id);
    update(items.map((i) => {
      if (i.key !== key) return i;
      const unitPrice = bd?.unitPrice ?? 0;
      return {
        ...i, boxDesignId: id,
        designName:  bd?.name  ?? "",
        designCode:  bd?.code  ?? "",
        unitPrice,
        lineTotal: Math.round(unitPrice * i.quantity * 100) / 100,
      };
    }));
  }

  function handleQtyChange(key: string, rawQty: string) {
    const qty = Math.max(1, parseInt(rawQty) || 1);
    const hasWarning = qty < 10;
    update(items.map((i) => {
      if (i.key !== key) return i;
      return { ...i, quantity: qty, lineTotal: Math.round(i.unitPrice * qty * 100) / 100 };
    }));
  }

  function handlePriceChange(key: string, rawPrice: string) {
    if (!isAdmin) return;
    const price = Math.max(0, parseFloat(rawPrice) || 0);
    update(items.map((i) => {
      if (i.key !== key) return i;
      return { ...i, unitPrice: price, lineTotal: Math.round(price * i.quantity * 100) / 100 };
    }));
  }

  function handleDesignCreated(newDesign: BoxDesignOption) {
    setLocalDesigns((prev) => [...prev, newDesign]);
    if (panelOpenForKey) handleBoxDesignChange(panelOpenForKey, String(newDesign.id));
  }

  const th: React.CSSProperties = {
    padding: "0.55rem 0.75rem", fontSize: "0.62rem", letterSpacing: "0.1em",
    color: "rgba(240,237,230,0.3)", fontWeight: 600, textAlign: "left",
    borderBottom: "1px solid rgba(245,182,30,0.08)", whiteSpace: "nowrap",
  };
  const td: React.CSSProperties = {
    padding: "0.5rem 0.6rem", borderBottom: "1px solid rgba(245,182,30,0.05)", verticalAlign: "middle",
  };
  const sel: React.CSSProperties = {
    width: "100%", background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(245,182,30,0.14)", borderRadius: "0.4rem",
    padding: "0.45rem 0.6rem", color: "#F0EDE6", fontSize: "0.78rem", outline: "none",
  };

  return (
    <>
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
          <span style={{ fontSize: "0.72rem", letterSpacing: "0.08em", color: "rgba(240,237,230,0.35)" }}>ORDER ITEMS</span>
          <button type="button" onClick={addItem} className="cta-btn" style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.68rem", padding: "0.4rem 0.85rem" }}>
            <Plus size={12} /> Add Item
          </button>
        </div>

        {items.length === 0 ? (
          <div style={{ padding: "2rem", textAlign: "center", fontSize: "0.78rem", color: "rgba(240,237,230,0.2)", border: "1px dashed rgba(245,182,30,0.12)", borderRadius: "0.5rem" }}>
            No items yet — click Add Item
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={th}>BOX TYPE</th>
                  <th style={th}>BOX DESIGN</th>
                  <th style={{ ...th, width: "80px" }}>QTY</th>
                  <th style={{ ...th, width: "110px" }}>UNIT PRICE</th>
                  <th style={{ ...th, width: "110px", textAlign: "right" }}>LINE TOTAL</th>
                  <th style={{ ...th, width: "40px" }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const typeId = selectedTypes[item.key] ?? 0;
                  const filteredDesigns = typeId
                    ? localDesigns.filter((bd) => bd.boxTypeId === typeId)
                    : localDesigns;
                  const qtyWarn = item.quantity > 0 && item.quantity < 10;

                  return (
                    <tr key={item.key}>
                      <td style={td}>
                        <select value={typeId || ""} onChange={(e) => handleTypeChange(item.key, e.target.value)} style={sel}>
                          <option value="">— All Types —</option>
                          {boxTypes.map((bt) => <option key={bt.id} value={bt.id} style={{ background: "#0d0d0d" }}>{bt.code} — {bt.name}</option>)}
                        </select>
                      </td>
                      <td style={td}>
                        <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                          <select
                            value={item.boxDesignId || ""}
                            onChange={(e) => handleBoxDesignChange(item.key, e.target.value)}
                            required
                            style={{ ...sel, color: item.boxDesignId ? "#F0EDE6" : "rgba(240,237,230,0.3)" }}
                          >
                            <option value="" disabled>— Select Design —</option>
                            {filteredDesigns.map((bd) => (
                              <option key={bd.id} value={bd.id} style={{ background: "#0d0d0d" }}>
                                {bd.code} — {bd.name}
                              </option>
                            ))}
                          </select>
                          <button type="button" onClick={() => setPanelOpenForKey(item.key)} title="Create new design" style={{ background: "rgba(245,182,30,0.07)", border: "1px solid rgba(245,182,30,0.2)", borderRadius: "0.4rem", padding: "0.4rem 0.5rem", color: "rgba(245,182,30,0.7)", cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center" }}>
                            <Sparkles size={13} />
                          </button>
                        </div>
                      </td>
                      <td style={td}>
                        <div>
                          <input
                            type="number" min="1" step="1" value={item.quantity}
                            onChange={(e) => handleQtyChange(item.key, e.target.value)}
                            required
                            style={{ ...sel, width: "100%", borderColor: qtyWarn ? "rgba(251,191,36,0.4)" : "rgba(245,182,30,0.14)" }}
                          />
                          {qtyWarn && <p style={{ fontSize: "0.55rem", color: "#FBBF24", marginTop: "0.15rem" }}>Min 10 recommended</p>}
                        </div>
                      </td>
                      <td style={td}>
                        <input
                          type="number" min="0" step="0.01" value={item.unitPrice}
                          onChange={(e) => handlePriceChange(item.key, e.target.value)}
                          readOnly={!isAdmin}
                          title={!isAdmin ? "Only admins can override unit price" : undefined}
                          style={{ ...sel, width: "100%", cursor: isAdmin ? "text" : "not-allowed", opacity: isAdmin ? 1 : 0.7 }}
                        />
                      </td>
                      <td style={{ ...td, textAlign: "right", color: "#F5B61E", fontWeight: 600, fontSize: "0.85rem" }}>
                        {item.lineTotal.toFixed(2)}
                      </td>
                      <td style={{ ...td, textAlign: "center" }}>
                        <button type="button" onClick={() => removeItem(item.key)} style={{ background: "none", border: "none", cursor: "pointer", padding: "0.2rem", color: "#F87171" }} title="Remove">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <QuickCreateDesignPanel
        isOpen={panelOpenForKey !== null}
        onClose={() => setPanelOpenForKey(null)}
        onCreated={handleDesignCreated}
        designTypes={designTypes}
        initialMaterials={materials}
      />
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
git add src/components/orders/OrderItemsEditor.tsx
git commit -m "feat: OrderItemsEditor — Box Type filter, auto-price from BoxDesign, ADMIN-only price override, min qty warning"
```

---

### Task 4: Update NewOrderForm + new order page

**Files:**
- Modify: `src/app/(app)/orders/new/NewOrderForm.tsx`
- Modify: `src/app/(app)/orders/new/page.tsx`

- [ ] **Step 1: Update the new order page server component to pass box types and lead sources**

In `src/app/(app)/orders/new/page.tsx`, add box types and lead sources to the data fetch:

```typescript
import { requireAuth } from "@/lib/auth-guards";
import prisma from "@/lib/prisma";
import TopBar from "@/components/layout/TopBar";
import NewOrderForm from "./NewOrderForm";

export default async function NewOrderPage() {
  await requireAuth();

  const [customers, boxTypes, boxDesigns, designTypes, materials, leadSources] = await Promise.all([
    prisma.customer.findMany({
      where:   { active: true },
      orderBy: { name: "asc" },
      select:  { id: true, name: true, phone: true, email: true },
    }),
    prisma.designType.findMany({
      where:   { active: true },
      orderBy: { code: "asc" },
      select:  { id: true, code: true, name: true },
    }),
    prisma.boxDesign.findMany({
      where:   { active: true },
      orderBy: { code: "asc" },
      select: {
        id: true, code: true, name: true, unitPrice: true,
        designTypeId: true,
        designType: { select: { name: true } },
      },
    }),
    prisma.designType.findMany({
      where:   { active: true },
      orderBy: { code: "asc" },
      select:  { id: true, code: true, name: true },
    }),
    prisma.material.findMany({
      where:   { status: { not: "INACTIVE" } },
      orderBy: { code: "asc" },
      select:  { id: true, code: true, name: true, status: true },
    }),
    prisma.leadSource.findMany({
      where:   { active: true },
      orderBy: { id: "asc" },
      select:  { id: true, name: true },
    }),
  ]);

  const serializedDesigns = boxDesigns.map((bd) => ({
    id:          bd.id,
    code:        bd.code,
    name:        bd.name,
    unitPrice:   Number(bd.unitPrice),
    boxTypeId:   bd.designTypeId,
    boxTypeName: bd.designType.name,
  }));

  return (
    <>
      <TopBar title="New Order" />
      <div style={{ padding: "1.5rem 1.75rem" }}>
        <NewOrderForm
          customers={customers}
          boxTypes={boxTypes}
          boxDesigns={serializedDesigns}
          designTypes={designTypes}
          materials={materials}
          leadSources={leadSources}
        />
      </div>
    </>
  );
}
```

- [ ] **Step 2: Update NewOrderForm to use CustomerSearchCombobox, auto-discount, lead source**

Replace `src/app/(app)/orders/new/NewOrderForm.tsx` with:

```typescript
"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { createOrder } from "@/actions/orders";
import CustomerSearchCombobox, { type CustomerOption } from "@/components/orders/CustomerSearchCombobox";
import OrderItemsEditor, { type BoxTypeOption, type BoxDesignOption, type OrderItem } from "@/components/orders/OrderItemsEditor";
import { calculateQuantityDiscount } from "@/lib/utils/calculations";
import type { DesignTypeOption, MaterialOption } from "@/components/orders/QuickCreateDesignPanel";
import { useSession } from "next-auth/react";

interface LeadSource { id: number; name: string; }

interface Props {
  customers:   CustomerOption[];
  boxTypes:    BoxTypeOption[];
  boxDesigns:  BoxDesignOption[];
  designTypes: DesignTypeOption[];
  materials:   MaterialOption[];
  leadSources: LeadSource[];
}

const today           = new Date().toISOString().split("T")[0];
const defaultDelivery = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];

export default function NewOrderForm({ customers, boxTypes, boxDesigns, designTypes, materials, leadSources }: Props) {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  const [customerId,      setCustomerId]      = useState<number | null>(null);
  const [error,           setError]           = useState("");
  const [loading,         setLoading]         = useState(false);
  const [items,           setItems]           = useState<OrderItem[]>([]);
  const [discountOverride, setDiscountOverride] = useState<string>("");
  const [leadSourceId,    setLeadSourceId]    = useState<string>("");

  const totalQty      = items.reduce((s, i) => s + i.quantity, 0);
  const totalAmount   = items.reduce((s, i) => s + i.lineTotal, 0);
  const autoRate      = calculateQuantityDiscount(totalQty);
  const effectiveRate = discountOverride !== "" && isAdmin ? parseFloat(discountOverride) / 100 : autoRate;
  const discountAmount = Math.round(totalAmount * effectiveRate * 100) / 100;
  const netAmount      = Math.round((totalAmount - discountAmount) * 100) / 100;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!customerId) { setError("Please select a customer."); return; }
    if (items.length === 0) { setError("Add at least one order item."); return; }
    if (items.some((i) => !i.boxDesignId || i.quantity < 1)) {
      setError("All items must have a box design and quantity ≥ 1."); return;
    }

    setLoading(true); setError("");
    const fd = new FormData(e.currentTarget);
    fd.set("customerId", String(customerId));
    fd.set("itemsJson",  JSON.stringify(items.map(({ key: _k, ...rest }) => rest)));
    if (leadSourceId) fd.set("leadSourceId", leadSourceId);
    if (discountOverride !== "" && isAdmin) fd.set("discountPercent", discountOverride);

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
              <select
                value={leadSourceId}
                onChange={(e) => setLeadSourceId(e.target.value)}
                style={{ ...input, background: "rgba(255,255,255,0.04)" }}
              >
                <option value="" style={{ background: "#0d0d0d" }}>— None —</option>
                {leadSources.map((ls) => (
                  <option key={ls.id} value={ls.id} style={{ background: "#0d0d0d" }}>{ls.name}</option>
                ))}
              </select>
            </div>
            <div></div>
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
              isAdmin={isAdmin}
              onChange={setItems}
            />
          </div>

          {/* Totals */}
          {items.length > 0 && (
            <div style={{ background: "rgba(245,182,30,0.04)", border: "1px solid rgba(245,182,30,0.1)", borderRadius: "0.5rem", padding: "1rem 1.25rem", marginBottom: "1.5rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem", alignItems: "flex-end" }}>
                <div style={{ display: "flex", justifyContent: "space-between", width: "260px", fontSize: "0.82rem", color: "rgba(240,237,230,0.55)" }}>
                  <span>Subtotal</span><span>Rs. {totalAmount.toFixed(2)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", width: "260px", fontSize: "0.78rem", color: "rgba(240,237,230,0.4)" }}>
                  <span>Total Qty: {totalQty}</span>
                  <span style={{ color: autoRate > 0 ? "#4ADE80" : "rgba(240,237,230,0.3)" }}>
                    Auto discount: {(autoRate * 100).toFixed(0)}%
                  </span>
                </div>
                {isAdmin && (
                  <div style={{ display: "flex", justifyContent: "space-between", width: "260px", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ fontSize: "0.72rem", color: "rgba(240,237,230,0.4)" }}>Discount override %:</span>
                    <input
                      type="number" min="0" max="100" step="0.01"
                      value={discountOverride}
                      onChange={(e) => setDiscountOverride(e.target.value)}
                      placeholder={String((autoRate * 100).toFixed(0))}
                      style={{ width: "80px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(245,182,30,0.2)", borderRadius: "0.35rem", padding: "0.3rem 0.5rem", color: "#F5B61E", fontSize: "0.78rem", outline: "none" }}
                    />
                  </div>
                )}
                {discountAmount > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", width: "260px", fontSize: "0.82rem", color: "#F87171" }}>
                    <span>Discount ({(effectiveRate * 100).toFixed(1)}%)</span>
                    <span>− Rs. {discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", width: "260px", fontSize: "1rem", fontWeight: 700, color: "#F5B61E", borderTop: "1px solid rgba(245,182,30,0.15)", paddingTop: "0.45rem", marginTop: "0.2rem" }}>
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

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Manual test**

```bash
npm run dev
```

1. Go to `/orders/new`
2. Search customer by phone → select
3. Click "Add new customer" → fill form → customer auto-selected
4. Add order items: select Box Type → Box Design dropdown filters correctly → unit price auto-fills
5. Add 50+ total qty → auto discount shows 7%
6. ADMIN: override discount → net amount updates
7. Submit → redirected to order detail

- [ ] **Step 5: Commit**

```bash
git add src/app/(app)/orders/new/
git commit -m "feat: new order form — customer search combobox, box type filter, auto-discount, lead source"
```

---

### Task 5: Edit Order page

**Files:**
- Create: `src/app/(app)/orders/[id]/edit/page.tsx`
- Create: `src/app/(app)/orders/[id]/edit/EditOrderForm.tsx`

- [ ] **Step 1: Create edit order page**

Create `src/app/(app)/orders/[id]/edit/page.tsx`:

```typescript
import { requireAuth } from "@/lib/auth-guards";
import prisma from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import TopBar from "@/components/layout/TopBar";
import EditOrderForm from "./EditOrderForm";

export default async function EditOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth();
  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id: Number(id) },
    include: {
      items: { orderBy: { id: "asc" } },
    },
  });
  if (!order) notFound();

  const editableStatuses = ["DRAFT", "CONFIRMED", "IN_PRODUCTION"];
  if (!editableStatuses.includes(order.status)) redirect(`/orders/${id}`);

  const [boxTypes, boxDesigns, designTypes, materials, leadSources] = await Promise.all([
    prisma.designType.findMany({ where: { active: true }, orderBy: { code: "asc" }, select: { id: true, code: true, name: true } }),
    prisma.boxDesign.findMany({
      where: { active: true }, orderBy: { code: "asc" },
      select: { id: true, code: true, name: true, unitPrice: true, designTypeId: true, designType: { select: { name: true } } },
    }),
    prisma.designType.findMany({ where: { active: true }, orderBy: { code: "asc" }, select: { id: true, code: true, name: true } }),
    prisma.material.findMany({ where: { status: { not: "INACTIVE" } }, orderBy: { code: "asc" }, select: { id: true, code: true, name: true, status: true } }),
    prisma.leadSource.findMany({ where: { active: true }, orderBy: { id: "asc" }, select: { id: true, name: true } }),
  ]);

  const serializedOrder = {
    id:             order.id,
    status:         order.status,
    deliveryDate:   order.deliveryDate?.toISOString().split("T")[0] ?? null,
    remarks:        order.remarks,
    leadSourceId:   order.leadSourceId,
    discountPercent: Number(order.discountPercent),
    items: order.items.map((item) => ({
      key:         `item-${item.id}`,
      boxDesignId: item.boxDesignId,
      designName:  item.designName,
      designCode:  item.designCode,
      quantity:    item.quantity,
      unitPrice:   Number(item.unitPrice),
      lineTotal:   Number(item.lineTotal),
    })),
  };

  const serializedDesigns = boxDesigns.map((bd) => ({
    id: bd.id, code: bd.code, name: bd.name,
    unitPrice: Number(bd.unitPrice),
    boxTypeId: bd.designTypeId, boxTypeName: bd.designType.name,
  }));

  return (
    <>
      <TopBar title={`Edit Order`} />
      <div style={{ padding: "1.5rem 1.75rem" }}>
        <EditOrderForm
          order={serializedOrder}
          boxTypes={boxTypes}
          boxDesigns={serializedDesigns}
          designTypes={designTypes}
          materials={materials}
          leadSources={leadSources}
          isAdmin={session.user.role === "ADMIN"}
        />
      </div>
    </>
  );
}
```

- [ ] **Step 2: Create EditOrderForm**

Create `src/app/(app)/orders/[id]/edit/EditOrderForm.tsx`:

```typescript
"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { updateOrderItems } from "@/actions/orders";
import OrderItemsEditor, { type BoxTypeOption, type BoxDesignOption, type OrderItem } from "@/components/orders/OrderItemsEditor";
import { calculateQuantityDiscount } from "@/lib/utils/calculations";
import type { DesignTypeOption, MaterialOption } from "@/components/orders/QuickCreateDesignPanel";

interface Props {
  order: {
    id: number; status: string; deliveryDate: string | null;
    remarks: string | null; leadSourceId: number | null;
    discountPercent: number;
    items: OrderItem[];
  };
  boxTypes:    BoxTypeOption[];
  boxDesigns:  BoxDesignOption[];
  designTypes: DesignTypeOption[];
  materials:   MaterialOption[];
  leadSources: { id: number; name: string }[];
  isAdmin:     boolean;
}

export default function EditOrderForm({ order, boxTypes, boxDesigns, designTypes, materials, leadSources, isAdmin }: Props) {
  const router = useRouter();
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);
  const [items,   setItems]   = useState<OrderItem[]>(order.items);
  const [discountOverride, setDiscountOverride] = useState(
    order.discountPercent > 0 ? String(order.discountPercent) : ""
  );

  const canEditItems = ["DRAFT", "CONFIRMED", "IN_PRODUCTION"].includes(order.status);
  const canEditDiscount = ["DRAFT", "CONFIRMED", "IN_PRODUCTION"].includes(order.status);

  const totalQty       = items.reduce((s, i) => s + i.quantity, 0);
  const totalAmount    = items.reduce((s, i) => s + i.lineTotal, 0);
  const autoRate       = calculateQuantityDiscount(totalQty);
  const effectiveRate  = discountOverride !== "" && isAdmin ? parseFloat(discountOverride) / 100 : autoRate;
  const discountAmount = Math.round(totalAmount * effectiveRate * 100) / 100;
  const netAmount      = Math.round((totalAmount - discountAmount) * 100) / 100;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (items.length === 0) { setError("At least one item required."); return; }

    setLoading(true); setError("");
    const fd = new FormData(e.currentTarget);
    fd.set("itemsJson", JSON.stringify(items.map(({ key: _k, ...rest }) => rest)));
    if (discountOverride !== "" && isAdmin) fd.set("discountPercent", discountOverride);

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
              <select name="leadSourceId" defaultValue={order.leadSourceId ?? ""} style={{ ...input, background: "rgba(255,255,255,0.04)" }}>
                <option value="">— None —</option>
                {leadSources.map((ls) => <option key={ls.id} value={ls.id}>{ls.name}</option>)}
              </select>
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
              isAdmin={isAdmin}
              onChange={setItems}
              initialItems={order.items}
            />
          </div>

          {/* Totals */}
          {items.length > 0 && (
            <div style={{ background: "rgba(245,182,30,0.04)", border: "1px solid rgba(245,182,30,0.1)", borderRadius: "0.5rem", padding: "1rem 1.25rem", marginBottom: "1.5rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem", alignItems: "flex-end" }}>
                <div style={{ display: "flex", justifyContent: "space-between", width: "260px", fontSize: "0.82rem", color: "rgba(240,237,230,0.55)" }}>
                  <span>Subtotal</span><span>Rs. {totalAmount.toFixed(2)}</span>
                </div>
                {isAdmin && canEditDiscount && (
                  <div style={{ display: "flex", justifyContent: "space-between", width: "260px", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ fontSize: "0.72rem", color: "rgba(240,237,230,0.4)" }}>Discount %:</span>
                    <input
                      type="number" min="0" max="100" step="0.01"
                      value={discountOverride}
                      onChange={(e) => setDiscountOverride(e.target.value)}
                      placeholder={String((autoRate * 100).toFixed(0))}
                      style={{ width: "80px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(245,182,30,0.2)", borderRadius: "0.35rem", padding: "0.3rem 0.5rem", color: "#F5B61E", fontSize: "0.78rem", outline: "none" }}
                    />
                  </div>
                )}
                {discountAmount > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", width: "260px", fontSize: "0.82rem", color: "#F87171" }}>
                    <span>Discount ({(effectiveRate * 100).toFixed(1)}%)</span>
                    <span>− Rs. {discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", width: "260px", fontSize: "1rem", fontWeight: 700, color: "#F5B61E", borderTop: "1px solid rgba(245,182,30,0.15)", paddingTop: "0.45rem", marginTop: "0.2rem" }}>
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

- [ ] **Step 3: Add "Edit Order" button on order detail page**

In `src/app/(app)/orders/[id]/page.tsx`, add an Edit Order button in the order header (next to the INVOICE button):

```typescript
// Add to the button group near the INVOICE button:
{["DRAFT", "CONFIRMED", "IN_PRODUCTION"].includes(order.status) && (
  <Link href={`/orders/${order.id}/edit`}>
    <button style={{
      display: "flex", alignItems: "center", gap: "0.4rem",
      background: "rgba(255,255,255,0.05)", border: "1px solid rgba(245,182,30,0.15)",
      borderRadius: "0.5rem", padding: "0.5rem 0.9rem",
      color: "rgba(240,237,230,0.6)", fontSize: "0.68rem", letterSpacing: "0.07em", cursor: "pointer",
    }}>
      EDIT ORDER
    </button>
  </Link>
)}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/app/(app)/orders/
git commit -m "feat: edit order page with status-gated editing, auto-discount recalculation"
```

---

### Task 6: Payment UI on order detail

**Files:**
- Create: `src/app/(app)/orders/[id]/PaymentSection.tsx`
- Modify: `src/app/(app)/orders/[id]/page.tsx`

- [ ] **Step 1: Create PaymentSection client component**

Create `src/app/(app)/orders/[id]/PaymentSection.tsx`:

```typescript
"use client";

import { useState, FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import { createPayment, deletePayment } from "@/actions/payments";

interface PaymentRow {
  id:          number;
  amount:      number;
  paymentDate: string;
  method:      string;
  referenceNo: string | null;
  note:        string | null;
}

interface Props {
  orderId:    number;
  netAmount:  number;
  payments:   PaymentRow[];
  isTerminal: boolean; // DELIVERED or CANCELLED — no edits
}

const METHOD_LABEL: Record<string, string> = {
  CASH: "Cash", BANK_TRANSFER: "Bank Transfer", CHEQUE: "Cheque",
};

export default function PaymentSection({ orderId, netAmount, payments: initPayments, isTerminal }: Props) {
  const [payments, setPayments] = useState<PaymentRow[]>(initPayments);
  const [showForm, setShowForm] = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState("");

  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const balance   = netAmount - totalPaid;
  const payStatus = totalPaid <= 0 ? "Unpaid" : balance > 0.01 ? "Partially Paid" : "Fully Paid";
  const statusColor = payStatus === "Fully Paid" ? "#4ADE80" : payStatus === "Partially Paid" ? "#FBBF24" : "#F87171";

  async function handleAddPayment(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true); setError("");
    const fd = new FormData(e.currentTarget);
    const result = await createPayment(orderId, fd);
    setSaving(false);
    if ("error" in result) { setError(result.error); return; }
    // Optimistically reload page to get fresh server data
    window.location.reload();
  }

  async function handleDelete(paymentId: number) {
    if (!confirm("Remove this payment?")) return;
    await deletePayment(paymentId, orderId);
    window.location.reload();
  }

  const inp: React.CSSProperties = {
    width: "100%", background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(245,182,30,0.14)", borderRadius: "0.45rem",
    padding: "0.55rem 0.75rem", color: "#F0EDE6", fontSize: "0.8rem", outline: "none",
  };
  const lbl: React.CSSProperties = {
    fontSize: "0.58rem", letterSpacing: "0.09em",
    color: "rgba(240,237,230,0.35)", display: "block", marginBottom: "0.25rem", fontWeight: 600,
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
        <h3 style={{ fontSize: "0.75rem", letterSpacing: "0.1em", color: "rgba(240,237,230,0.4)" }}>PAYMENTS</h3>
        {!isTerminal && (
          <button
            type="button" onClick={() => setShowForm((v) => !v)}
            style={{ display: "flex", alignItems: "center", gap: "0.3rem", background: "rgba(245,182,30,0.08)", border: "1px solid rgba(245,182,30,0.2)", borderRadius: "0.4rem", padding: "0.3rem 0.7rem", color: "#F5B61E", fontSize: "0.65rem", cursor: "pointer" }}
          >
            <Plus size={11} /> Add Payment
          </button>
        )}
      </div>

      {/* Summary */}
      <div style={{ display: "flex", gap: "1.5rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
        {[
          { label: "Total", value: `Rs. ${netAmount.toFixed(2)}`, color: "rgba(240,237,230,0.7)" },
          { label: "Paid",  value: `Rs. ${totalPaid.toFixed(2)}`, color: "#4ADE80" },
          { label: "Balance", value: `Rs. ${Math.max(0, balance).toFixed(2)}`, color: balance > 0.01 ? "#F87171" : "#4ADE80" },
        ].map((s) => (
          <div key={s.label}>
            <p style={{ fontSize: "0.58rem", letterSpacing: "0.08em", color: "rgba(240,237,230,0.3)", marginBottom: "0.15rem" }}>{s.label}</p>
            <p style={{ fontSize: "0.9rem", fontWeight: 700, color: s.color }}>{s.value}</p>
          </div>
        ))}
        <div>
          <p style={{ fontSize: "0.58rem", letterSpacing: "0.08em", color: "rgba(240,237,230,0.3)", marginBottom: "0.15rem" }}>STATUS</p>
          <span style={{ fontSize: "0.65rem", fontWeight: 700, color: statusColor, background: `${statusColor}18`, padding: "0.15rem 0.5rem", borderRadius: "0.3rem", border: `1px solid ${statusColor}40` }}>
            {payStatus.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Add payment form */}
      {showForm && (
        <form onSubmit={handleAddPayment} style={{ background: "rgba(245,182,30,0.03)", border: "1px solid rgba(245,182,30,0.1)", borderRadius: "0.5rem", padding: "0.85rem", marginBottom: "0.75rem" }}>
          {error && <div style={{ fontSize: "0.72rem", color: "#F87171", marginBottom: "0.5rem" }}>{error}</div>}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.6rem", marginBottom: "0.6rem" }}>
            <div><label style={lbl}>AMOUNT *</label><input name="amount" type="number" step="0.01" min="0.01" required style={inp} /></div>
            <div><label style={lbl}>DATE *</label><input name="paymentDate" type="date" defaultValue={new Date().toISOString().split("T")[0]} required style={inp} /></div>
            <div>
              <label style={lbl}>METHOD *</label>
              <select name="method" required style={{ ...inp, background: "rgba(255,255,255,0.04)" }}>
                <option value="CASH">Cash</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="CHEQUE">Cheque</option>
              </select>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem", marginBottom: "0.6rem" }}>
            <div><label style={lbl}>REFERENCE #</label><input name="referenceNo" type="text" placeholder="Cheque / TXN no." style={inp} /></div>
            <div><label style={lbl}>NOTE</label><input name="note" type="text" style={inp} /></div>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button type="submit" disabled={saving} style={{ padding: "0.5rem 1.25rem", background: "rgba(245,182,30,0.15)", border: "1px solid rgba(245,182,30,0.3)", borderRadius: "0.4rem", color: "#F5B61E", fontSize: "0.72rem", cursor: saving ? "not-allowed" : "pointer" }}>
              {saving ? "SAVING…" : "RECORD PAYMENT"}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setError(""); }} style={{ padding: "0.5rem 0.85rem", background: "none", border: "1px solid rgba(245,182,30,0.12)", borderRadius: "0.4rem", color: "rgba(240,237,230,0.4)", fontSize: "0.72rem", cursor: "pointer" }}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Payment list */}
      {payments.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
          {payments.map((p) => (
            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.5rem 0.75rem", background: "rgba(255,255,255,0.02)", borderRadius: "0.4rem", border: "1px solid rgba(245,182,30,0.06)" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#4ADE80" }}>Rs. {p.amount.toFixed(2)}</span>
              <span style={{ fontSize: "0.68rem", color: "rgba(240,237,230,0.45)" }}>{p.paymentDate}</span>
              <span style={{ fontSize: "0.62rem", color: "rgba(240,237,230,0.35)", background: "rgba(255,255,255,0.04)", padding: "0.1rem 0.4rem", borderRadius: "0.25rem" }}>{METHOD_LABEL[p.method] ?? p.method}</span>
              {p.referenceNo && <span style={{ fontSize: "0.65rem", color: "rgba(240,237,230,0.4)" }}>#{p.referenceNo}</span>}
              {p.note && <span style={{ fontSize: "0.65rem", color: "rgba(240,237,230,0.35)", fontStyle: "italic", flex: 1 }}>{p.note}</span>}
              {!isTerminal && (
                <button onClick={() => handleDelete(p.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(248,113,113,0.4)", marginLeft: "auto", padding: "0.1rem" }}>
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {payments.length === 0 && (
        <p style={{ fontSize: "0.72rem", color: "rgba(240,237,230,0.2)" }}>No payments recorded yet.</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Wire PaymentSection into order detail page**

In `src/app/(app)/orders/[id]/page.tsx`:

1. Add payments to the Prisma query:
```typescript
payments: {
  orderBy: { paymentDate: "asc" },
  select: { id: true, amount: true, paymentDate: true, method: true, referenceNo: true, note: true },
},
```

2. Serialize payments:
```typescript
const payments = order.payments.map((p) => ({
  ...p,
  amount:      Number(p.amount),
  paymentDate: p.paymentDate.toISOString().split("T")[0],
}));
```

3. Add PaymentSection in the JSX between items table and status update section:
```typescript
import PaymentSection from "./PaymentSection";
// ...
<div style={section}>
  <PaymentSection
    orderId={order.id}
    netAmount={netAmount}
    payments={payments}
    isTerminal={["DELIVERED", "CANCELLED"].includes(order.status)}
  />
</div>
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Manual test**

```bash
npm run dev
```

1. Open any DRAFT order
2. Click "Add Payment" → fill form → record → payment appears in list
3. Try to move to CONFIRMED without payment → error message shown
4. Add payment → move to CONFIRMED → succeeds
5. Move through to READY → try DELIVERED without full payment → error
6. Record remaining balance → move to DELIVERED → succeeds

- [ ] **Step 5: Commit**

```bash
git add src/app/(app)/orders/[id]/PaymentSection.tsx src/app/(app)/orders/[id]/page.tsx
git commit -m "feat: payment section on order detail — record, list, delete, payment status summary"
```
