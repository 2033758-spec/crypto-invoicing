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
import { cookies as getCookies } from "next/headers";
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
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") || "email";
  const next = sanitizeNext(searchParams.get("next"), defaultNext);
  const providerError = searchParams.get("error");
  const providerErrorDesc = searchParams.get("error_description");

  if (providerError) {
    const u = new URL(errorPath, origin);
    u.searchParams.set("reason", providerError);
    if (providerErrorDesc) u.searchParams.set("desc", providerErrorDesc);
    return NextResponse.redirect(u);
  }

  if (!code && !tokenHash) {
    // No code AND no token_hash — likely a stale visit. Push to signup so the flow restarts cleanly.
    const signupPath = locale === "es-AR" ? "/signup" : `/${locale}/signup`;
    return NextResponse.redirect(new URL(signupPath, origin));
  }

  const cookieStore = getCookies();
  const supabase = getServerActionSupabase(cookieStore);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout (Vercel cold start + network)

  try {
    let error;

    // Magic-link flow: token_hash (OTP verification)
    if (tokenHash && type === "email") {
      const { error: otpError } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: "email",
      });
      error = otpError;
    }
    // OAuth flow: code (PKCE exchange)
    else if (code) {
      const { error: codeError } = await supabase.auth.exchangeCodeForSession(code);
      error = codeError;
    } else {
      error = new Error("No authentication method provided");
    }

    clearTimeout(timeoutId);
    clearTimeout(timeoutId);

    if (error) {
      console.error("[auth/callback] exchangeCodeForSession failed", error);
      const u = new URL(errorPath, origin);
      u.searchParams.set("reason", "exchange_failed");
      u.searchParams.set("desc", "Registration error. Please try again.");
      return NextResponse.redirect(u);
    }

    // Session successfully exchanged! Cookies are now set by Supabase
    // in the Next.js cookie store via the adapter in createServerClient.
    // The redirect response will include these cookies automatically.
    return NextResponse.redirect(new URL(next, origin));
  } catch (err) {
    clearTimeout(timeoutId);

    if (err instanceof Error && err.name === "AbortError") {
      console.error("[auth/callback] Code exchange timeout (15s exceeded)");
      const u = new URL(errorPath, origin);
      u.searchParams.set("reason", "exchange_timeout");
      u.searchParams.set("desc", "Authentication took too long. Please try again.");
      return NextResponse.redirect(u);
    }

    console.error("[auth/callback] Unexpected error", err);
    const u = new URL(errorPath, origin);
    u.searchParams.set("reason", "exchange_error");
    u.searchParams.set("desc", "An error occurred during authentication. Please try again.");
    return NextResponse.redirect(u);
  }
}
