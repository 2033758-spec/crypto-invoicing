import type { Metadata } from "next";
import { unstable_setRequestLocale } from "next-intl/server";
import LegalPage from "../_lib/LegalPage";

const TITLE_BY_LOCALE: Record<string, string> = {
  "es-AR": "Términos del servicio · Crypto Invoicing",
  "pt-BR": "Termos de Serviço · Crypto Invoicing",
  "en-US": "Terms of Service · Crypto Invoicing",
};

const DESCRIPTION_BY_LOCALE: Record<string, string> = {
  "es-AR":
    "Términos del servicio de Crypto Invoicing: cobranza de USDC para freelancers de LATAM, diseño non-custodial, comisiones, KYC/AML por niveles y ley aplicable (Argentina).",
  "pt-BR":
    "Termos de Serviço da Crypto Invoicing: recebimento de USDC para freelancers da LATAM, arquitetura non-custodial, taxas, KYC/AML por níveis e lei aplicável.",
  "en-US":
    "Crypto Invoicing Terms of Service: USDC invoicing for LATAM freelancers, non-custodial design, fees, tiered KYC/AML and governing law (Argentina).",
};

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://cryptoinvoicing.co";

export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Promise<Metadata> {
  // `absolute` bypasses the root layout's "%s — Crypto Invoicing" template, which
  // otherwise produced "Términos del servicio · Crypto Invoicing — Crypto
  // Invoicing" (audit 2026-06-11, #15).
  const title = TITLE_BY_LOCALE[params.locale] || TITLE_BY_LOCALE["es-AR"];
  const description = DESCRIPTION_BY_LOCALE[params.locale] || DESCRIPTION_BY_LOCALE["es-AR"];
  const prefix = params.locale === "es-AR" ? "" : `/${params.locale}`;
  return {
    title: { absolute: title },
    description,
    alternates: {
      canonical: `${SITE}${prefix}/legal/terms`,
      languages: {
        "es-AR": `${SITE}/legal/terms`,
        "pt-BR": `${SITE}/pt-BR/legal/terms`,
        "en-US": `${SITE}/en-US/legal/terms`,
        "x-default": `${SITE}/legal/terms`,
      },
    },
    robots: { index: true, follow: true },
  };
}

export default function TermsPage({
  params,
}: {
  params: { locale: string };
}) {
  unstable_setRequestLocale(params.locale);
  return <LegalPage locale={params.locale} slug="terms_of_service" />;
}
