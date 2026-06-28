# Notification System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three notification layers — toast pop-ups for immediate UI feedback, an in-app bell/panel for staff awareness, and Resend email notifications for customers on status changes.

**Architecture:** A shared `notificationService()` function writes to the `Notification` DB table and optionally sends a Resend email; server actions call it after mutations and also return `toast` metadata that client components consume via a React context. A polling API route (`/api/notifications`) feeds the `NotificationBell` component in the TopBar every 30 seconds.

**Tech Stack:** Next.js 16 App Router, Prisma 7, Resend npm package, React context (no external toast library)

## Global Constraints

- Dark luxury theme throughout in-app UI: bg `#0d0d0d`, gold `#F5B61E`, text `#F0EDE6`, muted `rgba(240,237,230,0.35)`
- In-app notification panel bg: `#111109`, border `rgba(245,182,30,0.15)`
- Toast bg: `#1A1914`, border `1px solid rgba(245,182,30,0.15)`, left accent bar: green/red/gold
- Email backgrounds MUST be light (`#ffffff`) — email clients strip dark backgrounds
- No external toast library — custom React context implementation only
- `notificationService` must never throw — catch all errors and log with `console.error`
- Resend calls are fire-and-forget — email failure must never block the UI response
- If `RESEND_API_KEY` env var is absent, email sending is silently skipped (DB notifications still work)
- Customer phone in emails: `0783085081` only; no website URL
- Skip email silently if `customer.email` is null/empty
- Email statuses that trigger customer email: `CONFIRMED`, `READY`, `DELIVERED`, `CANCELLED`
- `prisma db push --accept-data-loss` required (existing DateTime columns have precision cast warning)
- After any schema change: run `npx prisma generate` before TypeScript checks

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `prisma/schema.prisma` | Modify | Add `Notification` + `NotificationRead` models; add reverse relations on `Order` and `User` |
| `src/lib/notification-types.ts` | Create | Shared `ToastPayload` type (imported by both client and server files) |
| `src/lib/toast-context.tsx` | Create | `ToastProvider`, `useToast()` hook, `Toaster` portal |
| `src/app/providers.tsx` | Modify | Wrap children in `<ToastProvider>` |
| `src/lib/email-templates.ts` | Create | `buildStatusEmail(status, data)` → HTML string |
| `src/lib/notifications.ts` | Create | `notificationService(payload)` — DB write + Resend email |
| `src/actions/orders.ts` | Modify | Call `notificationService` after status change + order create; return `toast` data |
| `src/app/(app)/orders/[id]/OrderStatusForm.tsx` | Modify | Call `useToast()` on action result; remove inline success state |
| `src/app/(app)/orders/[id]/OrderDetailsForm.tsx` | Modify | Call `useToast()` on action result; remove inline success state |
| `src/actions/payments.ts` | Modify | Call `notificationService` after payment create; return `toast` data |
| `src/app/(app)/orders/[id]/PaymentSection.tsx` | Modify | Call `useToast()` on action results before page reload |
| `src/app/api/notifications/route.ts` | Create | `GET` — returns `{ unreadCount, notifications[] }` for current user |
| `src/actions/notifications.ts` | Create | `markAllNotificationsRead()` and `markNotificationRead(id)` server actions |
| `src/components/layout/NotificationBell.tsx` | Create | Bell icon, badge, slide-down panel, polling logic |
| `src/components/layout/TopBar.tsx` | Modify | Replace placeholder bell button with `<NotificationBell />` |

---

## Task 1: DB Schema — Notification + NotificationRead

**Files:**
- Modify: `prisma/schema.prisma`

**Interfaces:**
- Produces: `Notification` and `NotificationRead` Prisma models; `notificationRead` unique index `notificationId_userId` used by upsert in Task 7

- [ ] **Step 1: Add models and reverse relations to `prisma/schema.prisma`**

Add the two new models at the end of the file (before the last closing brace of the last model). Also add the `notifications` reverse relation to `Order` and `notificationReads` reverse relation to `User`.

In the `User` model, add after the last relation line (`stockItemEntries StockItemEntry[]`):
```prisma
  notificationReads NotificationRead[]
```

In the `Order` model, add after `stockItemEntries StockItemEntry[]`:
```prisma
  notifications    Notification[]
```

At the very end of the file, add:
```prisma
model Notification {
  id        Int                @id @default(autoincrement())
  type      String             @db.VarChar(50)
  title     String             @db.VarChar(150)
  body      String             @db.VarChar(500)
  orderId   Int?               @map("order_id")
  order     Order?             @relation(fields: [orderId], references: [id], onDelete: SetNull)
  createdAt DateTime           @default(now()) @map("created_at") @db.DateTime
  reads     NotificationRead[]

  @@index([createdAt])
  @@map("notification")
}

model NotificationRead {
  id             Int          @id @default(autoincrement())
  notificationId Int          @map("notification_id")
  notification   Notification @relation(fields: [notificationId], references: [id], onDelete: Cascade)
  userId         Int          @map("user_id")
  user           User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  readAt         DateTime     @default(now()) @map("read_at") @db.DateTime

  @@unique([notificationId, userId])
  @@map("notification_read")
}
```

- [ ] **Step 2: Push schema to the database**

```bash
npx prisma db push --accept-data-loss
```

Expected output contains: `Your database is now in sync with your Prisma schema.`

- [ ] **Step 3: Regenerate Prisma client**

```bash
npx prisma generate
```

