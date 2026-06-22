# Gift Box OMS - Software Requirements Specification (SRS)

> Project: Renovated Gift Box Order Management System  
> Target stack: Next.js 16, React 19, TypeScript, Prisma 7, MySQL 8, Tailwind CSS v4, NextAuth.js  
> Document purpose: Define functional requirements, non-functional requirements, business rules, roles, data requirements, and acceptance criteria for the Gift Box OMS renovation.

---

## 1. Introduction

### 1.1 Purpose

Gift Box OMS is an internal business application for managing custom gift box orders. It supports customer management, design category setup, material setup, reusable box designs, order creation, production status tracking, invoice display, and user management.

This SRS defines the expected functionality for the renovated Next.js version.

### 1.2 Scope

The system covers:

- User authentication
- First-login password change
- Admin user management
- Dashboard
- Customer management
- Design type management
- Material management
- Box design management
- Order management
- Invoice rendering
- DFX/DXF design file upload
- Basic stock visibility

The first release does not include payment gateway integration, email/SMS notifications, real-time inventory deduction, or multi-tenancy unless explicitly added later.

### 1.3 Intended Users

| Role | Description |
|---|---|
| ADMIN | Manages users and all business data |
| STAFF | Manages customers, materials, designs, orders, and invoices, but cannot manage users |

---

## 2. Product Overview

### 2.1 Product Name

Gift Box Order Management System (Gift Box OMS)

### 2.2 Business Purpose

The system supports internal operations for a gift-box manufacturing company by providing one place to manage customers, design types, materials, box designs, custom production orders, production status, and printable invoices.

### 2.3 Primary Business Flow

```text
Admin creates users
  -> Staff logs in
  -> Staff manages customers/design types/materials/box designs
  -> Staff creates customer order
  -> System calculates totals and generates order number
  -> Order moves through production statuses
  -> Staff prints invoice
```

---

## 3. User Roles and Permissions

### 3.1 ADMIN

ADMIN shall be able to:

- Log in
- Change own password
- Manage users
- Create/edit/deactivate customers
- Create/edit/deactivate design types
- Create/edit/deactivate materials
- Create/edit/deactivate box designs
- Create and manage orders
- View invoices
- View dashboard

### 3.2 STAFF

STAFF shall be able to:

- Log in
- Change own password
- Create/edit/deactivate customers
- Create/edit/deactivate design types
- Create/edit/deactivate materials
- Create/edit/deactivate box designs
- Create and manage orders
- View invoices
- View dashboard

STAFF shall not be able to manage users.

---

## 4. Functional Requirements

## FR-1 Authentication

- FR-1.1 The system shall allow active users to log in using username and password.
- FR-1.2 The system shall store passwords as BCrypt hashes.
- FR-1.3 The system shall reject login attempts from inactive users.
- FR-1.4 The system shall maintain authenticated sessions using JWT session strategy.
- FR-1.5 The system shall allow users to log out and return to the login page.
- FR-1.6 The system shall redirect unauthenticated users to `/login`.
- FR-1.7 The session shall include user id, username, role, and must-change-password flag.

## FR-2 First Login Password Change

- FR-2.1 The system shall store `must_change_password` for each user.
- FR-2.2 If `must_change_password = true`, the system shall redirect the user to `/change-password`.
- FR-2.3 The password change form shall require current password, new password, and confirmation.
- FR-2.4 New password shall be at least 8 characters.
- FR-2.5 New password and confirmation shall match.
- FR-2.6 New password shall be different from current password.
- FR-2.7 The system shall verify the current password before changing it.
- FR-2.8 After successful change, the system shall hash the new password, update `password_hash`, set `must_change_password = false`, refresh the session, and redirect to dashboard.

## FR-3 Admin User Management

- FR-3.1 ADMIN shall be able to view all users.
- FR-3.2 ADMIN shall be able to create a new user with username, temporary password, role, and active status.
- FR-3.3 New users shall be created with `must_change_password = true`.
- FR-3.4 ADMIN shall be able to edit user role, active status, and force password change flag.
- FR-3.5 ADMIN shall be able to reset a user's temporary password.
- FR-3.6 Password reset shall set `must_change_password = true`.
- FR-3.7 ADMIN shall not be able to deactivate their own account.
- FR-3.8 Only ADMIN users shall access `/users`, `/users/new`, and `/users/[id]/edit`.

## FR-4 Dashboard

- FR-4.1 Dashboard shall display total orders.
- FR-4.2 Dashboard shall display total customers.
- FR-4.3 Dashboard shall display draft, confirmed, ready, and delivered order counts.
- FR-4.4 Dashboard shall display the five most recent orders.
- FR-4.5 Dashboard shall be visible to authenticated ADMIN and STAFF users.

## FR-5 Customer Management

