# Gift Box OMS - Architecture

> Project: Renovated Gift Box Order Management System  
> Target stack: Next.js 16, React 19, TypeScript, Prisma 7, MySQL 8, Tailwind CSS v4, NextAuth.js  
> Project path: `D:\Test\b\giftbox-oms`  
> Document purpose: Describe the technical architecture, module boundaries, data model, security model, deployment approach, and implementation rules for the renovated Gift Box OMS.

---

## 1. System Context

Gift Box OMS is an internal order management system for a custom gift-box manufacturing business. It manages the full operational flow from customer registration to box design setup, material setup, order creation, production status tracking, and invoice display.

The old system was a Spring Boot MVC + Thymeleaf application. The renovated system is a unified full-stack Next.js application where server-rendered pages, server actions, authentication, and database access live in one codebase.

---

## 2. Architecture Goals

The renovated architecture is designed to:

- Keep the application simple enough for a small internal team.
- Use server-side rendering and server actions for most business operations.
- Avoid unnecessary REST APIs for form-based internal workflows.
- Keep database writes centralized in server actions.
- Enforce business rules on the server, not only in the UI.
- Preserve historical order/invoice accuracy using snapshot data.
- Prevent order number collisions using a DB-backed sequence table.
- Support role-based access using `ADMIN` and `STAFF`.
- Support first-login password change for default/temporary passwords.
- Keep the system ready for future features such as PDF invoice export, stock ledger, and notifications.

---

## 3. High-Level Target Architecture

```text
Browser
  |
  | HTTP
  v
Next.js 16 App Router
  |-- Server Components: page rendering and data reads
  |-- Client Components: interactive forms, sidebar, topbar, order item editor
  |-- Server Actions: form mutations and business rules
  |-- Route Handlers: NextAuth and file upload endpoints
  |-- NextAuth.js Credentials Provider: authentication
  |-- proxy.ts: route protection and role guards
  |
  | Prisma Client v7 + MariaDB adapter
  v
MySQL 8 database: giftbox_oms
```

---

## 4. Main Technology Choices

| Layer | Technology | Purpose |
|---|---|---|
| Frontend + Backend | Next.js 16 App Router | Unified full-stack application |
| UI | React 19 + Tailwind CSS v4 | Pages, forms, app shell, dashboard |
| Language | TypeScript | Type-safe app code |
| ORM | Prisma 7 | Type-safe DB access |
| DB | MySQL 8 | Relational business data |
| Auth | NextAuth.js Credentials Provider | Username/password login |
| Password Hashing | bcryptjs | BCrypt password hashing and verification |
| Runtime DB Adapter | `@prisma/adapter-mariadb` + `mariadb` | Prisma 7 runtime DB connection |
| Local DB Tooling | Docker Compose + phpMyAdmin | Local database and DB inspection |
| Icons | lucide-react | UI icons |
| Validation | Zod | Planned validation layer |

---

## 5. Runtime Environment

### 5.1 Required Environment Variables

```env
DATABASE_URL="mysql://root:password@127.0.0.1:3306/giftbox_oms?allowPublicKeyRetrieval=true&ssl=false"
NEXTAUTH_SECRET="generated-secret"
NEXTAUTH_URL="http://localhost:3000"
UPLOAD_DIR="./public/uploads/dfx"
```

### 5.2 Local Docker Services

```text
giftbox-oms-db   MySQL 8       localhost:3306
giftbox-oms-pma  phpMyAdmin    localhost:8080
```

The MySQL connection includes `allowPublicKeyRetrieval=true` because MySQL 8 may use `caching_sha2_password`, which requires RSA public key retrieval for local development with the MariaDB adapter.

---

## 6. Current Project Structure

```text
giftbox-oms/
├── prisma/
│   ├── migrations/
│   ├── schema.prisma
│   └── seed.ts
├── public/
│   └── uploads/
│       └── dfx/
├── src/
│   ├── actions/
│   │   ├── auth.ts
│   │   └── users.ts
│   ├── app/
│   │   ├── (auth)/login/page.tsx
│   │   ├── api/auth/[...nextauth]/route.ts
│   │   ├── change-password/page.tsx
│   │   ├── users/
│   │   │   ├── page.tsx
│   │   │   ├── new/page.tsx
│   │   │   └── [id]/edit/page.tsx
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/layout/
│   │   ├── AppShell.tsx
│   │   ├── Sidebar.tsx
│   │   └── TopBar.tsx
│   ├── lib/
│   │   ├── auth.ts
│   │   ├── auth-guards.ts
│   │   └── prisma.ts
│   ├── types/next-auth.d.ts
│   └── proxy.ts
├── docker-compose.yml
├── package.json
├── prisma.config.ts
└── task.md
```

