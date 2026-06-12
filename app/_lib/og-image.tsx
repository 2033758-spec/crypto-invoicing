import { ImageResponse } from "next/og";

// Shared Open Graph image renderer. 1200×630 (Twitter + Facebook + LinkedIn +
// WhatsApp standard). Jade-on-slate template matching the Crypto Invoicing brand
// (Terminal Core, Industrial Slate canvas).
//
// Two routes consume this:
//   - app/opengraph-image.tsx          → /opengraph-image       (default es-AR)
//   - app/[locale]/opengraph-image.tsx → /pt-BR|/en-US/opengraph-image
//
// Why a root-level route exists: next-intl's `localePrefix: "as-needed"` strips
// the default-locale prefix, so /es-AR/opengraph-image 307-redirects to
// /opengraph-image — which previously had no route and 404'd. Every social/AI
// share of the home (es-AR) therefore had a broken preview (SEO audit
// 2026-06-11, finding #2). A root route makes /opengraph-image resolve; the
// [locale] route still serves the non-default locales (no stripping there).

export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_CONTENT_TYPE = "image/png";
export const OG_ALT =
  "Crypto Invoicing — USDC invoicing for LATAM freelancers";

export type OgLocale = "es-AR" | "pt-BR" | "en-US";

const COPY: Record<OgLocale, { eyebrow: string; title: string; sub: string }> = {
  "es-AR": {
    eyebrow: "CRYPTO INVOICING",
    title: "Cobrá del exterior. En blanco. Sin perder 4%.",
    sub: "USDC · factura E · AFIP / RG 5642 listo",
  },
  "pt-BR": {
    eyebrow: "CRYPTO INVOICING",
    title: "Receba do exterior em USDC. Sem perder 4%.",
    sub: "USDC · conversão USDC→BRL · Receita-aware [BETA]",
  },
  "en-US": {
    eyebrow: "CRYPTO INVOICING",
    title: "Get paid from abroad. Legal. Without losing 4%.",
    sub: "USDC · tax-ready PDFs · non-custodial",
  },
};

export function normalizeOgLocale(locale: string | undefined): OgLocale {
  return (["es-AR", "pt-BR", "en-US"].includes(locale ?? "")
    ? locale
    : "es-AR") as OgLocale;
}

export function renderOgImage(locale: string | undefined): ImageResponse {
  const copy = COPY[normalizeOgLocale(locale)];

  // Jade-on-slate template. Inline styles only (next/og constraints).
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background:
            "linear-gradient(135deg, #0a0f0d 0%, #0f1513 55%, #171d1b 100%)",
          color: "#dee4e0",
          fontFamily: "system-ui, -apple-system, sans-serif",
          position: "relative",
        }}
      >
        {/* Top row: eyebrow */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontSize: 22,
            letterSpacing: 4,
            color: "#69dab6",
            textTransform: "uppercase",
            fontWeight: 500,
          }}
        >
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: 12,
              background: "#69dab6",
              boxShadow: "0 0 24px #69dab6",
            }}
          />
          {copy.eyebrow}
        </div>

        {/* Middle: H1 */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 28,
            maxWidth: 1040,
          }}
        >
          <div
            style={{
              fontSize: 78,
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: -2.6,
              color: "#dee4e0",
              display: "flex",
            }}
          >
            {copy.title}
          </div>
          <div
            style={{
              fontSize: 32,
              fontWeight: 400,
              lineHeight: 1.4,
              color: "#bccac2",
              display: "flex",
            }}
          >
            {copy.sub}
          </div>
        </div>

        {/* Bottom row: brand + accent line */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: "1px solid #3d4944",
            paddingTop: 28,
            fontSize: 22,
            color: "#87948d",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                border: "1.5px solid #69dab6",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#69dab6",
                fontWeight: 700,
                fontSize: 16,
              }}
            >
              CI
            </div>
            <span style={{ color: "#dee4e0", fontWeight: 500 }}>
              cryptoinvoicing.co
            </span>
          </div>
          <span style={{ color: "#69dab6", letterSpacing: 2 }}>
            BUENOS AIRES · LATAM
          </span>
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
