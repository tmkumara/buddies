"use client";

import Image from "next/image";
import { useState, FormEvent } from "react";
import { useSession } from "next-auth/react";
import { changePassword } from "@/actions/auth";

export default function ChangePasswordPage() {
  const { update } = useSession();
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (newPw.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (newPw !== confirmPw) {
      setError("Passwords do not match.");
      return;
    }
    if (newPw === currentPw) {
      setError("New password must differ from current password.");
      return;
    }

    setLoading(true);
    setError("");

    const result = await changePassword(currentPw, newPw);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    // Refresh JWT so mustChangePassword becomes false
    await update({ mustChangePassword: false });
    window.location.href = "/dashboard";
  }

  return (
    <div
      className="relative overflow-hidden min-h-screen flex items-center justify-center"
      style={{ background: "#080808" }}
    >
      {/* Ambient glow */}
      <div style={{
        position: "absolute",
        inset: 0,
        background: "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(245,182,30,0.06) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      <div className="relative z-10 w-full px-6" style={{ maxWidth: "420px" }}>
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <Image src="/buddiesicon.png" alt="Buddies" width={52} height={52} className="object-contain mb-3" />
          <span style={{ fontSize: "0.8rem", letterSpacing: "0.28em", color: "#F5B61E", fontWeight: 700 }}>
            BUDDIES OMS
          </span>
        </div>

        <div className="glass-card rounded-2xl" style={{ padding: "2.5rem 2.25rem" }}>
          <h1 style={{
            fontSize: "1.35rem",
            fontWeight: 700,
            color: "#F0EDE6",
            letterSpacing: "0.04em",
            marginBottom: "0.4rem",
          }}>
            Change Password
          </h1>
          <p style={{
            fontSize: "0.68rem",
            color: "rgba(240,237,230,0.35)",
            letterSpacing: "0.06em",
            marginBottom: "1.75rem",
          }}>
            YOU MUST SET A NEW PASSWORD BEFORE CONTINUING
          </p>

          <div className="gold-divider mb-6" />

          {error && <div className="form-error mb-5">{error}</div>}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            <div className="form-field">
              <label htmlFor="currentPw" className="form-label">CURRENT PASSWORD</label>
              <input
                id="currentPw"
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            <div className="form-field">
              <label htmlFor="newPw" className="form-label">NEW PASSWORD</label>
              <input
                id="newPw"
                type="password"
                className="form-input"
                placeholder="Min. 8 characters"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                required
                autoComplete="new-password"
                minLength={8}
              />
            </div>

            <div className="form-field">
              <label htmlFor="confirmPw" className="form-label">CONFIRM NEW PASSWORD</label>
              <input
                id="confirmPw"
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              className="submit-btn"
              disabled={loading}
              style={{ marginTop: "0.5rem" }}
            >
              {loading ? "UPDATING…" : "SET NEW PASSWORD"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
