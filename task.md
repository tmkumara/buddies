# Renovated Gift Box OMS - Migration Task Tracker

This checklist tracks the migration of the existing **Spring Boot MVC + Thymeleaf + MySQL Gift Box OMS** into **Option A: Unified Next.js Fullstack** using **Next.js 16, React 19, TypeScript, Prisma 7, MySQL 8, Tailwind CSS v4, and NextAuth.js/custom auth**.

> Project path: `D:\Test\personal\giftbox-oms`  
> Current confirmed starting point: **Phase 1 foundation is already completed. Continue from Phase 2.**

---

## 0. Migration Source Review

- `[x]` Review existing Spring Boot OMS architecture, entities, business rules, and URL surface
- `[x]` Identify target stack: Next.js + Prisma + MySQL
- `[x]` Identify current renovation project state
- `[x]` Identify migration risks and optimization opportunities
- `[x]` Create migration task tracker

---

## 1. Initial Setup / Foundation

- `[x]` Bootstrap Next.js App Router project with TypeScript, Tailwind, and ESLint
- `[x]` Install and initialize Prisma ORM v7.8.0
- `[x]` Model initial database schema in `prisma/schema.prisma`
- `[x]` Generate initial migration SQL under `prisma/migrations/20260607061220_init/`
- `[x]` Configure database connection URL in `.env`
- `[x]` Configure Prisma using `prisma.config.ts`
- `[x]` Setup Prisma client singleton at `src/lib/prisma.ts`
- `[x]` Add Docker Compose setup for MySQL 8 and phpMyAdmin
- `[x]` Configure Tailwind CSS v4 base setup
- `[x]` Add initial project docs: `CLAUDE.md`, `AGENTS.md`, and `task.md`

---

## 2. Database Schema Improvements

> Goal: Improve the initial schema before building business modules, so later code does not need heavy rework.

### 2.1 Prisma Enums

- `[ ]` Replace string-based `Order.status` with Prisma `OrderStatus` enum
- `[ ]` Replace string-based `User.role` with Prisma `UserRole` enum
- `[ ]` Confirm enum values:
  - `DRAFT`
  - `CONFIRMED`
  - `IN_PRODUCTION`
  - `READY`
  - `DELIVERED`
  - `CANCELLED`
  - `ADMIN`
  - `STAFF`

### 2.2 Indexes

- `[ ]` Add index for `customer_order.status`
- `[ ]` Add index for `customer_order.order_date`
- `[ ]` Add index for `customer_order.customer_id`
- `[ ]` Add index for `customer.name`
- `[ ]` Add index for `customer.phone`
- `[ ]` Add index for `customer.is_active`
- `[ ]` Add index for `box_design.is_active`
- `[ ]` Add index for `box_design.design_type_id`
- `[ ]` Add index for `box_design.material_id`
- `[ ]` Add index for `order_item.order_id`
- `[ ]` Add index for `order_item.box_design_id`

### 2.3 Atomic Order Number Table

- `[ ]` Add `order_seq` table/model
- `[ ]` Implement atomic daily order number generation using DB upsert
- `[ ]` Preserve order number format: `ORD-YYYYMMDD` and `ORD-YYYYMMDD-N`
- `[ ]` Add utility file: `src/lib/utils/order-no.ts`

### 2.4 Order Item Snapshot Columns

- `[ ]` Add `design_name` column to `order_item`
- `[ ]` Add `design_code` column to `order_item`
- `[ ]` Ensure order creation snapshots design name and code at order time
- `[ ]` Ensure invoices read snapshot values instead of live design names

### 2.5 Order Status History

- `[ ]` Add `order_status_history` table/model
- `[ ]` Store `orderId`, `fromStatus`, `toStatus`, `changedBy`, `changedAt`, and `note`
- `[ ]` Write history record inside the same transaction when status changes

### 2.6 Material Stock Preparation

- `[ ]` Add `current_stock_level` to `material`
- `[ ]` Keep material movement ledger as future phase, not mandatory for first release

### 2.7 Migration Execution

- `[ ]` Run schema migration:
  ```bash
  npx prisma migrate dev --name add_schema_improvements
  ```
- `[ ]` Generate Prisma client:
  ```bash
  npx prisma generate
  ```
- `[ ]` Verify database tables using phpMyAdmin

---

## 3. Seed Data

> Goal: Make the app usable immediately after migration.

- `[x]` Create `prisma/seed.ts`
- `[x]` Install seed dependencies if required
- `[x]` Seed default admin user
- `[x]` Hash admin password using `bcryptjs`
- `[x]` Seed sample design types
- `[x]` Seed sample materials
- `[ ]` Optionally seed sample box designs for testing
- `[ ]` Add Prisma seed command to `package.json`
- `[ ]` Run seed:
  ```bash
  npx prisma db seed
  ```
