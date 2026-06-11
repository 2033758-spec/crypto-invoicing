// /api/concierge-request — user clicks «Set up first invoice» in dashboard.
//
// Q1 is concierge mode: no programmatic invoice flow yet (target W7-W12).
// Until then, this endpoint surfaces user intent to the founder via Telegram
// so the founder can DM the user back, schedule a 15-min call, and walk
// through their first manual invoice.
//
// Auth: only authenticated users (cookie-bound supabase client). We read the
// session to attach the user's email + id automatically — request body is
// just `{ note?: string }` if user wants to leave context.

import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { getServerActionSupabase } from "../../lib/supabase";
import { notifyFounder, tgEscape } from "../../lib/telegram";

interface Body {
  note?: string;
}

export async function POST(req: NextRequest) {
  let body: Body = {};
  try {
    body = (await req.json()) as Body;
  } catch {
    // empty body is fine
  }

  const cookieStore = cookies();
  const supabase = getServerActionSupabase(cookieStore);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const email = user.email || "—";
  const provider = user.app_metadata?.provider || "—";
  const userId = user.id;
  const note =
    typeof body.note === "string" ? body.note.slice(0, 500) : "";

  // Fire-and-forget Telegram. We don't block the response on it.
  void notifyFounder(
    `<b>📞 Concierge request</b>\n\n` +
      `User clicked «Set up first invoice» in dashboard.\n\n` +
      `Email: <code>${tgEscape(email)}</code>\n` +
      `Provider: <code>${tgEscape(provider)}</code>\n` +
      `User ID: <code>${tgEscape(userId)}</code>\n` +
      (note ? `\nNote from user:\n${tgEscape(note)}\n` : "") +
      `\nDM them to schedule a 15-min call.`,
  );

  return NextResponse.json({ ok: true });
}
