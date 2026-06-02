// Sentry browser config. Loaded automatically by @sentry/nextjs.
// Per decisions_log 2026-05-12: Sentry day 1 W7 (NOT Q4) — early error
// visibility is cheap and prevents debugging blind in concierge phase.

import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    // Q1: capture all errors, sample 10% of transactions (free tier budget).
    tracesSampleRate: 0.1,
    // Replay only on errors — keeps quota under free 50/mo.
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: 0.0,
    environment: process.env.NODE_ENV,
  });
}