Expected output contains: `Generated Prisma Client`

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: add Notification and NotificationRead schema"
```

---

## Task 2: Toast System

**Files:**
- Create: `src/lib/notification-types.ts`
- Create: `src/lib/toast-context.tsx`
- Modify: `src/app/providers.tsx`

**Interfaces:**
- Produces:
  - `ToastPayload` type (imported by server actions in Tasks 4 and 6)
  - `useToast()` hook returning `{ showToast(payload: Omit<Toast, 'id'>): void }` (used by Tasks 5 and 6)
  - `ToastProvider` component (added to providers.tsx)

- [ ] **Step 1: Create `src/lib/notification-types.ts`**

```ts
export interface ToastPayload {
  type:   "success" | "error" | "info";
  title:  string;
  body?:  string;
}
```

- [ ] **Step 2: Create `src/lib/toast-context.tsx`**

```tsx
"use client";

import {
  createContext, useContext, useState, useCallback,
  useEffect, ReactNode,
} from "react";
import { createPortal } from "react-dom";
import type { ToastPayload } from "@/lib/notification-types";

interface Toast extends ToastPayload { id: string; }

interface ToastContextValue { showToast: (t: ToastPayload) => void; }

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export function useToast() { return useContext(ToastContext); }

const ACCENT: Record<string, string> = {
  success: "#4ADE80",
  error:   "#F87171",
  info:    "#F5B61E",
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const t = setTimeout(() => onDismiss(toast.id), 4000);
    return () => clearTimeout(t);
  }, [toast.id, onDismiss]);

  return (
    <div style={{
      display: "flex", gap: "0.65rem", alignItems: "flex-start",
      background: "#1A1914",
      border: "1px solid rgba(245,182,30,0.15)",
      borderRadius: "0.6rem",
      padding: "0.75rem 0.9rem",
      boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
      maxWidth: "340px", width: "100%",
      animation: "fadeInDown 0.18s ease",
    }}>
      <div style={{
        width: "3px", borderRadius: "2px",
        background: ACCENT[toast.type] ?? "#F5B61E",
        alignSelf: "stretch", flexShrink: 0,
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: "0.82rem", fontWeight: 600, color: "#F0EDE6", margin: 0 }}>
          {toast.title}
        </p>
        {toast.body && (
          <p style={{ fontSize: "0.74rem", color: "rgba(240,237,230,0.55)", margin: "0.2rem 0 0" }}>
            {toast.body}
          </p>
        )}
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss"
        style={{
          background: "none", border: "none", cursor: "pointer",
          color: "rgba(240,237,230,0.3)", padding: "0.1rem",
          flexShrink: 0, lineHeight: 1, fontSize: "0.9rem",
        }}
      >✕</button>
    </div>
  );
}

