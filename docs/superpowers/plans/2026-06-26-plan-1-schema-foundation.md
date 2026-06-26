# Plan 1: Schema & Core Utilities

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the Prisma schema with three new models (Payment, LeadSource, StockAdjustment), two new Order fields (leadSourceId, publicToken, discountPercent), and build all core utility functions that every later plan depends on.

**Architecture:** Schema-first — run `prisma db push` after each model addition. Utility functions in `src/lib/utils/` are pure functions (no DB calls) so they can be imported anywhere. Validation schemas in `src/lib/validations/` match the new models.

**Tech Stack:** Prisma 7, Zod 4, TypeScript 5, Next.js 16 App Router

## Global Constraints

- Next.js 16 App Router — `searchParams` is a Promise, must be awaited in page components
- Prisma Decimal fields must be converted with `Number()` before passing to Client Components
- Server Actions return `{ error: string }` or `{ success: true }` — never redirect inside catch
- `redirect()` must be called OUTSIDE try-catch blocks
- All monetary values stored as `DECIMAL` in DB; use `Number()` for arithmetic
- No test framework installed — verify with `npx tsc --noEmit` and `next build`

---

### Task 1: Add Payment, LeadSource, StockAdjustment models + Order fields to Prisma schema

**Files:**
- Modify: `prisma/schema.prisma`

**Interfaces:**
- Produces: `Payment`, `LeadSource`, `StockAdjustment` Prisma models; `Order.leadSourceId`, `Order.publicToken`, `Order.discountPercent`

- [ ] **Step 1: Add LeadSource model and Order relation fields**

Open `prisma/schema.prisma`. Add directly after the `OrderSeq` model (before `Order`):

```prisma
model LeadSource {
  id      Int     @id @default(autoincrement())
  name    String  @db.VarChar(100)
  active  Boolean @default(true)
  orders  Order[]

  @@map("lead_source")
}
```

Then inside the `Order` model, add these fields after `remarks`:

```prisma
  discountPercent Decimal              @default(0.00) @map("discount_percent") @db.Decimal(5, 2)
  leadSourceId    Int?                 @map("lead_source_id")
  leadSource      LeadSource?          @relation(fields: [leadSourceId], references: [id])
  publicToken     String?              @unique @map("public_token") @db.VarChar(64)
```

And add `payments Payment[]` to the Order relations (after `statusHistory`):
```prisma
  payments       Payment[]
```

Also add these indexes to the Order `@@` block:
```prisma
  @@index([leadSourceId])
  @@index([publicToken])
```

- [ ] **Step 2: Add Payment model**

Add after the `Order` model:

```prisma
enum PaymentMethod {
  CASH
  BANK_TRANSFER
  CHEQUE
}

model Payment {
  id            Int           @id @default(autoincrement())
  orderId       Int           @map("order_id")
  order         Order         @relation(fields: [orderId], references: [id], onDelete: Cascade)
  amount        Decimal       @db.Decimal(12, 2)
  paymentDate   DateTime      @map("payment_date") @db.Date
  method        PaymentMethod
  referenceNo   String?       @map("reference_no") @db.VarChar(100)
  note          String?       @db.VarChar(255)
  createdById   Int?          @map("created_by_id")
  createdBy     User?         @relation(fields: [createdById], references: [id])
  createdAt     DateTime      @default(now()) @map("created_at") @db.DateTime

  @@index([orderId])
  @@map("payment")
}
```

Add `payments Payment[]` to the `User` model relations.

- [ ] **Step 3: Add StockAdjustment model**

Add after the `Payment` model:

```prisma
enum StockAdjustmentType {
  MANUAL
  AUTO_PRODUCTION
}

model StockAdjustment {
  id             Int                 @id @default(autoincrement())
  materialId     Int                 @map("material_id")
  material       Material            @relation(fields: [materialId], references: [id])
  quantityChange Decimal             @map("quantity_change") @db.Decimal(10, 2)
  reason         String?             @db.VarChar(255)
  type           StockAdjustmentType
  orderId        Int?                @map("order_id")
  order          Order?              @relation(fields: [orderId], references: [id])
  changedById    Int?                @map("changed_by_id")
  changedBy      User?               @relation(fields: [changedById], references: [id])
  changedAt      DateTime            @default(now()) @map("changed_at") @db.DateTime

  @@index([materialId])
  @@index([orderId])
  @@map("stock_adjustment")
}
```

