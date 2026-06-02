// Sentry server config (Next.js API routes, RSC, middleware).
// Per decisions_log 2026-05-12: Sentry day 1 W7.

import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    environment: process.env.NODE_ENV,
  });
}
