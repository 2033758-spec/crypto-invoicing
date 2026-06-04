import { NextResponse } from 'next/server';

export async function GET() {
  const secret = process.env.SUPABASE_AUTH_WEBHOOK_SECRET;

  if (!secret) {
    return NextResponse.json({ error: 'Secret not set' }, { status: 500 });
  }

  return NextResponse.json({
    secret: secret,
    secretStart: secret.slice(0, 30),
    secretLength: secret.length,
    hasWhsecPrefix: secret.startsWith('v1,whsec_')
  });
}
