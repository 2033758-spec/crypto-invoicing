import { unstable_setRequestLocale } from "next-intl/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { fetchUsdcArsRate } from "../lib/fx";

import Seams from "./_components/landing-v3/Seams";
import Header from "./_components/landing-v3/Header";
import Hero from "./_components/landing-v3/Hero";
import Marquee from "./_components/landing-v3/Marquee";
import Problem from "./_components/landing-v3/Problem";
import How from "./_components/landing-v3/How";
import Calculator from "./_components/landing-v3/Calculator";
import Features from "./_components/landing-v3/Features";
import Trust from "./_components/landing-v3/Trust";
import Pricing from "./_components/landing-v3/Pricing";
import FAQ from "./_components/landing-v3/FAQ";
import FinalCta from "./_components/landing-v3/FinalCta";
import LatestGuides from "./_components/landing-v3/LatestGuides";
import Footer from "./_components/landing-v3/Footer";

// /[locale]/ — Design System v3 landing.
//
// 12 sections matching .design-system/project/ui_kits/landing/index.html:
//   00 Header
//   01 Hero (with live-rate widget)
//   02 Marquee (payment-rails)
//   03 Problem (3 cost cards)
//   04 How it works (4 steps)
//   05 Calculator (interactive)
//   06 Features (6 tiles)
//   07 Trust (4 compliance cards)
//   08 Pricing (Starter + Pro)
//   09 FAQ (6 details/summary)
//   10 Final CTA
//   11 Footer
//
// ModalProvider is gone — every CTA now routes to /signup directly.

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://cryptoinvoicing.co";

import { fetchUsdcBrlRate } from "../lib/fx";

export default async function LandingPage({
  params,
}: {
  params: { locale: string };
}) {
  unstable_setRequestLocale(params.locale);

  // Check if user is authenticated (for Header to show correct nav)
  const cookieStore = cookies();

  // Create a proper cookie adapter for Supabase
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value || undefined;
        },
        set(name: string, value: string, options: any) {
          // Server Components can't set cookies, but reading works
        },
        remove(name: string, options: any) {
          // Server Components can't remove cookies
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Live USDC→ARS + USDC→BRL rates from CriptoYa (cached 60s on the edge).
  // Both fall back to sensible snapshots if the API is down. Both feed the
  // Hero card so it stays alive in 2 currencies without hardcoded numbers.
  const [arsFx, brlFx] = await Promise.all([
    fetchUsdcArsRate(),
    fetchUsdcBrlRate(),
  ]);

  // SoftwareApplication + Offer JSON-LD — eligible for Product rich-result in
  // SERP with price ($9 Pro). Lives on the home only (Organization JSON-LD is
  // emitted globally from the root layout).
  const appJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Crypto Invoicing",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: SITE,
    // B19: offers are locale-aware. BR is a conversion-only beta — no Pro tier
    // and no Factura E / AFIP (that's Argentina). Advertising AFIP on /pt-BR was
    // factually wrong; only es-AR / en-US carry the Pro AR offer.
    offers: [
      {
        "@type": "Offer",
        name: "Starter",
        price: "0",
        priceCurrency: "USD",
        description:
          params.locale === "pt-BR"
            ? "1% por transação (cap US$50/fatura), conversão USDC→BRL"
            : "1% commission per transaction, cap $50/invoice",
      },
      ...(params.locale === "pt-BR"
        ? []
        : [
            {
              "@type": "Offer",
              name: "Pro AR",
              price: "9.00",
              priceCurrency: "USD",
              description: "Unlimited invoices + factura E + AFIP auto-PDF",
            },
          ]),
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(appJsonLd) }}
      />

      {/* Decorative grid seams behind everything */}
      <Seams />

      <Header locale={params.locale} user={user} />

      <main className="relative isolate">
        <Hero
          locale={params.locale}
          liveRate={arsFx.rate}
          liveSource={arsFx.source}
          liveBrlRate={brlFx.rate}
          liveBrlSource={brlFx.source}
          isAuthenticated={!!user}
        />
        <Marquee />
        <Problem />
        <How />
        <Calculator />
        <Features />
        <Trust />
        <Pricing locale={params.locale} isAuthenticated={!!user} />
        <FAQ />
        <FinalCta locale={params.locale} isAuthenticated={!!user} />
        <LatestGuides locale={params.locale} />
      </main>

      <Footer locale={params.locale} />
    </>
  );
}
