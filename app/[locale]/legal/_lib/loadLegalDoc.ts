import { renderMarkdown } from "../../../lib/markdown";
import termsDoc from "../_content/terms_of_service";
import privacyDoc from "../_content/privacy_policy";
import cookiesDoc from "../_content/cookies";

// Renders a legal document to HTML at request time.
//
// The markdown now ships as bundled module strings (app/[locale]/legal/_content/*),
// NOT read from the parent repo's /06_legal/draft via fs. Reason: the Vercel
// deploy only includes the `code/calculadora` app directory, so the parent
// repo's legal files were absent in prod → fs.readFile threw → every legal page
// rendered a "Document missing" placeholder. On a YMYL fintech domain claiming
// CNV/PSAV registration, 9 placeholder legal pages in the index is a sitewide
// low-quality signal (SEO audit 2026-06-11, finding #4). Bundling the text
// guarantees real content in every environment.
//
// LANGUAGE POLICY (founder decision 2026-05-27):
//   Legal docs are published in English ONLY until the AR-lawyer redline (W11).
//   ES + PT versions were dropped because untranslated drafts created mis-claim
//   risk and need a lawyer redline in two languages, not one. For es-AR + pt-BR
//   users the calling page renders an "English only" banner.
//
// Slug values: "terms_of_service" | "privacy_policy" | "cookies".

export type LegalSlug = "terms_of_service" | "privacy_policy" | "cookies";

const DOC_BY_SLUG: Record<LegalSlug, string> = {
  terms_of_service: termsDoc,
  privacy_policy: privacyDoc,
  cookies: cookiesDoc,
};

export interface LegalDoc {
  html: string;
  /** True when the user's locale is non-EN and the body is served in English. */
  englishOnlyFallback: boolean;
  /** True when the slug is "cookies" — single bilingual doc. */
  isCookies: boolean;
}

export async function loadLegalDoc(
  slug: LegalSlug,
  locale: string,
): Promise<LegalDoc> {
  const englishOnlyFallback = locale !== "en-US";
  const raw = DOC_BY_SLUG[slug] ?? DOC_BY_SLUG.terms_of_service;
  return {
    html: renderMarkdown(raw),
    // Cookies is bilingual (EN + ES-AR), so no English-only banner for it.
    englishOnlyFallback: slug === "cookies" ? false : englishOnlyFallback,
    isCookies: slug === "cookies",
  };
}
