// Next.js 14 instrumentation hook — runs once per server bootstrap (node + edge).
// Required by @sentry/nextjs ≥8 so Sentry.init lives in the correct lifecycle.
// Without this file, the dev log warns:
//   "Sentry.init must be called inside instrumentation.ts"
// and server / edge errors may not be reported.

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}
