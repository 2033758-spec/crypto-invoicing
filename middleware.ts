// Middleware: locale detection + Supabase session refresh
// 1. next-intl: auto-locale detection, URL rewriting
// 2. Supabase: session refresh on every request (fixes cross-tab persistence)

import { type NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { defaultLocale, locales } from "./i18n";
import { createServerClient } from "@supabase/ssr";

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
              sameSite: "lax", // Allow cross-tab cookies
              secure: isSecure, // HTTPS in prod, allow HTTP on localhost
              httpOnly: true, // Not accessible from JS
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

    // Refresh session to keep it valid
    await supabase.auth.refreshSession();
  } catch (error) {
    // Session refresh failed, but that's OK — user will re-auth if needed
    console.debug("[middleware] Session refresh skipped (not authenticated)");
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next|_vercel|monitoring|icon|apple-icon|opengraph-image|.*\\..*).*)",
  ],
};
