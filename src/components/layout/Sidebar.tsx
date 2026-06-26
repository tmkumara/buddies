"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  LayoutDashboard, Package, Users, BoxSelect, Archive, UserCog, Factory, Radio, FileText,
} from "lucide-react";

const mainNav = [
  { label: "Dashboard",  href: "/dashboard",    icon: LayoutDashboard },
  { label: "Orders",     href: "/orders",       icon: Package },
  { label: "Production", href: "/production",   icon: Factory },
  { label: "Customers",  href: "/customers",    icon: Users },
];

const catalogNav = [
  { label: "Designs",   href: "/designs",   icon: BoxSelect },
  { label: "Materials", href: "/materials", icon: Archive },
];

const adminNav = [
  { label: "Users",        href: "/users",                 icon: UserCog  },
  { label: "Lead Sources", href: "/settings/lead-sources", icon: Radio    },
  { label: "Reports",      href: "/reports",               icon: FileText },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  const active = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname.startsWith(href);

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <Image src="/buddiesicon.png" alt="Buddies" width={28} height={28} className="object-contain" />
        <span style={{ fontSize: "0.95rem", letterSpacing: "0.28em", color: "#F5B61E", fontWeight: 700 }}>
          BUDDIES
        </span>
      </div>

      <nav>
        <p className="sidebar-section-label">MAIN MENU</p>
        {mainNav.map(({ label, href, icon: Icon }) => (
          <Link key={href} href={href} className={`sidebar-item${active(href) ? " sidebar-item-active" : ""}`}>
            <Icon size={15} strokeWidth={1.8} />
            {label}
          </Link>
        ))}
      </nav>

      <nav>
        <p className="sidebar-section-label">CATALOG</p>
        {catalogNav.map(({ label, href, icon: Icon }) => (
          <Link key={href} href={href} className={`sidebar-item${active(href) ? " sidebar-item-active" : ""}`}>
            <Icon size={15} strokeWidth={1.8} />
            {label}
          </Link>
        ))}
      </nav>

      {isAdmin && (
        <nav>
          <p className="sidebar-section-label">ADMIN</p>
          {adminNav.map(({ label, href, icon: Icon }) => (
            <Link key={href} href={href} className={`sidebar-item${active(href) ? " sidebar-item-active" : ""}`}>
              <Icon size={15} strokeWidth={1.8} />
              {label}
            </Link>
          ))}
        </nav>
      )}

      <div style={{ marginTop: "auto", padding: "0.75rem 1.1rem", borderTop: "1px solid rgba(245,182,30,0.07)" }}>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          style={{
            display: "flex", alignItems: "center", gap: "0.5rem", width: "100%",
            padding: "0.55rem 0", background: "none", border: "none", cursor: "pointer",
            textAlign: "left", fontSize: "0.65rem", letterSpacing: "0.1em",
            color: "rgba(240,237,230,0.25)", transition: "color 0.2s ease",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#F87171"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(240,237,230,0.25)"; }}
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
            <path d="M5 2H2a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h3M9 9.5l3-3-3-3M12 6.5H5"
              stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          SIGN OUT
        </button>
      </div>
    </aside>
  );
}
