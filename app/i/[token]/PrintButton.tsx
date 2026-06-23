"use client";

// "Descargar PDF" — triggers the browser's print dialog (→ Save as PDF). The
// page has a print stylesheet (globals.css @media print) that flips the invoice
// to a clean light layout and hides interactive chrome (.no-print).
export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-print inline-flex items-center gap-2 rounded border border-outline-variant px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest text-on-surface-variant hover:text-on-surface hover:border-primary/60 transition-colors"
    >
      ↓ Descargar PDF
    </button>
  );
}
