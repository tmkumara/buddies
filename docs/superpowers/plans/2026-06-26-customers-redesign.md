# Customers Module Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Full UX overhaul of the Customers module — slide-over new/edit, inline expand row with contact details and linked orders, stat strip, filter tabs, server-side pagination, secondary phone field.

**Architecture:** Schema gets `phone2 String?` on Customer. Three new components (`CustomerSlideOver`, `CustomerExpandRow`, `CustomersClient`) replace the current table-and-separate-pages approach. Server page reads `searchParams`, runs parallel Prisma queries, passes paginated data to `CustomersClient`. New/edit pages redirect to `/customers`.

**Tech Stack:** Next.js 16.2.7 App Router, React 19, TypeScript, Prisma 7 + MySQL, Lucide React 1.17

## Global Constraints

- **Depends on:** `StatChip`, `FilterTabBar`, `PaginationBar` from `2026-06-26-materials-pagination.md` plan (must be built first).
- **Next.js 16**: `searchParams` is `Promise<{...}>` — always `await`. Read `node_modules/next/dist/docs/` before writing Next.js code.
- **Prisma 7**: `db push` ONLY — never `prisma migrate`. `Decimal` fields → `number` before Client Components (Customer has no Decimals).
- **No new npm packages.**
- **Design tokens**: reuse `.slide-over-backdrop`, `.slide-over-panel`, `.slide-over-panel.open`, `.slide-over-header`, `.slide-over-body`, `.slide-over-footer`, `.form-section-label`, `.form-input`, `.form-label`, `.cta-btn`, `.submit-btn`, `.status-chip-btn`, `.status-chip-btn.active-ACTIVE/.active-INACTIVE`, `.stat-strip`, `.filter-tabs`, `.filter-tab`, `.filter-tab.active`, `.expand-row`, `.row-chevron`, `.row-chevron.expanded`, `.content-card`, `.orders-table`.
- **`router.refresh()`** after successful slide-over save.
- **TypeScript strict**: no `any`.

---

### Task 1: Schema, Validation, and Server Actions

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `src/lib/validations/customer.ts`
- Modify: `src/actions/customers.ts`

**Interfaces:**
- Produces:
  - `createCustomer(formData)` — now accepts `phone2`
  - `updateCustomer(id, formData)` — now accepts `phone2`, `active`
  - `getCustomerRecentOrders(customerId: number)` — new, returns recent orders

- [ ] **Step 1: Add `phone2` to Customer in `prisma/schema.prisma`**

Find the Customer model (search for `model Customer`). Add `phone2` after the `phone` field:

```prisma
model Customer {
  id          Int      @id @default(autoincrement())
  name        String   @db.VarChar(150)
  phone       String   @db.VarChar(30)
  phone2      String?  @map("phone_2") @db.VarChar(30)   // ADD THIS LINE
  email       String?  @db.VarChar(150)
  addressLine String?  @map("address_line") @db.VarChar(255)
  notes       String?  @db.VarChar(255)
  active      Boolean  @default(true) @map("is_active")
  createdAt   DateTime @default(now()) @map("created_at") @db.DateTime
  updatedAt   DateTime @updatedAt @map("updated_at") @db.DateTime
  orders      Order[]

  @@index([name])
  @@index([phone])
  @@index([active])
  @@map("customer")
}
```

- [ ] **Step 2: Apply schema to database**

```bash
npx prisma db push
```

Expected output: `Your database is now in sync with your Prisma schema.`

- [ ] **Step 3: Update `src/lib/validations/customer.ts`**

Add `phone2` to the schema:

```typescript
import { z } from "zod";

export const customerSchema = z.object({
  name:        z.string().min(1, "Name is required").max(150),
  phone:       z.string().min(1, "Phone is required").max(30),
  phone2:      z.string().max(30).optional().or(z.literal("")),
  email:       z.string().email("Invalid email").max(150).optional().or(z.literal("")),
  addressLine: z.string().max(255).optional().or(z.literal("")),
  notes:       z.string().max(255).optional().or(z.literal("")),
  active:      z.boolean().default(true),
});

export type CustomerInput = z.infer<typeof customerSchema>;
```