- `[ ]` Verify seeded admin login data exists in DB

---

## 4. Dependencies

- `[x]` Install auth dependencies: `next-auth`, `bcryptjs`, `@types/bcryptjs`
- `[x]` Install validation dependency: `zod`
- `[x]` Install file upload dependencies: `formidable`, `@types/formidable`
- `[x]` Install UI/helper dependencies: `lucide-react`, `clsx`, `tailwind-merge`
- `[ ]` Install chart dependency if dashboard chart is required: `recharts`

---

## 5. Authentication & Route Protection

> Goal: Replace Spring Security form login with Next.js authentication.
> Note: Next.js 16 deprecated `middleware.ts` — use `src/proxy.ts` instead.

- `[x]` Create `src/lib/auth.ts` (NextAuth config, CredentialsProvider)
- `[x]` Configure credentials provider using username/password
- `[x]` Validate password using `bcryptjs.compare`
- `[x]` Reject inactive users
- `[x]` Add user id, username, role, and mustChangePassword to session JWT
- `[x]` Create `src/app/api/auth/[...nextauth]/route.ts`
- `[x]` Create `src/proxy.ts` (NOT middleware.ts — deprecated in Next.js 16)
- `[x]` Create `src/lib/auth-guards.ts` (`requireAuth`, `requireAdmin`)
- `[x]` Create `src/types/next-auth.d.ts` (type augmentation)
- `[x]` Fix `src/lib/prisma.ts` to use MariaDB adapter
- `[x]` Add `mustChangePassword` field to User schema (migration pending DB start)
- `[x]` Protect all routes except `/`, `/login`, `/api/auth/**`, static assets
- `[x]` Admin-only guard for `/users/**`
- `[x]` Force `/change-password` redirect when `mustChangePassword = true`
- `[x]` Build login page at `src/app/login/page.tsx` (updated with real signIn)
- `[x]` Create `src/app/change-password/page.tsx` (FR-2 forced password change)
- `[x]` Create `src/actions/auth.ts` (changePassword server action)
- `[x]` Wire sign-out button with real `signOut({ callbackUrl: "/login" })`
- `[x]` Run migration: `npx prisma migrate dev --name add_must_change_password`
- `[x]` Run seed: `npx prisma db seed`
- `[ ]` Test successful login
- `[ ]` Test invalid password flow
- `[ ]` Test inactive user rejection
- `[ ]` Test logout flow
- `[ ]` Test mustChangePassword redirect flow

---

## 6. Core Layout & Theme

> Goal: Build the shared shell used by all authenticated pages.

- `[ ]` Update root layout metadata/title for Gift Box OMS
- `[ ]` Create `src/components/layout/Sidebar.tsx`
- `[ ]` Create `src/components/layout/TopBar.tsx`
- `[ ]` Create authenticated app shell layout
- `[ ]` Add responsive sidebar behavior
- `[ ]` Add active navigation highlight
- `[ ]` Add user/session display in top bar
- `[ ]` Add logout action/button
- `[ ]` Apply clean Tailwind v4 styling
- `[ ]` Optional: apply glassmorphism visual style

---

## 7. Shared UI Components

- `[ ]` Create `src/components/ui/Button.tsx`
- `[ ]` Create `src/components/ui/Input.tsx`
- `[ ]` Create `src/components/ui/Select.tsx`
- `[ ]` Create `src/components/ui/Table.tsx`
- `[ ]` Create `src/components/ui/Badge.tsx`
- `[ ]` Create `src/components/ui/Modal.tsx` if needed
- `[ ]` Create status badge variants for order statuses
- `[ ]` Create form error display component
- `[ ]` Create empty-state component
- `[ ]` Create loading/skeleton component if needed

---

## 8. Validation Layer

- `[ ]` Create `src/lib/validations/customer.ts`
- `[ ]` Create `src/lib/validations/material.ts`
- `[ ]` Create `src/lib/validations/design-type.ts`
- `[ ]` Create `src/lib/validations/box-design.ts`
- `[ ]` Create `src/lib/validations/order.ts`
- `[ ]` Validate required fields server-side
- `[ ]` Validate numeric ranges, especially:
  - GSM 80–600
  - quantity > 0
  - prices >= 0
  - discount cannot exceed total
  - delivery date cannot be before order date
- `[ ]` Reuse validation schemas in server actions

---

## 9. Utility Layer

- `[ ]` Create `src/lib/utils/calculations.ts`
- `[ ]` Add `calculateRawArea(cutLengthCm, cutWidthCm)`
- `[ ]` Add `calculateLineTotal(unitPrice, quantity)`
- `[ ]` Add `calculateOrderTotals(items, discountPercent)`
- `[ ]` Use Decimal-safe calculation for money values
- `[ ]` Add status transition helper
- `[ ]` Enforce valid transitions:
  - `DRAFT -> CONFIRMED / CANCELLED`
  - `CONFIRMED -> IN_PRODUCTION / CANCELLED`
  - `IN_PRODUCTION -> READY / CANCELLED`
  - `READY -> DELIVERED / CANCELLED`
  - `DELIVERED -> no further transition`
  - `CANCELLED -> no further transition`

