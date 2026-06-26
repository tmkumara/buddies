# Plan 7: Admin Modules

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build admin-only modules: (1) Users management at `/users` — view, create, deactivate staff accounts; (2) Lead Sources management at `/settings/lead-sources` — CRUD for the configurable lead source list; (3) Basic reports page at `/reports` with CSV export for orders.

**Architecture:**
- All three pages are behind `requireAuth()` with a role check (`session.user.role === "ADMIN"`) — non-admins get redirected to `/dashboard`
- Users page: server component + slide-over for create/edit (no password display)
- Lead sources: simple CRUD using existing slide-over pattern
- Reports: server component with date-range filter, generates CSV via a Route Handler
- **Prerequisite: Plan 1 must be complete (LeadSource model exists)**

**Tech Stack:** Next.js 16 App Router, Prisma 7, Server Actions, bcryptjs (already in package)

## Global Constraints

- `searchParams` is a Promise — must be awaited
- `requireAuth()` + role guard: redirect non-ADMINs to `/dashboard`
- Password must be hashed with `bcryptjs` — NEVER store plaintext
- Server Actions return `{ error: string }` or `{ success: true }`

---

### Task 1: Admin guard utility

**Files:**
- Create: `src/lib/admin-guard.ts`

- [ ] **Step 1: Create the admin guard helper**

Create `src/lib/admin-guard.ts`:

```typescript
import { requireAuth } from "@/lib/auth-guards";
import { redirect } from "next/navigation";

export async function requireAdmin() {
  const session = await requireAuth();
  if (session.user.role !== "ADMIN") redirect("/dashboard");
  return session;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/admin-guard.ts
git commit -m "feat: requireAdmin() guard — redirects non-ADMIN to /dashboard"
```

---

### Task 2: User management actions

**Files:**
- Create: `src/actions/users.ts`

- [ ] **Step 1: Create user actions**

Create `src/actions/users.ts`:

```typescript
"use server";

import { requireAdmin } from "@/lib/admin-guard";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { revalidatePath } from "next/cache";

const createSchema = z.object({
  name:     z.string().min(1).max(100),
  email:    z.string().email().max(150),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role:     z.enum(["ADMIN", "STAFF"]),
});

const updateSchema = z.object({
  userId:      z.coerce.number().int().positive(),
  name:        z.string().min(1).max(100),
  role:        z.enum(["ADMIN", "STAFF"]),
  newPassword: z.string().min(8).optional().or(z.literal("")),
});

export async function createUser(formData: FormData) {
  await requireAdmin();

  const parsed = createSchema.safeParse({
    name:     formData.get("name"),
    email:    formData.get("email"),
    password: formData.get("password"),
    role:     formData.get("role"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Validation error" };

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) return { error: "A user with this email already exists." };

  const hashed = await bcrypt.hash(parsed.data.password, 12);

  await prisma.user.create({
    data: {
      name:           parsed.data.name,
      email:          parsed.data.email,
      hashedPassword: hashed,
      role:           parsed.data.role,
      active:         true,
    },
  });

  revalidatePath("/users");
  return { success: true as const };
}

export async function updateUser(formData: FormData) {
  await requireAdmin();

  const parsed = updateSchema.safeParse({
    userId:      formData.get("userId"),
    name:        formData.get("name"),
    role:        formData.get("role"),
    newPassword: formData.get("newPassword") || "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Validation error" };

  const { userId, name, role, newPassword } = parsed.data;

  const updateData: { name: string; role: "ADMIN" | "STAFF"; hashedPassword?: string } = { name, role };
  if (newPassword) {
    updateData.hashedPassword = await bcrypt.hash(newPassword, 12);
  }

  await prisma.user.update({ where: { id: userId }, data: updateData });
  revalidatePath("/users");
  return { success: true as const };
}

export async function toggleUserActive(userId: number, active: boolean) {
  const session = await requireAdmin();
  if (Number(session.user.id) === userId) return { error: "You cannot deactivate your own account." };

  await prisma.user.update({ where: { id: userId }, data: { active } });
  revalidatePath("/users");
  return { success: true as const };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/actions/users.ts
git commit -m "feat: user management server actions — create, update (with optional password reset), toggle active"
```

---

### Task 3: Users page

**Files:**
- Create: `src/app/(app)/users/page.tsx`
- Create: `src/app/(app)/users/UserSlideOver.tsx`
- Create: `src/app/(app)/users/UsersClient.tsx`

