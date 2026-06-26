# Design Types Module Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Overhaul the Design Types list with a slide-over for new/edit (row click opens pre-populated), stat strip, filter tabs (ALL/ACTIVE/INACTIVE), server-side pagination, image thumbnail in table rows, and live image preview in the slide-over.

**Architecture:** Server Component page fetches paginated data + stat counts in parallel; passes data to a `DesignTypesClient` Client Component. `DesignTypeSlideOver` is a standalone Client Component handling create/edit via existing server actions. Shared atoms (`StatChip`, `FilterTabBar`, `PaginationBar`) from the Materials pagination plan are prerequisites.

**Tech Stack:** Next.js 16.2.7 App Router, React 19, Prisma 7 + MySQL, TypeScript, Zod v4, Lucide React icons

## Global Constraints

- `searchParams` is `Promise<{...}>` in Next.js 16 — must be `await`ed in Server Components
- Never run `prisma migrate` — schema changes use `db push` only
- `Decimal` fields must be converted to `number` before passing to Client Components
- URL-param-driven state: `?q=`, `?status=`, `?page=`, `?size=` — `size` defaults to 20
- No `useSearchParams` in shared atoms — pass `currentParams: Record<string, string>` as prop
- Debounced search: 300ms `setTimeout` + `useRef(true)` skip-first-render guard
- Dark glassmorphic design system: `--bg: #080808`, `--gold: #F5B61E`, `--text: #F0EDE6`
- Existing CSS: `.stat-strip-chip`, `.filter-tabs`, `.filter-tab`, `.filter-tab.active` — no new CSS needed for atoms
- Shared atoms already exist from Materials pagination plan: `src/components/ui/StatChip.tsx`, `src/components/ui/FilterTabBar.tsx`, `src/components/ui/PaginationBar.tsx`
- `imageUrl` validated as URL format by existing `designTypeSchema` — server returns error on invalid URL; client-side preview shows/hides via `onError` handler
- Lucide React already installed — use `ImageOff` icon for missing/broken image placeholder
- Do NOT add Redux, Zustand, or any global state library
- `router.refresh()` after successful slide-over save to revalidate Server Component data

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/components/design-types/DesignTypeSlideOver.tsx` | **Create** | Slide-over panel for create/edit |
| `src/components/design-types/DesignTypesClient.tsx` | **Create** | Client Component: table, cards, search, filter, pagination wiring |
| `src/app/(app)/design-types/page.tsx` | **Rewrite** | Paginated Server Component with parallel stat queries |
| `src/app/(app)/design-types/new/page.tsx` | **Replace** | `redirect("/design-types")` |
| `src/app/(app)/design-types/[id]/edit/page.tsx` | **Replace** | `redirect("/design-types")` |
| `src/app/(app)/design-types/DesignTypeRow.tsx` | **Delete** | Replaced by inline rows in DesignTypesClient |

---

## Task 1: DesignTypeSlideOver Component

**Files:**
- Create: `src/components/design-types/DesignTypeSlideOver.tsx`

**Interfaces:**
- Consumes: `createDesignType(formData)` and `updateDesignType(id, formData)` from `src/actions/design-types.ts`
- Produces: `export interface DesignTypeData { id: number; code: string; name: string; description: string | null; imageUrl: string | null; active: boolean; }` — used by DesignTypesClient in Task 2

- [ ] **Step 1: Read existing design-types actions to understand the API**

```
Read: src/actions/design-types.ts
```

Verify `createDesignType(formData: FormData)` and `updateDesignType(id: number, formData: FormData)` both exist and handle `code`, `name`, `description`, `imageUrl`, `active` fields. Confirm `imageUrl` accepts empty string → `undefined`.

- [ ] **Step 2: Create the slide-over component**

Create `src/components/design-types/DesignTypeSlideOver.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImageOff } from "lucide-react";
import { createDesignType, updateDesignType } from "@/actions/design-types";

export interface DesignTypeData {
  id: number;
  code: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  active: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  existing?: DesignTypeData;
  designTypes?: DesignTypeData[];
}

