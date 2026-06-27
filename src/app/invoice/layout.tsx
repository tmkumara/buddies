import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Invoice — Buddies Gift Box",
};

export default function InvoiceLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        #invoice-root * { box-sizing: border-box; }
        #invoice-root { background: #f3f4f6; min-height: 100vh; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1a1a1a; }
        .inv-sheet { position: relative; overflow: hidden; max-width: 780px; margin: 2rem auto; background: #fff; padding: 3rem 3.5rem; border-radius: 0.5rem; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
        @media (max-width: 600px) { .inv-sheet { margin: 0; padding: 1.5rem; border-radius: 0; } }
        .inv-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; }
        .inv-table { width: 100%; border-collapse: collapse; margin-bottom: 1.25rem; }
        .inv-table th { background: #f3f4f6; padding: 0.5rem 0.75rem; font-size: 0.7rem; letter-spacing: 0.07em; text-align: left; font-weight: 600; color: #374151; }
        .inv-table td { padding: 0.6rem 0.75rem; border-bottom: 1px solid #f3f4f6; font-size: 0.875rem; }
        .inv-tr { text-align: right; }
        .inv-label { font-size: 0.65rem; letter-spacing: 0.08em; color: #6b7280; margin-bottom: 0.25rem; text-transform: uppercase; }
        .inv-divider { height: 1px; background: #e5e7eb; margin: 1.25rem 0; }
        .inv-tot-row { display: flex; justify-content: space-between; margin-bottom: 0.35rem; font-size: 0.875rem; }
        .inv-net-row { display: flex; justify-content: space-between; border-top: 1.5px solid #1a1a1a; padding-top: 0.5rem; margin-top: 0.5rem; font-size: 1.1rem; font-weight: 700; }
        .inv-btn { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.5rem 1.25rem; border-radius: 0.375rem; font-size: 0.8rem; font-weight: 600; cursor: pointer; text-decoration: none; border: none; }
        .inv-btn-pdf { background: #1a1a1a; color: #fff; }
        .inv-btn-print { background: #f3f4f6; color: #374151; }
        @media print { .no-print { display: none !important; } .inv-sheet { box-shadow: none; margin: 0; padding: 1.5cm; } }
        .inv-watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 280px; height: 280px; opacity: 0.06; pointer-events: none; z-index: 0; }
        .inv-content { position: relative; z-index: 1; }
        .inv-footer-wrap { text-align: center; font-size: 0.7rem; color: #9ca3af; margin-top: 0.75rem; }
        .inv-footer-tagline { font-style: italic; margin-bottom: 0.15rem; }
        @media print { .inv-watermark { opacity: 0.04; } }
      `}</style>
      <div id="invoice-root">{children}</div>
    </>
  );
}
