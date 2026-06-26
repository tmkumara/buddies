"use client";

import { useState, useRef, useEffect, useId } from "react";
import { ChevronDown, Check, Search } from "lucide-react";

export interface ComboboxOption {
  value: string | number;
  label: string;
  meta?: string;
}

export interface ComboboxProps {
  name: string;
  options: ComboboxOption[];
  defaultValue?: string | number;
  value?: string | number;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  onChange?: (value: string | number) => void;
}

export default function Combobox({
  name, options, defaultValue, value: controlledValue,
  placeholder = "— Search or select —",
  required, disabled, onChange,
}: ComboboxProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | number>(controlledValue ?? defaultValue ?? "");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (controlledValue !== undefined) setSelected(controlledValue);
  }, [controlledValue]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => searchRef.current?.focus(), 40);
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => { clearTimeout(t); document.removeEventListener("mousedown", handleOutside); };
  }, [open]);

  const filtered = query
    ? options.filter(
        (o) =>
          o.label.toLowerCase().includes(query.toLowerCase()) ||
          (o.meta ?? "").toLowerCase().includes(query.toLowerCase())
      )
    : options;

  function handleSelect(opt: ComboboxOption) {
    setSelected(opt.value);
    setOpen(false);
    setQuery("");
    onChange?.(opt.value);
  }

  const selectedLabel = options.find((o) => String(o.value) === String(selected))?.label;

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%" }}>
      <input type="hidden" name={name} value={selected} required={required} />

      <button
        id={id}
        type="button"
        role="combobox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.5rem",
          background: open ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.04)",
          border: `1px solid ${open ? "rgba(245,182,30,0.5)" : "rgba(245,182,30,0.14)"}`,
          borderRadius: open ? "0.5rem 0.5rem 0 0" : "0.5rem",
          padding: "0.75rem 1rem",
          color: selectedLabel ? "#F0EDE6" : "rgba(240,237,230,0.2)",
          fontSize: "0.875rem",
          fontFamily: "var(--font-jakarta, 'Plus Jakarta Sans', sans-serif)",
          cursor: disabled ? "not-allowed" : "pointer",
          outline: "none",
          textAlign: "left",
          boxShadow: open ? "0 0 0 3px rgba(245,182,30,0.07)" : "none",
          transition: "border-color 0.2s ease, background 0.2s ease",
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {selectedLabel ?? placeholder}
        </span>
        <ChevronDown
          size={14}
          style={{
            flexShrink: 0,
            color: open ? "#F5B61E" : "rgba(240,237,230,0.28)",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease, color 0.2s ease",
          }}
        />
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0, zIndex: 200,
          background: "#0d0d0d",
          border: "1px solid rgba(245,182,30,0.28)",
          borderTop: "1px solid rgba(245,182,30,0.08)",
          borderRadius: "0 0 0.5rem 0.5rem",
          boxShadow: "0 16px 48px rgba(0,0,0,0.75)",
        }}>
          <div style={{ padding: "0.45rem 0.75rem", borderBottom: "1px solid rgba(245,182,30,0.08)", display: "flex", alignItems: "center", gap: "0.45rem" }}>
            <Search size={11} style={{ color: "rgba(240,237,230,0.22)", flexShrink: 0 }} />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                color: "#F0EDE6",
                fontSize: "0.78rem",
                fontFamily: "var(--font-jakarta, 'Plus Jakarta Sans', sans-serif)",
              }}
            />
          </div>
          <ul role="listbox" style={{
            maxHeight: "220px", overflowY: "auto", listStyle: "none", margin: 0, padding: "0.25rem 0",
            scrollbarWidth: "thin", scrollbarColor: "rgba(245,182,30,0.2) transparent",
          }}>
            {filtered.map((opt) => {
              const isSel = String(opt.value) === String(selected);
              return (
                <li
                  key={opt.value}
                  role="option"
                  aria-selected={isSel}
                  onClick={() => handleSelect(opt)}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "0.55rem 1rem", fontSize: "0.82rem", cursor: "pointer",
                    color: isSel ? "#F5B61E" : "rgba(240,237,230,0.62)",
                    background: isSel ? "rgba(245,182,30,0.1)" : "transparent",
                    borderLeft: isSel ? "2px solid #F5B61E" : "2px solid transparent",
                    transition: "background 0.12s ease",
                    fontFamily: "var(--font-jakarta, 'Plus Jakarta Sans', sans-serif)",
                  }}
                  onMouseEnter={(e) => { if (!isSel) { (e.currentTarget as HTMLElement).style.background = "rgba(245,182,30,0.06)"; (e.currentTarget as HTMLElement).style.color = "rgba(240,237,230,0.9)"; } }}
                  onMouseLeave={(e) => { if (!isSel) { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "rgba(240,237,230,0.62)"; } }}
                >
                  <span>
                    {opt.label}
                    {opt.meta && <span style={{ marginLeft: "0.4rem", fontSize: "0.7rem", color: "rgba(240,237,230,0.28)" }}>{opt.meta}</span>}
                  </span>
                  {isSel && <Check size={11} style={{ color: "#F5B61E", flexShrink: 0 }} />}
                </li>
              );
            })}
            {filtered.length === 0 && (
              <li style={{ padding: "0.7rem 1rem", fontSize: "0.76rem", color: "rgba(240,237,230,0.22)", fontStyle: "italic" }}>
                No results for "{query}"
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
