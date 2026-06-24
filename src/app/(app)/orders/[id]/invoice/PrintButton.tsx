"use client";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      style={{
        background: "rgba(245,182,30,0.1)", border: "1px solid rgba(245,182,30,0.3)",
        borderRadius: "0.5rem", padding: "0.55rem 1.25rem",
        color: "#F5B61E", fontSize: "0.75rem", letterSpacing: "0.07em",
        cursor: "pointer", fontWeight: 600,
      }}
      className="no-print"
    >
      PRINT / SAVE PDF
    </button>
  );
}
