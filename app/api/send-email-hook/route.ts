// /api/send-email-hook — Supabase Auth Hook for Send Email events
//
// This endpoint is called by Supabase Auth hooks when an email needs to be sent.
// Validates Standard Webhooks (svix) signature and forwards to Resend API.
//
// Webhook signature validation is CRITICAL to prevent unauthorized email sends.

import { NextResponse } from 'next/server';
import crypto from 'node:crypto';

interface SendEmailPayload {
  user?: {
    email?: string;
    id?: string;
  };
  email?: string;
  token?: string;
  type?: string;
  email_data?: {
    confirmation_link?: string;
    email?: string;
  };
}

export async function POST(req: Request) {
  const secret = process.env.SUPABASE_AUTH_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[send-email-hook] SUPABASE_AUTH_WEBHOOK_SECRET unset');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  // Get signature header — can be svix-signature or x-webhook-secret
  const svixSig = req.headers.get('svix-signature');
  const xWebhookSig = req.headers.get('x-webhook-secret');
  const signature = svixSig || xWebhookSig;

  if (!signature) {
    console.error('[send-email-hook] No signature header found');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const bodyText = await req.text();

  // Validate signature using Standard Webhooks format (v1,<sig>)
  let isValid = false;

  try {
    const parts = signature.split(',');
    if (parts.length === 2) {
      const [version, providedSig] = parts;

      if (version === 'v1') {
        // Extract base64 secret (remove v1,whsec_ prefix)
        const secretBase64 = secret.startsWith('v1,whsec_')
          ? secret.slice(9)
          : secret;

        const secretBytes = Buffer.from(secretBase64, 'base64');
        const expectedSig = crypto
          .createHmac('sha256', secretBytes)
          .update(bodyText, 'utf8')
          .digest('base64');

        isValid = crypto.timingSafeEqual(
          Buffer.from(providedSig),
          Buffer.from(expectedSig)
        );
      }
    }
  } catch (e) {
    console.error('[send-email-hook] Signature validation error:', e);
  }

  if (!isValid) {
    console.error('[send-email-hook] Signature validation failed', {
      hasSignature: !!signature,
      signatureStart: signature?.slice(0, 20),
      secretStart: secret.slice(0, 30)
    });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: SendEmailPayload;
  try {
    body = JSON.parse(bodyText) as SendEmailPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const email = body.email || body.user?.email;
  const token = body.token;
  const type = body.type || 'email_verification';

  if (!email || !token) {
    console.warn('[send-email-hook] Missing email or token', { email, token });
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 }
    );
  }

  try {
    // Send magic-link email via Resend
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.error('[send-email-hook] RESEND_API_KEY not configured');
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 500 }
      );
    }

    const magicLink = `https://www.cryptoinvoicing.co/auth/callback?token_hash=${token}&type=${type}`;

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'hello@cryptoinvoicing.com',
        to: email,
        subject: 'Tu link mágico para Crypto Invoicing',
        html: `
          <h2>Bienvenido a Crypto Invoicing</h2>
          <p>Haz click en el link para confirmar tu email:</p>
          <a href="${magicLink}" style="background-color: #69dab6; color: #0f1513; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
            Confirmar email
          </a>
          <p>O copia este link:</p>
          <p><code>${magicLink}</code></p>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const error = await emailResponse.text();
      console.error('[send-email-hook] Resend failed', {
        status: emailResponse.status,
        error,
      });
      return NextResponse.json(
        { error: 'Failed to send email' },
        { status: 500 }
      );
    }

    console.log('[send-email-hook] Email sent successfully', { email });
    return NextResponse.json({ ok: true }, { status: 200 });

  } catch (err) {
    console.error('[send-email-hook] Unexpected error', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