- [ ] **Step 4: Update `src/actions/customers.ts`**

Replace the full file content:

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth-guards";
import prisma from "@/lib/prisma";
import { customerSchema } from "@/lib/validations/customer";
import { OrderStatus } from "@prisma/client";

export async function createCustomer(formData: FormData) {
  await requireAuth();

  const raw = {
    name:        formData.get("name") as string,
    phone:       formData.get("phone") as string,
    phone2:      formData.get("phone2") as string || undefined,
    email:       formData.get("email") as string || undefined,
    addressLine: formData.get("addressLine") as string || undefined,
    notes:       formData.get("notes") as string || undefined,
    active:      true,
  };

  const parsed = customerSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Validation error" };
  }

  await prisma.customer.create({
    data: {
      name:        parsed.data.name,
      phone:       parsed.data.phone,
      phone2:      parsed.data.phone2 || null,
      email:       parsed.data.email || null,
      addressLine: parsed.data.addressLine || null,
      notes:       parsed.data.notes || null,
      active:      true,
    },
  });

  revalidatePath("/customers");
  return { success: true };
}

export async function updateCustomer(id: number, formData: FormData) {
  await requireAuth();

  const raw = {
    name:        formData.get("name") as string,
    phone:       formData.get("phone") as string,
    phone2:      formData.get("phone2") as string || undefined,
    email:       formData.get("email") as string || undefined,
    addressLine: formData.get("addressLine") as string || undefined,
    notes:       formData.get("notes") as string || undefined,
    active:      formData.get("active") === "true",
  };

  const parsed = customerSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Validation error" };
  }

  await prisma.customer.update({
    where: { id },
    data: {
      name:        parsed.data.name,
      phone:       parsed.data.phone,
      phone2:      parsed.data.phone2 || null,
      email:       parsed.data.email || null,
      addressLine: parsed.data.addressLine || null,
      notes:       parsed.data.notes || null,
      active:      parsed.data.active,
    },
  });

  revalidatePath("/customers");
  return { success: true };
}

export async function toggleCustomerActive(id: number, active: boolean) {
  await requireAuth();
  await prisma.customer.update({ where: { id }, data: { active } });
  revalidatePath("/customers");
  return { success: true };
}

const ORDER_STATUS_PILL: Record<OrderStatus, string> = {
  DRAFT:         "status-pending",
  CONFIRMED:     "status-fulfilled",
  IN_PRODUCTION: "status-pending",
  READY:         "status-fulfilled",
  DELIVERED:     "status-fulfilled",
  CANCELLED:     "status-cancelled",
};

export async function getCustomerRecentOrders(customerId: number): Promise<{
  id: number;
  orderNo: string;
  orderDate: string;
  status: OrderStatus;
  statusPillClass: string;
}[]> {
  await requireAuth();
  const orders = await prisma.order.findMany({
    where: { customerId },
    select: { id: true, orderNo: true, orderDate: true, status: true },
    orderBy: { orderDate: "desc" },
    take: 5,
  });
  return orders.map((o) => ({
    id:             o.id,
    orderNo:        o.orderNo,
    orderDate:      o.orderDate.toISOString(),
    status:         o.status,
    statusPillClass: ORDER_STATUS_PILL[o.status],
  }));
}
```

- [ ] **Step 5: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma src/lib/validations/customer.ts src/actions/customers.ts
git commit -m "feat: add Customer.phone2 field and getCustomerRecentOrders server action"
```

---

### Task 2: CustomerSlideOver

**Files:**
- Create: `src/components/customers/CustomerSlideOver.tsx`

