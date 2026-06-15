// /api/invoice/list — return the authenticated user's invoice requests.
//
// Reads via cookie-bound supabase client; RLS guarantees we only see the
// caller's own rows (policy: `user_id = auth.uid()`). Newest first.
//
// Query params:
//   ?offset=0&limit=50  — pagination (default: offset=0, limit=50)

import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { getServerActionSupabase } from "../../../lib/supabase";

export async function GET(request: NextRequest) {
  const cookieStore = cookies();
  const supabase = getServerActionSupabase(cookieStore);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  // Parse pagination params
  const searchParams = request.nextUrl.searchParams;
  const offset = Math.max(0, parseInt(searchParams.get("offset") || "0", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10))); // Max 100

  const { data, error, count } = await supabase
    .from("invoice_requests")
    .select(
      "id, client_name, client_email, amount_usd, description, country, status, usdc_address, payment_link_sent_at, created_at, public_token, recipient, line_items",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("[invoice/list] select failed", error);
    return NextResponse.json(
      { error: "Could not load your invoice requests" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    requests: data ?? [],
    pagination: {
      offset,
      limit,
      total: count ?? 0,
      hasMore: offset + limit < (count ?? 0),
    },
  });
}
