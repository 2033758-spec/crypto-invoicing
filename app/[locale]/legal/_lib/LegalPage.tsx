import Link from "next/link";
import { getTranslations } from "next-intl/server";
import Header from "../../_components/landing-v3/Header";
import Footer from "../../_components/landing-v3/Footer";
import Seams from "../../_components/landing-v3/Seams";
import { loadLegalDoc, type LegalSlug } from "./loadLegalDoc";

// Shared layout for /legal/{terms,privacy,cookies}. Renders:
//   1. Header (sticky)
//   2. Draft banner (always — until W11 lawyer redline closes)
//   3. PT-fallback banner (only for pt-BR users on terms/privacy)
//   4. Document body
//   5. Footer

interface Props {
  locale: string;
  slug: LegalSlug;
}

export default async function LegalPage({ locale, slug }: Props) {
  const [doc, langT] = await Promise.all([
    loadLegalDoc(slug, locale),
    getTranslations({ locale, namespace: "legalLanguageBanner" }),
  ]);

  return (
    <>
      <Seams />
      <Header locale={locale} />

      <main className="relative isolate py-16 lg:py-24">
        <div className="shell">
          <div className="max-w-[760px] mx-auto">
            {/* English-only notice for non-EN locales (founder decision
                2026-05-27: legal docs in EN until W11 lawyer redline).
                Draft-banner was removed 2026-05-28 by founder request — the
                legal copy itself is responsible enough not to need a top
                sentinel block. */}
            {doc.englishOnlyFallback && (
              <div
                className="rounded-lg border p-5 mb-8"
                style={{
                  borderColor: "var(--primary)",
                  background: "rgba(105, 218, 182, 0.06)",
                }}
              >
                <p
                  className="font-mono text-[10px] uppercase mb-2"
                  style={{
                    letterSpacing: "0.12em",
                    color: "var(--primary)",
                  }}
                >
                  {langT("title")}
                </p>
                <p
                  className="text-on-surface-variant m-0"
                  style={{ fontSize: "13px", lineHeight: 1.55 }}
                >
                  {langT("body")}
                </p>
              </div>
            )}

            <article
              className="legal-doc text-on-surface"
              dangerouslySetInnerHTML={{ __html: doc.html }}
            />

            <p
              className="mt-12 pt-8 border-t font-mono text-[11px] text-on-surface-placeholder"
              style={{ borderTopColor: "var(--outline-variant)" }}
            >
              <Link
                href={locale === "es-AR" ? "/" : `/${locale}`}
                className="underline hover:text-on-surface"
              >
                ← Crypto Invoicing
              </Link>
              {" · "}
              hola@cryptoinvoicing.co
            </p>
          </div>
        </div>
      </main>

      <Footer locale={locale} />
    </>
  );
}
