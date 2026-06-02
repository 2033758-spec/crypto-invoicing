import { withSentryConfig } from "@sentry/nextjs";
import createNextIntlPlugin from "next-intl/plugin";

// next-intl plugin points to our `i18n.ts` request config
const withNextIntl = createNextIntlPlugin("./i18n.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
