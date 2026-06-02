import { ImageResponse } from "next/og";

// Open Graph image — generated per-locale at edge. 1200×630 (Twitter +
// Facebook + LinkedIn + WhatsApp standard). Jade-on-slate template matching
// the Crypto Invoicing brand (Terminal Core, Industrial Slate canvas).

export const runtime = "edge";
export const alt = "Crypto Invoicing — USDC invoicing for LATAM freelancers";
export const size = { width: 1200, height: 630 } as const;
export const contentType = "image/png";

type Locale = "es-AR" | "pt-BR" | "en-US";

const COPY: Record<Locale, { eyebrow: string; title: string; sub: string }> = {
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

export default async function Image({
  params,
}: {
  params: { locale: string };
}) {
  const locale = (
    ["es-AR", "pt-BR", "en-US"].includes(params.locale)
      ? params.locale
      : "es-AR"
  ) as Locale;
  const copy = COPY[locale];

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
              cryptoinvoicing.com
            </span>
          </div>
          <span style={{ color: "#69dab6", letterSpacing: 2 }}>
            BUENOS AIRES · LATAM
          </span>
        </div>
      </div>
    ),
    size,
  );
}
