// /api/send-email-hook — Supabase Auth Hook for magic-link emails
// Called by Supabase Auth when an email needs to be sent (magic-link, password reset, etc.)
// Forwards to Resend API for delivery

import { NextResponse } from 'next/server';

interface AuthEmailPayload {
  user?: { email?: string; id?: string };
  email?: string;
  token?: string;
  type?: string;
}

export async function POST(req: Request) {
  console.log('[send-email-hook] Received request');
  console.log('[send-email-hook] Headers:', Object.fromEntries(req.headers));

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.error('[send-email-hook] RESEND_API_KEY not set');
    return NextResponse.json({ error: 'Not configured' }, { status: 500 });
  }

  let payload: AuthEmailPayload;
  try {
    payload = await req.json();
    console.log('[send-email-hook] Payload:', { email: payload.email || payload.user?.email });
  } catch (err) {
    console.error('[send-email-hook] JSON parse error:', err);
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  const userEmail = payload.email || payload.user?.email;
  const token = payload.token;

  if (!userEmail || !token) {
    console.warn('[send-email-hook] Missing email or token');
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  try {
    // Build magic-link
    const magicLink = `https://www.cryptoinvoicing.co/auth/callback?token_hash=${token}&type=${payload.type || 'email'}`;

    // Send via Resend
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'hola@cryptoinvoicing.com',
        to: userEmail,
        subject: 'Tu link mágico para Crypto Invoicing',
        html: `<h2>Bienvenido a Crypto Invoicing</h2><p><a href="${magicLink}">Confirmar email</a></p>`,
      }),
    });

    if (!res.ok) {
      console.error('[send-email-hook] Resend error:', res.status);
      return NextResponse.json({ error: 'Email failed' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[send-email-hook] Error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
