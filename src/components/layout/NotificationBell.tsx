"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Bell } from "lucide-react";
import Link from "next/link";
import { markAllNotificationsRead, markNotificationRead } from "@/actions/notifications";

interface NotificationItem {
  id:        number;
  type:      string;
  title:     string;
  body:      string;
  orderId:   number | null;
  createdAt: string;
  read:      boolean;
}

interface APIResponse {
  unreadCount:   number;
  notifications: NotificationItem[];
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr ago`;
  return `${Math.floor(h / 24)} d ago`;
}

export default function NotificationBell() {
  const [data, setData] = useState<APIResponse>({ unreadCount: 0, notifications: [] });
  const [open, setOpen] = useState(false);
  const panelRef        = useRef<HTMLDivElement>(null);

  const poll = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) setData(await res.json());
    } catch (err) { console.error("[NotificationBell] poll failed:", err); }
  }, []);

  useEffect(() => {
    poll();
    const interval = setInterval(poll, 30_000);
    const onVisibility = () => { if (!document.hidden) poll(); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [poll]);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function handleMarkAllRead() {
    await markAllNotificationsRead();
    setData((prev) => ({
      unreadCount: 0,
      notifications: prev.notifications.map((n) => ({ ...n, read: true })),
    }));
  }

  async function handleRowClick(n: NotificationItem) {
    try {
      if (!n.read) {
        await markNotificationRead(n.id);
        setData((prev) => ({
          unreadCount: Math.max(0, prev.unreadCount - 1),
          notifications: prev.notifications.map((x) => x.id === n.id ? { ...x, read: true } : x),
        }));
      }
    } finally {
      setOpen(false);
    }
  }

  const { unreadCount, notifications } = data;

  return (
    <div style={{ position: "relative" }} ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        aria-expanded={open}
        style={{
          position: "relative",
          background: open ? "rgba(245,182,30,0.12)" : "rgba(245,182,30,0.07)",
          border: "1px solid rgba(245,182,30,0.14)",
          borderRadius: "0.5rem",
          padding: "0.4rem",
          cursor: "pointer",
          color: unreadCount > 0 ? "#F5B61E" : "rgba(240,237,230,0.5)",
          display: "flex",
        }}
      >
        <Bell size={16} strokeWidth={1.5} />
        {unreadCount > 0 && (
          <span style={{
            position: "absolute", top: "-5px", right: "-5px",
            minWidth: "16px", height: "16px",
            background: "#F5B61E", borderRadius: "8px",
            fontSize: "0.58rem", fontWeight: 700, color: "#080808",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "0 3px",
          }}>
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 8px)", right: 0,
          width: "340px",
          background: "#111109",
          border: "1px solid rgba(245,182,30,0.15)",
          borderRadius: "0.65rem",
          boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
          zIndex: 1000,
          overflow: "hidden",
        }}>
          {/* Panel header */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "0.75rem 1rem",
            borderBottom: "1px solid rgba(245,182,30,0.08)",
          }}>
            <span style={{ fontSize: "0.7rem", letterSpacing: "0.1em", color: "rgba(240,237,230,0.4)" }}>
              NOTIFICATIONS
            </span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  fontSize: "0.65rem", color: "#F5B61E", padding: 0,
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notification list */}
          <div style={{ maxHeight: "380px", overflowY: "auto" }}>
            {notifications.length === 0 && (
              <p style={{
                padding: "1.5rem", textAlign: "center",
                fontSize: "0.75rem", color: "rgba(240,237,230,0.25)", margin: 0,
              }}>
                No notifications yet
              </p>
            )}
            {notifications.map((n) => {
              const rowContent = (
                <div
                  onClick={() => handleRowClick(n)}
                  style={{
                    display: "flex", gap: "0.6rem", alignItems: "flex-start",
                    padding: "0.75rem 1rem",
                    borderBottom: "1px solid rgba(245,182,30,0.05)",
                    cursor: "pointer",
                    background: n.read ? "transparent" : "rgba(245,182,30,0.03)",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.background = "rgba(245,182,30,0.06)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.background =
                      n.read ? "transparent" : "rgba(245,182,30,0.03)";
                  }}
                >
                  <div style={{
                    width: "6px", height: "6px", flexShrink: 0,
                    marginTop: "0.35rem", borderRadius: "50%",
                    background: n.read ? "transparent" : "#F5B61E",
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontSize: "0.78rem",
                      fontWeight: n.read ? 400 : 600,
                      color: n.read ? "rgba(240,237,230,0.5)" : "#F0EDE6",
                      margin: "0 0 0.15rem",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {n.title}
                    </p>
                    {n.body && (
                      <p style={{
                        fontSize: "0.72rem", color: "#7A7570",
                        margin: "0 0 0.15rem",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {n.body}
                      </p>
                    )}
                    <p style={{ fontSize: "0.67rem", color: "rgba(240,237,230,0.3)", margin: 0 }}>
                      {n.type.replace(/_/g, " ")} · {timeAgo(n.createdAt)}
                    </p>
                  </div>
                  {n.orderId && (
                    <span style={{ fontSize: "0.7rem", color: "rgba(240,237,230,0.2)", flexShrink: 0, alignSelf: "center" }}>
                      →
                    </span>
                  )}
                </div>
              );

              return n.orderId ? (
                <Link key={n.id} href={`/orders/${n.orderId}`} style={{ textDecoration: "none", display: "block" }}>
                  {rowContent}
                </Link>
              ) : (
                <div key={n.id}>{rowContent}</div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