---

## 10. Dashboard Module

- `[ ]` Replace default `src/app/page.tsx` with dashboard
- `[ ]` Show total orders count
- `[ ]` Show total customers count
- `[ ]` Show draft orders count
- `[ ]` Show confirmed orders count
- `[ ]` Show ready orders count
- `[ ]` Show delivered orders count
- `[ ]` Show recent 5 orders
- `[ ]` Add dynamic order chart if using Recharts
- `[ ]` Add recent activity feed if status history is available
- `[ ]` Ensure dashboard loads under 2 seconds

---

## 11. Customer Module

### Files

- `[ ]` Create `src/actions/customers.ts`
- `[ ]` Create `src/app/customers/page.tsx`
- `[ ]` Create `src/app/customers/new/page.tsx`
- `[ ]` Create `src/app/customers/[id]/edit/page.tsx`

### Features

- `[ ]` List customers
- `[ ]` Search customers by name
- `[ ]` Search customers by phone
- `[ ]` Create customer
- `[ ]` Edit customer
- `[ ]` Toggle active/inactive status
- `[ ]` Hide inactive customers from new order customer selector
- `[ ]` Show validation errors clearly

---

## 12. Design Type Module

### Files

- `[ ]` Create `src/actions/design-types.ts`
- `[ ]` Create `src/app/design-types/page.tsx`
- `[ ]` Create `src/app/design-types/new/page.tsx`
- `[ ]` Create `src/app/design-types/[id]/edit/page.tsx`

### Features

- `[ ]` List design types
- `[ ]` Create design type
- `[ ]` Edit design type
- `[ ]` Toggle active/inactive status
- `[ ]` Support image URL or image attachment depending on final UI decision
- `[ ]` Hide inactive design types from box design form

---

## 13. Material Module

### Files

- `[ ]` Create `src/actions/materials.ts`
- `[ ]` Create `src/app/materials/page.tsx`
- `[ ]` Create `src/app/materials/new/page.tsx`
- `[ ]` Create `src/app/materials/[id]/edit/page.tsx`

### Features

- `[ ]` List materials
- `[ ]` Create material
- `[ ]` Edit material
- `[ ]` Toggle active/inactive status
- `[ ]` Validate GSM range
- `[ ]` Show sheet dimensions
- `[ ]` Show cost per sheet
- `[ ]` Show min stock level
- `[ ]` Show current stock level
- `[ ]` Show low-stock visual alert
- `[ ]` Hide inactive materials from box design form

---

## 14. Box Design Module

### Files

- `[ ]` Create `src/actions/box-designs.ts`
- `[ ]` Create `src/app/box-designs/page.tsx`
- `[ ]` Create `src/app/box-designs/new/page.tsx`
- `[ ]` Create `src/app/box-designs/[id]/edit/page.tsx`
- `[ ]` Create upload handler if needed: `src/app/api/uploads/dfx/route.ts`

### Features

- `[ ]` List box designs
- `[ ]` Create box design
- `[ ]` Edit box design
- `[ ]` Toggle active/inactive status
- `[ ]` Select design type
- `[ ]` Select material
- `[ ]` Capture length, width, and height
- `[ ]` Capture cut length and cut width
- `[ ]` Auto-calculate raw area: `cutLengthCm * cutWidthCm`
- `[ ]` Capture unit price
- `[ ]` Support custom design flag
- `[ ]` Upload `.dfx` or `.dxf` file
- `[ ]` Reject invalid file extensions
- `[ ]` Enforce max file size 10 MB
- `[ ]` Store files in `public/uploads/dfx/`
- `[ ]` Preserve file naming pattern using design code and timestamp
- `[ ]` Hide inactive box designs from order creation form

---

## 15. Order Module

### Files

- `[ ]` Create `src/actions/orders.ts`
- `[ ]` Create `src/app/orders/page.tsx`
- `[ ]` Create `src/app/orders/new/page.tsx`
- `[ ]` Create `src/app/orders/[id]/page.tsx`
- `[ ]` Create `src/app/orders/[id]/invoice/page.tsx`
- `[ ]` Create `src/components/orders/OrderItemsEditor.tsx`

### Order List

- `[ ]` List orders with customer details
- `[ ]` Add status filter
- `[ ]` Add search by customer name/phone
- `[ ]` Add pagination using `skip`/`take`
- `[ ]` Sort by `orderDate DESC`, then `id DESC`

### Order Creation

