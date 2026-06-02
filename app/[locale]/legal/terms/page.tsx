import type { Metadata } from "next";
import { unstable_setRequestLocale } from "next-intl/server";
import LegalPage from "../_lib/LegalPage";

const TITLE_BY_LOCALE: Record<string, string> = {
  "es-AR": "Términos del servicio · Crypto Invoicing",
  "pt-BR": "Termos de Serviço · Crypto Invoicing",
  "en-US": "Terms of Service · Crypto Invoicing",
};

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://cryptoinvoicing.com";

export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const title = TITLE_BY_LOCALE[params.locale] || TITLE_BY_LOCALE["es-AR"];
  const prefix = params.locale === "es-AR" ? "" : `/${params.locale}`;
  return {
    title,
    description: "Terms of Service — Crypto Invoicing.",
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
