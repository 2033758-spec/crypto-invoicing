import type { MetadataRoute } from "next";
import { locales } from "../i18n";

// Next.js 14 App Router convention — served at /sitemap.xml.
//
// Enumerates every public route × every locale and emits per-URL <xhtml:link
// rel="alternate" hreflang> entries (via `alternates.languages`). Google uses
// these to dedupe cross-locale variants. /dashboard and /auth/* are noindex,
// so they don't belong here (also blocked in robots.ts as belt-and-braces).

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://cryptoinvoicing.co";

// Public routes (relative paths, no locale prefix). Locale prefix is added per
// row below — es-AR has no prefix (default), pt-BR → /pt-BR, en-US → /en-US.
const PUBLIC_ROUTES: { path: string; priority: number; changeFrequency: "weekly" | "monthly" }[] = [
  { path: "", priority: 1.0, changeFrequency: "weekly" },
  { path: "/signup", priority: 0.8, changeFrequency: "monthly" },
  { path: "/legal/terms", priority: 0.4, changeFrequency: "monthly" },
  { path: "/legal/privacy", priority: 0.4, changeFrequency: "monthly" },
  { path: "/legal/cookies", priority: 0.3, changeFrequency: "monthly" },
];

function urlFor(locale: string, path: string): string {
  const prefix = locale === "es-AR" ? "" : `/${locale}`;
  return `${SITE}${prefix}${path}`;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return PUBLIC_ROUTES.flatMap((route) =>
    locales.map((locale) => ({
      url: urlFor(locale, route.path),
      lastModified: now,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
      alternates: {
        languages: Object.fromEntries([
          ...locales.map((l) => [l, urlFor(l, route.path)] as const),
          ["x-default", urlFor("es-AR", route.path)] as const,
        ]),
      },
    })),
  );
}
