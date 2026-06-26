# Plan 8: Mobile Navigation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a bottom navigation bar for screens ≤767px that replaces the sidebar. The sidebar is hidden on mobile; the bottom nav shows the 5 most important navigation items with icons and labels.

**Architecture:**
- CSS-only responsive approach: sidebar wrapped in a `DesktopSidebar` div that is `display: none` on mobile; `BottomNav` is `display: none` on desktop and fixed at bottom on mobile
- Bottom nav items: Dashboard, Orders, Production, Designs (Box Designs module), Materials
- Active route detection via `usePathname()` — this is a `"use client"` component
- The layout's main content area already adjusts via `margin-left` — on mobile, set `margin-left: 0` and add `padding-bottom: 5rem` so content isn't hidden under the bottom nav

**Tech Stack:** Next.js 16 App Router, CSS media queries, `usePathname()`, lucide-react

## Global Constraints

- Bottom nav is ALWAYS 5 items only — no overflow/ellipsis menu
- Mobile breakpoint: ≤767px
- Bottom nav: `position: fixed`, `bottom: 0`, `left: 0`, `right: 0`, `z-index: 50`
- Safe area inset: use `padding-bottom: env(safe-area-inset-bottom, 0px)` for notched devices
- No new packages required

---

### Task 1: BottomNav component

**Files:**
- Create: `src/components/layout/BottomNav.tsx`

- [ ] **Step 1: Create the BottomNav component**

Create `src/components/layout/BottomNav.tsx`:

```typescript
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ShoppingCart, Package, BoxSelect, Layers } from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard",  label: "Dashboard",  icon: LayoutDashboard },
  { href: "/orders",     label: "Orders",     icon: ShoppingCart },
  { href: "/production", label: "Production", icon: Package },
  { href: "/designs",    label: "Designs",    icon: BoxSelect },
  { href: "/materials",  label: "Materials",  icon: Layers },
] as const;

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <>
      <style>{`
        .bottom-nav {
          display: none;
        }
        @media (max-width: 767px) {
          .bottom-nav {
            display: flex;
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            z-index: 50;
            background: rgba(10, 10, 10, 0.96);
            border-top: 1px solid rgba(245, 182, 30, 0.12);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            padding-bottom: env(safe-area-inset-bottom, 0px);
          }
        }
      `}</style>
      <nav className="bottom-nav">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.2rem",
                padding: "0.6rem 0.25rem",
                textDecoration: "none",
                color: isActive ? "#F5B61E" : "rgba(240,237,230,0.35)",
                transition: "color 0.15s",
                minWidth: 0,
              }}
            >
              <Icon
                size={20}
                strokeWidth={isActive ? 2.5 : 1.75}
                color={isActive ? "#F5B61E" : "rgba(240,237,230,0.35)"}
              />
              <span style={{
                fontSize: "0.55rem",
                letterSpacing: "0.06em",
                fontWeight: isActive ? 700 : 400,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: "100%",
              }}>
                {label.toUpperCase()}
              </span>
              {isActive && (
                <span style={{
                  position: "absolute",
                  top: 0,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: "32px",
                  height: "2px",
                  background: "#F5B61E",
                  borderRadius: "0 0 2px 2px",
                }} />
              )}
            </Link>
          );
        })}
      </nav>
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
git add src/components/layout/BottomNav.tsx
git commit -m "feat: BottomNav component — 5-item fixed bottom nav, active state, safe-area support"
```

---

### Task 2: Wire BottomNav into the app layout

**Files:**
- Modify: `src/app/(app)/layout.tsx`

- [ ] **Step 1: Add BottomNav and responsive sidebar/content CSS**

In `src/app/(app)/layout.tsx`, make the following changes:

1. Import BottomNav:
```typescript
import BottomNav from "@/components/layout/BottomNav";
```

2. Add responsive CSS for sidebar and main content:

Inside the `<style>` tag or the global layout styles, add:

```typescript
// In the JSX or a <style> tag in the layout:
<style>{`
  .sidebar-desktop {
    display: flex;
  }
  .app-main {
    margin-left: 240px; /* matches sidebar width */
  }
  @media (max-width: 767px) {
    .sidebar-desktop {
      display: none !important;
    }
    .app-main {
      margin-left: 0 !important;
      padding-bottom: calc(5rem + env(safe-area-inset-bottom, 0px));
    }
  }
`}</style>
```

3. Wrap the `<Sidebar />` render in a `<div className="sidebar-desktop">`:
```typescript
<div className="sidebar-desktop">
  <Sidebar session={session} />
</div>
```

