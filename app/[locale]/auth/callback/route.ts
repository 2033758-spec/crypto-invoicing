// Auth callback — SERVER route handler.
//
// Why server, not client: PKCE code-exchange must read the verifier cookie
// the @supabase/ssr browser client set when signInWithOAuth / signInWithOtp
// fired. The browser client's exchange flow in a client component cannot
// reliably re-read that cookie across the redirect chain
// (us → google → supabase.co → us). The canonical Supabase Next.js App
// Router pattern uses a route handler with `createServerClient` reading
// `cookies()` — that's what's here.
//
// Flow:
//   1. Provider redirects to /{locale}/auth/callback?code=...&next=/{locale}/dashboard
//   2. We read `code`, exchange for session via cookie-bound supabase client
//   3. supabase.auth.exchangeCodeForSession() writes new session cookies
//      (sb-<project>-auth-token), invalidates the PKCE verifier
//   4. We redirect to `next` (sanitised) or default dashboard
//
// Failure modes → redirect to /{locale}/auth/error with ?reason= so the
// existing error UI in page.tsx renders.

import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { getServerActionSupabase } from "../../../lib/supabase";

const ALLOWED_NEXT_PREFIXES = [
  "/dashboard",
  "/es-AR/dashboard",
  "/pt-BR/dashboard",
  "/en-US/dashboard",
];

function sanitizeNext(raw: string | null, fallback: string): string {
  if (!raw) return fallback;
  if (!raw.startsWith("/")) return fallback;
  if (raw.startsWith("//") || raw.startsWith("/\\")) return fallback;
  if (raw.includes("://") || raw.includes("\\")) return fallback;
  const pathOnly = raw.split(/[?#]/)[0];
  const ok = ALLOWED_NEXT_PREFIXES.some(
    (p) => pathOnly === p || pathOnly.startsWith(`${p}/`),
  );
  return ok ? raw : fallback;
}

function isSupportedLocale(loc: string): loc is "es-AR" | "pt-BR" | "en-US" {
  return loc === "es-AR" || loc === "pt-BR" || loc === "en-US";
}

export async function GET(
  request: NextRequest,
  { params }: { params: { locale: string } },
) {
  const locale = isSupportedLocale(params.locale) ? params.locale : "es-AR";
  const { origin, searchParams } = new URL(request.url);

  const defaultNext =
    locale === "es-AR" ? "/dashboard" : `/${locale}/dashboard`;
  const errorPath =
    locale === "es-AR" ? "/auth/error" : `/${locale}/auth/error`;

  const code = searchParams.get("code");
  const next = sanitizeNext(searchParams.get("next"), defaultNext);
  const providerError = searchParams.get("error");
  const providerErrorDesc = searchParams.get("error_description");

  if (providerError) {
    const u = new URL(errorPath, origin);
    u.searchParams.set("reason", providerError);
    if (providerErrorDesc) u.searchParams.set("desc", providerErrorDesc);
    return NextResponse.redirect(u);
  }

  if (!code) {
    // No code, no error — likely a stale visit. Push to signup so the flow
    // restarts cleanly.
    const signupPath = locale === "es-AR" ? "/signup" : `/${locale}/signup`;
    return NextResponse.redirect(new URL(signupPath, origin));
  }

  const cookieStore = cookies();
  const supabase = getServerActionSupabase(cookieStore);

  // Wrap exchange in timeout (10 seconds) to prevent hanging on slow Supabase
  const exchangePromise = supabase.auth.exchangeCodeForSession(code);
  const timeoutPromise = new Promise<{ error: Error }>((resolve) =>
    setTimeout(
      () =>
        resolve({
          error: new Error("Code exchange timeout after 10s. Try signing in again."),
        }),
      10000,
    ),
  );

  const { error } = await Promise.race([exchangePromise, timeoutPromise]);
  if (error) {
    console.error("[auth/callback] exchangeCodeForSession failed", error);
    const u = new URL(errorPath, origin);
    u.searchParams.set("reason", "exchange_failed");
    u.searchParams.set("desc", error.message);
    return NextResponse.redirect(u);
  }

  return NextResponse.redirect(new URL(next, origin));
}