Add `stockAdjustments StockAdjustment[]` to the `Material` model.
Add `stockAdjustments StockAdjustment[]` to the `Order` model.
Add `stockAdjustments StockAdjustment[]` to the `User` model.

- [ ] **Step 4: Push schema to database**

```bash
npx prisma db push
```

Expected output: `Your database is now in sync with your Prisma schema.`

If you see migration drift warnings, run `npx prisma db push --force-reset` only on a dev database (this drops and recreates tables — do NOT use on production data).

- [ ] **Step 5: Regenerate Prisma client**

```bash
npx prisma generate
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors. Fix any type errors before proceeding.

- [ ] **Step 7: Seed lead sources**

Create `prisma/seed-lead-sources.ts`:

```typescript
import prisma from "../src/lib/prisma";

const sources = ["WhatsApp", "Facebook", "Instagram", "Walk-in", "Referral", "Other"];

async function main() {
  for (const name of sources) {
    await prisma.leadSource.upsert({
      where: { id: sources.indexOf(name) + 1 },
      update: {},
      create: { name },
    });
  }
  console.log("Lead sources seeded.");
}

main().finally(() => prisma.$disconnect());
```

Run: `npx tsx prisma/seed-lead-sources.ts`

Expected output: `Lead sources seeded.`

- [ ] **Step 8: Commit**

```bash
git add prisma/schema.prisma prisma/seed-lead-sources.ts
git commit -m "feat: add Payment, LeadSource, StockAdjustment models + Order fields (discountPercent, leadSourceId, publicToken)"
```

---

### Task 2: Pricing utility functions

**Files:**
- Create: `src/lib/utils/pricing.ts`

**Interfaces:**
- Produces:
  - `calculateBoxesPerSheet(dims: BoxDims): number` — 0 if dims missing
  - `calculateMaterialCostPerBox(materialUnitPrice: number, boxesPerSheet: number): number`
  - `calculateSuggestedUnitPrice(materialCostPerBox: number, addOnCost: number): number`
  - `type BoxDims = { sheetLengthIn, sheetWidthIn, sheetLengthCm, sheetWidthCm, cutLengthIn, cutWidthIn, cutLengthCm, cutWidthCm }`

- [ ] **Step 1: Create pricing utility**

Create `src/lib/utils/pricing.ts`:

```typescript
export interface BoxDims {
  sheetLengthIn?: number | null;
  sheetWidthIn?:  number | null;
  sheetLengthCm?: number | null;
  sheetWidthCm?:  number | null;
  cutLengthIn?:   number | null;
  cutWidthIn?:    number | null;
  cutLengthCm?:   number | null;
  cutWidthCm?:    number | null;
}

export function calculateBoxesPerSheet(dims: BoxDims): number {
  const sheetL = dims.sheetLengthIn ?? dims.sheetLengthCm;
  const sheetW = dims.sheetWidthIn  ?? dims.sheetWidthCm;
  const cutL   = dims.cutLengthIn   ?? dims.cutLengthCm;
  const cutW   = dims.cutWidthIn    ?? dims.cutWidthCm;

  if (!sheetL || !sheetW || !cutL || !cutW || cutL <= 0 || cutW <= 0) return 0;

  return Math.floor(sheetL / cutL) * Math.floor(sheetW / cutW);
}

export function calculateMaterialCostPerBox(
  materialUnitPrice: number,
  boxesPerSheet: number,
): number {
  if (boxesPerSheet <= 0) return 0;
  return Math.round((materialUnitPrice / boxesPerSheet) * 100) / 100;
}

export function calculateSuggestedUnitPrice(
  materialCostPerBox: number,
  addOnCost: number,
): number {
  return Math.round((materialCostPerBox + addOnCost) * 100) / 100;
}

export function calculateTrueCostPerBox(
  materialCostPerSheet: number,
  boxesPerSheet: number,
): number {
  if (boxesPerSheet <= 0) return 0;
  return Math.round((materialCostPerSheet / boxesPerSheet) * 100) / 100;
}

