// Edge middleware — handles auto-locale detection via `Accept-Language` header,
// rewrites `/` → `/{locale}` and respects user's explicit choice (cookie set
// by LanguageSwitcher). next-intl `createMiddleware` does the heavy lifting:
// negotiates locale, normalizes pathname, sets `NEXT_LOCALE` cookie.
//
// Default locale = es-AR (no prefix in URL — pretty links для AR users).
// Other locales prefixed: /pt-BR/..., /en-US/...

import createMiddleware from "next-intl/middleware";
import { defaultLocale, locales } from "./i18n";

export default createMiddleware({
  locales: [...locales],
  defaultLocale,
  // `as-needed` → es-AR served at `/`, pt-BR at `/pt-BR`, en-US at `/en-US`.
  // Keeps the AR canonical URL clean for SEO (primary market Q1).
  localePrefix: "as-needed",
  // Persist user choice in cookie so detection не overrides manual switch.
  localeDetection: true,
});

export const config = {
  // Match all routes except: api, _next, _vercel, static files (anything with
  // a `.` in the path — e.g. sitemap.xml, robots.txt, manifest.webmanifest),
  // the Sentry tunnel, and Next.js file-convention routes that live at the
  // root without an extension (`icon`, `apple-icon`, `opengraph-image`).
  // Without the explicit exclude, next-intl tries to locale-rewrite `/icon`
  // and the favicon endpoint 404s.
  matcher: [
    "/((?!api|_next|_vercel|monitoring|icon|apple-icon|opengraph-image|.*\\..*).*)",
  ],
};
