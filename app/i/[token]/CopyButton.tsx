"use client";

import { useState } from "react";

// Small client island for copy-to-clipboard on the otherwise-server hosted
// invoice page. Used for the USDC address, amount and reference.
export default function CopyButton({
  value,
  label = "Copiar",
}: {
  value: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* clipboard blocked — no-op */
        }
      }}
      className="no-print font-mono text-[11px] uppercase tracking-widest text-primary hover:underline whitespace-nowrap"
    >
      {copied ? "✓ Copiado" : label}
    </button>
  );
}
