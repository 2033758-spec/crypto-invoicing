import type { Metadata } from "next";
import { unstable_setRequestLocale } from "next-intl/server";
import LegalPage from "../_lib/LegalPage";

const TITLE_BY_LOCALE: Record<string, string> = {
  "es-AR": "Política de Cookies · Crypto Invoicing",
  "pt-BR": "Política de Cookies · Crypto Invoicing",
  "en-US": "Cookies Policy · Crypto Invoicing",
};

const DESCRIPTION_BY_LOCALE: Record<string, string> = {
  "es-AR":
    "Aviso de cookies de Crypto Invoicing: qué cookies usamos (sesión, idioma, analítica anónima), para qué sirven y cómo controlarlas. Sin cookies publicitarias.",
  "pt-BR":
    "Aviso de cookies da Crypto Invoicing: quais cookies usamos (sessão, idioma, analítica anônima), para que servem e como controlá-las. Sem cookies de publicidade.",
  "en-US":
    "Crypto Invoicing cookies notice: which cookies we use (session, language, anonymized analytics), what they do and how to control them. No advertising cookies.",
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
      canonical: `${SITE}${prefix}/legal/cookies`,
      languages: {
        "es-AR": `${SITE}/legal/cookies`,
        "pt-BR": `${SITE}/pt-BR/legal/cookies`,
        "en-US": `${SITE}/en-US/legal/cookies`,
        "x-default": `${SITE}/legal/cookies`,
      },
    },
    robots: { index: true, follow: true },
  };
}

export default function CookiesPage({
  params,
}: {
  params: { locale: string };
}) {
  unstable_setRequestLocale(params.locale);
  return <LegalPage locale={params.locale} slug="cookies" />;
}