function Toaster({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || toasts.length === 0) return null;

  return createPortal(
    <div style={{
      position: "fixed", top: "1rem", right: "1rem", zIndex: 9999,
      display: "flex", flexDirection: "column", gap: "0.5rem",
      alignItems: "flex-end",
    }}>
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>,
    document.body,
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((payload: ToastPayload) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { ...payload, id }].slice(-3));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Toaster toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}
```

- [ ] **Step 3: Add fade-in keyframe to globals.css**

Open `src/app/globals.css` and add at the very end:
```css
@keyframes fadeInDown {
  from { opacity: 0; transform: translateY(-6px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

- [ ] **Step 4: Wrap children in `ToastProvider` in `src/app/providers.tsx`**

Replace the entire file with:
```tsx
"use client";

import { SessionProvider } from "next-auth/react";
import { ToastProvider } from "@/lib/toast-context";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ToastProvider>{children}</ToastProvider>
    </SessionProvider>
  );
}
```

- [ ] **Step 5: Type check**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 6: Smoke-test in dev**

```bash
npm run dev
```

Navigate to any order page. Page should load normally with no console errors. The Toaster is invisible until a toast is triggered.

- [ ] **Step 7: Commit**

```bash
git add src/lib/notification-types.ts src/lib/toast-context.tsx src/app/providers.tsx src/app/globals.css
git commit -m "feat: add toast notification system (context + Toaster portal)"
```

---

## Task 3: Notification Infrastructure (Service + Email Template + Resend)

**Files:**
- Create: `src/lib/email-templates.ts`
- Create: `src/lib/notifications.ts`

**Interfaces:**
- Consumes:
  - `InvoiceData` from `@/lib/invoice-data` (already exists)
  - `ToastPayload` from `@/lib/notification-types` (Task 2)
- Produces:
  - `notificationService(payload: NotificationPayload): Promise<void>` — called by Tasks 4 and 6
  - `NotificationPayload` interface

- [ ] **Step 1: Add `RESEND_API_KEY` to `.env.local`**

Open (or create) `.env.local` in the project root and add:
```
RESEND_API_KEY=re_your_key_here
RESEND_FROM_EMAIL=Buddies <onboarding@resend.dev>
```

For testing use `onboarding@resend.dev` (Resend's free sandbox sender). For production, verify a custom domain in the Resend dashboard and change `RESEND_FROM_EMAIL` to `Buddies <noreply@yourdomain.lk>`.

- [ ] **Step 2: Install Resend**

```bash
npm install resend
```

Expected: `added 1 package`

- [ ] **Step 3: Create `src/lib/email-templates.ts`**

```ts
import type { InvoiceData } from "@/lib/invoice-data";

const STATUS_META: Record<string, { headline: string; message: string; subject: string } | undefined> = {
  CONFIRMED: {
    headline: "Your order is confirmed",
    message:  "We've received your payment and will begin production shortly.",
    subject:  "confirmed",
  },
  READY: {
    headline: "Your order is ready",
    message:  "Please arrange pickup or delivery at your convenience.",
    subject:  "ready for pickup",
  },
  DELIVERED: {
    headline: "Thank you!",
    message:  "Your order has been delivered. We hope you love it.",
    subject:  "delivered",
  },
  CANCELLED: {
    headline: "Order cancelled",
    message:  "Your order has been cancelled. Contact us if you have questions.",
    subject:  "cancelled",
  },
};

const METHOD_LABEL: Record<string, string> = {
  CASH: "Cash", BANK_TRANSFER: "Bank Transfer", CHEQUE: "Cheque",
};

const COMPANY_PHONE = "0783085081";
const COMPANY_EMAIL = "hello.buddieslk@gmail.com";

export function buildStatusEmail(
  status: string,
  data: InvoiceData,
): { html: string; subject: string } | null {
  const meta = STATUS_META[status];
  if (!meta) return null;

  const itemsHtml = data.items.map((item) => `
    <tr>
      <td style="padding:8px 6px;border-bottom:1px solid #e5e7eb;font-size:12px;color:#374151;">${item.designCode}</td>
      <td style="padding:8px 6px;border-bottom:1px solid #e5e7eb;font-size:12px;color:#374151;">
        <span>${item.designName}</span>
        ${item.boxTypeName || item.sizeCm ? `<br/><span style="font-size:10px;color:#9ca3af;">${[item.boxTypeName, item.sizeCm].filter(Boolean).join("  ·  ")}</span>` : ""}
      </td>
      <td style="padding:8px 6px;border-bottom:1px solid #e5e7eb;font-size:12px;color:#374151;text-align:right;">${item.quantity}</td>
      <td style="padding:8px 6px;border-bottom:1px solid #e5e7eb;font-size:12px;color:#374151;text-align:right;">Rs.&nbsp;${item.unitPrice.toFixed(2)}</td>
      <td style="padding:8px 6px;border-bottom:1px solid #e5e7eb;font-size:12px;font-weight:600;color:#111827;text-align:right;">Rs.&nbsp;${item.lineTotal.toFixed(2)}</td>
    </tr>`).join("");

  const discountRow = data.discountAmount > 0
    ? `<tr><td style="padding:4px 0;font-size:13px;color:#6b7280;">Discount (${data.discountPercent.toFixed(1)}%)</td><td style="padding:4px 0;font-size:13px;color:#dc2626;text-align:right;">−&nbsp;Rs.&nbsp;${data.discountAmount.toFixed(2)}</td></tr>`
    : "";

  const deliveryRow = data.deliveryCharge > 0
    ? `<tr><td style="padding:4px 0;font-size:13px;color:#6b7280;">${data.deliveryMethodName ?? "Delivery"}</td><td style="padding:4px 0;font-size:13px;color:#374151;text-align:right;">Rs.&nbsp;${data.deliveryCharge.toFixed(2)}</td></tr>`
    : "";

  const paymentsHtml = data.payments.length > 0
    ? `<div style="margin-bottom:20px;">
        <p style="font-size:10px;letter-spacing:0.07em;color:#6b7280;margin:0 0 8px 0;font-weight:600;">PAYMENT HISTORY</p>
        ${data.payments.map((p) => `
          <div style="display:flex;justify-content:space-between;font-size:12px;color:#555;margin-bottom:4px;">
            <span>${p.paymentDate} — ${METHOD_LABEL[p.method] ?? p.method}${p.referenceNo ? ` (#${p.referenceNo})` : ""}</span>
            <span style="color:#16a34a;font-weight:600;">Rs.&nbsp;${p.amount.toFixed(2)}</span>
          </div>`).join("")}
      </div>`
    : "";

  const remarksHtml = data.remarks
    ? `<div style="padding:10px 14px;background:#f9fafb;border-left:3px solid #e5e7eb;border-radius:0 4px 4px 0;margin-bottom:20px;">
        <p style="font-size:10px;letter-spacing:0.07em;color:#6b7280;margin:0 0 4px 0;font-weight:600;">REMARKS</p>
        <p style="font-size:13px;color:#555;margin:0;">${data.remarks}</p>
      </div>`
    : "";

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:24px 12px;">

  <div style="background:#ffffff;border-radius:8px 8px 0 0;padding:20px 28px 16px;border-bottom:3px solid #F5B61E;">
    <span style="font-size:22px;font-weight:800;color:#1a1a1a;letter-spacing:0.1em;">BUDDIES</span>
    <span style="font-size:11px;color:#9ca3af;margin-left:12px;letter-spacing:0.06em;">YOUR VISION, OUR MISSION</span>
  </div>

  <div style="background:#ffffff;padding:24px 28px 16px;border-bottom:1px solid #f0f0f0;">
    <h1 style="font-size:20px;font-weight:700;color:#1a1a1a;margin:0 0 8px 0;">${meta.headline}</h1>
    <p style="font-size:14px;color:#374151;margin:0 0 4px 0;">Hi ${data.customer.name},</p>
    <p style="font-size:14px;color:#374151;margin:0;">${meta.message}</p>
  </div>

  <div style="background:#ffffff;padding:24px 28px;">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;">
      <div>
        <p style="font-size:10px;letter-spacing:0.07em;color:#6b7280;margin:0 0 4px 0;font-weight:600;">BILL TO</p>
        <p style="font-size:14px;font-weight:700;color:#1a1a1a;margin:0 0 2px 0;">${data.customer.name}</p>
        <p style="font-size:12px;color:#555;margin:0;">${data.customer.phone}</p>
        ${data.customer.email ? `<p style="font-size:12px;color:#555;margin:2px 0 0 0;">${data.customer.email}</p>` : ""}
      </div>
      <div style="text-align:right;">
        <p style="font-size:16px;font-weight:700;color:#1a1a1a;margin:0;">#&nbsp;${data.orderNo}</p>
        <p style="font-size:12px;color:#6b7280;margin:4px 0 0 0;">Date: ${data.orderDate}</p>
        ${data.deliveryDate ? `<p style="font-size:12px;color:#6b7280;margin:2px 0 0 0;">Delivery: ${data.deliveryDate}</p>` : ""}
      </div>
    </div>

    <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
      <thead>
        <tr style="background:#f9fafb;">
          <th style="padding:8px 6px;text-align:left;font-size:10px;letter-spacing:0.07em;color:#6b7280;border-bottom:2px solid #e5e7eb;font-weight:600;">CODE</th>
          <th style="padding:8px 6px;text-align:left;font-size:10px;letter-spacing:0.07em;color:#6b7280;border-bottom:2px solid #e5e7eb;font-weight:600;">DESCRIPTION</th>
          <th style="padding:8px 6px;text-align:right;font-size:10px;letter-spacing:0.07em;color:#6b7280;border-bottom:2px solid #e5e7eb;font-weight:600;">QTY</th>
          <th style="padding:8px 6px;text-align:right;font-size:10px;letter-spacing:0.07em;color:#6b7280;border-bottom:2px solid #e5e7eb;font-weight:600;">UNIT</th>
          <th style="padding:8px 6px;text-align:right;font-size:10px;letter-spacing:0.07em;color:#6b7280;border-bottom:2px solid #e5e7eb;font-weight:600;">TOTAL</th>
        </tr>
      </thead>
      <tbody>${itemsHtml}</tbody>
    </table>

    <div style="display:flex;justify-content:flex-end;margin-bottom:20px;">
      <table style="width:220px;border-collapse:collapse;">
        <tr><td style="padding:4px 0;font-size:13px;color:#6b7280;">Subtotal</td><td style="padding:4px 0;font-size:13px;color:#374151;text-align:right;">Rs.&nbsp;${data.totalAmount.toFixed(2)}</td></tr>
        ${discountRow}
        ${deliveryRow}
        <tr style="border-top:2px solid #e5e7eb;">
          <td style="padding:8px 0 4px;font-size:15px;font-weight:700;color:#1a1a1a;">Total</td>
          <td style="padding:8px 0 4px;font-size:15px;font-weight:700;color:#1a1a1a;text-align:right;">Rs.&nbsp;${data.netAmount.toFixed(2)}</td>
        </tr>
        <tr><td style="padding:3px 0;font-size:13px;color:#6b7280;">Paid</td><td style="padding:3px 0;font-size:13px;color:#16a34a;font-weight:600;text-align:right;">Rs.&nbsp;${data.totalPaid.toFixed(2)}</td></tr>
        <tr><td style="padding:3px 0;font-size:13px;font-weight:600;color:#1a1a1a;">Balance Due</td><td style="padding:3px 0;font-size:13px;font-weight:700;color:${data.balance > 0.01 ? "#dc2626" : "#16a34a"};text-align:right;">Rs.&nbsp;${Math.max(0, data.balance).toFixed(2)}</td></tr>
      </table>
    </div>

    ${paymentsHtml}
    ${remarksHtml}

    <div style="border-top:1px solid #e5e7eb;padding-top:16px;text-align:center;">
      <p style="font-size:13px;font-weight:600;color:#1a1a1a;margin:0 0 4px 0;">Thank you for choosing Buddies</p>
      <p style="font-size:12px;color:#6b7280;margin:0;">${COMPANY_PHONE}&nbsp;&nbsp;·&nbsp;&nbsp;${COMPANY_EMAIL}</p>
    </div>
  </div>

</div>
</body>
</html>`;

  return { html, subject: `Order ${data.orderNo} ${meta.subject} — Buddies` };
}
```

- [ ] **Step 4: Create `src/lib/notifications.ts`**

```ts
import { Resend } from "resend";
import prisma from "@/lib/prisma";
import { getInvoiceDataById } from "@/lib/invoice-data";
import { buildStatusEmail } from "@/lib/email-templates";

const EMAIL_STATUSES = new Set(["CONFIRMED", "READY", "DELIVERED", "CANCELLED"]);

export type NotificationType =
  | "ORDER_CREATED"
  | "ORDER_STATUS_CHANGED"
  | "PAYMENT_RECEIVED"
  | "LOW_STOCK";

export interface NotificationPayload {
  type:          NotificationType;
  title:         string;
  body:          string;
  orderId?:      number;
  orderStatus?:  string;      // new status; used to decide email template + whether to send
  customerEmail?: string;     // customer's email address; send email if set + orderStatus warrants it
}

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  return key ? new Resend(key) : null;
}

export async function notificationService(payload: NotificationPayload): Promise<void> {
  // 1. Write in-app notification to DB
  try {
    await prisma.notification.create({
      data: {
        type:    payload.type,
        title:   payload.title,
        body:    payload.body,
        orderId: payload.orderId ?? null,
      },
    });
  } catch (err) {
    console.error("[notificationService] DB write failed:", err);
  }

  // 2. Send customer email (fire-and-forget)
  if (
    payload.type === "ORDER_STATUS_CHANGED" &&
    payload.orderStatus &&
    EMAIL_STATUSES.has(payload.orderStatus) &&
    payload.customerEmail &&
    payload.orderId
  ) {
    const resend = getResend();
    if (resend) {
      (async () => {
        try {
          const invoiceData = await getInvoiceDataById(payload.orderId!);
          if (!invoiceData) return;
          const result = buildStatusEmail(payload.orderStatus!, invoiceData);
          if (!result) return;
          const from = process.env.RESEND_FROM_EMAIL ?? "Buddies <onboarding@resend.dev>";
          await resend.emails.send({
            from,
            to:      [payload.customerEmail!],
            subject: result.subject,
            html:    result.html,
          });
        } catch (err) {
          console.error("[notificationService] Email send failed:", err);
        }
      })();
    }
  }
}
```

- [ ] **Step 5: Type check**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add src/lib/email-templates.ts src/lib/notifications.ts package.json package-lock.json
git commit -m "feat: add notificationService with Resend email + email template builder"
```

---

## Task 4: Wire Notifications into Order Actions

**Files:**
- Modify: `src/actions/orders.ts`

**Interfaces:**
- Consumes: `notificationService` from `@/lib/notifications` (Task 3); `ToastPayload` from `@/lib/notification-types` (Task 2)
- Produces: `updateOrderStatus` now returns `toast` field; `createOrder` fires notification before redirect

- [ ] **Step 1: Update imports in `src/actions/orders.ts`**

Add to the existing imports at the top:
```ts
import { notificationService } from "@/lib/notifications";
import type { ToastPayload } from "@/lib/notification-types";
```

- [ ] **Step 2: Update `createOrder` to fire notification before redirect**

In `createOrder`, find the lines:
```ts
  revalidatePath("/orders");
  redirect(`/orders/${orderId}`);
```

Replace with:
```ts
  revalidatePath("/orders");
  await notificationService({
    type:    "ORDER_CREATED",
    title:   `New order — ${orderNo}`,
    body:    `Order ${orderNo} has been created.`,
    orderId: orderId,
  });
  redirect(`/orders/${orderId}`);
```

- [ ] **Step 3: Update `updateOrderStatus` query to include customer email and orderNo**

Find the existing query:
```ts
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      status: true,
      netAmount: true,
      payments: { select: { amount: true } },
    },
  });
```

Replace with:
```ts
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      status:   true,
      orderNo:  true,
      netAmount: true,
      payments: { select: { amount: true } },
      customer: { select: { email: true, name: true } },
    },
  });
```

- [ ] **Step 4: Add notification call and toast return to `updateOrderStatus`**

In `updateOrderStatus`, find and replace the block that begins with `revalidatePath(\`/orders/\${orderId}\`)` and ends with the closing `return { success: true as const };` and `}` of the function (everything after `await prisma.$transaction([...])`). Replace that entire block with:

```ts
  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/orders");

  if (newStatus === "IN_PRODUCTION") {
    await deductStockForOrder(orderId, Number(session.user.id));
  }

  if (newStatus === "CONFIRMED") {
    const { warnings } = await deductStockItemsForOrder(orderId, Number(session.user.id));
    if (warnings.length > 0) {
      await notificationService({
        type:    "LOW_STOCK",
        title:   "Low stock warning",
        body:    warnings.join("; "),
        orderId,
      });
      await notificationService({
        type:         "ORDER_STATUS_CHANGED",
        title:        `Order ${order.orderNo} — Confirmed`,
        body:         `Status changed to Confirmed`,
        orderId,
        orderStatus:  newStatus,
        customerEmail: order.customer.email ?? undefined,
      });
      const toast: ToastPayload = {
        type:  "info",
        title: `Order confirmed`,
        body:  `Low stock: ${warnings.join("; ")}`,
      };
      return { success: true as const, warnings, toast };
    }
  }

  const cancelFromStatuses = ["CONFIRMED", "IN_PRODUCTION", "READY"];
  if (newStatus === "CANCELLED" && cancelFromStatuses.includes(order.status)) {
    await restoreStockItemsForOrder(orderId, Number(session.user.id));
  }

  await notificationService({
    type:         "ORDER_STATUS_CHANGED",
    title:        `Order ${order.orderNo} — ${STATUS_LABELS[newStatus as OrderStatusKey]}`,
    body:         `Status changed from ${STATUS_LABELS[order.status as OrderStatusKey]} to ${STATUS_LABELS[newStatus as OrderStatusKey]}`,
    orderId,
    orderStatus:  newStatus,
    customerEmail: order.customer.email ?? undefined,
  });

  const toast: ToastPayload = {
    type:  "success",
    title: `Status updated — ${STATUS_LABELS[newStatus as OrderStatusKey]}`,
  };
  return { success: true as const, toast };
```

- [ ] **Step 5: Add toast return to `updateOrderDetails`**

In `updateOrderDetails`, find:
```ts
  return { success: true };
```

Replace with:
```ts
  return { success: true, toast: { type: "success" as const, title: "Details updated" } };
```

- [ ] **Step 6: Type check**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 7: Commit**

```bash
git add src/actions/orders.ts
git commit -m "feat: wire notificationService into order actions; return toast data"
```

---

## Task 5: Wire Toasts into Order Forms

**Files:**
- Modify: `src/app/(app)/orders/[id]/OrderStatusForm.tsx`
- Modify: `src/app/(app)/orders/[id]/OrderDetailsForm.tsx`

**Interfaces:**
- Consumes: `useToast()` from `@/lib/toast-context` (Task 2); toast field now returned by `updateOrderStatus` and `updateOrderDetails` (Task 4)

- [ ] **Step 1: Update `OrderStatusForm.tsx`**

Replace the entire file with:

```tsx
"use client";

import { useState, FormEvent } from "react";
import { updateOrderStatus } from "@/actions/orders";
import { getAllowedTransitions, STATUS_LABELS, type OrderStatusKey } from "@/lib/utils/status-transitions";
import { useToast } from "@/lib/toast-context";

interface Props {
  orderId: number;
  currentStatus: OrderStatusKey;
}

export default function OrderStatusForm({ orderId, currentStatus }: Props) {
  const allowed              = getAllowedTransitions(currentStatus);
  const [newStatus, setNewStatus] = useState(allowed[0] ?? "");
  const [note, setNote]     = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState("");
  const { showToast }       = useToast();

  if (allowed.length === 0) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!newStatus) return;
    setLoading(true); setError("");
    const result = await updateOrderStatus(orderId, newStatus, note);
    if ("error" in result && result.error) {
      setError(result.error);
    } else {
      if ("toast" in result && result.toast) showToast(result.toast);
      setNote("");
    }
    setLoading(false);
  }

  const input: React.CSSProperties = {
    width: "100%", background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(245,182,30,0.14)", borderRadius: "0.5rem",
    padding: "0.6rem 0.9rem", color: "#F0EDE6", fontSize: "0.82rem", outline: "none",
  };

  return (
    <form onSubmit={handleSubmit}>
      <h3 style={{ fontSize: "0.75rem", letterSpacing: "0.1em", color: "rgba(240,237,230,0.4)", marginBottom: "0.9rem" }}>
        UPDATE STATUS
      </h3>
      {error && <div className="form-error" style={{ marginBottom: "0.75rem" }}>{error}</div>}

      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: "140px" }}>
          <label style={{ fontSize: "0.62rem", letterSpacing: "0.08em", color: "rgba(240,237,230,0.3)", display: "block", marginBottom: "0.4rem" }}>
            NEW STATUS
          </label>
          <select value={newStatus} onChange={(e) => setNewStatus(e.target.value as OrderStatusKey)} style={input}>
            {allowed.map((s) => (
              <option key={s} value={s} style={{ background: "#0d0d0d" }}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>
        <div style={{ flex: 2, minWidth: "180px" }}>
          <label style={{ fontSize: "0.62rem", letterSpacing: "0.08em", color: "rgba(240,237,230,0.3)", display: "block", marginBottom: "0.4rem" }}>
            NOTE (optional)
          </label>
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason for status change…" style={input} />
        </div>
        <div style={{ display: "flex", alignItems: "flex-end" }}>
          <button type="submit" className="submit-btn" disabled={loading} style={{ whiteSpace: "nowrap" }}>
            {loading ? "UPDATING…" : "UPDATE STATUS"}
          </button>
        </div>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Update `OrderDetailsForm.tsx`**

Add `useToast` import and replace the success handling. Find the two lines at top of the file:
```tsx
import { useState, FormEvent } from "react";
import { updateOrderDetails } from "@/actions/orders";
```

Replace with:
```tsx
import { useState, FormEvent } from "react";
import { updateOrderDetails } from "@/actions/orders";
import { useToast } from "@/lib/toast-context";
```

Inside the component body, add `useToast` after the existing `useState` calls and remove the `success` state:

Find:
```tsx
  const [loading,           setLoading]           = useState(false);
  const [error,             setError]             = useState("");
  const [success,           setSuccess]           = useState("");
```

Replace with:
```tsx
  const [loading,           setLoading]           = useState(false);
  const [error,             setError]             = useState("");
  const { showToast }                             = useToast();
```

Find the `handleSubmit` function body:
```tsx
    const result = await updateOrderDetails(orderId, fd);
    if (result.error) { setError(result.error); }
    else { setSuccess("Details updated."); }
    setLoading(false);
```

Replace with:
```tsx
    const result = await updateOrderDetails(orderId, fd);
    if (result.error) { setError(result.error); }
    else if (result.toast) { showToast(result.toast); }
    setLoading(false);
```

Remove the success display JSX. Find:
```tsx
      {error   && <div className="form-error" style={{ marginBottom: "0.75rem" }}>{error}</div>}
      {success && <div style={{ marginBottom: "0.75rem", padding: "0.6rem 0.9rem", background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: "0.5rem", fontSize: "0.78rem", color: "#4ADE80" }}>{success}</div>}
```

Replace with:
```tsx
      {error && <div className="form-error" style={{ marginBottom: "0.75rem" }}>{error}</div>}
```

- [ ] **Step 3: Type check**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 4: Manual verification**

```bash
npm run dev
```

1. Navigate to any non-terminal order.
2. Update the status — a gold/green toast should appear top-right and dismiss after 4 seconds.
3. Edit order details and save — a success toast appears.
4. Trigger an error (e.g., confirm without payment) — inline red error shows (no toast for errors).

- [ ] **Step 5: Commit**

```bash
git add src/app/\(app\)/orders/\[id\]/OrderStatusForm.tsx src/app/\(app\)/orders/\[id\]/OrderDetailsForm.tsx
git commit -m "feat: replace inline success messages with toasts in order forms"
```

---

## Task 6: Wire Notifications + Toasts into Payments

**Files:**
- Modify: `src/actions/payments.ts`
- Modify: `src/app/(app)/orders/[id]/PaymentSection.tsx`

**Interfaces:**
- Consumes: `notificationService` (Task 3); `useToast()` (Task 2)
- Produces: `createPayment` and `deletePayment` return `toast` field

- [ ] **Step 1: Update `src/actions/payments.ts`**

Replace the entire file with:
```ts
"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth-guards";
import prisma from "@/lib/prisma";
import { createPaymentSchema } from "@/lib/validations/payment";
import { notificationService } from "@/lib/notifications";

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
    where:  { id: orderId },
    select: { id: true, orderNo: true },
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

  await notificationService({
    type:    "PAYMENT_RECEIVED",
    title:   `Payment received — ${order.orderNo}`,
    body:    `Rs. ${Number(parsed.data.amount).toFixed(2)} recorded`,
    orderId,
  });

  revalidatePath(`/orders/${orderId}`);
  return {
    success: true as const,
    toast: { type: "success" as const, title: "Payment recorded", body: `Rs. ${Number(parsed.data.amount).toFixed(2)} recorded` },
  };
}

export async function deletePayment(paymentId: number, orderId: number) {
  await requireAuth();

  const order = await prisma.order.findUnique({
    where:  { id: orderId },
    select: { status: true },
  });
  if (!order) return { error: "Order not found" };
  if (["DELIVERED", "CANCELLED"].includes(order.status)) {
    return { error: "Cannot delete payments on a completed order" };
  }

  await prisma.payment.delete({ where: { id: paymentId, orderId } });
  revalidatePath(`/orders/${orderId}`);
  return {
    success: true as const,
    toast: { type: "info" as const, title: "Payment removed" },
  };
}
```

- [ ] **Step 2: Update `PaymentSection.tsx` to use toasts**

Add `useToast` import. Find the imports at the top:
```tsx
import { Plus, Trash2 } from "lucide-react";
import { createPayment, deletePayment } from "@/actions/payments";
```

Replace with:
```tsx
import { Plus, Trash2 } from "lucide-react";
import { createPayment, deletePayment } from "@/actions/payments";
import { useToast } from "@/lib/toast-context";
```

Inside the component, add `useToast` after the existing state declarations. Find the line:
```tsx
  const [error,    setError]    = useState("");
```

Add after it:
```tsx
  const { showToast } = useToast();
```

Update `handleAddPayment` — find:
```tsx
    if ("error" in result) { setError(result.error ?? "Unknown error"); return; }
    // Optimistically reload page to get fresh server data
    window.location.reload();
```

Replace with:
```tsx
    if ("error" in result) { setError(result.error ?? "Unknown error"); return; }
    if (result.toast) showToast(result.toast);
    window.location.reload();
```

Update `handleDelete` — find:
```tsx
  async function handleDelete(paymentId: number) {
    if (!confirm("Remove this payment?")) return;
    await deletePayment(paymentId, orderId);
    window.location.reload();
  }
```

Replace with:
```tsx
  async function handleDelete(paymentId: number) {
    if (!confirm("Remove this payment?")) return;
    const result = await deletePayment(paymentId, orderId);
    if ("toast" in result && result.toast) showToast(result.toast);
    window.location.reload();
  }
```

- [ ] **Step 3: Type check**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 4: Manual verification**

Start dev server, navigate to an order with a non-terminal status, record a payment — a green toast "Payment recorded" should briefly appear before the page reloads. Delete a payment — a gold "Payment removed" toast appears.

- [ ] **Step 5: Commit**

```bash
git add src/actions/payments.ts src/app/\(app\)/orders/\[id\]/PaymentSection.tsx
git commit -m "feat: wire payment notifications and toasts"
```

---

## Task 7: Notifications API Route + Mark-Read Server Action

**Files:**
- Create: `src/app/api/notifications/route.ts`
- Create: `src/actions/notifications.ts`

**Interfaces:**
- Produces:
  - `GET /api/notifications` → `{ unreadCount: number, notifications: NotificationItem[] }`
  - `NotificationItem`: `{ id, type, title, body, orderId: number|null, createdAt: string, read: boolean }`
  - `markAllNotificationsRead(): Promise<void>` server action
  - `markNotificationRead(notificationId: number): Promise<void>` server action

- [ ] **Step 1: Create `src/app/api/notifications/route.ts`**

```ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = Number(session.user.id);

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        reads: { where: { userId }, select: { id: true } },
      },
    }),
    prisma.notification.count({
      where: { reads: { none: { userId } } },
    }),
  ]);

  return NextResponse.json({
    unreadCount,
    notifications: notifications.map((n) => ({
      id:        n.id,
      type:      n.type,
      title:     n.title,
      body:      n.body,
      orderId:   n.orderId,
      createdAt: n.createdAt.toISOString(),
      read:      n.reads.length > 0,
    })),
  });
}
```

- [ ] **Step 2: Create `src/actions/notifications.ts`**

```ts
"use server";

