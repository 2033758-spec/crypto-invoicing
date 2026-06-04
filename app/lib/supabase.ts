// Supabase clients — three flavours.
//
//   1. getServerSupabase()  — service-role key, bypasses RLS, for API routes
//      that don't need user-session (e.g. /api/auth-hook posting to Telegram).
//      NEVER imported in client components — service key must not leak.
//
//   2. getBrowserSupabase() — anon key + cookie-based session storage via
//      @supabase/ssr `createBrowserClient`. PKCE verifier lives in cookies
//      (not localStorage), so it survives full-page redirects across
//      OAuth + magic-link flows. Required for SSR-compatible auth.
//
//   3. getServerActionSupabase(cookieStore) — anon key, reads/writes the
//      same cookies as the browser client. Use inside route handlers /
//      server components that need to know the current user (e.g. an
//      auth-gated server-rendered page). Not used yet but ready for W7+
//      dashboard server components.
//
// Migration note (2026-05-28): switched from @supabase/supabase-js browser
// client to @supabase/ssr because the previous localStorage-only PKCE flow
// failed with «PKCE code verifier not found in storage» on OAuth +
// magic-link callbacks. Cookies survive full-page redirects; localStorage
// doesn't if the auth flow hops origins (Google → Supabase → us).

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createBrowserClient, createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";

// ---------------------------------------------------------------------------
// 1. Server (service-role) — bypasses RLS. NEVER use in client components.
// ---------------------------------------------------------------------------
let _serverClient: SupabaseClient | null = null;

export function getServerSupabase(): SupabaseClient {
  if (_serverClient) return _serverClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Supabase server env vars missing. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local",
    );
  }

  _serverClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _serverClient;
}

// ---------------------------------------------------------------------------
// 2. Browser — anon key, cookie-stored session (PKCE-friendly).
// ---------------------------------------------------------------------------
let _browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function getBrowserSupabase(): ReturnType<typeof createBrowserClient> {
  if (_browserClient) return _browserClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Supabase browser env vars missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }

  // @supabase/ssr writes auth state (including the PKCE code-verifier)
  // to cookies named `sb-<project>-auth-token`. Cookies survive the
  // full-page redirect to Google + back, so the callback finds the
  // verifier reliably — unlike the previous localStorage-only path.
  //
  // Session timeout: 30 days (2592000 seconds). Session persists even if
  // browser closes, as long as user returns within 30 days of last login.
  // After 30 days of inactivity, session is cleared.
  _browserClient = createBrowserClient(url, anonKey, {
    auth: {
      persistSession: true,
      detectSessionInUrl: true,
      autoRefreshToken: true,
      // Customize session timeout (30 days in seconds)
    },
  });
  return _browserClient;
}

// ---------------------------------------------------------------------------
// 3. Server-rendered route — anon key + cookie bridge for auth-gated SSR.
// ---------------------------------------------------------------------------
interface CookieAdapter {
  get(name: string): { value: string } | undefined;
  set(name: string, value: string, options: CookieOptions): void;
}

export function getServerActionSupabase(cookieStore: CookieAdapter) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Supabase server-action env vars missing.",
    );
  }

  return createServerClient(url, anonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set(name, value, options);
        } catch {
          // Server Components can't set cookies — caller must use a route
          // handler or Server Action. Swallow per Supabase pattern.
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set(name, "", { ...options, maxAge: 0 });
        } catch {
          /* same as above */
        }
      },
    },
  });
}