---

## 7. Application Layers

### 7.1 App Router Pages

Pages are responsible for rendering module screens:

- Dashboard: `src/app/page.tsx`
- Login: `src/app/(auth)/login/page.tsx`
- Change password: `src/app/change-password/page.tsx`
- Users: `src/app/users/**`
- Future modules: customers, design types, materials, box designs, orders, invoices

Server components should fetch data directly with Prisma where possible.

### 7.2 Client Components

Client components are used when browser interactivity is required:

- Login form
- Change password form
- TopBar logout/session controls
- Sidebar active navigation
- Future dynamic order item editor
- Future modal/dialog components

### 7.3 Server Actions

Server actions perform mutations:

- `src/actions/auth.ts`: change password
- `src/actions/users.ts`: create user, update user, toggle status, reset password
- Future actions: customers, design-types, materials, box-designs, orders

All business rules must be enforced in server actions.

### 7.4 Data Access

All data access goes through Prisma Client:

```text
Page / Server Action
  -> src/lib/prisma.ts
  -> Prisma Client v7 with MariaDB adapter
  -> MySQL 8
```

`src/lib/prisma.ts` must construct Prisma Client with `PrismaMariaDb` adapter because Prisma 7 requires the runtime adapter configuration used in this project.

---

## 8. Authentication Architecture

### 8.1 Auth Provider

Authentication uses NextAuth.js Credentials Provider:

- Login identifier: `username`
- Password: user-entered password
- Password verification: `bcryptjs.compare`
- Session strategy: JWT

### 8.2 Session Fields

Session user object includes:

```ts
{
  id: string;
  username: string;
  role: "ADMIN" | "STAFF";
  mustChangePassword: boolean;
}
```

### 8.3 Route Protection

Route protection is implemented in `src/proxy.ts`.

Rules:

- Public: `/login`, `/api/auth/**`, static assets
- Authenticated: dashboard and business modules
- Admin only: `/users/**`
- Forced password change: if `mustChangePassword = true`, redirect to `/change-password`

### 8.4 First Login Password Change

```text
Login successful
  -> JWT contains mustChangePassword = true
  -> proxy.ts redirects to /change-password
  -> User enters current password + new password
  -> Server action verifies old password
  -> New password is hashed with BCrypt
  -> users.must_change_password = false
  -> Session is refreshed / user is re-logged-in
  -> Redirect to dashboard
```

### 8.5 User Management

Admin users can:

- View users
- Create users
- Assign `ADMIN` or `STAFF`
- Activate/deactivate users
- Reset temporary password
- Force password change on next login

Safety rules:

- Admin cannot deactivate their own account.
- New users are created with `mustChangePassword = true`.
- Password reset sets `mustChangePassword = true`.

---

## 9. Database Architecture

### 9.1 Core Tables

```text
users
customer
design_type
material
box_design
customer_order
order_item
order_seq
order_status_history
```

### 9.2 Entity Relationships

```text
Customer 1 -> N Order
Order 1 -> N OrderItem
BoxDesign 1 -> N OrderItem
DesignType 1 -> N BoxDesign
Material 1 -> N BoxDesign
Order 1 -> N OrderStatusHistory
User 1 -> N OrderStatusHistory
```

### 9.3 Important Schema Optimizations

The renovated schema includes:

- `UserRole` enum
- `OrderStatus` enum
- `order_seq` for atomic order numbers
- `order_item.design_name` and `order_item.design_code` for invoice history
- `order_status_history` for audit trail
- `material.current_stock_level`
- Indexes for search, filtering, joins, and dashboard queries
- Required `box_design.raw_area_sq_cm` with default `0.00`

---

## 10. Business Modules

### 10.1 Dashboard

Dashboard shows total orders, total customers, order counts by status, and recent five orders.

### 10.2 Users

Implemented admin module: list users, create user, edit role/status/password policy, reset temporary password, and restrict to ADMIN.

### 10.3 Customers

