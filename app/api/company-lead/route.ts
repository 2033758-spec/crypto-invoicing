// /api/company-lead — demand smoke-test for the company/payroll side.
//
// Public (no auth) → rate-limited + honeypot. Inserts into company_leads via
// service-role (deny-all RLS) and pings the founder on Telegram. Does NOT revive
// the deprecated /api/lead surface — fresh, narrow, guarded endpoint.

import { NextResponse, type NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getServerSupabase } from "../../lib/supabase";
import { notifyFounder, tgEscape } from "../../lib/telegram";
import { checkRateLimit, getClientIp } from "../../lib/rate-limit";

const EMAIL_RE = /^\S+@\S+\.\S+$/;

interface Body {
  company?: string;
  contact_name?: string;
  email?: string;
  headcount?: string;
  message?: string;
  website?: string; // honeypot — must stay empty
}

function s(v: unknown, max: number): string {
  return (typeof v === "string" ? v.trim() : "").slice(0, max);
}

export async function POST(req: NextRequest) {
  // Rate limit by IP — public endpoint, the abuse lesson from /api/lead.
  const ip = getClientIp(req);
  const rl = checkRateLimit(ip, "/api/company-lead", 5, 3600000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Honeypot — bots fill hidden fields; humans never see it.
  if (s(body.website, 100)) {
    return NextResponse.json({ ok: true }, { status: 200 }); // pretend success
  }

  const company = s(body.company, 120);
  const email = s(body.email, 160);
  const contact_name = s(body.contact_name, 120);
  const headcount = s(body.headcount, 40);
  const message = s(body.message, 1000);
  const source = s(req.headers.get("referer"), 300);

  if (!company) {
    return NextResponse.json({ field: "company", error: "required" }, { status: 400 });
  }
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ field: "email", error: "invalid" }, { status: 400 });
  }

  try {
    const service = getServerSupabase();
    const { error } = await service.from("company_leads").insert({
      company,
      contact_name: contact_name || null,
      email,
      headcount: headcount || null,
      message: message || null,
      source: source || null,
    });
    if (error) throw error;
  } catch (err) {
    console.error("[company-lead] insert failed", err);
    Sentry.captureException(err, { tags: { endpoint: "company-lead" } });
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }

  // Notify founder (fire-and-forget with timeout — Telegram down must not fail it).
  const msg =
    `<b>🏢 Company lead</b>\n\n` +
    `Company: <code>${tgEscape(company)}</code>\n` +
    `Email: <code>${tgEscape(email)}</code>\n` +
    (contact_name ? `Contact: <code>${tgEscape(contact_name)}</code>\n` : "") +
    (headcount ? `Headcount: <code>${tgEscape(headcount)}</code>\n` : "") +
    (message ? `\n${tgEscape(message)}\n` : "");
  try {
    await Promise.race([
      notifyFounder(msg),
      new Promise((_, rej) => setTimeout(() => rej(new Error("tg timeout")), 5000)),
    ]);
  } catch (err) {
    console.error("[company-lead] telegram failed", err instanceof Error ? err.message : String(err));
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