**Interfaces:**
- Produces:
```typescript
export interface CustomerData {
  id: number;
  name: string;
  phone: string;
  phone2: string | null;
  email: string | null;
  addressLine: string | null;
  notes: string | null;
  active: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  existing?: CustomerData;
}
export default function CustomerSlideOver(props: Props): JSX.Element
```

- [ ] **Step 1: Create `src/components/customers/CustomerSlideOver.tsx`**

```tsx
"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { createCustomer, updateCustomer } from "@/actions/customers";

export interface CustomerData {
  id: number;
  name: string;
  phone: string;
  phone2: string | null;
  email: string | null;
  addressLine: string | null;
  notes: string | null;
  active: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  existing?: CustomerData;
}

export default function CustomerSlideOver({ open, onClose, existing }: Props) {
  const router = useRouter();
  const [active, setActive] = useState(existing?.active ?? true);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  // Sync state when slide-over opens for a different customer
  useEffect(() => {
    if (!open) return;
    setActive(existing?.active ?? true);
    setError("");
  }, [open, existing?.id]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = existing
        ? await updateCustomer(existing.id, fd)
        : await createCustomer(fd);
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
    marginTop: "1.25rem",
  };

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
            {existing ? `Edit — ${existing.name}` : "New Customer"}
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

            <input type="hidden" name="active" value={active ? "true" : "false"} />

            {/* IDENTITY */}
            <p className="form-section-label" style={{ marginBottom: "0.75rem" }}>IDENTITY</p>
            <div className="form-field" style={{ marginBottom: "0.75rem" }}>
              <label className="form-label">NAME *</label>
              <input name="name" type="text" className="form-input" defaultValue={existing?.name ?? ""} required />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
              <div className="form-field">
                <label className="form-label">PRIMARY PHONE *</label>
                <input name="phone" type="text" className="form-input" defaultValue={existing?.phone ?? ""} required />
              </div>
              <div className="form-field">
                <label className="form-label">SECONDARY PHONE</label>
                <input name="phone2" type="text" className="form-input" defaultValue={existing?.phone2 ?? ""} />
              </div>
            </div>

            {/* CONTACT */}
            <p className="form-section-label" style={{ marginTop: "0.5rem", marginBottom: "0.75rem" }}>CONTACT</p>
            <div className="form-field" style={{ marginBottom: "0.75rem" }}>
              <label className="form-label">EMAIL</label>
              <input name="email" type="email" className="form-input" defaultValue={existing?.email ?? ""} />
            </div>
            <div className="form-field" style={{ marginBottom: "0.75rem" }}>
              <label className="form-label">ADDRESS LINE</label>
              <input name="addressLine" type="text" className="form-input" defaultValue={existing?.addressLine ?? ""} />
            </div>
            <div className="form-field" style={{ marginBottom: "1rem" }}>
              <label className="form-label">NOTES</label>
              <textarea
                name="notes"
                className="form-input"
                rows={3}
                defaultValue={existing?.notes ?? ""}
                style={{ resize: "vertical", minHeight: "80px" }}
              />
            </div>

            {/* STATUS */}
            <p className="form-section-label" style={{ marginBottom: "0.6rem" }}>STATUS</p>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                type="button"
                className={`status-chip-btn${active ? " active-ACTIVE" : ""}`}
                onClick={() => setActive(true)}
              >
                ACTIVE
              </button>
              <button
                type="button"
                className={`status-chip-btn${!active ? " active-INACTIVE" : ""}`}
                onClick={() => setActive(false)}
              >
                INACTIVE
              </button>
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
              {pending ? "SAVING…" : "SAVE CUSTOMER"}
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
git add src/components/customers/CustomerSlideOver.tsx
git commit -m "feat: add CustomerSlideOver component"
```

---

### Task 3: CustomerExpandRow

**Files:**
- Create: `src/components/customers/CustomerExpandRow.tsx`

