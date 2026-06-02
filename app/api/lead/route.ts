// DEPRECATED 2026-05-27 (P0 batch).
//
// v3 landing routes every CTA directly to /signup (Supabase Auth magic-link
// + Google OAuth). This endpoint is no longer called by any component on the
// public site, so leaving it open invited bot floods that could exhaust the
// Supabase free-tier (no rate-limit was implemented).
//
// The endpoint now returns 404 for all methods. Telegram founder-pings
// previously triggered here are reimplemented via the Supabase Auth Database
// Webhook → /api/auth-hook in C1. See SUPABASE_AUTH_WEBHOOK_SETUP.md.
//
// Safe to delete this file entirely once founder confirms no external
// integrations are hitting it. Kept as a stub to surface intentional 404 in
// route logs (vs a "route not found at build" mystery).

import { NextResponse } from "next/server";

export const dynamic = "force-static";

const GONE = NextResponse.json(
  {
    error: "Endpoint removed",
    note: "Lead capture moved to /signup (Supabase Auth). See changelog 2026-05-27.",
  },
  { status: 410 },
);

export async function GET() {
  return GONE;
}
export async function POST() {
  return GONE;
}
export async function PUT() {
  return GONE;
}
export async function DELETE() {
  return GONE;
}
