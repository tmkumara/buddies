"use client";

import { useState, useRef, useEffect } from "react";
import { User, Plus, Search } from "lucide-react";
import CustomerQuickCreate, { type CustomerOption } from "./CustomerQuickCreate";

interface Props {
  customers: CustomerOption[];
  value:     number | null;
  onChange:  (id: number, customer: CustomerOption) => void;
}

export default function CustomerSearchCombobox({ customers: initialCustomers, value, onChange }: Props) {
  const [customers,   setCustomers]  = useState<CustomerOption[]>(initialCustomers);
  const [query,       setQuery]      = useState("");
  const [open,        setOpen]       = useState(false);
  const [showCreate,  setShowCreate] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = customers.find((c) => c.id === value) ?? null;

  const filtered = query.length < 1 ? customers : customers.filter(
    (c) =>
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      c.phone.includes(query),
  );

  function selectCustomer(c: CustomerOption) {
    onChange(c.id, c);
    setQuery("");
    setOpen(false);
  }

  function handleCustomerCreated(c: CustomerOption) {
    setCustomers((prev) => [...prev, c]);
    selectCustomer(c);
    setShowCreate(false);
  }

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const inp: React.CSSProperties = {
    width: "100%", background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(245,182,30,0.14)", borderRadius: "0.5rem",
    padding: "0.7rem 1rem", color: "#F0EDE6", fontSize: "0.875rem", outline: "none",
    cursor: "pointer",
  };

  return (
    <>
      <div style={{ position: "relative" }}>
        {/* Trigger */}
        <div
          onClick={() => setOpen((v) => !v)}
          style={{ ...inp, display: "flex", alignItems: "center", gap: "0.5rem" }}
        >
          <User size={14} color="rgba(240,237,230,0.35)" />
          {selected
            ? <span style={{ flex: 1 }}>{selected.name} <span style={{ color: "rgba(240,237,230,0.4)", fontSize: "0.78rem" }}>({selected.phone})</span></span>
            : <span style={{ flex: 1, color: "rgba(240,237,230,0.3)" }}>— Select Customer —</span>
          }
          <span style={{ fontSize: "0.6rem", color: "rgba(240,237,230,0.3)" }}>▼</span>
        </div>

        {/* Dropdown */}
        {open && (
          <div style={{
            position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 30,
            background: "#1a1a1a", border: "1px solid rgba(245,182,30,0.2)", borderRadius: "0.5rem",
            boxShadow: "0 8px 32px rgba(0,0,0,0.6)", maxHeight: "280px", display: "flex", flexDirection: "column",
          }}>
            {/* Search input */}
            <div style={{ padding: "0.5rem", borderBottom: "1px solid rgba(245,182,30,0.08)", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", background: "rgba(255,255,255,0.04)", borderRadius: "0.35rem", padding: "0.4rem 0.6rem" }}>
                <Search size={12} color="rgba(240,237,230,0.3)" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search name or phone…"
                  style={{ background: "none", border: "none", outline: "none", color: "#F0EDE6", fontSize: "0.8rem", flex: 1 }}
                />
              </div>
            </div>
            {/* Options */}
            <div style={{ overflowY: "auto", flex: 1 }}>
              {filtered.map((c) => (
                <div
                  key={c.id}
                  onClick={() => selectCustomer(c)}
                  style={{
                    padding: "0.65rem 0.9rem", cursor: "pointer",
                    background: c.id === value ? "rgba(245,182,30,0.08)" : "transparent",
                    borderBottom: "1px solid rgba(245,182,30,0.04)",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "rgba(245,182,30,0.06)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = c.id === value ? "rgba(245,182,30,0.08)" : "transparent"; }}
                >
                  <div style={{ fontSize: "0.82rem", color: "#F0EDE6", fontWeight: 500 }}>{c.name}</div>
                  <div style={{ fontSize: "0.68rem", color: "rgba(240,237,230,0.4)" }}>{c.phone}</div>
                </div>
              ))}
              {filtered.length === 0 && (
                <div style={{ padding: "0.75rem 0.9rem", fontSize: "0.75rem", color: "rgba(240,237,230,0.3)" }}>
                  No customers match "{query}"
                </div>
              )}
              {/* Add new customer option */}
              <div
                onClick={() => { setOpen(false); setShowCreate(true); }}
                style={{
                  padding: "0.65rem 0.9rem", cursor: "pointer",
                  borderTop: "1px solid rgba(245,182,30,0.1)",
                  display: "flex", alignItems: "center", gap: "0.5rem",
                  color: "#F5B61E", fontSize: "0.78rem",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "rgba(245,182,30,0.06)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
              >
                <Plus size={13} /> Add new customer
              </div>
            </div>
          </div>
        )}
      </div>

      <CustomerQuickCreate
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={handleCustomerCreated}
      />
    </>
  );
}