**Interfaces:**
- Consumes: `getCustomerRecentOrders` from `@/actions/customers` (Task 1); `CustomerData` from `./CustomerSlideOver` (Task 2)
- Produces:
```typescript
interface CustomerExpandRowProps {
  customer: {
    id: number;
    phone: string;
    phone2: string | null;
    email: string | null;
    addressLine: string | null;
    notes: string | null;
  };
  onFullEdit: () => void;
  onClose: () => void;
}
export default function CustomerExpandRow(props: CustomerExpandRowProps): JSX.Element
```

- [ ] **Step 1: Create `src/components/customers/CustomerExpandRow.tsx`**

The expand row uses `.expand-row` CSS class (two-column grid, collapses to 1 column on mobile). Orders are fetched lazily on mount via `getCustomerRecentOrders`.

```tsx
"use client";

import { useState, useEffect } from "react";
import { Pencil, X, ExternalLink } from "lucide-react";
import { getCustomerRecentOrders } from "@/actions/customers";

type RecentOrder = Awaited<ReturnType<typeof getCustomerRecentOrders>>[number];

interface Props {
  customer: {
    id: number;
    phone: string;
    phone2: string | null;
    email: string | null;
    addressLine: string | null;
    notes: string | null;
  };
  onFullEdit: () => void;
  onClose: () => void;
}

const sectionLabel: React.CSSProperties = {
  fontSize: "0.62rem",
  letterSpacing: "0.1em",
  color: "rgba(240,237,230,0.35)",
  textTransform: "uppercase",
  marginBottom: "0.6rem",
};

const fieldRow: React.CSSProperties = {
  display: "flex",
  gap: "0.6rem",
  marginBottom: "0.35rem",
  fontSize: "0.75rem",
};

const fieldLabel: React.CSSProperties = {
  minWidth: "64px",
  color: "rgba(240,237,230,0.35)",
  fontSize: "0.65rem",
  paddingTop: "1px",
  flexShrink: 0,
};

export default function CustomerExpandRow({ customer, onFullEdit, onClose }: Props) {
  const [orders, setOrders] = useState<RecentOrder[] | null>(null);

  useEffect(() => {
    getCustomerRecentOrders(customer.id).then(setOrders);
  }, [customer.id]);

  function formatDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  }

  const displayedOrders = orders?.slice(0, 3) ?? [];
  const extraCount = orders ? Math.max(0, orders.length - 3) : 0;

  return (
    <div>
      {/* Two-column body */}
      <div className="expand-row" style={{ padding: 0 }}>
        {/* Left: Contact details */}
        <div style={{ padding: "1rem 1.25rem", borderRight: "1px solid rgba(245,182,30,0.08)" }}>
          <p style={sectionLabel}>Contact Details</p>

          <div style={fieldRow}>
            <span style={fieldLabel}>Phone 1</span>
            <span style={{ color: "#F0EDE6" }}>{customer.phone}</span>
          </div>

          {customer.phone2 && (
            <div style={fieldRow}>
              <span style={fieldLabel}>Phone 2</span>
              <span style={{ color: "#F0EDE6" }}>{customer.phone2}</span>
            </div>
          )}

          {customer.email && (
            <div style={fieldRow}>
              <span style={fieldLabel}>Email</span>
              <span style={{ color: "rgba(240,237,230,0.7)" }}>{customer.email}</span>
            </div>
          )}

          {customer.addressLine && (
            <div style={fieldRow}>
              <span style={fieldLabel}>Address</span>
              <span style={{ color: "rgba(240,237,230,0.7)", lineHeight: 1.4 }}>{customer.addressLine}</span>
            </div>
          )}

          {customer.notes && (
            <div style={fieldRow}>
              <span style={fieldLabel}>Notes</span>
              <span style={{
                color: "rgba(240,237,230,0.55)",
                overflow: "hidden",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                lineHeight: 1.4,
              }}>
                {customer.notes}
              </span>
            </div>
          )}
        </div>

        {/* Right: Recent orders */}
        <div style={{ padding: "1rem 1.25rem" }}>
          <p style={sectionLabel}>Recent Orders</p>

          {orders === null && (
            <p style={{ fontSize: "0.72rem", color: "rgba(240,237,230,0.28)", fontStyle: "italic" }}>
              Loading…
            </p>
          )}

          {orders !== null && orders.length === 0 && (
            <p style={{ fontSize: "0.72rem", color: "rgba(240,237,230,0.28)", fontStyle: "italic" }}>
              No orders yet.
            </p>
          )}

          {displayedOrders.map((o) => (
            <div key={o.id} style={{
              display: "flex",
              alignItems: "center",
              gap: "0.6rem",
              marginBottom: "0.4rem",
              fontSize: "0.72rem",
            }}>
              <a
                href={`/orders/${o.id}`}
                style={{ color: "#F5B61E", fontWeight: 700, textDecoration: "none", letterSpacing: "0.04em", flexShrink: 0 }}
              >
                #{o.orderNo}
              </a>
              <span style={{ color: "rgba(240,237,230,0.35)", flexShrink: 0 }}>{formatDate(o.orderDate)}</span>
              <span className={`status-pill ${o.statusPillClass}`} style={{ fontSize: "0.58rem", padding: "0.1rem 0.5rem" }}>
                {o.status}
              </span>
            </div>
          ))}

          {extraCount > 0 && (
            <a
              href={`/orders?customer=${customer.id}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.25rem",
                fontSize: "0.65rem",
                color: "rgba(245,182,30,0.7)",
                textDecoration: "none",
                marginTop: "0.25rem",
              }}
            >
              + {extraCount} more <ExternalLink size={10} />
            </a>
          )}
        </div>
      </div>

      {/* Footer */}
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

