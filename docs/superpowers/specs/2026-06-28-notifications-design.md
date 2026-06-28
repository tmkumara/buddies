# Notification System Design

**Date:** 2026-06-28
**Project:** Buddies Gift Box OMS

---

## Overview

Three notification layers working together:

1. **Email notifications** — customer-facing, via Resend, triggered by order status changes
2. **In-app notification center** — staff-facing, DB-backed bell icon with polling
3. **Toast notifications** — transient UI feedback for the acting user's own actions

---

## Architecture

```
Server Action (e.g. updateOrderStatus)
        │
        ▼
notificationService(type, title, body, orderId?)
        │
        ├─► Write Notification row to DB  (in-app bell + panel)
        │
        └─► Send email via Resend          (customer, if order has email)

Client (TopBar)
        └─► polls /api/notifications every 30s → unread count + list
        └─► shows Toast immediately when current user triggers an action
```

**notificationService** is a shared function in `src/lib/notifications.ts`. All server actions call it rather than duplicating email/DB logic.

### Event → Notification Matrix

| Event | In-App Notification | Customer Email |
|---|---|---|
| Order created | ✓ | — |
| → CONFIRMED | ✓ | ✓ |
| → IN_PRODUCTION | ✓ | — |
| → READY | ✓ | ✓ |
| → DELIVERED | ✓ | ✓ |
| → CANCELLED | ✓ | ✓ |
| Payment recorded | ✓ | — |
| Low stock warning | ✓ | — |

Toasts fire immediately on the acting user's screen (returned from the server action). DB notifications are what other staff see when their bell polls.

---

## Data Model

Two new tables added to `prisma/schema.prisma`:

```prisma
model Notification {
  id        Int      @id @default(autoincrement())
  type      String   @db.VarChar(50)
  title     String   @db.VarChar(150)
  body      String   @db.VarChar(500)
  orderId   Int?     @map("order_id")
  order     Order?   @relation(fields: [orderId], references: [id], onDelete: SetNull)
  createdAt DateTime @default(now()) @map("created_at")
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
  readAt         DateTime     @default(now()) @map("read_at")

  @@unique([notificationId, userId])
  @@map("notification_read")
}
```

`NotificationRead` uses a join table so notifications are shared across all staff — one row per staff member who reads it. "Mark all read" inserts a row per unread notification for that user. Cascade deletes keep orphans clean.

**`type` values:** `ORDER_CREATED`, `ORDER_STATUS_CHANGED`, `PAYMENT_RECEIVED`, `LOW_STOCK`

---

## Email Notifications

### Trigger & Sender

- **Library:** Resend (`resend` npm package)
- **From:** `hello.buddieslk@gmail.com`
- **To:** customer's email (skip if not set)
- **Triggers:** CONFIRMED, READY, DELIVERED, CANCELLED status changes

### Email Structure

```
┌─────────────────────────────────────────┐
│  [BUDDIES logo]   BUDDIES               │  ← gold accent, white bg
├─────────────────────────────────────────┤
│  Status headline (e.g. "Order Ready")   │
│  One-line message specific to status    │
├─────────────────────────────────────────┤
│  ── INVOICE ─────────────────────────── │
│  (full customer invoice HTML, inline)   │
│  order info, items table, totals,       │
│  payments, balance                      │
├─────────────────────────────────────────┤
│  Questions? 0783085081                  │
│  hello.buddieslk@gmail.com              │
└─────────────────────────────────────────┘
```

**Background:** white (`#ffffff`) — email clients strip dark backgrounds. The existing customer invoice (`/invoice/[token]`) already uses a light theme; the same template is reused.

### Status Messages

| Status | Headline | Body |
|---|---|---|
| CONFIRMED | Your order is confirmed | We've received your payment and will begin production shortly. |
| READY | Your order is ready | Please arrange pickup or delivery at your convenience. |
| DELIVERED | Thank you! | Your order has been delivered. We hope you love it. |
| CANCELLED | Order cancelled | Your order has been cancelled. Contact us if you have questions. |

### Implementation Notes

- Invoice HTML rendered server-side using existing `getInvoiceData()` logic
- Inline styles throughout for email client compatibility
- If customer has no email address, skip silently (no error)
- `notificationService` calls Resend only for status events with a customer email

---

## In-App Notification Center

### Bell Icon (TopBar)

- `Bell` icon from lucide-react, gold tint when unread count > 0
- Badge: small gold circle with white count text, capped at `99+`
- Lives on the right side of `TopBar`
- Clicking opens a panel below the TopBar