- [ ] **Step 1: Create UserSlideOver**

Create `src/app/(app)/users/UserSlideOver.tsx`:

```typescript
"use client";

import { useState, FormEvent } from "react";
import { X } from "lucide-react";
import { createUser, updateUser } from "@/actions/users";

interface UserRow { id: number; name: string; email: string; role: string; active: boolean; }
interface Props {
  isOpen:  boolean;
  onClose: () => void;
  editing: UserRow | null;
}

const inp: React.CSSProperties = {
  width: "100%", background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(245,182,30,0.14)", borderRadius: "0.45rem",
  padding: "0.65rem 0.85rem", color: "#F0EDE6", fontSize: "0.83rem", outline: "none",
};
const lbl: React.CSSProperties = {
  fontSize: "0.6rem", letterSpacing: "0.09em",
  color: "rgba(240,237,230,0.4)", display: "block", marginBottom: "0.3rem", fontWeight: 600,
};

export default function UserSlideOver({ isOpen, onClose, editing }: Props) {
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true); setError("");
    const fd = new FormData(e.currentTarget);
    if (editing) fd.set("userId", String(editing.id));

    const action = editing ? updateUser : createUser;
    const result = await action(fd);
    setSaving(false);
    if ("error" in result) { setError(result.error); return; }
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
            <h2 style={{ fontSize: "0.9rem", fontWeight: 700, color: "#F5B61E", margin: 0 }}>{editing ? "Edit User" : "New User"}</h2>
            <p style={{ fontSize: "0.62rem", color: "rgba(240,237,230,0.35)", margin: "0.2rem 0 0" }}>USER MANAGEMENT</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(240,237,230,0.4)" }}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: "auto", padding: "1.1rem 1.25rem", display: "flex", flexDirection: "column", gap: "0.7rem" }}>
          {error && <div style={{ padding: "0.55rem 0.75rem", background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)", borderRadius: "0.4rem", fontSize: "0.72rem", color: "#F87171" }}>{error}</div>}

          <div><label style={lbl}>NAME *</label><input name="name" required defaultValue={editing?.name} style={inp} /></div>

          {!editing && (
            <div><label style={lbl}>EMAIL *</label><input name="email" type="email" required style={inp} /></div>
          )}

          <div>
            <label style={lbl}>ROLE *</label>
            <select name="role" defaultValue={editing?.role ?? "STAFF"} required style={{ ...inp, background: "rgba(255,255,255,0.04)" }}>
              <option value="STAFF" style={{ background: "#0d0d0d" }}>Staff</option>
              <option value="ADMIN" style={{ background: "#0d0d0d" }}>Admin</option>
            </select>
          </div>

          <div>
            <label style={lbl}>{editing ? "NEW PASSWORD (leave blank to keep)" : "PASSWORD *"}</label>
            <input name={editing ? "newPassword" : "password"} type="password" required={!editing} minLength={8} style={inp} />
          </div>

          <div style={{ display: "flex", gap: "0.6rem", marginTop: "auto", paddingTop: "0.75rem" }}>
            <button type="submit" disabled={saving} style={{ flex: 1, padding: "0.65rem", background: "rgba(245,182,30,0.15)", border: "1px solid rgba(245,182,30,0.3)", borderRadius: "0.5rem", color: "#F5B61E", fontSize: "0.75rem", letterSpacing: "0.08em", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer" }}>
              {saving ? "SAVING…" : editing ? "SAVE CHANGES" : "CREATE USER"}
            </button>
            <button type="button" onClick={onClose} style={{ padding: "0.65rem 1rem", background: "none", border: "1px solid rgba(245,182,30,0.12)", borderRadius: "0.5rem", color: "rgba(240,237,230,0.4)", fontSize: "0.72rem", cursor: "pointer" }}>Cancel</button>
          </div>
        </form>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Create UsersClient**

Create `src/app/(app)/users/UsersClient.tsx`:

```typescript
"use client";

import { useState } from "react";
import { Plus, Pencil, ToggleLeft, ToggleRight } from "lucide-react";
import UserSlideOver from "./UserSlideOver";
import { toggleUserActive } from "@/actions/users";

interface UserRow { id: number; name: string; email: string; role: string; active: boolean; createdAt: string; }

interface Props { users: UserRow[]; currentUserId: number; }

