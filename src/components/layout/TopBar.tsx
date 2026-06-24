"use client";

import { useSession } from "next-auth/react";
import { Bell, ChevronDown } from "lucide-react";

export default function TopBar({ title }: { title: string }) {
  const { data: session } = useSession();
  const username = session?.user?.username ?? "User";
  const initial = username[0]?.toUpperCase() ?? "U";

  return (
    <header className="dash-topbar">
      <h1 style={{ fontSize: "1.6rem", fontWeight: 700, color: "#F0EDE6", letterSpacing: "0.02em" }}>
        {title}
      </h1>

      <div className="flex items-center gap-4">
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

        <div style={{
          display: "flex", alignItems: "center", gap: "0.6rem",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(245,182,30,0.14)",
          borderRadius: "2rem",
          padding: "0.35rem 0.75rem 0.35rem 0.35rem",
          cursor: "pointer",
        }}>
          <div style={{
            width: "28px", height: "28px", borderRadius: "50%",
            background: "linear-gradient(135deg, #D4920A, #F5B61E)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "0.7rem", fontWeight: 700, color: "#080808",
          }}>
            {initial}
          </div>
          <span style={{ fontSize: "0.74rem", color: "rgba(240,237,230,0.6)" }}>{username}</span>
          <ChevronDown size={12} style={{ color: "rgba(240,237,230,0.35)" }} />
        </div>
      </div>
    </header>
  );
}