- FR-5.1 The system shall show a list of customers.
- FR-5.2 The system shall allow searching by customer name and phone.
- FR-5.3 The system shall allow creating a customer with name, phone, email, address line, notes, and active status.
- FR-5.4 The system shall allow editing customer details.
- FR-5.5 The system shall allow soft-deactivating customers.
- FR-5.6 Inactive customers shall not appear in new order customer selection.
- FR-5.7 Customer name and phone shall be required.

## FR-6 Design Type Management

- FR-6.1 The system shall show all design types.
- FR-6.2 The system shall allow creating design types with code, name, description, image URL or future image attachment, and active status.
- FR-6.3 The system shall allow editing design type details.
- FR-6.4 The system shall allow soft-deactivating design types.
- FR-6.5 Inactive design types shall not appear in box design forms.

## FR-7 Material Management

- FR-7.1 The system shall display all materials.
- FR-7.2 The system shall allow creating materials with code, name, GSM, sheet dimensions, cost per sheet, min stock level, current stock level, and active status.
- FR-7.3 The system shall allow editing material details.
- FR-7.4 The system shall allow soft-deactivating materials.
- FR-7.5 GSM shall be between 80 and 600.
- FR-7.6 The system shall show a visual low-stock alert when current stock is below minimum stock.
- FR-7.7 Inactive materials shall not appear in box design forms.

## FR-8 Box Design Management

- FR-8.1 The system shall display all box design templates.
- FR-8.2 The system shall allow creating a box design with code, name, design type, material, dimensions, cut dimensions, raw area, unit price, DFX/DXF file, custom flag, and active status.
- FR-8.3 The system shall calculate `rawAreaSqCm = cutLengthCm × cutWidthCm`.
- FR-8.4 The system shall allow editing box design details.
- FR-8.5 The system shall allow soft-deactivating box designs.
- FR-8.6 The system shall support `.dfx` and `.dxf` file uploads.
- FR-8.7 The system shall reject unsupported file extensions and files larger than 10 MB.
- FR-8.8 Uploaded files shall be stored under `public/uploads/dfx/`.
- FR-8.9 Inactive box designs shall not appear in order creation.

## FR-9 Order Management

- FR-9.1 The system shall display orders with customer information.
- FR-9.2 The system shall allow searching orders by customer name and phone.
- FR-9.3 The system shall allow filtering orders by status.
- FR-9.4 The system shall paginate order list results.
- FR-9.5 The system shall allow creating an order by selecting active customer, one or more active box designs, quantity, discount percentage, delivery date, and remarks.
- FR-9.6 Each order shall contain at least one item.
- FR-9.7 Each item quantity shall be greater than zero.
- FR-9.8 The system shall fetch unit prices server-side from `box_design`.
- FR-9.9 The system shall snapshot design name, design code, and unit price into `order_item`.
- FR-9.10 The system shall calculate `lineTotal = unitPrice × quantity`.
- FR-9.11 The system shall calculate total amount, discount amount, and net amount.
- FR-9.12 The system shall reject discounts that exceed total amount.
- FR-9.13 The system shall reject delivery dates before order date.
- FR-9.14 The system shall generate unique order numbers in format `ORD-YYYYMMDD[-N]`.
- FR-9.15 The system shall use `order_seq` to prevent order number collisions.
- FR-9.16 New orders shall start with status `DRAFT`.
- FR-9.17 Default delivery date shall be order date plus 7 days.

## FR-10 Order Status Lifecycle

- FR-10.1 The system shall enforce these transitions: `DRAFT -> CONFIRMED`, `DRAFT -> CANCELLED`, `CONFIRMED -> IN_PRODUCTION`, `CONFIRMED -> CANCELLED`, `IN_PRODUCTION -> READY`, `IN_PRODUCTION -> CANCELLED`, `READY -> DELIVERED`, `READY -> CANCELLED`.
- FR-10.2 `DELIVERED` and `CANCELLED` shall be terminal states.
- FR-10.3 The system shall reject invalid transitions.
- FR-10.4 The system shall write a status history record whenever status changes.
- FR-10.5 Status history shall include order id, from status, to status, changed by, changed at, and optional note.

## FR-11 Invoice

- FR-11.1 The system shall provide a printable invoice page for each order.
- FR-11.2 Invoice shall show order number, dates, customer details, item details, discount, net amount, and remarks.
- FR-11.3 Invoice shall use snapshot item fields.
- FR-11.4 Invoice shall remain unchanged after box design rename/edit/deactivation.
- FR-11.5 Invoice page shall support browser print styling.
- FR-11.6 PDF export is optional/future unless explicitly required.

## FR-12 File Migration Compatibility

- FR-12.1 Existing Spring Boot uploaded DFX/DXF files shall be copied to `public/uploads/dfx/`.
- FR-12.2 The system shall ensure stored file paths resolve correctly after migration.

---

## 5. Data Requirements

### 5.1 User

Required: username, passwordHash, role, active, mustChangePassword.

### 5.2 Customer

Required: name, phone. Optional: email, addressLine, notes.