const ROLE_COLOR: Record<string, string> = { ADMIN: "#F5B61E", STAFF: "#818CF8" };

export default function UsersClient({ users: initUsers, currentUserId }: Props) {
  const [users,      setUsers]      = useState<UserRow[]>(initUsers);
  const [slideOpen,  setSlideOpen]  = useState(false);
  const [editing,    setEditing]    = useState<UserRow | null>(null);
  const [toggling,   setToggling]   = useState<number | null>(null);

  function openCreate() { setEditing(null); setSlideOpen(true); }
  function openEdit(u: UserRow) { setEditing(u); setSlideOpen(true); }

  async function handleToggle(user: UserRow) {
    if (user.id === currentUserId) return;
    setToggling(user.id);
    await toggleUserActive(user.id, !user.active);
    setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, active: !u.active } : u));
    setToggling(null);
  }

  const th: React.CSSProperties = {
    padding: "0.55rem 0.75rem", fontSize: "0.62rem", letterSpacing: "0.1em",
    color: "rgba(240,237,230,0.3)", fontWeight: 600, borderBottom: "1px solid rgba(245,182,30,0.1)",
  };
  const td: React.CSSProperties = {
    padding: "0.65rem 0.75rem", fontSize: "0.83rem", borderBottom: "1px solid rgba(245,182,30,0.05)", verticalAlign: "middle",
  };

  return (
    <>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1rem" }}>
        <button onClick={openCreate} className="cta-btn" style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.72rem" }}>
          <Plus size={14} /> New User
        </button>
      </div>

      <div className="content-card" style={{ overflow: "clip", borderRadius: "0.7rem" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ position: "sticky", top: "4.5rem", background: "#0d0d0d", zIndex: 2 }}>
            <tr>
              <th style={{ ...th, textAlign: "left" }}>NAME</th>
              <th style={{ ...th, textAlign: "left" }}>EMAIL</th>
              <th style={{ ...th, textAlign: "left" }}>ROLE</th>
              <th style={{ ...th, textAlign: "left" }}>JOINED</th>
              <th style={{ ...th, textAlign: "center" }}>STATUS</th>
              <th style={{ ...th, textAlign: "center" }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td style={{ ...td, color: "#F0EDE6", fontWeight: 500 }}>
                  {u.name}
                  {u.id === currentUserId && <span style={{ fontSize: "0.55rem", marginLeft: "0.4rem", color: "rgba(240,237,230,0.35)" }}>(you)</span>}
                </td>
                <td style={{ ...td, color: "rgba(240,237,230,0.55)", fontSize: "0.78rem" }}>{u.email}</td>
                <td style={td}>
                  <span style={{ fontSize: "0.62rem", fontWeight: 700, color: ROLE_COLOR[u.role] ?? "#6b7280", background: `${ROLE_COLOR[u.role] ?? "#6b7280"}18`, padding: "0.15rem 0.5rem", borderRadius: "0.3rem", border: `1px solid ${ROLE_COLOR[u.role] ?? "#6b7280"}35` }}>
                    {u.role}
                  </span>
                </td>
                <td style={{ ...td, color: "rgba(240,237,230,0.4)", fontSize: "0.72rem" }}>{u.createdAt}</td>
                <td style={{ ...td, textAlign: "center" }}>
                  <span style={{ fontSize: "0.62rem", fontWeight: 700, color: u.active ? "#4ADE80" : "#F87171", background: u.active ? "rgba(74,222,128,0.08)" : "rgba(248,113,113,0.08)", padding: "0.15rem 0.5rem", borderRadius: "0.3rem" }}>
                    {u.active ? "ACTIVE" : "INACTIVE"}
                  </span>
                </td>
                <td style={{ ...td, textAlign: "center" }}>
                  <div style={{ display: "flex", justifyContent: "center", gap: "0.4rem" }}>
                    <button onClick={() => openEdit(u)} style={{ background: "none", border: "1px solid rgba(245,182,30,0.15)", borderRadius: "0.35rem", padding: "0.3rem 0.5rem", color: "rgba(245,182,30,0.7)", cursor: "pointer" }}>
                      <Pencil size={12} />
                    </button>
                    {u.id !== currentUserId && (
                      <button onClick={() => handleToggle(u)} disabled={toggling === u.id} style={{ background: "none", border: `1px solid ${u.active ? "rgba(248,113,113,0.2)" : "rgba(74,222,128,0.2)"}`, borderRadius: "0.35rem", padding: "0.3rem 0.5rem", color: u.active ? "#F87171" : "#4ADE80", cursor: toggling === u.id ? "not-allowed" : "pointer" }}>
                        {u.active ? <ToggleRight size={12} /> : <ToggleLeft size={12} />}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <UserSlideOver
        isOpen={slideOpen}
        onClose={() => setSlideOpen(false)}
        editing={editing}
      />
    </>
  );
}
```

- [ ] **Step 3: Create Users page server component**

Create `src/app/(app)/users/page.tsx`:

```typescript
import { requireAdmin } from "@/lib/admin-guard";
import prisma from "@/lib/prisma";
import TopBar from "@/components/layout/TopBar";
import UsersClient from "./UsersClient";

export default async function UsersPage() {
  const session = await requireAdmin();

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
  });

  const serialized = users.map((u) => ({
    ...u,
    createdAt: u.createdAt.toISOString().split("T")[0],
  }));

  return (
    <>
      <TopBar title="Users" />
      <div style={{ padding: "1.5rem 1.75rem" }}>
        <UsersClient users={serialized} currentUserId={Number(session.user.id)} />
      </div>
    </>
  );
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Manual test**

```bash
npm run dev
```

1. Log in as ADMIN → navigate to `/users`
2. All users list visible with role badge, status badge
3. Click "New User" → slide-over → create a STAFF user → appears in list
4. Click edit icon → slide-over with current data prefilled → save
5. Click toggle button on a non-self user → status toggles
6. Log in as STAFF → navigate to `/users` → redirected to /dashboard

- [ ] **Step 6: Commit**

```bash
git add src/app/(app)/users/ src/lib/admin-guard.ts src/actions/users.ts
git commit -m "feat: users management page — create, edit, toggle active (ADMIN only)"
```

---

### Task 4: Lead Sources management

**Files:**
- Create: `src/app/(app)/settings/lead-sources/page.tsx`
- Create: `src/app/(app)/settings/lead-sources/LeadSourcesClient.tsx`

- [ ] **Step 1: Create LeadSourcesClient**

Create `src/app/(app)/settings/lead-sources/LeadSourcesClient.tsx`:

```typescript
"use client";

import { useState, FormEvent } from "react";
import { Plus, Pencil, ToggleRight, ToggleLeft } from "lucide-react";
import { createLeadSource, updateLeadSource } from "@/actions/lead-sources";

interface LeadSourceRow { id: number; name: string; active: boolean; }

interface Props { sources: LeadSourceRow[]; }

export default function LeadSourcesClient({ sources: initSources }: Props) {
  const [sources,    setSources]    = useState<LeadSourceRow[]>(initSources);
  const [showForm,   setShowForm]   = useState(false);
  const [editingId,  setEditingId]  = useState<number | null>(null);
  const [formName,   setFormName]   = useState("");
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState("");

  function openCreate() { setEditingId(null); setFormName(""); setShowForm(true); setError(""); }
  function openEdit(s: LeadSourceRow) { setEditingId(s.id); setFormName(s.name); setShowForm(true); setError(""); }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true); setError("");
    const fd = new FormData();
    fd.set("name", formName);
    if (editingId) fd.set("id", String(editingId));

    const action = editingId ? updateLeadSource : createLeadSource;
    const result = await action(fd);
    setSaving(false);
    if ("error" in result) { setError(result.error); return; }
    window.location.reload();
  }

  async function handleToggle(s: LeadSourceRow) {
    const fd = new FormData();
    fd.set("id",     String(s.id));
    fd.set("name",   s.name);
    fd.set("active", String(!s.active));
    await updateLeadSource(fd);
    setSources((prev) => prev.map((ls) => ls.id === s.id ? { ...ls, active: !ls.active } : ls));
  }

  const inp: React.CSSProperties = {
    flex: 1, background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(245,182,30,0.14)", borderRadius: "0.45rem",
    padding: "0.6rem 0.85rem", color: "#F0EDE6", fontSize: "0.83rem", outline: "none",
  };

  return (
    <div style={{ maxWidth: "600px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <p style={{ fontSize: "0.72rem", color: "rgba(240,237,230,0.35)" }}>{sources.filter((s) => s.active).length} active sources</p>
        <button onClick={openCreate} className="cta-btn" style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.72rem" }}>
          <Plus size={13} /> Add Source
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", alignItems: "center" }}>
          <input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Lead source name (e.g. TikTok)" required style={inp} />
          <button type="submit" disabled={saving} style={{ padding: "0.6rem 1rem", background: "rgba(245,182,30,0.15)", border: "1px solid rgba(245,182,30,0.3)", borderRadius: "0.45rem", color: "#F5B61E", fontSize: "0.72rem", cursor: saving ? "not-allowed" : "pointer" }}>
            {saving ? "…" : editingId ? "Save" : "Add"}
          </button>
          <button type="button" onClick={() => setShowForm(false)} style={{ padding: "0.6rem 0.85rem", background: "none", border: "1px solid rgba(245,182,30,0.1)", borderRadius: "0.45rem", color: "rgba(240,237,230,0.4)", fontSize: "0.72rem", cursor: "pointer" }}>×</button>
        </form>
      )}
      {error && <p style={{ fontSize: "0.72rem", color: "#F87171", marginBottom: "0.75rem" }}>{error}</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
        {sources.map((s) => (
          <div key={s.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.65rem 0.9rem", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(245,182,30,0.07)", borderRadius: "0.45rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <span style={{ fontSize: "0.85rem", color: s.active ? "#F0EDE6" : "rgba(240,237,230,0.35)", fontWeight: 500 }}>{s.name}</span>
              {!s.active && <span style={{ fontSize: "0.58rem", color: "#F87171" }}>INACTIVE</span>}
            </div>
            <div style={{ display: "flex", gap: "0.35rem" }}>
              <button onClick={() => openEdit(s)} style={{ background: "none", border: "1px solid rgba(245,182,30,0.12)", borderRadius: "0.35rem", padding: "0.25rem 0.5rem", color: "rgba(245,182,30,0.6)", cursor: "pointer" }}>
                <Pencil size={11} />
              </button>
              <button onClick={() => handleToggle(s)} style={{ background: "none", border: `1px solid ${s.active ? "rgba(248,113,113,0.15)" : "rgba(74,222,128,0.15)"}`, borderRadius: "0.35rem", padding: "0.25rem 0.5rem", color: s.active ? "#F87171" : "#4ADE80", cursor: "pointer" }}>
                {s.active ? <ToggleRight size={12} /> : <ToggleLeft size={12} />}
              </button>
            </div>
          </div>
        ))}
        {sources.length === 0 && (
          <p style={{ fontSize: "0.75rem", color: "rgba(240,237,230,0.2)", padding: "1rem 0" }}>No lead sources configured yet.</p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create lead sources page**

Create `src/app/(app)/settings/lead-sources/page.tsx`:

```typescript
import { requireAdmin } from "@/lib/admin-guard";
import prisma from "@/lib/prisma";
import TopBar from "@/components/layout/TopBar";
import LeadSourcesClient from "./LeadSourcesClient";

export default async function LeadSourcesPage() {
  await requireAdmin();

  const sources = await prisma.leadSource.findMany({
    orderBy: { id: "asc" },
    select: { id: true, name: true, active: true },
  });

  return (
    <>
      <TopBar title="Lead Sources" />
      <div style={{ padding: "1.5rem 1.75rem" }}>
        <LeadSourcesClient sources={sources} />
      </div>
    </>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/app/(app)/settings/ src/actions/lead-sources.ts
git commit -m "feat: lead sources settings page — add, edit, toggle active (ADMIN only)"
```

---

### Task 5: Reports page + CSV export

**Files:**
- Create: `src/app/(app)/reports/page.tsx`
- Create: `src/app/api/reports/orders-csv/route.ts`

- [ ] **Step 1: Create the CSV route handler**

Create `src/app/api/reports/orders-csv/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guards";
import prisma from "@/lib/prisma";

function csvEscape(val: unknown): string {
  const s = String(val ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function row(cells: unknown[]): string {
  return cells.map(csvEscape).join(",");
}

export async function GET(req: NextRequest) {
  await requireAuth();

  const { searchParams } = req.nextUrl;
  const from = searchParams.get("from");
  const to   = searchParams.get("to");

  const dateFilter =
    from && to
      ? { orderDate: { gte: new Date(from), lte: new Date(to + "T23:59:59Z") } }
      : {};

  const orders = await prisma.order.findMany({
    where:   { ...dateFilter, status: { not: "CANCELLED" } },
    orderBy: { orderDate: "desc" },
    include: {
      customer:   { select: { name: true, phone: true } },
      items:      { select: { designCode: true, designName: true, quantity: true, unitPrice: true, lineTotal: true } },
      payments:   { select: { amount: true, method: true, paymentDate: true } },
    },
  });

  const lines: string[] = [
    row(["Order No", "Order Date", "Customer", "Phone", "Items", "Total Qty", "Subtotal", "Discount %", "Discount Amt", "Net Amount", "Total Paid", "Balance", "Status", "Delivery Date", "Lead Source"]),
  ];

  for (const o of orders) {
    const totalPaid = o.payments.reduce((s, p) => s + Number(p.amount), 0);
    const itemsStr  = o.items.map((i) => `${i.quantity}×${i.designCode}`).join("; ");
    const totalQty  = o.items.reduce((s, i) => s + i.quantity, 0);

    lines.push(row([
      o.orderNo,
      o.orderDate.toISOString().split("T")[0],
      o.customer.name,
      o.customer.phone,
      itemsStr,
      totalQty,
      Number(o.totalAmount).toFixed(2),
      Number(o.discountPercent).toFixed(2),
      Number(o.discountAmount).toFixed(2),
      Number(o.netAmount).toFixed(2),
      totalPaid.toFixed(2),
      Math.max(0, Number(o.netAmount) - totalPaid).toFixed(2),
      o.status,
      o.deliveryDate?.toISOString().split("T")[0] ?? "",
      "",
    ]));
  }

  const csv = lines.join("\r\n");
  const filename = `orders-${from ?? "all"}-${to ?? "all"}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type":        "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
```

- [ ] **Step 2: Create the reports page**

Create `src/app/(app)/reports/page.tsx`:

```typescript
import { requireAuth } from "@/lib/auth-guards";
import prisma from "@/lib/prisma";
import TopBar from "@/components/layout/TopBar";
import ReportsClient from "./ReportsClient";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await requireAuth();
  const params = await searchParams;

  const from = params.from ?? "";
  const to   = params.to   ?? "";

  const dateFilter =
    from && to
      ? { orderDate: { gte: new Date(from), lte: new Date(to + "T23:59:59Z") } }
      : {};

  const [orderCount, revenueAgg, statusBreakdown] = await Promise.all([
    prisma.order.count({ where: { ...dateFilter, status: { not: "CANCELLED" } } }),
    prisma.order.aggregate({ where: { ...dateFilter, status: { not: "CANCELLED" } }, _sum: { netAmount: true } }),
    prisma.order.groupBy({ by: ["status"], where: dateFilter, _count: { _all: true } }),
  ]);

  const csvUrl = `/api/reports/orders-csv${from && to ? `?from=${from}&to=${to}` : ""}`;

  return (
    <>
      <TopBar title="Reports" />
      <div style={{ padding: "1.5rem 1.75rem" }}>
        <ReportsClient
          from={from}
          to={to}
          orderCount={orderCount}
          totalRevenue={Math.round(Number(revenueAgg._sum.netAmount) ?? 0)}
          statusBreakdown={statusBreakdown.map((s) => ({ status: s.status, count: s._count._all }))}
          csvUrl={csvUrl}
        />
      </div>
    </>
  );
}
```

- [ ] **Step 3: Create ReportsClient**

Create `src/app/(app)/reports/ReportsClient.tsx`:

```typescript
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Download, BarChart2 } from "lucide-react";

interface StatusCount { status: string; count: number; }

interface Props {
  from:             string;
  to:               string;
  orderCount:       number;
  totalRevenue:     number;
  statusBreakdown:  StatusCount[];
  csvUrl:           string;
}

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft", CONFIRMED: "Confirmed", IN_PRODUCTION: "In Production",
  READY: "Ready", DELIVERED: "Delivered", CANCELLED: "Cancelled",
};

export default function ReportsClient({ from: initFrom, to: initTo, orderCount, totalRevenue, statusBreakdown, csvUrl }: Props) {
  const router = useRouter();
  const [from, setFrom] = useState(initFrom);
  const [to,   setTo]   = useState(initTo);

  function applyFilter() {
    const q = from && to ? `?from=${from}&to=${to}` : "";
    router.push(`/reports${q}`);
  }

  const inp: React.CSSProperties = {
    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(245,182,30,0.14)",
    borderRadius: "0.45rem", padding: "0.6rem 0.85rem", color: "#F0EDE6", fontSize: "0.83rem", outline: "none",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Date filter */}
      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(245,182,30,0.08)", borderRadius: "0.6rem", padding: "1rem 1.25rem" }}>
        <p style={{ fontSize: "0.62rem", letterSpacing: "0.1em", color: "rgba(240,237,230,0.35)", marginBottom: "0.75rem" }}>DATE RANGE</p>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={inp} />
          <span style={{ color: "rgba(240,237,230,0.3)", fontSize: "0.8rem" }}>to</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={inp} />
          <button onClick={applyFilter} style={{ padding: "0.6rem 1.25rem", background: "rgba(245,182,30,0.12)", border: "1px solid rgba(245,182,30,0.25)", borderRadius: "0.45rem", color: "#F5B61E", fontSize: "0.72rem", letterSpacing: "0.07em", cursor: "pointer" }}>
            APPLY
          </button>
          <a href={csvUrl} style={{ display: "flex", alignItems: "center", gap: "0.35rem", padding: "0.6rem 1.1rem", background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: "0.45rem", color: "#4ADE80", fontSize: "0.72rem", letterSpacing: "0.07em", textDecoration: "none" }}>
            <Download size={13} /> EXPORT CSV
          </a>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(245,182,30,0.08)", borderRadius: "0.6rem", padding: "1.1rem 1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
            <BarChart2 size={14} color="rgba(240,237,230,0.35)" />
            <span style={{ fontSize: "0.6rem", letterSpacing: "0.1em", color: "rgba(240,237,230,0.35)" }}>TOTAL ORDERS</span>
          </div>
          <p style={{ fontSize: "2rem", fontWeight: 800, color: "#F0EDE6", letterSpacing: "-0.02em" }}>{orderCount}</p>
        </div>
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(245,182,30,0.08)", borderRadius: "0.6rem", padding: "1.1rem 1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
            <span style={{ fontSize: "0.6rem", letterSpacing: "0.1em", color: "rgba(240,237,230,0.35)" }}>TOTAL REVENUE</span>
          </div>
          <p style={{ fontSize: "2rem", fontWeight: 800, color: "#F5B61E", letterSpacing: "-0.02em" }}>Rs. {totalRevenue.toLocaleString()}</p>
        </div>
      </div>

      {/* Status breakdown */}
      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(245,182,30,0.08)", borderRadius: "0.6rem", padding: "1rem 1.25rem" }}>
        <p style={{ fontSize: "0.62rem", letterSpacing: "0.1em", color: "rgba(240,237,230,0.35)", marginBottom: "0.75rem" }}>ORDERS BY STATUS</p>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          {statusBreakdown.map((s) => (
            <div key={s.status} style={{ padding: "0.6rem 1rem", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(245,182,30,0.07)", borderRadius: "0.45rem", textAlign: "center" }}>
              <p style={{ fontSize: "1.15rem", fontWeight: 700, color: "#F0EDE6" }}>{s.count}</p>
              <p style={{ fontSize: "0.6rem", color: "rgba(240,237,230,0.35)", letterSpacing: "0.06em" }}>{STATUS_LABEL[s.status] ?? s.status}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Add admin links to sidebar**

In `src/components/layout/Sidebar.tsx`, add admin nav group with links to /users, /settings/lead-sources, /reports:

```typescript
// In the adminNav array (if it exists), or create one:
{ href: "/users",                    label: "Users",         icon: Users   },
{ href: "/settings/lead-sources",   label: "Lead Sources",  icon: Radio   },
{ href: "/reports",                 label: "Reports",        icon: FileText },
```

Render this nav group only if `session.user.role === "ADMIN"`.

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 6: Manual test**

```bash
npm run dev
```

1. Navigate to `/reports`
2. Total orders and revenue display (all time by default)
3. Set date range → click APPLY → stats update
4. Click EXPORT CSV → CSV file downloads with correct columns
5. CSV contains correct rows when date range is applied
6. Navigate to `/settings/lead-sources` → add "TikTok" → appears in list
7. Go to New Order → lead source dropdown includes "TikTok"

- [ ] **Step 7: Commit**

```bash
git add src/app/(app)/reports/ src/app/api/reports/ src/components/layout/Sidebar.tsx
git commit -m "feat: reports page with date filter and CSV export; admin sidebar links"
```
