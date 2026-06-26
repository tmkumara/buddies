"use client";

import { useState, FormEvent } from "react";
import { X } from "lucide-react";
import { createUser, updateUser } from "@/actions/users";

interface UserRow { id: number; username: string; role: string; active: boolean; createdAt: string; }
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
    if ("error" in result) { setError(result.error ?? "An error occurred"); return; }
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

          <div><label style={lbl}>USERNAME *</label><input name="username" required defaultValue={editing?.username} style={inp} /></div>

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
