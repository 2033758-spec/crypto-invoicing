// /api/auth-hook — Supabase Database Webhook receiver for `auth.users` INSERT.
//
// Configured in Supabase Dashboard → Database → Webhooks (see
// SUPABASE_AUTH_WEBHOOK_SETUP.md). Fires once per new user (Google OAuth or
// email magic-link) and forwards a Markdown summary to the founder's
// Telegram bot.
//
// Auth: shared secret in the `X-Webhook-Secret` header (env
// SUPABASE_AUTH_WEBHOOK_SECRET). Tampering returns 401. Without this,
// anybody could spam the bot by calling this endpoint directly.
//
// Replaces the old `/api/lead` `notifyFounder()` ping (route deprecated
// 2026-05-27, since v3 landing signs up through Supabase Auth directly).

import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { notifyFounder, tgEscape } from "../../lib/telegram";
import { checkRateLimit, getClientIp } from "../../lib/rate-limit";

interface SupabaseWebhookPayload {
  type?: string;
  table?: string;
  schema?: string;
  record?: {
    id?: string;
    email?: string;
    created_at?: string;
    raw_app_meta_data?: { provider?: string; providers?: string[] };
    app_metadata?: { provider?: string };
  };
  old_record?: unknown;
}

// Uses Node's built-in `crypto.timingSafeEqual` to avoid the
// length-comparison leak of a hand-rolled loop. Buffers must be equal length —
// we pad / reject mismatched-length inputs upfront so the call never throws.
function secretsMatch(provided: string, expected: string): boolean {
  if (provided.length !== expected.length) return false;
  return crypto.timingSafeEqual(
    Buffer.from(provided, "utf8"),
    Buffer.from(expected, "utf8"),
  );
}

export async function POST(req: Request) {
  // Rate limit: max 50 signups per hour per IP (prevents spam/DoS)
  const clientIp = getClientIp(req);
  const rateLimit = checkRateLimit(clientIp, "/api/auth-hook", 50, 3600000);
  if (!rateLimit.allowed) {
    console.warn(`[auth-hook] Rate limit exceeded for IP ${clientIp}`);
    return NextResponse.json(
      { error: "Too many signups. Please try again later." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSec || 60) } },
    );
  }

  const expected = process.env.SUPABASE_AUTH_WEBHOOK_SECRET;
  if (!expected) {
    // Misconfigured server — fail closed (don't silently accept).
    console.error(
      "[auth-hook] SUPABASE_AUTH_WEBHOOK_SECRET unset — refusing to accept webhooks",
    );
    return NextResponse.json(
      { error: "Server misconfigured" },
      { status: 500 },
    );
  }

  const provided = req.headers.get("x-webhook-secret") || "";
  if (!secretsMatch(provided, expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: SupabaseWebhookPayload;
  try {
    body = (await req.json()) as SupabaseWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Only fire on auth.users INSERT. Ignore everything else (UPDATE, DELETE,
  // other tables) — defensive guard for misconfigured webhooks.
  const isAuthUsersInsert =
    body.type === "INSERT" &&
    body.table === "users" &&
    body.schema === "auth";
  if (!isAuthUsersInsert) {
    return NextResponse.json({ ok: true, skipped: true }, { status: 200 });
  }

  const user = body.record || {};
  const email = user.email || "—";
  const provider =
    user.app_metadata?.provider ||
    user.raw_app_meta_data?.provider ||
    "email";
  const createdAt = user.created_at || new Date().toISOString();

  // Fire-and-forget Telegram alert. If the bot is down, we still return 200
  // so Supabase doesn't keep retrying (the signup itself already succeeded).
  void notifyFounder(
    `<b>🆕 New signup</b>\n\n` +
      `Email: <code>${tgEscape(email)}</code>\n` +
      `Provider: <code>${tgEscape(provider)}</code>\n` +
      `At: <code>${tgEscape(createdAt)}</code>`,
  );

  return NextResponse.json({ ok: true }, { status: 200 });
}
