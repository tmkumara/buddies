"use client";

import { signOut } from "next-auth/react";

export default function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="sign-out-btn"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        width: "100%",
        padding: "0.55rem 0",
        background: "none",
        border: "none",
        cursor: "pointer",
        textAlign: "left",
        fontSize: "0.65rem",
        letterSpacing: "0.1em",
        color: "rgba(240, 237, 230, 0.25)",
        transition: "color 0.2s ease",
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#F87171"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(240, 237, 230, 0.25)"; }}
    >
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
        <path d="M5 2H2a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h3M9 9.5l3-3-3-3M12 6.5H5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      SIGN OUT
    </button>
  );
}
