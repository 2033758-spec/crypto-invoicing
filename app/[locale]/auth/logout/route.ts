import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { getServerActionSupabase } from "../../../lib/supabase";

export async function GET(request: NextRequest) {
  const cookieStore = cookies();
  const supabase = getServerActionSupabase(cookieStore);

  // Sign out the user (clears session cookies)
  await supabase.auth.signOut();

  // Redirect to home
  const origin = new URL(request.url).origin;
  return NextResponse.redirect(new URL("/", origin));
}
