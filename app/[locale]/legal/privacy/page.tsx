import type { Metadata } from "next";
import { unstable_setRequestLocale } from "next-intl/server";
import LegalPage from "../_lib/LegalPage";

const TITLE_BY_LOCALE: Record<string, string> = {
  "es-AR": "Política de Privacidad · Crypto Invoicing",
  "pt-BR": "Política de Privacidade · Crypto Invoicing",
  "en-US": "Privacy Policy · Crypto Invoicing",
};

const DESCRIPTION_BY_LOCALE: Record<string, string> = {
  "es-AR":
    "Política de privacidad de Crypto Invoicing: qué datos recolectamos, con qué base legal, con quién los compartimos, cuánto los retenemos y tus derechos (Ley 25.326).",
  "pt-BR":
    "Política de privacidade da Crypto Invoicing: quais dados coletamos, base legal, com quem compartilhamos, tempo de retenção e seus direitos.",
  "en-US":
    "Crypto Invoicing privacy policy: what data we collect, lawful bases, processors we share with, retention periods and your data-subject rights.",
};

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://cryptoinvoicing.co";

export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const title = TITLE_BY_LOCALE[params.locale] || TITLE_BY_LOCALE["es-AR"];
  const description = DESCRIPTION_BY_LOCALE[params.locale] || DESCRIPTION_BY_LOCALE["es-AR"];
  const prefix = params.locale === "es-AR" ? "" : `/${params.locale}`;
  return {
    title: { absolute: title },
    description,
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
