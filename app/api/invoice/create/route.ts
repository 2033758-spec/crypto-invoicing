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
import * as Sentry from "@sentry/nextjs";
import { getServerActionSupabase, getServerSupabase } from "../../../lib/supabase";
import { ensureUserOrg } from "../../../lib/provision";
import { notifyFounder, tgEscape } from "../../../lib/telegram";
import { checkRateLimit, getClientIp } from "../../../lib/rate-limit";

interface LineItemIn {
  description?: string;
  qty?: number | string;
  unit_price?: number | string;
}
interface RecipientIn {
  name?: string;
  company?: string;
  address?: string;
  country?: string;
  tax_id?: string;
  email?: string;
}
interface Body {
  client_name?: string;
  client_email?: string;
  amount_usd?: number | string;
  description?: string;
  country?: "AR" | "BR";
  // v1 rich invoice (optional — legacy callers still send only the above)
  recipient?: RecipientIn;
  line_items?: LineItemIn[];
  terms_notes?: string;
}

const EMAIL_RE = /^\S+@\S+\.\S+$/;
const SAFE_ADDRESS = process.env.SAFE_MULTISIG_ADDRESS || "";

function num(v: unknown): number {
  return typeof v === "number" ? v : parseFloat(String(v));
}
function s(v: unknown, max: number): string | null {
  const t = typeof v === "string" ? v.trim() : "";
  return t ? t.slice(0, max) : null;
}

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

  // Line items (v1 rich). Server computes every amount + the total — never
  // trust client-sent totals (money-path).
  const lineItems: { description: string; qty: number; unit_price: number; amount: number }[] = [];
  if (Array.isArray(body.line_items)) {
    if (body.line_items.length > 50) {
      return NextResponse.json({ error: "Too many line items (max 50)" }, { status: 400 });
    }
    for (const raw of body.line_items) {
      const description = s(raw?.description, 200);
      if (!description) continue; // skip blank rows
      const qty = num(raw?.qty);
      const unit_price = num(raw?.unit_price);
      if (!Number.isFinite(qty) || qty <= 0 || qty > 100_000) {
        return NextResponse.json({ error: "Invalid item quantity" }, { status: 400 });
      }
      if (!Number.isFinite(unit_price) || unit_price < 0 || unit_price > 1_000_000) {
        return NextResponse.json({ error: "Invalid item price" }, { status: 400 });
      }
      lineItems.push({ description, qty, unit_price, amount: Math.round(qty * unit_price * 100) / 100 });
    }
  }

  // amount_usd = computed total when items present (legacy: from body.amount_usd).
  const amount_usd =
    lineItems.length > 0
      ? Math.round(lineItems.reduce((acc, it) => acc + it.amount, 0) * 100) / 100
      : num(body.amount_usd);
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

  // Get user's organization for multi-tenant scoping. Use a service-role lookup
  // (bypasses RLS) that self-heals a missing user/org row, so this can never
  // fail with "Organization not configured" again.
  const service = getServerSupabase();
  let orgId: string;
  try {
    orgId = await ensureUserOrg(service, user.id, user.email ?? null, country);
  } catch (err) {
    console.error("[invoice/create] ensureUserOrg failed", err);
    Sentry.captureException(err, {
      tags: { endpoint: "invoice/create", type: "org_provision" },
      extra: { userId: user.id },
      level: "error",
    });
    return NextResponse.json(
      { error: "Could not set up your account. Please try again." },
      { status: 500 },
    );
  }

  // Build factura-E fields. Issuer snapshot is read from the user's profile
  // (denormalized into the invoice so historical CUIT/punto-venta stay correct).
  const { data: profile } = await service
    .from("users")
    .select("legal_name, full_name, tax_id, fiscal_address, iva_condition, punto_venta, email")
    .eq("id", user.id)
    .maybeSingle();

  // No email in the snapshot — it ends up on the public hosted page payload and
  // the issuer never consented to publish it (tester SEC PII finding).
  const issuer_snapshot = {
    legal_name: profile?.legal_name || profile?.full_name || null,
    cuit: profile?.tax_id || null,
    fiscal_address: profile?.fiscal_address || null,
    iva_condition: profile?.iva_condition || null,
    punto_venta: profile?.punto_venta || null,
  };

  const recipient = body.recipient
    ? {
        name: s(body.recipient.name, 120),
        company: s(body.recipient.company, 120),
        address: s(body.recipient.address, 200),
        country: s(body.recipient.country, 60),
        tax_id: s(body.recipient.tax_id, 60),
        email: s(body.recipient.email, 160),
      }
    : null;

  // IVA exento (export of services) → total = subtotal.
  const total_usd = amount_usd;
  const subtotal_usd = amount_usd;
  const payment = SAFE_ADDRESS ? { usdc_address: SAFE_ADDRESS, network: "base", reference: null } : null;

  // Insert via service-role (bypasses RLS, incl. the RETURNING select) so a
  // policy quirk can't reject a legitimate, already-authenticated write.
  const { data: inserted, error: insertError } = await service
    .from("invoice_requests")
    .insert({
      user_id: user.id,
      org_id: orgId,
      client_name,
      client_email: client_email || null,
      amount_usd,
      description,
      country,
      // v1 rich fields (additive; null/[] when legacy caller omits them)
      recipient,
      line_items: lineItems,
      issuer_snapshot,
      subtotal_usd,
      total_usd,
      tax_note: "IVA exento — exportación de servicios",
      terms_notes: s(body.terms_notes, 500),
      currency: "USD",
      payment,
    })
    .select(
      "id, client_name, client_email, amount_usd, description, country, status, created_at, public_token",
    )
    .single();

  if (insertError || !inserted) {
    console.error("[invoice/create] insert failed", insertError);
    Sentry.captureException(insertError || new Error("Invoice insert failed"), {
      tags: { endpoint: "invoice/create", type: "insert" },
      extra: { userId: user.id, orgId },
      level: "error",
    });
    return NextResponse.json(
      { error: "Could not save your invoice request" },
      { status: 500 },
    );
  }

  // Notify founder with timeout + error handling
  const notifyMessage =
    `<b>🧾 New invoice request</b>\n\n` +
    `From: <code>${tgEscape(user.email)}</code> (user <code>${tgEscape(user.id)}</code>)\n` +
    `Client: <code>${tgEscape(client_name)}</code>${client_email ? ` &lt;<code>${tgEscape(client_email)}</code>&gt;` : ""}\n` +
    `Amount: <code>USD ${amount_usd.toFixed(2)}</code>\n` +
    `Country: <code>${tgEscape(country)}</code>\n` +
    (description ? `\nDescription:\n${tgEscape(description)}\n` : "") +
    `\nRequest ID: <code>${tgEscape(inserted.id)}</code>\n` +
    `Next: provision Safe address, mark <code>payment_link_ready</code>.`;

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
