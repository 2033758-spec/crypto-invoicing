import { withSentryConfig } from "@sentry/nextjs";
import createNextIntlPlugin from "next-intl/plugin";

// next-intl plugin points to our `i18n.ts` request config
const withNextIntl = createNextIntlPlugin("./i18n.ts");

// Security headers (B6 + SEO-TZ C1). The ENFORCED CSP stays minimal
// (frame-ancestors) so we never break the live site; the FULL default-src CSP
// ships as Report-Only first (SEO-TZ C1) — observe violations ≥48h, tune the
// allowlist, then promote to enforced.
const CSP_REPORT_ONLY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "img-src 'self' data: blob: https:",
  "font-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  // Next.js injects inline hydration + we emit JSON-LD inline → 'unsafe-inline'.
  "script-src 'self' 'unsafe-inline' https://*.posthog.com https://*.sentry.io",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.posthog.com https://*.i.posthog.com https://*.sentry.io https://*.ingest.sentry.io https://criptoya.com",
  "form-action 'self' https://*.supabase.co",
  "frame-src 'self'",
].join("; ");

const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "Content-Security-Policy-Report-Only", value: CSP_REPORT_ONLY },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

// Compose: next-intl wraps base config, Sentry wraps the result. Order matters
// — Sentry must be outermost для source-map upload через webpack hook.
//
// Sentry wrap is a no-op if SENTRY_DSN is unset (build still works в dev /
// без creds). Founder fills DSN после создания проекта на sentry.io.
export default withSentryConfig(withNextIntl(nextConfig), {
  // Sentry org/project — заполнить когда есть аккаунт. Без них source-maps
  // upload пропускается, рантайм всё равно работает.
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  hideSourceMaps: true,
  disableLogger: true,
});