- [ ] **Step 3: Commit**

```bash
git add src/components/customers/CustomerExpandRow.tsx
git commit -m "feat: add CustomerExpandRow with lazy order fetch and two-column layout"
```

---

### Task 4: CustomersClient + Page Overhaul + Redirects

**Files:**
- Create: `src/components/customers/CustomersClient.tsx`
- Modify: `src/app/(app)/customers/page.tsx`
- Modify: `src/app/(app)/customers/new/page.tsx`
- Modify: `src/app/(app)/customers/[id]/edit/page.tsx`

**Interfaces:**
- Consumes:
  - `CustomerSlideOver`, `CustomerData` from `./CustomerSlideOver` (Task 2)
  - `CustomerExpandRow` from `./CustomerExpandRow` (Task 3)
  - `StatChip` from `@/components/ui/StatChip`
  - `FilterTabBar` from `@/components/ui/FilterTabBar`
  - `PaginationBar` from `@/components/ui/PaginationBar`

- [ ] **Step 1: Create `src/components/customers/CustomersClient.tsx`**

```tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { ChevronRight } from "lucide-react";
import StatChip from "@/components/ui/StatChip";
import FilterTabBar from "@/components/ui/FilterTabBar";
import PaginationBar from "@/components/ui/PaginationBar";
import CustomerSlideOver, { CustomerData } from "./CustomerSlideOver";
import CustomerExpandRow from "./CustomerExpandRow";

export interface CustomerRow {
  id: number;
  name: string;
  phone: string;
  phone2: string | null;
  email: string | null;
  addressLine: string | null;
  notes: string | null;
  active: boolean;
}

interface StatTotals {
  total: number;
  active: number;
  inactive: number;
}

interface Props {
  customers: CustomerRow[];
  filteredTotal: number;
  page: number;
  size: number;
  currentQ: string;
  currentStatus: string;
  statTotals: StatTotals;
}

const TABS = ["ALL", "ACTIVE", "INACTIVE"];

export default function CustomersClient({
  customers,
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
  const [editTarget, setEditTarget] = useState<CustomerData | undefined>(undefined);
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
  function openEdit(id: number) {
    const c = customers.find((x) => x.id === id);
    if (c) { setEditTarget(c as CustomerData); setSlideOpen(true); }
  }
  function closeSlide() { setSlideOpen(false); setEditTarget(undefined); }

  return (
    <div style={{ padding: "1.25rem 1.75rem" }}>
      {/* Stat strip */}
      <div className="stat-strip" style={{ marginBottom: "1rem" }}>
        <StatChip label="TOTAL"    value={statTotals.total} />
        <StatChip label="ACTIVE"   value={statTotals.active}   color="#4ADE80" />
        <StatChip label="INACTIVE" value={statTotals.inactive} color="#F87171" />
      </div>

      {/* Controls */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        <div style={{ position: "relative", flex: "1 1 180px", maxWidth: "280px" }}>
          <Search size={12} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "rgba(240,237,230,0.22)", pointerEvents: "none" }} />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search name, phone, email…"
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
          <Plus size={12} /> New Customer
        </button>
      </div>

      {customers.length === 0 && (
        <div className="content-card" style={{ padding: "3rem 0", textAlign: "center", fontSize: "0.8rem", color: "rgba(240,237,230,0.22)" }}>
          {searchValue || currentStatus !== "ALL" ? "No customers match your filter." : "No customers yet."}
        </div>
      )}

      {/* Desktop/tablet table */}
      {customers.length > 0 && (
        <div id="customers-table-view">
          <div className="content-card" style={{ padding: 0, overflow: "hidden" }}>
            <table className="orders-table">
              <thead>
                <tr>
                  <th style={{ width: "2rem" }} />
                  <th>NAME</th>
                  <th>PHONE</th>
                  <th className="hide-tablet">EMAIL</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => {
                  const isExpanded = expandedId === c.id;
                  return (
                    <React.Fragment key={c.id}>
                      <tr
                        style={{
                          opacity: c.active ? 1 : 0.55,
                          cursor: "pointer",
                        }}
                        onClick={() => setExpandedId(isExpanded ? null : c.id)}
                      >
                        <td style={{ paddingRight: 0 }}>
                          <ChevronRight size={14} className={`row-chevron${isExpanded ? " expanded" : ""}`} />
                        </td>
                        <td style={{ fontWeight: 600, color: "#F0EDE6" }}>{c.name}</td>
                        <td style={{ color: "rgba(240,237,230,0.65)" }}>{c.phone}</td>
                        <td className="hide-tablet" style={{ color: "rgba(240,237,230,0.42)", fontSize: "0.76rem" }}>
                          {c.email ?? "—"}
                        </td>
                        <td>
                          <span className={`status-pill ${c.active ? "status-fulfilled" : "status-cancelled"}`}>
                            {c.active ? "ACTIVE" : "INACTIVE"}
                          </span>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={5} style={{ padding: 0 }}>
                            <CustomerExpandRow
                              customer={c}
                              onFullEdit={() => { setExpandedId(null); openEdit(c.id); }}
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
          <PaginationBar total={filteredTotal} page={page} size={size} currentParams={currentParams} />
        </div>
      )}

      {/* Mobile cards */}
      {customers.length > 0 && (
        <div id="customers-card-view">
          {customers.map((c) => (
            <div
              key={c.id}
              className="material-card"
              style={{
                opacity: c.active ? 1 : 0.55,
                cursor: "pointer",
              }}
              onClick={() => openEdit(c.id)}
            >
              <div className="material-card-face" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <p style={{ fontWeight: 700, color: "#F0EDE6", fontSize: "0.85rem" }}>{c.name}</p>
                  <p style={{ fontSize: "0.72rem", color: "rgba(240,237,230,0.55)", marginTop: "0.2rem" }}>{c.phone}</p>
                  {c.email && <p style={{ fontSize: "0.68rem", color: "rgba(240,237,230,0.38)", marginTop: "0.15rem" }}>{c.email}</p>}
                </div>
                <span className={`status-pill ${c.active ? "status-fulfilled" : "status-cancelled"}`}>
                  {c.active ? "ACTIVE" : "INACTIVE"}
                </span>
              </div>
            </div>
          ))}
          <PaginationBar total={filteredTotal} page={page} size={size} currentParams={currentParams} />
        </div>
      )}

      <CustomerSlideOver open={slideOpen} onClose={closeSlide} existing={editTarget} />
    </div>
  );
}
```

