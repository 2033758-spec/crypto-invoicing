// Middleware: locale detection + Supabase session refresh
// 1. next-intl: auto-locale detection, URL rewriting
// 2. Supabase: session refresh on every request (fixes cross-tab persistence)

import { type NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { defaultLocale, locales } from "./i18n";
import { createServerClient } from "@supabase/ssr";
import { SESSION_MAX_AGE } from "./app/lib/session-config";

const intlMiddleware = createMiddleware({
  locales: [...locales],
  defaultLocale,
  localePrefix: "as-needed",
  localeDetection: true,
});

export async function middleware(request: NextRequest) {
  // First: handle i18n locale routing
  let response = intlMiddleware(request);

  // Second: refresh Supabase session on every request
  // This ensures session cookies persist correctly across browser tabs
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            // secure: false on localhost (http://), true on production (https://)
            const isSecure = process.env.NODE_ENV === 'production' || request.headers.get('x-forwarded-proto') === 'https';
            response.cookies.set({
              name,
              value,
              ...options,
              maxAge: SESSION_MAX_AGE, // 30-day persistence (refreshed cookies keep the long expiry)
              sameSite: "lax", // Allow cross-tab cookies
              secure: isSecure, // HTTPS in prod, allow HTTP on localhost
              // httpOnly MUST stay false on the Supabase auth cookie. The app
              // reads the session client-side via getBrowserSupabase() (the
              // /dashboard auth gate + profile query). @supabase/ssr stores the
              // session in a JS-readable cookie by design; forcing httpOnly:true
              // here made the browser client see no session after the first
              // middleware refresh → /dashboard bounced logged-in users to
              // /signup even though the server (home header) saw them logged in
              // (incident 2026-06-12). Server reads are unaffected by this flag.
              httpOnly: false,
            });
          },
          remove(name: string, options: any) {
            response.cookies.set({
              name,
              value: "",
              ...options,
              maxAge: 0,
            });
          },
        },
      }
    );

    // Canonical @supabase/ssr pattern: getUser() validates the session and
    // refreshes the access token *only when needed*, writing the refreshed
    // cookies onto `response`. The previous code called refreshSession() on
    // EVERY request, which — with refresh-token rotation on — let one tab
    // invalidate another tab's token ("refresh token already used") and
    // logged the user out across tabs. getUser() is idempotent and safe.
    await supabase.auth.getUser();
  } catch (error) {
    // Not authenticated (or transient) — fine, anonymous users hit this too.
    console.debug("[middleware] No active session to refresh");
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next|_vercel|monitoring|icon|apple-icon|opengraph-image|i/|.*\\..*).*)",
  ],
};
