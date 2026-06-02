import type { Metadata } from "next";
import { unstable_setRequestLocale } from "next-intl/server";
import DashboardClient from "./DashboardClient";

// /[locale]/dashboard — STUB landing for newly-authenticated users.
//
// Founder note (2026-05-26): the real invoice flow ships Q1 2026. For now
// this page exists so the magic-link redirect target is a real page; manual
// onboarding happens via Telegram/Calendly outside the app.
//
// Auth check runs client-side via `getBrowserSupabase()` (PKCE + cookie-bound
// session via @supabase/ssr, migrated 2026-05-28). Unauth users get
// redirected to /signup. A server-side gate via getServerActionSupabase() is
// queued for W7+ when this page stops being a stub.

export const metadata: Metadata = {
  title: "Dashboard",
  // Gated, stub content — never index. Also blocks archive (Bing cache, Wayback).
  robots: { index: false, follow: false, noarchive: true, nosnippet: true },
};

export default function DashboardPage({
  params,
}: {
  params: { locale: string };
}) {
  unstable_setRequestLocale(params.locale);
  return <DashboardClient locale={params.locale} />;
}