4. Add `className="app-main"` to the main content wrapper `<div>` (the one with `marginLeft: "240px"` in inline style).

5. Add `<BottomNav />` just before the closing `</body>` tag (or at the end of the layout root div):
```typescript
<BottomNav />
```

- [ ] **Step 2: Fix TopBar z-index on mobile**

Ensure the TopBar's `position: sticky` works on mobile. In the TopBar component, ensure it has a `z-index` lower than the bottom nav (50) but higher than page content. If it's already `z-index: 10` or `z-index: 20`, it's fine. No change needed unless the bottom nav overlaps it.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Manual test**

```bash
npm run dev
```

Desktop (≥768px):
1. Sidebar is visible on the left
2. Bottom nav is NOT visible
3. Content has correct left margin

Mobile (open DevTools → toggle device toolbar → set to 375px width):
1. Sidebar is hidden
2. Bottom nav appears at bottom of screen with 5 items
3. Active item shows gold color + top accent line
4. Tap each nav item → navigates correctly
5. Page content is not hidden under the bottom nav (padding-bottom applied)
6. Test on a long page (orders list) — content scrolls without overlapping bottom nav

- [ ] **Step 5: Commit**

```bash
git add src/app/(app)/layout.tsx
git commit -m "feat: mobile bottom nav — sidebar hidden ≤767px, BottomNav fixed at bottom, content padding-bottom adjusted"
```

---

### Task 3: Mobile card views for Orders list

**Files:**
- Modify: `src/app/(app)/orders/page.tsx` (or the client component if it exists)

**Note:** The existing code already has responsive card/table switch using CSS ID selectors (`#module-table-view` / `#module-card-view`). This task ensures the orders list has the same card view pattern for mobile.

- [ ] **Step 1: Verify existing orders list has mobile card view**

Check `src/app/(app)/orders/page.tsx`. If it already uses `#module-table-view` / `#module-card-view` selectors with the CSS media query, skip to Step 3.

If it doesn't:

Add card view markup after the table:

```typescript
{/* Mobile card view */}
<div id="orders-card-view">
  {orders.map((order) => (
    <div key={order.id} style={{
      background: "rgba(255,255,255,0.02)", border: "1px solid rgba(245,182,30,0.07)",
      borderRadius: "0.5rem", padding: "0.9rem 1rem", marginBottom: "0.5rem",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.4rem" }}>
        <Link href={`/orders/${order.id}`} style={{ color: "#F5B61E", fontWeight: 700, fontSize: "0.9rem", textDecoration: "none" }}>
          {order.orderNo}
        </Link>
        <StatusBadge status={order.status} />
      </div>
      <p style={{ fontSize: "0.82rem", color: "#F0EDE6", marginBottom: "0.2rem" }}>{order.customer.name}</p>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "0.7rem", color: "rgba(240,237,230,0.4)" }}>{order.orderDate.toISOString().split("T")[0]}</span>
        <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#F5B61E" }}>Rs. {Number(order.netAmount).toFixed(2)}</span>
      </div>
    </div>
  ))}
</div>
```

Add CSS to show/hide:
```typescript
<style>{`
  #orders-card-view { display: none; }
  @media (max-width: 767px) {
    #orders-table-view { display: none; }
    #orders-card-view { display: block; }
  }
`}</style>
```

Wrap the existing `<table>` in `<div id="orders-table-view">`.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Manual test on mobile breakpoint**

1. DevTools → 375px width → navigate to /orders
2. Card view visible (not table)
3. Each card shows order number, customer, status badge, date, net amount
4. Tapping order number navigates to detail page

- [ ] **Step 4: Commit**

```bash
git add src/app/(app)/orders/
git commit -m "feat: orders list mobile card view — card layout ≤767px, table layout ≥768px"
```

---

### Task 4: Final verification

- [ ] **Step 1: Full TypeScript check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 2: Build check**

```bash
npm run build
```

Expected: clean build, no type errors, no missing imports.

- [ ] **Step 3: Manual checklist**

On Desktop (1280px):
- [ ] Sidebar visible, bottom nav hidden
- [ ] All 5 sidebar nav sections navigable
- [ ] Dashboard charts render
- [ ] Orders list, new order form, order detail all work

On Mobile (375px via DevTools):
- [ ] Sidebar hidden
- [ ] Bottom nav shows 5 items with correct labels
- [ ] Active item highlighted in gold
- [ ] Dashboard: stat cards stack vertically (check they're grid → responsive)
- [ ] Orders: card view shows
- [ ] Production queue: readable on mobile
- [ ] Bottom nav does not cover page content

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "chore: final responsive verification — mobile nav complete"
```
