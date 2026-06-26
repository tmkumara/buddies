"use client";

import { useState } from "react";
import { Plus, Pencil, ToggleLeft, ToggleRight } from "lucide-react";
import UserSlideOver from "./UserSlideOver";
import { toggleUserActive } from "@/actions/users";

interface UserRow { id: number; username: string; role: string; active: boolean; createdAt: string; }

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
              <th style={{ ...th, textAlign: "left" }}>USERNAME</th>
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
                  {u.username}
                  {u.id === currentUserId && <span style={{ fontSize: "0.55rem", marginLeft: "0.4rem", color: "rgba(240,237,230,0.35)" }}>(you)</span>}
                </td>
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