export function calculateSheetsNeeded(quantity: number, boxesPerSheet: number): number {
  if (boxesPerSheet <= 0) return 0;
  return Math.ceil(quantity / boxesPerSheet);
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/utils/pricing.ts
git commit -m "feat: add pricing utility functions (boxes per sheet, material cost, suggested price)"
```

---

### Task 3: Update order totals calculation for quantity-based discount

**Files:**
- Modify: `src/lib/utils/calculations.ts`

**Interfaces:**
- Modifies: `calculateOrderTotals` signature — removes `discountPercent` param, adds `discountOverride` optional
- Produces: `calculateQuantityDiscount(totalQty: number): number` — returns rate (0, 0.07, or 0.10)

- [ ] **Step 1: Update calculations.ts**

Replace the contents of `src/lib/utils/calculations.ts` with:

```typescript
export function calculateRawArea(
  cutLengthCm: number | null | undefined,
  cutWidthCm:  number | null | undefined,
): number | null {
  if (cutLengthCm == null || cutWidthCm == null) return null;
  return cutLengthCm * cutWidthCm;
}

export function calculateLineTotal(unitPrice: number, quantity: number): number {
  return Math.round(unitPrice * quantity * 100) / 100;
}

export function calculateQuantityDiscount(totalQty: number): number {
  if (totalQty >= 100) return 0.10;
  if (totalQty >= 50)  return 0.07;
  return 0;
}

export function calculateOrderTotals(
  items: { unitPrice: number; quantity: number }[],
  discountOverride?: number | null,
): { totalAmount: number; discountAmount: number; netAmount: number; discountPercent: number } {
  const totalAmount = items.reduce(
    (sum, item) => sum + calculateLineTotal(item.unitPrice, item.quantity),
    0,
  );
  const totalQty = items.reduce((sum, item) => sum + item.quantity, 0);

  const discountPercent = discountOverride != null
    ? discountOverride
    : calculateQuantityDiscount(totalQty) * 100;

  const discountAmount = Math.round(totalAmount * (discountPercent / 100) * 100) / 100;
  const netAmount      = Math.round((totalAmount - discountAmount) * 100) / 100;

  return { totalAmount, discountAmount, netAmount, discountPercent };
}

export function toNumber(value: { toString(): string } | number | string): number {
  return typeof value === "number" ? value : Number(value);
}
```

- [ ] **Step 2: Fix the call site in `src/actions/orders.ts`**

In `src/actions/orders.ts`, the line:
```typescript
const totals = calculateOrderTotals(items, parsed.data.discountPercent);
```

Update `createOrderSchema` in `src/lib/validations/order.ts` — remove `discountPercent` field (discount is now auto-calculated):

```typescript
import { z } from "zod";

export const orderItemInputSchema = z.object({
  boxDesignId: z.coerce.number().int().positive("Box design required"),
  quantity:    z.coerce.number().int().positive("Quantity must be at least 1"),
  unitPrice:   z.coerce.number().nonnegative("Unit price must be non-negative"),
});

export const createOrderSchema = z.object({
  customerId:      z.coerce.number().int().positive("Customer is required"),
  orderDate:       z.string().min(1, "Order date is required"),
  deliveryDate:    z.string().optional(),
  discountPercent: z.coerce.number().min(0).max(100).optional(), // optional ADMIN override
  remarks:         z.string().max(255).optional(),
  leadSourceId:    z.coerce.number().int().positive().optional(),
});

export const updateOrderDetailsSchema = z.object({
  deliveryDate:    z.string().optional(),
  remarks:         z.string().max(255).optional(),
  discountPercent: z.coerce.number().min(0).max(100).optional(),
});
```

- [ ] **Step 3: Update `src/actions/orders.ts` createOrder to use new totals + publicToken**

In `createOrder`, replace the totals line and add publicToken:

```typescript
import crypto from "crypto";
// ...
const totals = calculateOrderTotals(items, parsed.data.discountPercent ?? null);
const publicToken = crypto.randomBytes(32).toString("hex");
// ...
// In prisma.order.create({ data: { ... } }), add:
//   discountPercent: totals.discountPercent,
//   leadSourceId:    parsed.data.leadSourceId ?? null,
//   publicToken,
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Fix any type errors (the return type of `calculateOrderTotals` now includes `discountPercent`).

- [ ] **Step 5: Commit**

```bash
git add src/lib/utils/calculations.ts src/lib/validations/order.ts src/actions/orders.ts
git commit -m "feat: quantity-based auto-discount (7%@50+, 10%@100+), add discountPercent + publicToken to order creation"
```

---

### Task 4: Payment validation schema and server action

**Files:**
- Create: `src/lib/validations/payment.ts`
- Create: `src/actions/payments.ts`

**Interfaces:**
- Produces:
  - `createPayment(orderId: number, formData: FormData): Promise<{ success: true } | { error: string }>`
  - `deletePayment(paymentId: number): Promise<{ success: true } | { error: string }>`

- [ ] **Step 1: Create payment validation schema**

Create `src/lib/validations/payment.ts`:

```typescript
import { z } from "zod";

export const createPaymentSchema = z.object({
  amount:      z.coerce.number().positive("Amount must be greater than 0"),
  paymentDate: z.string().min(1, "Payment date is required"),
  method:      z.enum(["CASH", "BANK_TRANSFER", "CHEQUE"], { message: "Invalid payment method" }),
  referenceNo: z.string().max(100).optional(),
  note:        z.string().max(255).optional(),
});
```

- [ ] **Step 2: Create payment server actions**

Create `src/actions/payments.ts`:

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth-guards";
import prisma from "@/lib/prisma";
import { createPaymentSchema } from "@/lib/validations/payment";

export async function createPayment(orderId: number, formData: FormData) {
  const session = await requireAuth();

  const parsed = createPaymentSchema.safeParse({
    amount:      formData.get("amount"),
    paymentDate: formData.get("paymentDate"),
    method:      formData.get("method"),
    referenceNo: (formData.get("referenceNo") as string) || undefined,
    note:        (formData.get("note") as string) || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Validation error" };

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true },
  });
  if (!order) return { error: "Order not found" };

  await prisma.payment.create({
    data: {
      orderId,
      amount:      parsed.data.amount,
      paymentDate: new Date(parsed.data.paymentDate),
      method:      parsed.data.method,
      referenceNo: parsed.data.referenceNo ?? null,
      note:        parsed.data.note ?? null,
      createdById: Number(session.user.id),
    },
  });

  revalidatePath(`/orders/${orderId}`);
  return { success: true as const };
}

