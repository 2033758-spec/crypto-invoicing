// /api/invoice/create — user submits a new invoice request from the dashboard.
//
// Flow (Q1 concierge MVP):
//   1. User fills form: client name, email, amount USD, description, country
//   2. We validate, insert into `public.invoice_requests` with status
//      `pending_setup`
//   3. Fire Telegram alert to founder so they can provision a Safe address
//   4. Return the new record so the dashboard can show it immediately
//
// Auth: cookie-bound supabase client — only authenticated users.

import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { getServerActionSupabase } from "../../../lib/supabase";
import { notifyFounder } from "../../../lib/telegram";
import { checkRateLimit, getClientIp } from "../../../lib/rate-limit";

interface Body {
  client_name?: string;
  client_email?: string;
  amount_usd?: number | string;
  description?: string;
  country?: "AR" | "BR";
}

const EMAIL_RE = /^\S+@\S+\.\S+$/;

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Validate
  const client_name =
    typeof body.client_name === "string" ? body.client_name.trim() : "";
  if (!client_name || client_name.length > 120) {
    return NextResponse.json(
      { error: "client_name required (≤120 chars)" },
      { status: 400 },
    );
  }

  const client_email =
    typeof body.client_email === "string" ? body.client_email.trim() : "";
  if (client_email && !EMAIL_RE.test(client_email)) {
    return NextResponse.json({ error: "Invalid client_email" }, { status: 400 });
  }

  const amount_raw = body.amount_usd;
  const amount_usd =
    typeof amount_raw === "number" ? amount_raw : parseFloat(String(amount_raw));
  if (!Number.isFinite(amount_usd) || amount_usd <= 0 || amount_usd > 1_000_000) {
    return NextResponse.json(
      { error: "amount_usd must be a positive number ≤ 1,000,000" },
      { status: 400 },
    );
  }

  const country = body.country;
  if (country !== "AR" && country !== "BR") {
    return NextResponse.json(
      { error: "country must be 'AR' or 'BR'" },
      { status: 400 },
    );
  }

  const description =
    typeof body.description === "string"
      ? body.description.trim().slice(0, 500)
      : null;

  // Auth + rate limit
  const cookieStore = cookies();
  const supabase = getServerActionSupabase(cookieStore);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  // Rate limit: max 10 invoices per hour per user (prevents spam/DoS)
  // Use user.id as the rate limit key instead of IP (authenticated users)
  const rateLimit = checkRateLimit(user.id, "/api/invoice/create", 10, 3600000);
  if (!rateLimit.allowed) {
    console.warn(`[invoice/create] Rate limit exceeded for user ${user.id}`);
    return NextResponse.json(
      { error: "Too many invoice requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSec || 60) } },
    );
  }

  const { data: inserted, error: insertError } = await supabase
    .from("invoice_requests")
    .insert({
      user_id: user.id,
      client_name,
      client_email: client_email || null,
      amount_usd,
      description,
      country,
    })
    .select(
      "id, client_name, client_email, amount_usd, description, country, status, created_at",
    )
    .single();

  if (insertError || !inserted) {
    console.error("[invoice/create] insert failed", insertError);
    return NextResponse.json(
      { error: "Could not save your invoice request" },
      { status: 500 },
    );
  }

  // Notify founder with timeout + error handling
  const notifyMessage =
    `*🧾 New invoice request*\n\n` +
    `From: \`${user.email}\` (user \`${user.id}\`)\n` +
    `Client: \`${client_name}\`${client_email ? ` <\`${client_email}\`>` : ""}\n` +
    `Amount: \`USD ${amount_usd.toFixed(2)}\`\n` +
    `Country: \`${country}\`\n` +
    (description ? `\nDescription:\n${description}\n` : "") +
    `\nRequest ID: \`${inserted.id}\`\n` +
    `Next: provision Safe address, mark \`payment_link_ready\`.`;

  try {
    // Await with 5s timeout so we don't block response indefinitely
    const notifyPromise = notifyFounder(notifyMessage);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Telegram timeout")), 5000)
    );
    await Promise.race([notifyPromise, timeoutPromise]);
  } catch (err) {
    // Log but don't fail request — invoice is already saved
    console.error("[invoice/create] Telegram notification failed:", err instanceof Error ? err.message : String(err));
    // TODO: Queue to notification_queue table for retry worker (W8+)
  }

  return NextResponse.json({ ok: true, request: inserted }, { status: 200 });
}
