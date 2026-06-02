// DEPRECATED 2026-05-27 (P0 batch). See app/api/lead/route.ts for context.
//
// Legacy calculadora waitlist endpoint. The v3 landing no longer calls it
// (every CTA routes to /signup). Returning 410 Gone closes the abuse
// surface (bot-flood → Supabase free-tier exhaustion).

import { NextResponse } from "next/server";

export const dynamic = "force-static";

const GONE = NextResponse.json(
  {
    error: "Endpoint removed",
    note: "Waitlist signups moved to /signup (Supabase Auth). See changelog 2026-05-27.",
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
