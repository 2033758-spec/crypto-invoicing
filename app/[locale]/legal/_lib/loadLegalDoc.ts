import { promises as fs } from "fs";
import path from "path";
import { renderMarkdown } from "../../../lib/markdown";

// Loads a draft legal markdown file from /06_legal/draft/ relative to the
// repo root and converts it to HTML at request time.
//
// LANGUAGE POLICY (founder decision 2026-05-27):
//   Legal docs are published in English ONLY until the AR-lawyer redline (W11).
//   ES + PT versions were dropped because:
//     1. Untranslated drafts created mis-claim risk (Terms in Spanish saying
//        things the English source no longer says after Tier-1 edits).
//     2. Spanish translations require lawyer redline in two languages, not one.
//     3. Most AR/BR ICP users have working English (mid-senior devs / designers).
//   For es-AR + pt-BR users, the calling page renders an "English only" banner
//   so users understand why the body is in English.
//
// Slug values: "terms_of_service" | "privacy_policy" | "cookies".

export type LegalSlug = "terms_of_service" | "privacy_policy" | "cookies";

const REPO_ROOT_FROM_APP = path.resolve(
  process.cwd(),
  "..",
  "..",
  "06_legal",
  "draft",
);

function fileFor(slug: LegalSlug): string {
  if (slug === "cookies") {
    return path.join(REPO_ROOT_FROM_APP, "cookies_v1.md");
  }
  return path.join(REPO_ROOT_FROM_APP, `${slug}_v1_en.md`);
}

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
  const filePath = fileFor(slug);
  let raw = "";
  try {
    raw = await fs.readFile(filePath, "utf8");
  } catch (err) {
    // Defensive: legal docs MUST exist by launch. If missing, return a
    // visible placeholder so the page still renders without a 500.
    raw =
      `# Document missing\n\nThe requested legal document is being finalised. ` +
      `Please email hola@cryptoinvoicing.com for a copy.`;
    console.error(
      `[legal] failed to read ${filePath}:`,
      (err as Error).message,
    );
  }
  return {
    html: renderMarkdown(raw),
    englishOnlyFallback,
    isCookies: slug === "cookies",
  };
}
