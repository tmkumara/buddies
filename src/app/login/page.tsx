"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, FormEvent } from "react";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!username || !password) {
      setError("Please enter your username and password.");
      return;
    }
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      username,
      password,
      redirect: false,
      callbackUrl: "/dashboard",
    });

    if (result?.error) {
      setError("Invalid username or password.");
      setLoading(false);
      return;
    }

    window.location.href = result?.url ?? "/dashboard";
  }

  return (
    <div
      className="relative overflow-hidden min-h-screen flex flex-col"
      style={{ background: "#080808" }}
    >
      {/* ── Orbital SVG background ──────────────────────── */}
      <svg
        aria-hidden="true"
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 1000 1000"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id="lg-centerGlow" cx="50%" cy="50%" r="45%">
            <stop offset="0%" stopColor="#F5B61E" stopOpacity="0.1" />
            <stop offset="60%" stopColor="#F5B61E" stopOpacity="0.02" />
            <stop offset="100%" stopColor="#080808" stopOpacity="0" />
          </radialGradient>
          <filter id="lg-goldGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="lg-dotGlow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="7" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <ellipse cx="500" cy="500" rx="500" ry="500" fill="url(#lg-centerGlow)" />

        <g className="ring-outer">
          <circle cx="500" cy="500" r="440" fill="none" stroke="#F5B61E" strokeWidth="0.5" strokeOpacity="0.16" strokeDasharray="14 52" />
          <circle cx="500" cy="60" r="3" fill="#F5B61E" opacity="0.35" />
        </g>

        <g className="ring-mid">
          <circle cx="500" cy="500" r="305" fill="none" stroke="#F5B61E" strokeWidth="0.8" strokeOpacity="0.1" strokeDasharray="28 80" />
          <circle cx="500" cy="195" r="4.5" fill="#FFD960" opacity="0.9" filter="url(#lg-dotGlow)" />
        </g>

        <g className="ring-inner">
          <path
            d="M 500 340 A 160 160 0 1 1 340 500"
            fill="none"
            stroke="#F5B61E"
            strokeWidth="2"
            strokeLinecap="round"
            strokeOpacity="0.6"
            strokeDasharray="220 800"
            filter="url(#lg-goldGlow)"
          />
        </g>

        <circle className="particle-a" cx="280" cy="660" r="1.5" fill="#F5B61E" opacity="0.5" />
        <circle className="particle-c" cx="720" cy="700" r="1.5" fill="#FFD960" opacity="0.45" />
        <circle className="particle-e" cx="400" cy="580" r="1"   fill="#F5B61E" opacity="0.4" />
      </svg>

      {/* ── Content ──────────────────────────────────────── */}
      <div className="relative z-10 flex-1 flex flex-col">

        {/* Minimal header */}
        <header
          className="flex items-center px-8 py-5"
          style={{ borderBottom: "1px solid rgba(245, 182, 30, 0.08)" }}
        >
          <Link href="/" className="flex items-center gap-3">
            <Image src="/buddiesicon.png" alt="Buddies" width={26} height={26} className="object-contain" />
            <span style={{
              fontSize: "0.95rem",
              letterSpacing: "0.32em",
              color: "#F5B61E",
              fontWeight: 700,
            }}>
              BUDDIES
            </span>
            <span style={{
              fontSize: "0.58rem",
              letterSpacing: "0.14em",
              color: "rgba(240, 237, 230, 0.2)",
              borderLeft: "1px solid rgba(245, 182, 30, 0.15)",
              paddingLeft: "0.7rem",
            }}>
              OMS
            </span>
          </Link>
        </header>

        {/* Login card */}
        <main className="flex-1 flex items-center justify-center px-6 py-12">
          <div
            className="glass-card hero-entry rounded-2xl w-full"
            style={{ maxWidth: "400px", padding: "2.75rem 2.25rem" }}
          >
            {/* Logo */}
            <div className="flex justify-center mb-5">
              <Image
                src="/buddiesicon.png"
                alt="Buddies emblem"
                width={68}
                height={68}
                className="object-contain logo-emblem"
                priority
              />
            </div>

            {/* Heading */}
            <h1 style={{
              fontSize: "2rem",
              fontWeight: 700,
              color: "#F5B61E",
              letterSpacing: "0.08em",
              margin: "0 0 0.3rem",
              textAlign: "center",
              lineHeight: 1,
            }}>
              Welcome Back
            </h1>
            <p style={{
              fontSize: "0.7rem",
              color: "rgba(240, 237, 230, 0.35)",
              textAlign: "center",
              letterSpacing: "0.08em",
              marginBottom: "1.5rem",
            }}>
              SIGN IN TO BUDDIES OMS
            </p>

            <div className="gold-divider mb-6" />

            {/* Error */}
            {error && (
              <div className="form-error mb-5">{error}</div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>

              <div className="form-field">
                <label htmlFor="username" className="form-label">USERNAME</label>
                <input
                  id="username"
                  type="text"
                  className="form-input"
                  placeholder="your-username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                  autoCapitalize="none"
                />
              </div>

              <div className="form-field">
                <label htmlFor="password" className="form-label">PASSWORD</label>
                <div style={{ position: "relative" }}>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    className="form-input"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    style={{ paddingRight: "3rem" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    style={{
                      position: "absolute",
                      right: "0.85rem",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "rgba(240, 237, 230, 0.28)",
                      padding: "0.2rem",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    {showPassword ? (
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                        <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.2" />
                        <path d="M2 2l12 12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                        <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.2" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="submit-btn"
                disabled={loading}
              >
                {loading ? "SIGNING IN…" : "SIGN IN"}
              </button>
            </form>

            {/* Back link */}
            <p style={{
              marginTop: "1.5rem",
              textAlign: "center",
              fontSize: "0.65rem",
            }}>
              <Link href="/" className="nav-link" style={{ fontSize: "0.65rem" }}>
                ← Back to home
              </Link>
            </p>
          </div>
        </main>

        {/* Footer */}
        <footer
          className="flex items-center justify-center py-4"
          style={{
            borderTop: "1px solid rgba(245, 182, 30, 0.06)",
            fontSize: "0.6rem",
            letterSpacing: "0.07em",
            color: "rgba(240, 237, 230, 0.14)",
          }}
        >
          © 2026 Buddies · Your Vision, Our Mission
        </footer>
      </div>
    </div>
  );
}
