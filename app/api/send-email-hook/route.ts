// /api/send-email-hook — Supabase Auth Hook for magic-link emails
// Called by Supabase Auth when an email needs to be sent (magic-link, password reset, etc.)
// Forwards to Resend API for delivery with exponential backoff retry

import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { checkRateLimit } from '../../lib/rate-limit';

interface AuthEmailPayload {
  user?: { email?: string; id?: string };
  email?: string;
  token?: string;
  type?: string;
}

// Retry with exponential backoff for transient failures
async function sendWithRetry(payload: any, resendKey: string, maxAttempts = 3): Promise<Response> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: payload,
      });

      // Success
      if (res.ok) return res;

      // Permanent failure (4xx except 429)
      if (res.status >= 400 && res.status < 500 && res.status !== 429) {
        return res;
      }

      // Transient failure (429, 5xx) — retry with backoff
      if (attempt < maxAttempts - 1) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }

      return res;
    } catch (err) {
      if (attempt < maxAttempts - 1) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
  throw new Error('Max retries exceeded');
}

export async function POST(req: Request) {
  console.log('[send-email-hook] Processing magic-link request');

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    const err = new Error('RESEND_API_KEY not configured');
    Sentry.captureException(err, { tags: { endpoint: 'send-email-hook' } });
    console.error('[send-email-hook] RESEND_API_KEY not set');
    return NextResponse.json({ error: 'Not configured' }, { status: 500 });
  }

  let payload: AuthEmailPayload;
  try {
    payload = await req.json();
    console.log('[send-email-hook] Payload:', { email: payload.email || payload.user?.email });
  } catch (err) {
    console.error('[send-email-hook] JSON parse error:', err);
    Sentry.captureException(err, { tags: { endpoint: 'send-email-hook', type: 'parse' } });
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  const userEmail = payload.email || payload.user?.email;
  const token = payload.token;

  if (!userEmail || !token) {
    console.warn('[send-email-hook] Missing email or token');
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  // Abuse guard. This endpoint sends a branded magic-link email from our verified
  // Resend domain — unthrottled it can email-bomb arbitrary victims or burn the
  // Resend quota. Requests arrive from Supabase's IP (not the end user), so a
  // per-caller-IP limit is useless; we cap per-target-email + a global backstop.
  // Follow-up (tracked): also verify the Supabase Send-Email-Hook Standard-Webhooks
  // signature for full origin auth — rate-limiting is the immediate mitigation.
  const perEmail = checkRateLimit(userEmail.toLowerCase(), 'send-email-hook:email', 3, 10 * 60 * 1000);
  const globalCap = checkRateLimit('all', 'send-email-hook:global', 60, 60 * 1000);
  if (!perEmail.allowed || !globalCap.allowed) {
    console.warn('[send-email-hook] rate limit hit', { perEmail: !perEmail.allowed, global: !globalCap.allowed });
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    // Build magic-link with URL-encoded token
    const magicLink = `https://cryptoinvoicing.co/auth/callback?token_hash=${encodeURIComponent(token)}&type=${encodeURIComponent(payload.type || 'email')}`;

    const emailPayload = JSON.stringify({
      from: 'hola@cryptoinvoicing.co',
      to: userEmail,
      subject: 'Tu link mágico para Crypto Invoicing',
      html: `<h2>Bienvenido a Crypto Invoicing</h2><p><a href="${magicLink}">Confirmar email</a></p>`,
    });

    // Send via Resend with retry logic
    const res = await sendWithRetry(emailPayload, resendKey);

    if (!res.ok) {
      const status = res.status;
      console.error('[send-email-hook] Resend error:', status, await res.text());

      // Return 503 for transient errors so Supabase retries
      if (status === 429 || status >= 500) {
        return NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 503 });
      }

      // Return 400 for permanent errors
      return NextResponse.json({ error: 'Invalid email or configuration' }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[send-email-hook] Fatal error:', err instanceof Error ? err.message : String(err));
    // Transient error — Supabase will retry
    return NextResponse.json({ error: 'Temporary failure' }, { status: 503 });
  }
}