export default function DesignTypeSlideOver({ open, onClose, existing }: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [active, setActive] = useState(true);
  const [imageUrl, setImageUrl] = useState("");
  const [imageVisible, setImageVisible] = useState(false);

  useEffect(() => {
    if (!open) return;
    setActive(existing?.active ?? true);
    setImageUrl(existing?.imageUrl ?? "");
    setImageVisible(false);
    setError("");
  }, [open, existing?.id]);

  // Show image preview when URL changes
  useEffect(() => {
    setImageVisible(!!imageUrl);
  }, [imageUrl]);

  function handleBackdrop(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("active", active ? "true" : "false");
    startTransition(async () => {
      const result = existing
        ? await updateDesignType(existing.id, formData)
        : await createDesignType(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        onClose();
        router.refresh();
      }
    });
  }

  if (!open) return null;

  const isEdit = !!existing;

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 50,
        background: "rgba(0,0,0,0.6)", backdropFilter: "blur(2px)",
        display: "flex", alignItems: "flex-end", justifyContent: "flex-end",
      }}
      onClick={handleBackdrop}
    >
      {/* Panel */}
      <div
        style={{
          background: "var(--surface, #111)",
          width: "clamp(320px, 440px, 100vw)",
          height: "100dvh",
          display: "flex", flexDirection: "column",
          boxShadow: "-4px 0 32px rgba(0,0,0,0.6)",
          borderLeft: "1px solid rgba(245,182,30,0.15)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", gap: "0.75rem",
          padding: "1rem 1.25rem",
          borderBottom: "1px solid rgba(245,182,30,0.1)",
          flexShrink: 0,
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "none", border: "none", color: "var(--text-muted, #888)",
              fontSize: "1.25rem", cursor: "pointer", lineHeight: 1, padding: "0.25rem",
            }}
            aria-label="Close"
          >
            ✕
          </button>
          <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 600, color: "var(--text, #F0EDE6)" }}>
            {isEdit ? `Edit — ${existing.code} ${existing.name}` : "New Design Type"}
          </h2>
        </div>

        {/* Content */}
        <form ref={formRef} onSubmit={handleSubmit} style={{ display: "contents" }}>
          <div style={{ flex: 1, overflowY: "auto", padding: "1.25rem" }}>
            {error && (
              <div style={{
                background: "rgba(248,113,113,0.12)", border: "1px solid rgba(248,113,113,0.3)",
                borderRadius: "6px", padding: "0.75rem 1rem", marginBottom: "1rem",
                color: "#F87171", fontSize: "0.85rem",
              }}>
                {error}
              </div>
            )}

            {/* IDENTITY */}
            <div style={{ marginBottom: "1.5rem" }}>
              <div style={{ fontSize: "0.65rem", letterSpacing: "0.1em", color: "var(--gold, #F5B61E)", fontWeight: 700, marginBottom: "0.75rem" }}>
                IDENTITY
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "0.75rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.7rem", color: "var(--text-muted, #888)", marginBottom: "0.25rem", letterSpacing: "0.05em" }}>
                    CODE *
                  </label>
                  <input
                    name="code"
                    defaultValue={existing?.code ?? ""}
                    required
                    onChange={(e) => { e.target.value = e.target.value.toUpperCase(); }}
                    style={{
                      width: "100%", background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(245,182,30,0.2)", borderRadius: "6px",
                      padding: "0.5rem 0.75rem", color: "var(--text, #F0EDE6)",
                      fontSize: "0.85rem", boxSizing: "border-box",
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.7rem", color: "var(--text-muted, #888)", marginBottom: "0.25rem", letterSpacing: "0.05em" }}>
                    NAME *
                  </label>
                  <input
                    name="name"
                    defaultValue={existing?.name ?? ""}
                    required
                    style={{
                      width: "100%", background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(245,182,30,0.2)", borderRadius: "6px",
                      padding: "0.5rem 0.75rem", color: "var(--text, #F0EDE6)",
                      fontSize: "0.85rem", boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>
            </div>

            {/* DESCRIPTION */}
            <div style={{ marginBottom: "1.5rem" }}>
              <div style={{ fontSize: "0.65rem", letterSpacing: "0.1em", color: "var(--gold, #F5B61E)", fontWeight: 700, marginBottom: "0.75rem" }}>
                DESCRIPTION
              </div>
              <textarea
                name="description"
                defaultValue={existing?.description ?? ""}
                rows={3}
                placeholder="Optional description…"
                style={{
                  width: "100%", background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(245,182,30,0.2)", borderRadius: "6px",
                  padding: "0.5rem 0.75rem", color: "var(--text, #F0EDE6)",
                  fontSize: "0.85rem", resize: "vertical", boxSizing: "border-box",
                  fontFamily: "inherit",
                }}
              />
            </div>

            {/* IMAGE */}
            <div style={{ marginBottom: "1.5rem" }}>
              <div style={{ fontSize: "0.65rem", letterSpacing: "0.1em", color: "var(--gold, #F5B61E)", fontWeight: 700, marginBottom: "0.75rem" }}>
                IMAGE
              </div>
              <input
                name="imageUrl"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://… (optional)"
                style={{
                  width: "100%", background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(245,182,30,0.2)", borderRadius: "6px",
                  padding: "0.5rem 0.75rem", color: "var(--text, #F0EDE6)",
                  fontSize: "0.85rem", boxSizing: "border-box",
                }}
              />
              {imageVisible && (
                <div style={{ marginTop: "0.75rem", borderRadius: "8px", overflow: "hidden", maxHeight: "120px" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUrl}
                    alt="Preview"
                    onError={() => setImageVisible(false)}
                    style={{ width: "100%", height: "120px", objectFit: "cover", display: "block" }}
                  />
                </div>
              )}
            </div>

            {/* STATUS */}
            <div style={{ marginBottom: "1.5rem" }}>
              <div style={{ fontSize: "0.65rem", letterSpacing: "0.1em", color: "var(--gold, #F5B61E)", fontWeight: 700, marginBottom: "0.75rem" }}>
                STATUS
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  type="button"
                  className={`status-chip-btn${active ? " active-ACTIVE" : ""}`}
                  onClick={() => setActive(true)}
                >
                  ✓ ACTIVE
                </button>
                <button
                  type="button"
                  className={`status-chip-btn${!active ? " active-INACTIVE" : ""}`}
                  onClick={() => setActive(false)}
                >
                  INACTIVE
                </button>
              </div>
              <input type="hidden" name="active" value={active ? "true" : "false"} />
            </div>
          </div>

          {/* Footer */}
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "1rem 1.25rem",
            borderTop: "1px solid rgba(245,182,30,0.1)",
            flexShrink: 0,
          }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "none", border: "1px solid rgba(245,182,30,0.2)",
                borderRadius: "6px", padding: "0.5rem 1rem",
                color: "var(--text-muted, #888)", cursor: "pointer", fontSize: "0.85rem",
              }}
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={isPending}
              style={{
                background: "var(--gold, #F5B61E)", border: "none",
                borderRadius: "6px", padding: "0.5rem 1.5rem",
                color: "#000", fontWeight: 700, cursor: isPending ? "not-allowed" : "pointer",
                fontSize: "0.85rem", opacity: isPending ? 0.7 : 1,
                display: "flex", alignItems: "center", gap: "0.5rem",
              }}
            >
              {isPending && (
                <span style={{
                  width: "14px", height: "14px", border: "2px solid rgba(0,0,0,0.3)",
                  borderTopColor: "#000", borderRadius: "50%",
                  animation: "spin 0.6s linear infinite", display: "inline-block",
                }} />
              )}
              SAVE TYPE
            </button>
          </div>
        </form>

        {/* Mobile: bottom sheet responsive override handled via CSS */}
        <style>{`
          @media (max-width: 767px) {
            /* The panel div is positioned at flex-end; on mobile make it full-width bottom sheet */
          }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```powershell
npx tsc --noEmit 2>&1 | Select-String "design-types"
```

Expected: no errors in `DesignTypeSlideOver.tsx`. Fix any type errors before continuing.

- [ ] **Step 4: Commit**

```powershell
git add src/components/design-types/DesignTypeSlideOver.tsx
git commit -m "feat: add DesignTypeSlideOver component"
```

---

## Task 2: DesignTypesClient + Page Overhaul

**Files:**
- Create: `src/components/design-types/DesignTypesClient.tsx`
- Rewrite: `src/app/(app)/design-types/page.tsx`
- Replace: `src/app/(app)/design-types/new/page.tsx`
- Replace: `src/app/(app)/design-types/[id]/edit/page.tsx`
- Delete: `src/app/(app)/design-types/DesignTypeRow.tsx` (if it exists)

**Interfaces:**
- Consumes: `DesignTypeData` from Task 1's `src/components/design-types/DesignTypeSlideOver.tsx`
- Consumes: `StatChip` from `src/components/ui/StatChip.tsx`
- Consumes: `FilterTabBar` from `src/components/ui/FilterTabBar.tsx`
- Consumes: `PaginationBar` from `src/components/ui/PaginationBar.tsx`
- Consumes: `DesignTypeSlideOver` from Task 1
- Consumes: `prisma.designType` Prisma model

- [ ] **Step 1: Read current page.tsx to understand what needs to change**

```
Read: src/app/(app)/design-types/page.tsx
```

Note all data fetching patterns, how Decimal fields (if any) are handled, and what components are rendered.

- [ ] **Step 2: Check whether DesignTypeRow.tsx exists**

```powershell
Test-Path "src/app/(app)/design-types/DesignTypeRow.tsx"
```

If exists, delete it after creating DesignTypesClient (end of this task).

- [ ] **Step 3: Create DesignTypesClient.tsx**

Create `src/components/design-types/DesignTypesClient.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImageOff } from "lucide-react";
import StatChip from "@/components/ui/StatChip";
import FilterTabBar from "@/components/ui/FilterTabBar";
import PaginationBar from "@/components/ui/PaginationBar";
import DesignTypeSlideOver, { DesignTypeData } from "./DesignTypeSlideOver";

interface Props {
  designTypes: DesignTypeData[];
  filteredTotal: number;
  page: number;
  size: number;
  statTotals: { total: number; active: number; inactive: number };
  currentParams: Record<string, string>;
}

export default function DesignTypesClient({
  designTypes,
  filteredTotal,
  page,
  size,
  statTotals,
  currentParams,
}: Props) {
  const router = useRouter();
  const [searchValue, setSearchValue] = useState(currentParams.q ?? "");
  const [slideOverOpen, setSlideOverOpen] = useState(false);
  const [selectedDesignType, setSelectedDesignType] = useState<DesignTypeData | undefined>();
  const isFirstRender = useRef(true);

  // Debounced search
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    const timer = setTimeout(() => {
      const params = new URLSearchParams(currentParams);
      if (searchValue) {
        params.set("q", searchValue);
      } else {
        params.delete("q");
      }
      params.delete("page");
      router.replace(`?${params.toString()}`);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchValue]);

  function openNew() {
    setSelectedDesignType(undefined);
    setSlideOverOpen(true);
  }

  function openEdit(dt: DesignTypeData) {
    setSelectedDesignType(dt);
    setSlideOverOpen(true);
  }

  const currentStatus = currentParams.status ?? "ALL";

  return (
    <div style={{ padding: "1.5rem" }}>
      {/* Stat Strip */}
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
        <StatChip label="TOTAL" value={statTotals.total} />
        <StatChip label="ACTIVE" value={statTotals.active} color="#4ADE80" />
        <StatChip label="INACTIVE" value={statTotals.inactive} color="#F87171" />
      </div>

      {/* Controls Row */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        <input
          type="search"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          placeholder="Search code or name…"
          style={{
            flex: "1 1 200px", minWidth: "160px",
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(245,182,30,0.2)", borderRadius: "6px",
            padding: "0.5rem 0.75rem", color: "var(--text, #F0EDE6)",
            fontSize: "0.85rem",
          }}
        />
        <FilterTabBar
          tabs={["ALL", "ACTIVE", "INACTIVE"]}
          activeTab={currentStatus}
          currentParams={currentParams}
          paramName="status"
        />
        <button
          onClick={openNew}
          style={{
            background: "var(--gold, #F5B61E)", border: "none",
            borderRadius: "6px", padding: "0.5rem 1rem",
            color: "#000", fontWeight: 700, cursor: "pointer", fontSize: "0.85rem",
            whiteSpace: "nowrap",
          }}
        >
          + New Type
        </button>
      </div>

      {/* Table — Desktop/Tablet */}
      <div className="hide-mobile">
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(245,182,30,0.15)" }}>
              <th style={{ width: 52, padding: "0.5rem 0.75rem", textAlign: "left", color: "var(--text-muted, #888)", fontSize: "0.7rem", letterSpacing: "0.06em" }}></th>
              <th style={{ padding: "0.5rem 0.75rem", textAlign: "left", color: "var(--text-muted, #888)", fontSize: "0.7rem", letterSpacing: "0.06em" }}>CODE</th>
              <th style={{ padding: "0.5rem 0.75rem", textAlign: "left", color: "var(--text-muted, #888)", fontSize: "0.7rem", letterSpacing: "0.06em" }}>NAME</th>
              <th className="hide-tablet" style={{ padding: "0.5rem 0.75rem", textAlign: "left", color: "var(--text-muted, #888)", fontSize: "0.7rem", letterSpacing: "0.06em" }}>DESCRIPTION</th>
              <th style={{ padding: "0.5rem 0.75rem", textAlign: "left", color: "var(--text-muted, #888)", fontSize: "0.7rem", letterSpacing: "0.06em" }}>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {designTypes.map((dt) => (
              <tr
                key={dt.id}
                onClick={() => openEdit(dt)}
                style={{
                  borderBottom: "1px solid rgba(245,182,30,0.06)",
                  cursor: "pointer",
                  opacity: dt.active ? 1 : 0.6,
                  transition: "border-left 0.1s",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderLeft = "2px solid rgba(245,182,30,0.25)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderLeft = ""; }}
              >
                <td style={{ padding: "0.625rem 0.75rem" }}>
                  {dt.imageUrl ? (
                    <ImageWithFallback src={dt.imageUrl} />
                  ) : (
                    <div style={{
                      width: 36, height: 36, borderRadius: "6px",
                      background: "rgba(255,255,255,0.05)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <ImageOff size={16} color="var(--text-muted, #888)" />
                    </div>
                  )}
                </td>
                <td style={{ padding: "0.625rem 0.75rem", color: "var(--gold, #F5B61E)", fontWeight: 700, fontSize: "0.72rem", letterSpacing: "0.06em" }}>
                  {dt.code}
                </td>
                <td style={{ padding: "0.625rem 0.75rem", color: "var(--text, #F0EDE6)", fontWeight: 600 }}>
                  {dt.name}
                </td>
                <td className="hide-tablet" style={{ padding: "0.625rem 0.75rem", color: "var(--text-muted, #888)", maxWidth: "300px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {dt.description ?? "—"}
                </td>
                <td style={{ padding: "0.625rem 0.75rem" }}>
                  <span className={`status-pill ${dt.active ? "status-fulfilled" : "status-cancelled"}`}>
                    {dt.active ? "ACTIVE" : "INACTIVE"}
                  </span>
                </td>
              </tr>
            ))}
            {designTypes.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted, #888)" }}>
                  No design types found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Cards — Mobile */}
      <div className="hide-desktop hide-tablet">
        {designTypes.map((dt) => (
          <div
            key={dt.id}
            onClick={() => openEdit(dt)}
            style={{
              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(245,182,30,0.1)",
              borderRadius: "8px", padding: "0.875rem", marginBottom: "0.625rem",
              cursor: "pointer", opacity: dt.active ? 1 : 0.6,
              display: "flex", alignItems: "flex-start", gap: "0.875rem",
            }}
          >
            <div style={{ flexShrink: 0 }}>
              {dt.imageUrl ? (
                <ImageWithFallback src={dt.imageUrl} />
              ) : (
                <div style={{
                  width: 36, height: 36, borderRadius: "6px",
                  background: "rgba(255,255,255,0.05)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <ImageOff size={16} color="var(--text-muted, #888)" />
                </div>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem", marginBottom: "0.25rem" }}>
                <span style={{ color: "var(--gold, #F5B61E)", fontWeight: 700, fontSize: "0.72rem", letterSpacing: "0.06em" }}>
                  {dt.code}
                </span>
                <span className={`status-pill ${dt.active ? "status-fulfilled" : "status-cancelled"}`}>
                  {dt.active ? "ACTIVE" : "INACTIVE"}
                </span>
              </div>
              <div style={{ color: "var(--text, #F0EDE6)", fontWeight: 600, fontSize: "0.9rem", marginBottom: "0.25rem" }}>
                {dt.name}
              </div>
              {dt.description && (
                <div style={{ color: "var(--text-muted, #888)", fontSize: "0.8rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {dt.description}
                </div>
              )}
            </div>
          </div>
        ))}
        {designTypes.length === 0 && (
          <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted, #888)" }}>
            No design types found.
          </div>
        )}
      </div>

      {/* Pagination */}
      <PaginationBar
        total={filteredTotal}
        page={page}
        size={size}
        currentParams={currentParams}
      />

      {/* Slide-over */}
      <DesignTypeSlideOver
        open={slideOverOpen}
        onClose={() => setSlideOverOpen(false)}
        existing={selectedDesignType}
      />
    </div>
  );
}

// Inline helper: renders thumbnail with onError fallback
function ImageWithFallback({ src }: { src: string }) {
  const [errored, setErrored] = useState(false);
  if (errored) {
    return (
      <div style={{
        width: 36, height: 36, borderRadius: "6px",
        background: "rgba(255,255,255,0.05)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <ImageOff size={16} color="var(--text-muted, #888)" />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      width={36}
      height={36}
      onError={() => setErrored(true)}
      style={{ width: 36, height: 36, borderRadius: "6px", objectFit: "cover", display: "block" }}
    />
  );
}
```

- [ ] **Step 4: Rewrite page.tsx**

Overwrite `src/app/(app)/design-types/page.tsx`:

```tsx
import { prisma } from "@/lib/prisma";
import DesignTypesClient from "@/components/design-types/DesignTypesClient";

interface SearchParams {
  q?: string;
  status?: string;
  page?: string;
  size?: string;
}

export default async function DesignTypesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const q = params.q ?? "";
  const status = params.status ?? "";
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const size = [20, 50, 100].includes(parseInt(params.size ?? "20", 10))
    ? parseInt(params.size ?? "20", 10)
    : 20;
  const skip = (page - 1) * size;

  const where = {
    active:
      status === "ACTIVE" ? true : status === "INACTIVE" ? false : undefined,
    OR: q
      ? [{ code: { contains: q } }, { name: { contains: q } }]
      : undefined,
  };

  const [designTypes, filteredTotal, totalCount, activeCount, inactiveCount] =
    await Promise.all([
      prisma.designType.findMany({
        where,
        skip,
        take: size,
        orderBy: { code: "asc" },
        select: {
          id: true,
          code: true,
          name: true,
          description: true,
          imageUrl: true,
          active: true,
        },
      }),
      prisma.designType.count({ where }),
      prisma.designType.count(),
      prisma.designType.count({ where: { active: true } }),
      prisma.designType.count({ where: { active: false } }),
    ]);

  // No Decimal fields on DesignType — safe to pass directly as serializable objects.
  const currentParams: Record<string, string> = {};
  if (q) currentParams.q = q;
  if (status) currentParams.status = status;
  if (page > 1) currentParams.page = String(page);
  if (size !== 20) currentParams.size = String(size);

  return (
    <DesignTypesClient
      designTypes={designTypes}
      filteredTotal={filteredTotal}
      page={page}
      size={size}
      statTotals={{ total: totalCount, active: activeCount, inactive: inactiveCount }}
      currentParams={currentParams}
    />
  );
}
```

- [ ] **Step 5: Replace new/page.tsx with redirect**

Overwrite `src/app/(app)/design-types/new/page.tsx`:

```tsx
import { redirect } from "next/navigation";

export default function NewDesignTypePage() {
  redirect("/design-types");
}
```

- [ ] **Step 6: Replace [id]/edit/page.tsx with redirect**

Overwrite `src/app/(app)/design-types/[id]/edit/page.tsx`:

```tsx
import { redirect } from "next/navigation";

export default function EditDesignTypePage() {
  redirect("/design-types");
}
```

- [ ] **Step 7: Delete DesignTypeRow.tsx if it exists**

```powershell
if (Test-Path "src/app/(app)/design-types/DesignTypeRow.tsx") {
  Remove-Item "src/app/(app)/design-types/DesignTypeRow.tsx"
  Write-Output "Deleted DesignTypeRow.tsx"
} else {
  Write-Output "DesignTypeRow.tsx does not exist — nothing to delete"
}
```

- [ ] **Step 8: Verify TypeScript compiles**

```powershell
npx tsc --noEmit 2>&1 | Select-String "design-types"
```

Expected: no errors in any design-types file. Fix any type errors.

- [ ] **Step 9: Start dev server and manual smoke test**

```powershell
npm run dev
```

Navigate to `/design-types`. Verify:
1. Stat strip shows TOTAL / ACTIVE / INACTIVE counts
2. Search filters rows in real time (after 300ms debounce)
3. ACTIVE / INACTIVE filter tabs work
4. Clicking a row opens the slide-over pre-populated with that design type's data
5. "+ New Type" opens an empty slide-over
6. Saving a new type closes the slide-over and the list refreshes (new item appears)
7. Editing an existing type saves and refreshes
8. Image thumbnail appears when `imageUrl` is set; `ImageOff` icon shows when null or broken
9. In slide-over: entering a valid image URL shows the preview; a broken URL hides the preview
10. `/design-types/new` redirects to `/design-types`
11. `/design-types/[any-id]/edit` redirects to `/design-types`
12. Pagination controls appear when `filteredTotal > size`
13. Page size selector works (20/50/100)

- [ ] **Step 10: Commit**

```powershell
git add src/components/design-types/DesignTypesClient.tsx
git add src/app/(app)/design-types/page.tsx
git add src/app/(app)/design-types/new/page.tsx
git add "src/app/(app)/design-types/[id]/edit/page.tsx"
git commit -m "feat: design types list overhaul — slide-over, stat strip, pagination"
```

---

## Self-Review

**Spec coverage:**

| Spec requirement | Task |
|-----------------|------|
| Replace new/edit pages with slide-over | Task 1 (slide-over), Task 2 (redirects) |
| Row click opens slide-over pre-populated | Task 2 (DesignTypesClient row onClick) |
| Stat strip: TOTAL, ACTIVE, INACTIVE chips | Task 2 (DesignTypesClient stat strip) |
| Filter tabs ALL / ACTIVE / INACTIVE | Task 2 (FilterTabBar) |
| Server-side pagination with URL params | Task 2 (page.tsx + PaginationBar) |
| 36×36 image thumbnail in table | Task 2 (ImageWithFallback) |
| ImageOff placeholder when no/broken image | Task 2 (ImageWithFallback + fallback div) |
| Live image preview in slide-over | Task 1 (imageUrl state + `<img onError>`) |
| Preview hidden when URL empty | Task 1 (imageVisible state) |
| Preview hides on load error | Task 1 (onError → setImageVisible(false)) |
| CODE auto-uppercased | Task 1 (onChange toUpperCase) |
| STATUS chip toggle (ACTIVE/INACTIVE) | Task 1 |
| Desktop: full table (img, code, name, desc, status) | Task 2 |
| Tablet: DESCRIPTION hidden | Task 2 (hide-tablet class) |
| Mobile: card stack with image | Task 2 (mobile cards section) |
| `searchParams` awaited in Server Component | Task 2 (page.tsx `await searchParams`) |
| Inactive rows opacity 0.6 | Task 2 (row style opacity) |
| Gold left border on hover | Task 2 (onMouseEnter/Leave) |
| `router.refresh()` after save | Task 1 |
| No new CSS needed | ✓ reuses existing classes |

**Placeholder scan:** None found — all steps contain complete code.

**Type consistency:** `DesignTypeData` interface defined in Task 1 and imported in Task 2. All property names match across tasks.