- [ ] **Step 2: Rewrite `src/app/(app)/customers/page.tsx`**

```tsx
import { requireAuth } from "@/lib/auth-guards";
import prisma from "@/lib/prisma";
import TopBar from "@/components/layout/TopBar";
import CustomersClient from "@/components/customers/CustomersClient";

export default async function CustomersPage({
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

  const activeFilter =
    status === "ACTIVE"   ? true  :
    status === "INACTIVE" ? false :
    undefined;

  const where = {
    active: activeFilter,
    OR: q
      ? [
          { name:   { contains: q } },
          { phone:  { contains: q } },
          { phone2: { contains: q } },
          { email:  { contains: q } },
        ]
      : undefined,
  };

  const [raw, filteredTotal, totalAll, totalActive, totalInactive] = await Promise.all([
    prisma.customer.findMany({ where, skip, take: size, orderBy: { name: "asc" } }),
    prisma.customer.count({ where }),
    prisma.customer.count(),
    prisma.customer.count({ where: { active: true } }),
    prisma.customer.count({ where: { active: false } }),
  ]);

  const customers = raw.map((c) => ({
    id:          c.id,
    name:        c.name,
    phone:       c.phone,
    phone2:      c.phone2,
    email:       c.email,
    addressLine: c.addressLine,
    notes:       c.notes,
    active:      c.active,
  }));

  return (
    <>
      <TopBar title="Customers" />
      <CustomersClient
        customers={customers}
        filteredTotal={filteredTotal}
        page={page}
        size={size}
        currentQ={q ?? ""}
        currentStatus={status && ["ACTIVE", "INACTIVE"].includes(status) ? status : "ALL"}
        statTotals={{ total: totalAll, active: totalActive, inactive: totalInactive }}
      />
    </>
  );
}
```

