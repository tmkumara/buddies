"use client";

export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inv-btn inv-btn-print"
    >
      🖨 Print
    </button>
  );
}