Planned module: list/search/create/edit/toggle customers and hide inactive customers from order creation.

### 10.4 Design Types

Planned module: manage box design categories.

### 10.5 Materials

Planned module: manage paper stock, GSM, sheet dimensions, cost, min stock, current stock, and low-stock alerts.

### 10.6 Box Designs

Planned module: manage reusable product templates, dimensions, cut pattern, raw area, unit price, and DFX/DXF files.

### 10.7 Orders

Planned module: create multi-item orders, generate atomic order numbers, calculate totals, update status, record history, and render invoices.

---

## 11. Business Logic Rules

### 11.1 Order Lifecycle

```text
DRAFT -> CONFIRMED -> IN_PRODUCTION -> READY -> DELIVERED
CANCELLED allowed from active states
```

Transition map:

```ts
const VALID_TRANSITIONS = {
  DRAFT: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["IN_PRODUCTION", "CANCELLED"],
  IN_PRODUCTION: ["READY", "CANCELLED"],
  READY: ["DELIVERED", "CANCELLED"],
  DELIVERED: [],
  CANCELLED: [],
};
```

### 11.2 Order Number Generation

Format:

```text
First order of day: ORD-YYYYMMDD
Next orders:        ORD-YYYYMMDD-2, ORD-YYYYMMDD-3
```

Implementation uses `order_seq` table with atomic DB upsert.

### 11.3 Order Creation

Rules:

- Customer must be active.
- At least one item is required.
- Each quantity must be positive.
- Box design must be active.
- Unit price is fetched server-side.
- Design name and code are snapshotted.
- Discount cannot exceed total.
- Delivery date cannot be before order date.
- New order starts as `DRAFT`.

### 11.4 Invoice Accuracy

Invoices must use snapshot order item fields and must not change if a box design is later renamed, deactivated, or edited.

### 11.5 Box Design Raw Area

```text
rawAreaSqCm = cutLengthCm × cutWidthCm
```

### 11.6 Material Stock

Current release tracks stock values and low-stock alerts only. Automatic stock deduction is future scope.

---

## 12. File Upload Architecture

Upload destination:

```text
public/uploads/dfx/
```

Allowed extensions:

```text
.dfx
.dxf
```

Max file size:

```text
10 MB
```

Recommended file name pattern:

```text
{design_code}_{timestamp}.{ext}
```

---

## 13. Error Handling Strategy

Server actions should validate input, enforce permissions, return user-friendly errors, and use Prisma transactions for multi-table writes.

Forms should show clear errors for required fields, duplicate values, invalid numeric ranges, invalid transitions, and upload validation failures.

Dynamic pages should use `notFound()` when records do not exist.

---

## 14. Security Rules

- Passwords are always BCrypt hashes.
- Inactive users cannot log in.
- Temporary-password users must change password first.
- `/users` is ADMIN only.
- Server actions must call `requireAuth()` or `requireAdmin()`.
- `.env` must not be committed.
- `NEXTAUTH_SECRET` must be generated and kept secret.

---

## 15. Performance Rules

- Dashboard must use efficient count queries.
- List pages must use pagination when data grows.
- Search/filter columns must be indexed.
- Order list should sort by `orderDate DESC`, then `id DESC`.
- Avoid fetching all rows for large tables.

---

## 16. Deployment Notes

Local development:

```bash
docker compose up -d
npx prisma migrate dev
npx prisma db seed
npm run dev
```

Production build:

```bash
npm run lint
npm run build
npm start
```

Production requirements:

- MySQL 8 database
- Persistent upload folder
- Valid `DATABASE_URL`
- Valid `NEXTAUTH_SECRET`
- Valid `NEXTAUTH_URL`
- DB backup strategy
- File backup strategy for uploaded DFX/DXF files

---

## 17. Current Implementation Status

Completed:

- Foundation
- Git baseline
- Prisma schema optimization
- Seed data
- NextAuth login
- App shell
- Dashboard
- First-login password change
- Admin user management

Next recommended module:

- Customer module

---

## 18. Open Architecture Decisions

1. Should invoice PDF export be included in the first release or kept as future enhancement?
2. Should material stock be deducted when order is confirmed, when in production, or manually only?
3. Should image attachment for design types be supported, or only image URL?
4. Should usernames be editable by ADMIN, or kept immutable?
5. Should audit logging be added for all modules, or only order status changes for now?
