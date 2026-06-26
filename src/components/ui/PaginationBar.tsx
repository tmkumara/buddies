"use client";

import { useRouter } from "next/navigation";

interface PaginationBarProps {
  total: number;
  page: number;
  size: number;
  currentParams: Record<string, string>;
}

const SIZES = [20, 50, 100];

export default function PaginationBar({ total, page, size, currentParams }: PaginationBarProps) {
  const router = useRouter();

  if (total === 0) return null;

  const totalPages = Math.ceil(total / size);
  const showPageNav = total > size;
  const start = (page - 1) * size + 1;
  const end = Math.min(page * size, total);

  function navigate(nextPage: number, nextSize = size) {
    const params = new URLSearchParams(currentParams);
    params.set("page", String(nextPage));
    params.set("size", String(nextSize));
    router.replace(`?${params.toString()}`);
  }

  function getPages(): (number | "...")[] {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | "...")[] = [1];
    if (page > 3) pages.push("...");
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      pages.push(i);
    }
    if (page < totalPages - 2) pages.push("...");
    pages.push(totalPages);
    return pages;
  }

  const btnBase: React.CSSProperties = {
    border: "1px solid rgba(245,182,30,0.12)",
    borderRadius: "0.35rem",
    background: "transparent",
    cursor: "pointer",
    fontFamily: "var(--font-jakarta, 'Plus Jakarta Sans', sans-serif)",
  };

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      flexWrap: "wrap",
      gap: "0.75rem",
      padding: "0.75rem 0",
      marginTop: "0.5rem",
    }}>
      {/* Size selector */}
      <div style={{ display: "flex", gap: "0.25rem" }}>
        {SIZES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => navigate(1, s)}
            style={{
              ...btnBase,
              padding: "0.25rem 0.6rem",
              fontSize: "0.68rem",
              border: `1px solid ${s === size ? "rgba(245,182,30,0.5)" : "rgba(245,182,30,0.12)"}`,
              background: s === size ? "rgba(245,182,30,0.1)" : "transparent",
              color: s === size ? "#F5B61E" : "rgba(240,237,230,0.4)",
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Record count */}
      <span style={{ fontSize: "0.68rem", color: "rgba(240,237,230,0.3)" }}>
        {start}–{end} of {total}
      </span>

      {/* Page navigation */}
      {showPageNav && (
        <div style={{ display: "flex", gap: "0.2rem", alignItems: "center" }}>
          <button
            type="button"
            disabled={page === 1}
            onClick={() => navigate(page - 1)}
            style={{
              ...btnBase,
              padding: "0.25rem 0.6rem",
              fontSize: "0.72rem",
              color: page === 1 ? "rgba(240,237,230,0.18)" : "rgba(240,237,230,0.55)",
              cursor: page === 1 ? "not-allowed" : "pointer",
            }}
          >
            ‹ Prev
          </button>

          {getPages().map((p, i) =>
            p === "..." ? (
              <span key={`e${i}`} style={{ padding: "0 0.2rem", color: "rgba(240,237,230,0.25)", fontSize: "0.72rem" }}>
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => navigate(p as number)}
                style={{
                  ...btnBase,
                  padding: "0.25rem 0.55rem",
                  fontSize: "0.72rem",
                  minWidth: "2rem",
                  border: `1px solid ${p === page ? "rgba(245,182,30,0.5)" : "rgba(245,182,30,0.12)"}`,
                  background: p === page ? "rgba(245,182,30,0.1)" : "transparent",
                  color: p === page ? "#F5B61E" : "rgba(240,237,230,0.4)",
                }}
              >
                {p}
              </button>
            )
          )}

          <button
            type="button"
            disabled={page === totalPages}
            onClick={() => navigate(page + 1)}
            style={{
              ...btnBase,
              padding: "0.25rem 0.6rem",
              fontSize: "0.72rem",
              color: page === totalPages ? "rgba(240,237,230,0.18)" : "rgba(240,237,230,0.55)",
              cursor: page === totalPages ? "not-allowed" : "pointer",
            }}
          >
            Next ›
          </button>
        </div>
      )}
    </div>
  );
}
