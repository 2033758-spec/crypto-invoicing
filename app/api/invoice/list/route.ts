// /api/invoice/list — return the authenticated user's invoice requests.
//
// Reads via cookie-bound supabase client; RLS guarantees we only see the
// caller's own rows (policy: `user_id = auth.uid()`). Newest first.

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServerActionSupabase } from "../../../lib/supabase";

export async function GET() {
  const cookieStore = cookies();
  const supabase = getServerActionSupabase(cookieStore);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("invoice_requests")
    .select(
      "id, client_name, client_email, amount_usd, description, country, status, usdc_address, payment_link_sent_at, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("[invoice/list] select failed", error);
    return NextResponse.json(
      { error: "Could not load your invoice requests" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, requests: data ?? [] });
}
