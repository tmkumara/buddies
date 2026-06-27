"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ShoppingCart, Package, BoxSelect, Layers, Boxes } from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard",     label: "Dashboard",    icon: LayoutDashboard },
  { href: "/orders",        label: "Orders",       icon: ShoppingCart },
  { href: "/production",    label: "Production",   icon: Package },
  { href: "/designs",       label: "Designs",      icon: BoxSelect },
  { href: "/materials",     label: "Materials",    icon: Layers },
  { href: "/stock-items",   label: "Stock Items",  icon: Boxes },
] as const;

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <>
      <style>{`
        .bottom-nav {
          display: none;
        }
        @media (max-width: 767px) {
          .bottom-nav {
            display: flex;
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            z-index: 50;
            background: rgba(10, 10, 10, 0.96);
            border-top: 1px solid rgba(245, 182, 30, 0.12);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            padding-bottom: env(safe-area-inset-bottom, 0px);
          }
        }
      `}</style>
      <nav className="bottom-nav">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? "page" : undefined}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.2rem",
                padding: "0.6rem 0.25rem",
                textDecoration: "none",
                color: isActive ? "#F5B61E" : "rgba(240,237,230,0.35)",
                transition: "color 0.15s",
                minWidth: 0,
                position: "relative",
              }}
            >
              <Icon
                size={20}
                strokeWidth={isActive ? 2.5 : 1.75}
                color={isActive ? "#F5B61E" : "rgba(240,237,230,0.35)"}
              />
              <span style={{
                fontSize: "0.55rem",
                letterSpacing: "0.06em",
                fontWeight: isActive ? 700 : 400,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: "100%",
              }}>
                {label.toUpperCase()}
              </span>
              {isActive && (
                <span style={{
                  position: "absolute",
                  top: 0,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: "32px",
                  height: "2px",
                  background: "#F5B61E",
                  borderRadius: "0 0 2px 2px",
                }} />
              )}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