import { requireAuth } from "@/lib/auth-guards";
import prisma from "@/lib/prisma";

export async function markAllNotificationsRead(): Promise<void> {
  const session = await requireAuth();
  const userId  = Number(session.user.id);

  const unread = await prisma.notification.findMany({
    where:  { reads: { none: { userId } } },
    select: { id: true },
  });
  if (unread.length === 0) return;

  await prisma.notificationRead.createMany({
    data: unread.map((n) => ({ notificationId: n.id, userId })),
    skipDuplicates: true,
  });
}

export async function markNotificationRead(notificationId: number): Promise<void> {
  const session = await requireAuth();
  const userId  = Number(session.user.id);

  await prisma.notificationRead.upsert({
    where:  { notificationId_userId: { notificationId, userId } },
    create: { notificationId, userId },
    update: {},
  });
}
```

- [ ] **Step 3: Type check**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 4: Verify API route manually**

With dev server running, open browser dev tools and run:
```
fetch('/api/notifications').then(r=>r.json()).then(console.log)
```
Expected: `{ unreadCount: N, notifications: [...] }` — unreadCount should be the total number of notifications so far (they're all unread since no bell component yet).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/notifications/route.ts src/actions/notifications.ts
git commit -m "feat: add notifications API route and mark-read server actions"
```