- `[ ]` Select active customer
- `[ ]` Add one or more order items
- `[ ]` Select active box design per item
- `[ ]` Enter quantity per item
- `[ ]` Snapshot unit price from box design
- `[ ]` Snapshot design name and design code
- `[ ]` Calculate line total
- `[ ]` Calculate total amount
- `[ ]` Apply discount percentage
- `[ ]` Validate discount does not exceed total
- `[ ]` Calculate net amount
- `[ ]` Set default status to `DRAFT`
- `[ ]` Set order date to current date
- `[ ]` Set default delivery date to order date + 7 days
- `[ ]` Validate delivery date is not before order date
- `[ ]` Generate order number using atomic `order_seq`
- `[ ]` Save order and order items in a transaction

### Order Detail / Status Update

- `[ ]` Show full order details
- `[ ]` Show customer details
- `[ ]` Show order items
- `[ ]` Show totals and discount
- `[ ]` Allow delivery date update
- `[ ]` Allow remarks update
- `[ ]` Allow status update only through valid transitions
- `[ ]` Prevent invalid transition such as `DELIVERED -> DRAFT`
- `[ ]` Write status history entry on status change

### Invoice

- `[ ]` Build printable invoice page
- `[ ]` Show order number and dates
- `[ ]` Show customer information
- `[ ]` Show snapshot design code/name
- `[ ]` Show quantity, unit price, and line total
- `[ ]` Show discount and net amount
- `[ ]` Add print-friendly CSS
- `[ ]` Keep PDF export as optional/future enhancement unless required now

---

## 16. File Migration / Upload Compatibility

- `[ ]` Create `public/uploads/dfx/` folder
- `[ ]` Copy existing Spring Boot uploaded files from `uploads/dfx/` to `public/uploads/dfx/`
- `[ ]` Verify old DFX/DXF paths still resolve or are mapped correctly
- `[ ]` Update stored file paths if required
- `[ ]` Test file upload from UI
- `[ ]` Test file download/open from UI

---

## 17. Business Rule Verification

- `[ ]` Verify raw area is always computed before saving box design
- `[ ]` Verify inactive customers cannot be selected in new orders
- `[ ]` Verify inactive box designs cannot be selected in new orders
- `[ ]` Verify inactive materials/design types do not appear in dependent forms
- `[ ]` Verify order number collision cannot happen under rapid order creation
- `[ ]` Verify historical invoice does not change when box design name changes
- `[ ]` Verify discount cannot create negative net amount
- `[ ]` Verify delivery date validation works
- `[ ]` Verify status transition validation works

---

## 18. QA & End-to-End Testing

- `[ ]` Test login/logout
- `[ ]` Test customer CRUD
- `[ ]` Test design type CRUD
- `[ ]` Test material CRUD
- `[ ]` Test box design CRUD with DFX/DXF upload
- `[ ]` Test order creation with multiple items
- `[ ]` Test order lifecycle:
  - `DRAFT -> CONFIRMED`
  - `CONFIRMED -> IN_PRODUCTION`
  - `IN_PRODUCTION -> READY`
  - `READY -> DELIVERED`
- `[ ]` Test cancellation from allowed states
- `[ ]` Test invalid status transitions
- `[ ]` Test invoice rendering
- `[ ]` Test dashboard counts
- `[ ]` Test search and filters
- `[ ]` Test pagination
- `[ ]` Test responsive layout

---

## 19. Build & Deployment Readiness

- `[ ]` Run lint:
  ```bash
  npm run lint
  ```
- `[ ]` Run production build:
  ```bash
  npm run build
  ```
- `[ ]` Fix TypeScript errors
- `[ ]` Fix ESLint errors
- `[ ]` Verify app starts:
  ```bash
  npm start
  ```
- `[ ]` Document required environment variables:
  - `DATABASE_URL`
  - `NEXTAUTH_SECRET`
  - `NEXTAUTH_URL`
  - `UPLOAD_DIR`
- `[ ]` Add production deployment notes
- `[ ]` Add database backup/cutover notes if migrating real data

---

## 20. Future Enhancements / Backlog

- `[ ]` PDF invoice export
- `[ ]` Real-time stock deduction
- `[ ]` Material movement ledger
- `[ ]` SMS/email notifications
- `[ ]` Audit log for all create/update/delete actions
- `[ ]` Role-based admin-only pages
- `[ ]` REST API or mobile client support
- `[ ]` Multi-tenant support for multiple gift box businesses
- `[ ]` Advanced reporting and sales analytics

---

## Current Next Action

Start with **Section 2: Database Schema Improvements**.

Recommended immediate command flow after updating `schema.prisma`:

```bash
npx prisma migrate dev --name add_schema_improvements
npx prisma generate
```

Then continue with **Section 3: Seed Data** and **Section 5: Authentication & Route Protection**.