export async function deletePayment(paymentId: number, orderId: number) {
  await requireAuth();

  await prisma.payment.delete({ where: { id: paymentId } });

  revalidatePath(`/orders/${orderId}`);
  return { success: true as const };
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/validations/payment.ts src/actions/payments.ts
git commit -m "feat: payment server actions (create, delete) with validation"
```

---

### Task 5: Lead source server actions

**Files:**
- Create: `src/actions/lead-sources.ts`

**Interfaces:**
- Produces:
  - `getLeadSources(): Promise<{ id: number; name: string }[]>`
  - `createLeadSource(formData: FormData): Promise<{ success: true } | { error: string }>`
  - `updateLeadSource(id: number, formData: FormData): Promise<{ success: true } | { error: string }>`

- [ ] **Step 1: Create lead source actions**

Create `src/actions/lead-sources.ts`:

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth-guards";
import prisma from "@/lib/prisma";

export async function getLeadSources() {
  const sources = await prisma.leadSource.findMany({
    where:   { active: true },
    orderBy: { id: "asc" },
    select:  { id: true, name: true },
  });
  return sources;
}

export async function createLeadSource(formData: FormData) {
  const session = await requireAuth();
  if (session.user.role !== "ADMIN") return { error: "Admin only" };

  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "Name is required" };

  await prisma.leadSource.create({ data: { name } });
  revalidatePath("/settings/lead-sources");
  return { success: true as const };
}

export async function updateLeadSource(id: number, formData: FormData) {
  const session = await requireAuth();
  if (session.user.role !== "ADMIN") return { error: "Admin only" };

  const name   = (formData.get("name") as string)?.trim();
  const active = formData.get("active") === "true";

  if (!name) return { error: "Name is required" };

  await prisma.leadSource.update({ where: { id }, data: { name, active } });
  revalidatePath("/settings/lead-sources");
  return { success: true as const };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/actions/lead-sources.ts
git commit -m "feat: lead source CRUD server actions"
```

---

### Task 6: Stock adjustment server action

**Files:**
- Create: `src/actions/stock.ts`

**Interfaces:**
- Produces:
  - `createManualStockAdjustment(materialId: number, formData: FormData): Promise<{ success: true } | { error: string }>`
  - `deductStockForOrder(orderId: number, userId: number): Promise<void>` — called internally on IN_PRODUCTION transition

- [ ] **Step 1: Create stock action**

Create `src/actions/stock.ts`:

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth-guards";
import prisma from "@/lib/prisma";
import { calculateBoxesPerSheet, calculateSheetsNeeded } from "@/lib/utils/pricing";

export async function createManualStockAdjustment(materialId: number, formData: FormData) {
  const session = await requireAuth();

  const rawQty    = parseFloat((formData.get("quantityChange") as string) ?? "0");
  const reason    = (formData.get("reason") as string)?.trim() || null;

  if (isNaN(rawQty) || rawQty === 0) return { error: "Quantity change cannot be zero" };
  if (!reason) return { error: "Reason is required for manual adjustments" };

  const material = await prisma.material.findUnique({ where: { id: materialId } });
  if (!material) return { error: "Material not found" };

  await prisma.$transaction([
    prisma.material.update({
      where: { id: materialId },
      data:  { currentStockLevel: { increment: rawQty } },
    }),
    prisma.stockAdjustment.create({
      data: {
        materialId,
        quantityChange: rawQty,
        reason,
        type:        "MANUAL",
        changedById: Number(session.user.id),
      },
    }),
  ]);

  revalidatePath("/materials");
  return { success: true as const };
}

export async function deductStockForOrder(orderId: number, userId: number): Promise<void> {
  const order = await prisma.order.findUnique({
    where:   { id: orderId },
    include: {
      items: {
        include: {
          boxDesign: {
            include: { material: true },
          },
        },
      },
    },
  });
  if (!order) return;

  for (const item of order.items) {
    const bd  = item.boxDesign;
    const mat = bd.material;

    const boxesPerSheet = calculateBoxesPerSheet({
      sheetLengthIn: mat.sheetLengthIn ? Number(mat.sheetLengthIn) : null,
      sheetWidthIn:  mat.sheetWidthIn  ? Number(mat.sheetWidthIn)  : null,
      sheetLengthCm: mat.sheetLengthCm ? Number(mat.sheetLengthCm) : null,
      sheetWidthCm:  mat.sheetWidthCm  ? Number(mat.sheetWidthCm)  : null,
      cutLengthIn:   bd.cutLengthIn    ? Number(bd.cutLengthIn)    : null,
      cutWidthIn:    bd.cutWidthIn     ? Number(bd.cutWidthIn)     : null,
      cutLengthCm:   bd.cutLengthCm    ? Number(bd.cutLengthCm)    : null,
      cutWidthCm:    bd.cutWidthCm     ? Number(bd.cutWidthCm)     : null,
    });

    if (boxesPerSheet === 0) continue; // skip if dimensions not set, warn handled at UI level

    const sheetsNeeded = calculateSheetsNeeded(item.quantity, boxesPerSheet);

    await prisma.$transaction([
      prisma.material.update({
        where: { id: mat.id },
        data:  { currentStockLevel: { decrement: sheetsNeeded } },
      }),
      prisma.stockAdjustment.create({
        data: {
          materialId:    mat.id,
          quantityChange: -sheetsNeeded,
          reason:        `Auto-deducted for Order #${order.orderNo}`,
          type:          "AUTO_PRODUCTION",
          orderId,
          changedById:   userId,
        },
      }),
    ]);
  }
}
```

- [ ] **Step 2: Wire deductStockForOrder into updateOrderStatus action**

In `src/actions/orders.ts`, import and call `deductStockForOrder` when transition is to IN_PRODUCTION:

```typescript
import { deductStockForOrder } from "@/actions/stock";

// Inside updateOrderStatus, after the transaction:
if (newStatus === "IN_PRODUCTION") {
  await deductStockForOrder(orderId, Number(session.user.id));
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Run dev server and manually test**

```bash
npm run dev
```

1. Create a test order with items that have box designs with dimensions set
2. Move the order to CONFIRMED (add a payment first)
3. Move to IN_PRODUCTION
4. Check that `stock_adjustment` table has AUTO_PRODUCTION entries
5. Check that `material.currentStockLevel` decreased

- [ ] **Step 5: Commit**

```bash
git add src/actions/stock.ts src/actions/orders.ts
git commit -m "feat: stock auto-deduction on IN_PRODUCTION + manual stock adjustment action"
```

---

### Task 7: Final verification

- [ ] **Step 1: Full TypeScript check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 2: Build check**

```bash
npm run build
```

Expected: successful build, 0 errors.

- [ ] **Step 3: Verify DB tables exist**

Using a DB client (e.g. TablePlus, DBeaver, or `npx prisma studio`), confirm these tables exist:
- `payment`
- `lead_source` (with 6 rows: WhatsApp, Facebook, Instagram, Walk-in, Referral, Other)
- `stock_adjustment`
- `customer_order` has columns: `discount_percent`, `lead_source_id`, `public_token`