- [ ] **Step 3: Redirect new/edit pages**

Replace `src/app/(app)/customers/new/page.tsx`:
```tsx
import { redirect } from "next/navigation";
export default function NewCustomerPage() {
  redirect("/customers");
}
```

Replace `src/app/(app)/customers/[id]/edit/page.tsx`:
```tsx
import { redirect } from "next/navigation";
export default function EditCustomerPage() {
  redirect("/customers");
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

Navigate to `http://localhost:3000/customers`. Verify:
- [ ] Stat strip: TOTAL, ACTIVE, INACTIVE counts correct
- [ ] Search filters by name, phone, email; URL updates with `?q=`
- [ ] Filter tabs ALL/ACTIVE/INACTIVE work; URL updates with `?status=`
- [ ] Pagination bar appears with multiple pages; size 20/50/100 works
- [ ] Clicking chevron expands row showing contact details + orders (loading then rendered)
- [ ] Phone 2 row visible when customer has secondary phone; hidden when absent
- [ ] "FULL EDIT" in expand row opens slide-over pre-populated
- [ ] Full Edit saves changes; slide-over closes; list updates
- [ ] "New Customer" opens empty slide-over; saves new customer
- [ ] Navigate to `/customers/new` → redirects to `/customers`
- [ ] Navigate to `/customers/1/edit` → redirects to `/customers`
- [ ] Mobile (< 768px): card view appears, tap card opens slide-over

- [ ] **Step 6: Commit**

```bash
git add src/components/customers/CustomersClient.tsx src/app/(app)/customers/page.tsx "src/app/(app)/customers/new/page.tsx" "src/app/(app)/customers/[id]/edit/page.tsx"
git commit -m "feat: overhaul Customers module with slide-over, expand row, stat strip, and pagination"
```
