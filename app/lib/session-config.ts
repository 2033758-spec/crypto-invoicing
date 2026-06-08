// Session-cookie policy — shared by the browser Supabase client, the server
// client, and the Edge middleware. Kept in its own dependency-free module so
// importing it into middleware.ts does NOT pull @supabase/supabase-js into the
// Edge bundle.
//
// Why this exists: the "30-day session" used to live only in a code comment —
// no client set a cookie maxAge, so `sb-<project>-auth-token` was a *session*
// cookie that died on browser close. These options fix that: the auth cookie
// now persists across browser restarts and tabs.
//
// IMPORTANT — where the 30-day cap is ACTUALLY enforced:
//  - SERVER write paths (auth callback + middleware refresh): our cookie adapter
//    forces maxAge = SESSION_MAX_AGE, so the login/refresh Set-Cookie is 30d.
//  - The @supabase/ssr BROWSER client IGNORES this maxAge and writes its own
//    (~400d) default when it rewrites the cookie on autoRefresh. So the cookie
//    is persistent, but its browser-side lifetime is the lib default, not 30d.
//    (path / sameSite / secure from these options DO apply on every path.)
//  - The authoritative 30-day cap therefore lives SERVER-SIDE in the Supabase
//    project: Authentication → Sessions → "Time-box user sessions" +
//    "Inactivity timeout" = 30 days. Do not trust cookie maxAge alone.

export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days, in seconds

export const SESSION_COOKIE_OPTIONS = {
  maxAge: SESSION_MAX_AGE,
  path: "/",
  sameSite: "lax" as const,
  // env-gated so the cookie is still accepted over http://localhost in dev
  // (secure cookies are silently dropped over http — a classic "cookie never
  // appears in DevTools" cause).
  secure: process.env.NODE_ENV === "production",
};
