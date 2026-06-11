// /api/profile — save the freelancer payout profile.
//
// Why server-side (not a direct browser RLS update): the profile write must be
// reliable and self-healing. This route authenticates via the cookie-bound
// client, then writes with the service-role client — which bypasses RLS and,
// crucially, PROVISIONS the user/org row if the signup trigger never created it
// (so a missing row can never silently swallow a save). It also returns precise
// per-field validation errors the dashboard can highlight.

import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import * as Sentry from "@sentry/nextjs";
import { getServerActionSupabase, getServerSupabase } from "../../lib/supabase";
import { ensureUserOrg } from "../../lib/provision";

interface Body {
  full_name?: string;
  country?: "AR" | "BR";
  tax_id?: string;
  payout_destination?: string;
  tax_status?: string;
  telegram_handle?: string;
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const full_name = str(body.full_name);
  const country = body.country;
  const tax_id = str(body.tax_id);
  const payout_destination = str(body.payout_destination);
  const tax_status = str(body.tax_status);
  const telegram_handle = str(body.telegram_handle);

  // Field-level validation — return the offending field so the UI can highlight it.
  if (!full_name || full_name.length > 120) {
    return NextResponse.json({ field: "full_name", error: "required" }, { status: 400 });
  }
  if (country !== "AR" && country !== "BR") {
    return NextResponse.json({ field: "country", error: "required" }, { status: 400 });
  }
  if (!tax_id || tax_id.length > 40) {
    return NextResponse.json({ field: "tax_id", error: "required" }, { status: 400 });
  }
  if (!payout_destination || payout_destination.length > 80) {
    return NextResponse.json({ field: "payout_destination", error: "required" }, { status: 400 });
  }

  // Telegram optional, but if present must be a valid @handle. Normalize to "@…".
  let telegram_normalized: string | null = null;
  if (telegram_handle) {
    const tg = telegram_handle.replace(/^@/, "");
    if (!/^[a-zA-Z0-9_]{4,32}$/.test(tg)) {
      return NextResponse.json({ field: "telegram_handle", error: "format" }, { status: 400 });
    }
    telegram_normalized = "@" + tg;
  }

  // Auth (cookie-bound client).
  const cookieStore = cookies();
  const authClient = getServerActionSupabase(cookieStore);
  const {
    data: { user },
    error: authError,
  } = await authClient.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  try {
    const service = getServerSupabase();

    // Self-heal the user/org row if the signup trigger missed it.
    await ensureUserOrg(service, user.id, user.email ?? null, country);

    const { error: updErr } = await service
      .from("users")
      .update({
        full_name,
        country,
        tax_id,
        payout_destination,
        tax_status: tax_status || null,
        telegram_handle: telegram_normalized,
        profile_completed_at: new Date().toISOString(),
      })
      .eq("id", user.id);
    if (updErr) throw updErr;

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("[api/profile] save failed", err);
    Sentry.captureException(err, { tags: { endpoint: "profile" }, extra: { userId: user.id } });
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }
}