---

## Task 8: NotificationBell + TopBar

**Files:**
- Create: `src/components/layout/NotificationBell.tsx`
- Modify: `src/components/layout/TopBar.tsx`

**Interfaces:**
- Consumes:
  - `GET /api/notifications` (Task 7)
  - `markAllNotificationsRead()` and `markNotificationRead()` (Task 7)

- [ ] **Step 1: Create `src/components/layout/NotificationBell.tsx`**

```tsx
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Bell } from "lucide-react";
import Link from "next/link";
import { markAllNotificationsRead, markNotificationRead } from "@/actions/notifications";

interface NotificationItem {
  id:        number;
  type:      string;
  title:     string;
  body:      string;
  orderId:   number | null;
  createdAt: string;
  read:      boolean;
}

interface APIResponse {
  unreadCount:   number;
  notifications: NotificationItem[];
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr ago`;
  return `${Math.floor(h / 24)} d ago`;
}

export default function NotificationBell() {
  const [data, setData] = useState<APIResponse>({ unreadCount: 0, notifications: [] });
  const [open, setOpen] = useState(false);
  const panelRef        = useRef<HTMLDivElement>(null);

  const poll = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) setData(await res.json());
    } catch {}
  }, []);

  useEffect(() => {
    poll();
    const interval = setInterval(poll, 30_000);
    const onVisibility = () => { if (!document.hidden) poll(); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [poll]);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function handleMarkAllRead() {
    await markAllNotificationsRead();
    setData((prev) => ({
      unreadCount: 0,
      notifications: prev.notifications.map((n) => ({ ...n, read: true })),
    }));
  }

  async function handleRowClick(n: NotificationItem) {
    if (!n.read) {
      await markNotificationRead(n.id);
      setData((prev) => ({
        unreadCount: Math.max(0, prev.unreadCount - 1),
        notifications: prev.notifications.map((x) => x.id === n.id ? { ...x, read: true } : x),
      }));
    }
    setOpen(false);
  }

  const { unreadCount, notifications } = data;

  return (
    <div style={{ position: "relative" }} ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        aria-expanded={open}
        style={{
          position: "relative",
          background: open ? "rgba(245,182,30,0.12)" : "rgba(245,182,30,0.07)",
          border: "1px solid rgba(245,182,30,0.14)",
          borderRadius: "0.5rem",
          padding: "0.4rem",
          cursor: "pointer",
          color: unreadCount > 0 ? "#F5B61E" : "rgba(240,237,230,0.5)",
          display: "flex",
        }}
      >
        <Bell size={16} strokeWidth={1.5} />
        {unreadCount > 0 && (
          <span style={{
            position: "absolute", top: "-5px", right: "-5px",
            minWidth: "16px", height: "16px",
            background: "#F5B61E", borderRadius: "8px",
            fontSize: "0.58rem", fontWeight: 700, color: "#080808",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "0 3px",
          }}>
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 8px)", right: 0,
          width: "340px",
          background: "#111109",
          border: "1px solid rgba(245,182,30,0.15)",
          borderRadius: "0.65rem",
          boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
          zIndex: 1000,
          overflow: "hidden",
        }}>
          {/* Panel header */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "0.75rem 1rem",
            borderBottom: "1px solid rgba(245,182,30,0.08)",
          }}>
            <span style={{ fontSize: "0.7rem", letterSpacing: "0.1em", color: "rgba(240,237,230,0.4)" }}>
              NOTIFICATIONS
            </span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  fontSize: "0.65rem", color: "#F5B61E", padding: 0,
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notification list */}
          <div style={{ maxHeight: "380px", overflowY: "auto" }}>
            {notifications.length === 0 && (
              <p style={{
                padding: "1.5rem", textAlign: "center",
                fontSize: "0.75rem", color: "rgba(240,237,230,0.25)", margin: 0,
              }}>
                No notifications yet
              </p>
            )}
            {notifications.map((n) => {
              const rowContent = (
                <div
                  onClick={() => handleRowClick(n)}
                  style={{
                    display: "flex", gap: "0.6rem", alignItems: "flex-start",
                    padding: "0.75rem 1rem",
                    borderBottom: "1px solid rgba(245,182,30,0.05)",
                    cursor: "pointer",
                    background: n.read ? "transparent" : "rgba(245,182,30,0.03)",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.background = "rgba(245,182,30,0.06)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.background =
                      n.read ? "transparent" : "rgba(245,182,30,0.03)";
                  }}
                >
                  <div style={{
                    width: "6px", height: "6px", flexShrink: 0,
                    marginTop: "0.35rem", borderRadius: "50%",
                    background: n.read ? "transparent" : "#F5B61E",
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontSize: "0.78rem",
                      fontWeight: n.read ? 400 : 600,
                      color: n.read ? "rgba(240,237,230,0.5)" : "#F0EDE6",
                      margin: "0 0 0.15rem",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {n.title}
                    </p>
                    <p style={{ fontSize: "0.67rem", color: "rgba(240,237,230,0.3)", margin: 0 }}>
                      {n.type.replace(/_/g, " ")} · {timeAgo(n.createdAt)}
                    </p>
                  </div>
                  {n.orderId && (
                    <span style={{ fontSize: "0.7rem", color: "rgba(240,237,230,0.2)", flexShrink: 0, alignSelf: "center" }}>
                      →
                    </span>
                  )}
                </div>
              );

              return n.orderId ? (
                <Link key={n.id} href={`/orders/${n.orderId}`} style={{ textDecoration: "none", display: "block" }}>
                  {rowContent}
                </Link>
              ) : (
                <div key={n.id}>{rowContent}</div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Replace placeholder bell in `TopBar.tsx`**

Find the current import line for Bell:
```tsx
import { Bell, ChevronDown } from "lucide-react";
```

Replace with:
```tsx
import { ChevronDown } from "lucide-react";
import NotificationBell from "@/components/layout/NotificationBell";
```

Find the existing bell button block:
```tsx
        <button
          aria-label="Notifications"
          style={{
            position: "relative",
            background: "rgba(245,182,30,0.07)",
            border: "1px solid rgba(245,182,30,0.14)",
            borderRadius: "0.5rem",
            padding: "0.4rem",
            cursor: "pointer",
            color: "rgba(240,237,230,0.5)",
            display: "flex",
          }}
        >
          <Bell size={16} strokeWidth={1.5} />
          <span style={{
            position: "absolute", top: "-3px", right: "-3px",
            width: "8px", height: "8px", background: "#F5B61E", borderRadius: "50%",
          }} />
        </button>
```

Replace with:
```tsx
        <NotificationBell />
```

- [ ] **Step 3: Type check**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 4: Full end-to-end manual verification**

```bash
npm run dev
```

1. Open any order page. The bell icon appears in the TopBar with a count badge showing all existing notifications (unread).
2. Click the bell — panel opens with the notification list.
3. Click "Mark all read" — badge disappears, dots disappear from rows.
4. Change an order's status — a toast pops up AND a new notification appears in the panel on next poll (within 30s, or switch tab and back).
5. Click a notification row with an `orderId` — navigates to that order and marks row as read.
6. Press Escape or click outside — panel closes.
7. If customer has an email address and status is CONFIRMED/READY/DELIVERED/CANCELLED, check server console for Resend output (or email inbox if `RESEND_API_KEY` is set).

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/NotificationBell.tsx src/components/layout/TopBar.tsx
git commit -m "feat: add NotificationBell with polling panel; wire into TopBar"
```
