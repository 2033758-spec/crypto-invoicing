import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, unstable_setRequestLocale } from "next-intl/server";
import "../globals.css";
import { isSupportedLocale, locales } from "../../i18n";
import Analytics from "./_components/Analytics";
import CookieConsent from "./_components/CookieConsent";

// Pre-render all supported locales at build time.
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

// Site origin — single source of truth for canonical, OG image URLs, hreflang.
// Configured via NEXT_PUBLIC_SITE_URL in .env (Vercel: project env var). Falls
// back to production domain so build doesn't error in fresh checkouts.
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://cryptoinvoicing.co";

function pathForLocale(locale: string): string {
  return locale === "es-AR" ? "" : `/${locale}`;
}

export const viewport: Viewport = {
  themeColor: "#0f1513",
  colorScheme: "dark",
};

export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Promise<Metadata> {
  if (!isSupportedLocale(params.locale)) return {};
  const t = await getTranslations({ locale: params.locale, namespace: "meta" });
  const path = pathForLocale(params.locale);
  const canonical = `${SITE}${path}`;

  // Absolute hreflang URLs per Google guidance (relative URLs cause indexing
  // confusion across subdomains/locales). x-default points at es-AR — primary
  // ICP market Q1.
  const languages: Record<string, string> = {
    "es-AR": `${SITE}/`,
    "pt-BR": `${SITE}/pt-BR`,
    "en-US": `${SITE}/en-US`,
    "x-default": `${SITE}/`,
  };

  return {
    metadataBase: new URL(SITE),
    title: { default: t("title"), template: "%s — Crypto Invoicing" },
    description: t("description"),
    icons: {
      icon: [{ url: "/logo.svg", type: "image/svg+xml" }],
      apple: [{ url: "/apple-icon", sizes: "180x180", type: "image/png" }],
    },
    manifest: "/manifest.webmanifest",
    alternates: {
      canonical,
      languages,
    },
    openGraph: {
      title: t("ogTitle"),
      description: t("ogDescription"),
      url: canonical,
      siteName: "Crypto Invoicing",
      type: "website",
      locale: params.locale.replace("-", "_"),
      images: [
        {
          url: "/opengraph-image",
          width: 1200,
          height: 630,
          alt: "Crypto Invoicing — USDC invoicing for LATAM freelancers",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: t("ogTitle"),
      description: t("twitterDescription"),
      // Absolute, per-locale URL so Twitter / X / Slack / LinkedIn previews
      // resolve correctly. The implicit /opengraph-image route lives under
      // `app/[locale]/`, so it MUST be prefixed with the locale segment for
      // non-default locales (es-AR has no prefix per next-intl as-needed).
      images: [`${canonical}/opengraph-image`],
    },
    robots: { index: true, follow: true },
    // Verification — paste GSC token into NEXT_PUBLIC_GSC_VERIFICATION
    // after registering cryptoinvoicing.com in Google Search Console
    // (Settings → Ownership verification → HTML tag → copy the value).
    // Yandex / Bing tokens follow the same pattern when needed.
    verification: process.env.NEXT_PUBLIC_GSC_VERIFICATION
      ? { google: process.env.NEXT_PUBLIC_GSC_VERIFICATION }
      : undefined,
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  if (!isSupportedLocale(params.locale)) notFound();
  unstable_setRequestLocale(params.locale);
  const messages = await getMessages();

  // Organization JSON-LD — emitted on every page (Knowledge Graph eligibility).
  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Crypto Invoicing",
    url: SITE,
    logo: `${SITE}/logo.svg`,
    sameAs: ["https://twitter.com/cryptoinvoicing"],
    foundingLocation: {
      "@type": "Place",
      name: "Buenos Aires, Argentina",
    },
  };

  return (
    <html lang={params.locale} className="dark">
      <body className="min-h-screen text-on-surface antialiased font-body">
        <Script
          id="ld-organization"
          type="application/ld+json"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
        <NextIntlClientProvider locale={params.locale} messages={messages}>
          {children}
          <Analytics />
          <CookieConsent locale={params.locale} />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
