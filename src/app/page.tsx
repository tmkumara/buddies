import Image from "next/image";

export default function Home() {
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
          <radialGradient id="centerGlow" cx="50%" cy="50%" r="45%">
            <stop offset="0%" stopColor="#F5B61E" stopOpacity="0.13" />
            <stop offset="60%" stopColor="#F5B61E" stopOpacity="0.03" />
            <stop offset="100%" stopColor="#080808" stopOpacity="0" />
          </radialGradient>
          <filter id="goldGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="dotGlow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Ambient radial glow */}
        <ellipse cx="500" cy="500" rx="500" ry="500" fill="url(#centerGlow)" />

        {/* Outer dashed ring + orbiting accent dot */}
        <g className="ring-outer">
          <circle
            cx="500" cy="500" r="440"
            fill="none"
            stroke="#F5B61E"
            strokeWidth="0.5"
            strokeOpacity="0.2"
            strokeDasharray="14 52"
          />
          <circle cx="500" cy="60" r="3.5" fill="#F5B61E" opacity="0.45" />
        </g>

        {/* Mid ring + bright orbiting dot */}
        <g className="ring-mid">
          <circle
            cx="500" cy="500" r="305"
            fill="none"
            stroke="#F5B61E"
            strokeWidth="0.8"
            strokeOpacity="0.14"
            strokeDasharray="28 80"
          />
          <circle
            cx="500" cy="195"
            r="5"
            fill="#FFD960"
            opacity="0.95"
            filter="url(#dotGlow)"
          />
        </g>

        {/* Inner arc comet — the signature golden sweep */}
        <g className="ring-inner">
          <path
            d="M 500 340 A 160 160 0 1 1 340 500"
            fill="none"
            stroke="#F5B61E"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeOpacity="0.72"
            strokeDasharray="230 800"
            filter="url(#goldGlow)"
          />
        </g>

        {/* Floating gold particles */}
        <circle className="particle-a" cx="310" cy="640" r="2"   fill="#F5B61E"  opacity="0.6" />
        <circle className="particle-b" cx="692" cy="590" r="1.5" fill="#FFD960"  opacity="0.5" />
        <circle className="particle-c" cx="445" cy="720" r="2"   fill="#F5B61E"  opacity="0.65" />
        <circle className="particle-d" cx="618" cy="670" r="1.5" fill="#F5B61E"  opacity="0.5" />
        <circle className="particle-e" cx="365" cy="570" r="1"   fill="#FFD960"  opacity="0.45" />
        <circle className="particle-f" cx="650" cy="730" r="2"   fill="#F5B61E"  opacity="0.55" />
      </svg>

      {/* ── Content ──────────────────────────────────────── */}
      <div className="relative z-10 flex-1 flex flex-col px-6 max-w-5xl mx-auto w-full">

        {/* Header */}
        <header
          className="flex items-center justify-between py-5"
          style={{ borderBottom: "1px solid rgba(245, 182, 30, 0.1)" }}
        >
          <div className="flex items-center gap-3">
            <Image
              src="/buddiesicon.png"
              alt="Buddies"
              width={30}
              height={30}
              className="object-contain"
            />
            <span
              style={{
                fontSize: "1rem",
                letterSpacing: "0.32em",
                color: "#F5B61E",
                fontWeight: 700,
              }}
            >
              BUDDIES
            </span>
            <span
              style={{
                fontSize: "0.6rem",
                letterSpacing: "0.14em",
                color: "rgba(240, 237, 230, 0.22)",
                borderLeft: "1px solid rgba(245, 182, 30, 0.18)",
                paddingLeft: "0.75rem",
                marginLeft: "0.15rem",
              }}
            >
              OMS
            </span>
          </div>

          <nav className="hidden sm:flex items-center gap-8">
            <a href="#" className="nav-link">DASHBOARD</a>
            <a href="#" className="nav-link">ORDERS</a>
            <a href="#" className="nav-link">REPORTS</a>
          </nav>
        </header>

        {/* Hero glass card */}
        <main className="flex-1 flex items-center justify-center py-10">
          <div
            className="glass-card hero-entry rounded-2xl text-center w-full"
            style={{ maxWidth: "420px", padding: "3rem 2.5rem" }}
          >
            {/* Logo emblem */}
            <div className="flex justify-center mb-6">
              <Image
                src="/buddiesicon.png"
                alt="Buddies emblem"
                width={110}
                height={110}
                className="object-contain logo-emblem"
                priority
              />
            </div>

            {/* Brand name */}
            <h1
              style={{
                fontSize: "2.4rem",
                fontWeight: 800,
                letterSpacing: "0.45em",
                color: "#F5B61E",
                margin: "0 0 0.4rem",
                lineHeight: 1,
              }}
            >
              BUDDIES
            </h1>

            <p
              style={{
                fontSize: "0.8rem",
                color: "rgba(240, 237, 230, 0.5)",
                margin: "0 0 1.75rem",
                letterSpacing: "0.1em",
              }}
            >
              Your Vision, Our Mission
            </p>

            <div className="gold-divider mb-6" />

            <p
              style={{
                fontSize: "0.7rem",
                color: "rgba(240, 237, 230, 0.3)",
                lineHeight: 2,
                letterSpacing: "0.1em",
                marginBottom: "2rem",
              }}
            >
              ORDER MANAGEMENT SYSTEM
              <br />
              <span style={{ color: "rgba(240, 237, 230, 0.16)", letterSpacing: "0.06em" }}>
                GIFT BOX OPERATIONS · ENTERPRISE
              </span>
            </p>

            <a href="/login" className="cta-btn">
              ENTER SYSTEM
              <svg
                width="13"
                height="13"
                viewBox="0 0 13 13"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M2 6.5H11M7.5 3L11 6.5L7.5 10"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </a>
          </div>
        </main>

        {/* Stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-6">
          {[
            { label: "Orders Today",     value: "1,247",  delta: "+12%",  cls: "stat-entry-0" },
            { label: "Fulfillment Rate", value: "98.4%",  delta: "+0.3%", cls: "stat-entry-1" },
            { label: "Revenue MTD",      value: "$84.2K", delta: "+8.1%", cls: "stat-entry-2" },
          ].map((stat) => (
            <div key={stat.label} className={`stat-card ${stat.cls}`}>
              <div
                style={{
                  fontSize: "0.62rem",
                  letterSpacing: "0.12em",
                  color: "rgba(240, 237, 230, 0.3)",
                  marginBottom: "0.5rem",
                }}
              >
                {stat.label.toUpperCase()}
              </div>
              <div
                style={{
                  fontSize: "1.7rem",
                  fontWeight: 800,
                  color: "#F5B61E",
                  lineHeight: 1,
                  marginBottom: "0.35rem",
                }}
              >
                {stat.value}
              </div>
              <div
                style={{
                  fontSize: "0.62rem",
                  color: "#4ADE80",
                  letterSpacing: "0.06em",
                }}
              >
                {stat.delta}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <footer
          className="flex items-center justify-between py-4"
          style={{
            borderTop: "1px solid rgba(245, 182, 30, 0.08)",
            fontSize: "0.62rem",
            letterSpacing: "0.07em",
            color: "rgba(240, 237, 230, 0.18)",
          }}
        >
          <span>BUDDIES OMS v1.0</span>
          <span>© 2026 Buddies · Your Vision, Our Mission</span>
        </footer>
      </div>
    </div>
  );
}