### Notification Panel

```
┌─────────────────────────────────────────┐
│  NOTIFICATIONS              Mark all read│
├─────────────────────────────────────────┤
│  ● New order #ORD-042 from Saman         │  ← unread: gold left dot
│    ORDER CREATED · 2 min ago        →   │
├─────────────────────────────────────────┤
│    Payment recorded · Rs. 3,500          │  ← read: no dot, dimmed
│    Order #ORD-041 · 1 hr ago        →   │
├─────────────────────────────────────────┤
│  ● Low stock: Ribbon (Gold) — 12 left    │
│    LOW STOCK · 3 hr ago             →   │
└─────────────────────────────────────────┘
```

- `→` links to the relevant order (or stock item page for LOW_STOCK)
- Clicking any row marks it read
- Panel closes on outside click or Escape key
- Shows last 20 notifications

### Polling

- `GET /api/notifications` returns `{ unreadCount, notifications: [...last 20] }`
- Client polls every 30 seconds via `setInterval`
- On tab focus (`visibilitychange` event), immediately re-polls

### Theme

Follows dark luxury theme: `#0d0d0d` background, `#F5B61E` gold accents, `#F0EDE6` text, `#7A7570` muted.

---

## Toast Notifications

Transient pop-ups for immediate feedback when the **current user** performs an action. No DB — fire and forget on the client.

### Visual Design

```
┌──────────────────────────────────────┐
│ ▮  Order #ORD-042 confirmed          │  ← success: green left bar
│    Status updated successfully    ✕  │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│ ▮  Cannot confirm order              │  ← error: red left bar
│    At least one payment required  ✕  │
└──────────────────────────────────────┘
```

- **Background:** `#1A1914`
- **Border:** `1px solid rgba(245,182,30,0.15)`
- **Left accent bar:** green (success), red (error), gold (info/warning)
- **Text:** `#F0EDE6` title, muted body below
- **Auto-dismiss:** 4 seconds, manual `✕` close
- **Position:** top-right on desktop, top-center on mobile
- **Max 3** visible at once; oldest dismissed first when overflow

### Implementation

Custom implementation — no external library.

- `src/lib/toast-context.tsx` — `ToastContext`, `useToast()` hook, `<Toaster />` portal
- `src/app/(app)/layout.tsx` — wrapped with `<ToastProvider />`
- Server actions return `{ toast?: { type: 'success'|'error'|'info', title: string, body?: string } }` alongside existing result shape
- Client components call `showToast()` from the returned action result

### Where Toasts Fire

| Action | Toast |
|---|---|
| Status change (success) | "Order #X moved to [Status]" |
| Status change (error) | Error message from action |
| Payment added | "Payment of Rs. X recorded" |
| Payment deleted | "Payment removed" |
| Details saved | "Details updated" |
| Low stock after CONFIRM | Gold info toast: "Low stock: [items]" |

---

## File Map

| File | Purpose |
|---|---|
| `prisma/schema.prisma` | Add `Notification` + `NotificationRead` models |
| `src/lib/notifications.ts` | `notificationService()` — write DB row + send Resend email |
| `src/lib/email-templates.ts` | HTML email builder (envelope + inline invoice) |
| `src/lib/toast-context.tsx` | Toast context, hook, Toaster portal component |
| `src/app/api/notifications/route.ts` | GET — unread count + last 20 notifications |
| `src/components/layout/NotificationBell.tsx` | Bell icon + badge + slide panel |
| `src/components/layout/TopBar.tsx` | Add `<NotificationBell />` |
| `src/app/(app)/layout.tsx` | Wrap with `<ToastProvider />` |
| `src/actions/orders.ts` | Call `notificationService` + return toast data |
| `src/actions/payments.ts` | Return toast data on create/delete |

---

## Dependencies

- **Resend** — `npm install resend` (not yet installed)
- Everything else is already in the project

---

## Constraints

- Dark luxury theme throughout: `bg #0d0d0d`, gold `#F5B61E`, text `#F0EDE6`, muted `#7A7570`
- Email backgrounds must be light (`#ffffff`) — email clients strip dark backgrounds
- No external toast library — custom implementation only
- `notificationService` must not throw — log errors silently so they never break the calling action
- Resend calls are fire-and-forget (`void sendEmail(...)`) — email failure must not block the UI
- Phone number in emails: `0783085081` only (no website)
- Customer email field on `Customer` model must be checked before sending; skip if null/empty
