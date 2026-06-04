import type { Metadata } from "next";
import { unstable_setRequestLocale } from "next-intl/server";
import LegalPage from "../_lib/LegalPage";

const TITLE_BY_LOCALE: Record<string, string> = {
  "es-AR": "Política de Privacidad · Crypto Invoicing",
  "pt-BR": "Política de Privacidade · Crypto Invoicing",
  "en-US": "Privacy Policy · Crypto Invoicing",
};

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://cryptoinvoicing.co";

export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const title = TITLE_BY_LOCALE[params.locale] || TITLE_BY_LOCALE["es-AR"];
  const prefix = params.locale === "es-AR" ? "" : `/${params.locale}`;
  return {
    title,
    description: "Privacy Policy — Crypto Invoicing.",
    alternates: {
      canonical: `${SITE}${prefix}/legal/privacy`,
      languages: {
        "es-AR": `${SITE}/legal/privacy`,
        "pt-BR": `${SITE}/pt-BR/legal/privacy`,
        "en-US": `${SITE}/en-US/legal/privacy`,
        "x-default": `${SITE}/legal/privacy`,
      },
    },
    robots: { index: true, follow: true },
  };
}

export default function PrivacyPage({
  params,
}: {
  params: { locale: string };
}) {
  unstable_setRequestLocale(params.locale);
  return <LegalPage locale={params.locale} slug="privacy_policy" />;
}
