"use client";

import { useState, useRef, useEffect, useId } from "react";
import { ChevronDown, Check } from "lucide-react";

export interface SelectOption {
  value: string | number;
  label: string;
}

interface SelectProps {
  name: string;
  options: SelectOption[];
  defaultValue?: string | number;
  value?: string | number;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  onChange?: (value: string) => void;
}

export default function Select({
  name, options, defaultValue, value: controlledValue,
  placeholder = "— Select —", required, disabled, onChange,
}: SelectProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | number>(
    controlledValue ?? defaultValue ?? ""
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (controlledValue !== undefined) setSelected(controlledValue);
  }, [controlledValue]);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  useEffect(() => {
    if (open && listRef.current) {
      const active = listRef.current.querySelector("[data-selected]") as HTMLElement;
      active?.scrollIntoView({ block: "nearest" });
    }
  }, [open]);

  function handleSelect(opt: SelectOption) {
    setSelected(opt.value);
    setOpen(false);
    onChange?.(String(opt.value));
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen((v) => !v); }
    if (e.key === "Escape") setOpen(false);
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const idx = options.findIndex((o) => String(o.value) === String(selected));
      const next = e.key === "ArrowDown"
        ? Math.min(idx + 1, options.length - 1)
        : Math.max(idx - 1, 0);
      if (options[next]) handleSelect(options[next]);
    }
  }

  const selectedLabel = options.find((o) => String(o.value) === String(selected))?.label;

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%" }}>
      {/* Hidden native input so the form value submits */}
      <input type="hidden" name={name} value={selected} required={required} />

      {/* Trigger */}
      <button
        id={id}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        onKeyDown={handleKeyDown}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.5rem",
          background: open
            ? "rgba(255,255,255,0.06)"
            : "rgba(255,255,255,0.04)",
          border: `1px solid ${open ? "rgba(245,182,30,0.5)" : "rgba(245,182,30,0.14)"}`,
          borderRadius: open ? "0.5rem 0.5rem 0 0" : "0.5rem",
          padding: "0.75rem 1rem",
          color: selectedLabel ? "#F0EDE6" : "rgba(240,237,230,0.2)",
          fontSize: "0.875rem",
          fontFamily: "var(--font-jakarta, 'Plus Jakarta Sans', sans-serif)",
          cursor: disabled ? "not-allowed" : "pointer",
          outline: "none",
          textAlign: "left",
          transition: "border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease",
          boxShadow: open ? "0 0 0 3px rgba(245,182,30,0.07)" : "none",
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

      {/* Dropdown */}
      {open && (
        <ul
          ref={listRef}
          role="listbox"
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            zIndex: 200,
            background: "#0d0d0d",
            border: "1px solid rgba(245,182,30,0.28)",
            borderTop: "1px solid rgba(245,182,30,0.06)",
            borderRadius: "0 0 0.5rem 0.5rem",
            boxShadow: "0 16px 48px rgba(0,0,0,0.75), 0 0 0 1px rgba(245,182,30,0.06) inset",
            maxHeight: "240px",
            overflowY: "auto",
            listStyle: "none",
            margin: 0,
            padding: "0.3rem 0",
            scrollbarWidth: "thin",
            scrollbarColor: "rgba(245,182,30,0.2) transparent",
          }}
        >
          {options.map((opt) => {
            const isSelected = String(opt.value) === String(selected);
            return (
              <li
                key={opt.value}
                role="option"
                aria-selected={isSelected}
                data-selected={isSelected || undefined}
                onClick={() => handleSelect(opt)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.6rem 1rem",
                  fontSize: "0.82rem",
                  cursor: "pointer",
                  color: isSelected ? "#F5B61E" : "rgba(240,237,230,0.65)",
                  background: isSelected
                    ? "rgba(245,182,30,0.1)"
                    : "transparent",
                  borderLeft: isSelected
                    ? "2px solid #F5B61E"
                    : "2px solid transparent",
                  transition: "background 0.15s ease, color 0.15s ease",
                  fontFamily: "var(--font-jakarta, 'Plus Jakarta Sans', sans-serif)",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    (e.currentTarget as HTMLElement).style.background = "rgba(245,182,30,0.06)";
                    (e.currentTarget as HTMLElement).style.color = "rgba(240,237,230,0.9)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                    (e.currentTarget as HTMLElement).style.color = "rgba(240,237,230,0.65)";
                  }
                }}
              >
                <span>{opt.label}</span>
                {isSelected && <Check size={12} style={{ color: "#F5B61E", flexShrink: 0 }} />}
              </li>
            );
          })}

          {options.length === 0 && (
            <li style={{ padding: "0.75rem 1rem", fontSize: "0.78rem", color: "rgba(240,237,230,0.25)", fontStyle: "italic" }}>
              No options available
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
