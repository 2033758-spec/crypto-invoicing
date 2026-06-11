"use client";

import { useLocale, useTranslations } from "next-intl";

const BASE_RAILS = [
  { dot: "#2775CA", label: "USDC · Circle" },
  { dot: "#0052FF", label: "Base · Coinbase L2" },
  { dot: "#F0B90B", label: "Binance P2P" },
  { dot: "#F7A600", label: "Bybit" },
  { dot: "#0073e6", label: "CriptoYa" },
  { dot: "#86f7d1", label: "Safe Multisig" },
  { dot: "#fa6400", label: "Sumsub KYC" },
];

// B19: the tax-rail is locale-specific. AFIP/ARCA is Argentina; on /pt-BR
// (conversion-only beta) it's irrelevant and misleading — show the Pix rail.
function railsFor(locale: string) {
  const taxRail =
    locale === "pt-BR"
      ? { dot: "#32BCAD", label: "Pix · BCB" }
      : { dot: "#bccac2", label: "AFIP · ARCA" };
  return [...BASE_RAILS, taxRail];
}

/**
 * Marquee — endless horizontal rail of payment-stack logos with colored dots.
 * CSS-only animation (see globals.css `@keyframes marquee`), pause on hover,
 * masked fade-in/out on left/right edges.
 */
export default function Marquee() {
  const t = useTranslations("marquee");
  const locale = useLocale();
  const RAILS = railsFor(locale);

  return (
    <section
      className="py-10 border-t border-b overflow-hidden"
      style={{
        borderTopColor: "var(--outline-hairline)",
        borderBottomColor: "var(--outline-hairline)",
        background: "var(--surface-container-lowest)",
      }}
    >
      <div className="shell">
        <div
          className="font-mono text-[11px] uppercase text-on-surface-placeholder text-center mb-6"
          style={{ letterSpacing: "0.1em" }}
        >
          {t("meta")}
        </div>
        <div
          className="marquee"
          style={{
            overflow: "hidden",
            maskImage:
              "linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent)",
            WebkitMaskImage:
              "linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent)",
          }}
        >
          <div className="marquee-track">
            {/* doubled for seamless loop */}
            {RAILS.concat(RAILS).map((r, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-3 font-display font-medium text-[18px] text-on-surface-variant whitespace-nowrap"
              >
                <span
                  className="inline-block w-[9px] h-[9px] rounded-full"
                  style={{ background: r.dot }}
                />
                {r.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