### 5.3 Design Type

Required: code, name. Optional: description, imageUrl.

### 5.4 Material

Required: code, name, gsm, sheetLengthCm, sheetWidthCm, costPerSheet, minStockLevel, currentStockLevel.

### 5.5 Box Design

Required: code, name, designTypeId, materialId, lengthCm, widthCm, heightCm, cutLengthCm, cutWidthCm, rawAreaSqCm, unitPrice. Optional: designFilePath, custom flag.

### 5.6 Order

Required: orderNo, customerId, orderDate, status, totalAmount, discountAmount, netAmount. Optional: deliveryDate, remarks.

### 5.7 Order Item

Required: orderId, boxDesignId, designName, designCode, quantity, unitPrice, lineTotal.

---

## 6. Non-Functional Requirements

| ID | Requirement |
|---|---|
| NFR-1 | All routes except login, auth routes, and static assets shall require authentication. |
| NFR-2 | Passwords shall be stored as BCrypt hashes. |
| NFR-3 | Admin-only pages shall not be accessible by STAFF users. |
| NFR-4 | Dashboard and common list pages should load within 2 seconds for normal internal usage. |
| NFR-5 | Order and order item calculations shall be performed server-side. |
| NFR-6 | Invoices shall remain historically accurate even after box design changes. |
| NFR-7 | DFX/DXF files shall be limited to 10 MB. |
| NFR-8 | The system shall support modern Chrome, Edge, and Firefox. |
| NFR-9 | Code shall be organized by modules. |
| NFR-10 | System shall support deployment as a Node.js application connected to MySQL 8. |

---

## 7. Validation Requirements

### 7.1 Authentication

- Username is required.
- Password is required.
- Inactive users are rejected.
- Temporary-password users are forced to change password.

### 7.2 User

- Username required.
- Username must be unique.
- Password minimum 8 characters.
- Role must be ADMIN or STAFF.
- Admin cannot deactivate self.

### 7.3 Customer

- Name required.
- Phone required.
- Email must be valid format if provided.

### 7.4 Material

- Code required and unique.
- Name required.
- GSM between 80 and 600.
- Dimensions must be greater than zero.
- Cost and stock values must be greater than or equal to zero.

### 7.5 Box Design

- Code required and unique.
- Name required.
- Design type required.
- Material required.
- Dimensions and cut dimensions must be greater than zero.
- Unit price must be greater than or equal to zero.
- Raw area must be calculated server-side.
- Uploaded file must be `.dfx` or `.dxf`.

### 7.6 Order

- Customer required and active.
- At least one item required.
- Box design must be active.
- Quantity must be greater than zero.
- Discount cannot exceed total.
- Delivery date cannot be before order date.
- Status transition must be valid.

---

## 8. Acceptance Criteria

### 8.1 Authentication Acceptance

- User can log in with valid credentials.
- User cannot log in with invalid password.
- Inactive user cannot log in.
- User can logout.
- Temporary-password user is forced to change password.

### 8.2 User Management Acceptance

- Admin can create user.
- Admin can edit user role/status.
- Admin can reset password.
- Staff cannot access user management.
- New user must change password first.

### 8.3 Customer Acceptance

- Staff/Admin can create customer.
- Customer appears in list.
- Customer can be searched.
- Customer can be edited.
- Inactive customer is hidden from order creation.

### 8.4 Material Acceptance

- Staff/Admin can create material.
- Material appears in list.
- Low stock is visually shown.
- Inactive material is hidden from box design forms.

### 8.5 Box Design Acceptance

- Staff/Admin can create box design.
- Raw area is calculated correctly.
- DFX/DXF upload validates extension and size.
- Inactive box design is hidden from order creation.

### 8.6 Order Acceptance

- Staff/Admin can create multi-item order.
- Order number is unique and correctly formatted.
- Totals and discounts are correct.
- Invalid discounts are rejected.
- Invalid delivery dates are rejected.
- Status transitions follow allowed lifecycle.
- Status history is recorded.

### 8.7 Invoice Acceptance

- Invoice displays customer and order data.
- Invoice displays snapshot item design code/name.
- Invoice remains unchanged after design rename.
- Invoice can be printed from browser.

### 8.8 Build Acceptance

- `npm run lint` passes.
- `npm run build` passes.
- App starts with `npm start`.
- Required environment variables are documented.

---

## 9. Out of Scope for First Release

- Payment gateway integration
- Email/SMS notifications
- PDF invoice export
- Real-time stock deduction
- Material movement ledger
- Multi-tenancy
- Mobile app/API
- Advanced analytics
- Full audit log for every module

---

## 10. Future Enhancements

- PDF invoice export
- Material movement ledger
- Automatic stock deduction
- SMS/email notifications
- Audit log for all create/update/delete actions
- Admin-only reports
- Advanced sales dashboard
- Multi-tenant support
- Customer-facing portal
- Mobile-friendly order entry
