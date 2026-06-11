import type { SupabaseClient } from "@supabase/supabase-js";

// Returns the caller's org_id, provisioning the organization + user row if the
// signup trigger never created it. MUST be called with a SERVICE-ROLE client so
// it bypasses RLS (the read is otherwise gated by policies). This is the single
// source of truth for "ensure this user has an org" — used by /api/profile and
// /api/invoice/create so "Organization not configured" can never surface.
export async function ensureUserOrg(
  service: SupabaseClient,
  userId: string,
  email: string | null,
  country: "AR" | "BR" = "AR",
): Promise<string> {
  const { data: existing } = await service
    .from("users")
    .select("org_id")
    .eq("id", userId)
    .maybeSingle();
  if (existing?.org_id) return existing.org_id as string;

  // No row (or somehow no org) — provision deterministically. Slug derived from
  // the user id so concurrent calls converge on the same org via upsert.
  const slug = "org-" + userId.replace(/-/g, "");
  const { data: org, error: orgErr } = await service
    .from("organizations")
    .upsert({ slug, name: email ?? "Personal" }, { onConflict: "slug" })
    .select("id")
    .single();
  if (orgErr || !org) throw orgErr || new Error("org provisioning failed");

  if (!existing) {
    const { error: insErr } = await service
      .from("users")
      .insert({ id: userId, org_id: org.id, email, country });
    // Ignore unique-violation races (another request provisioned first).
    if (insErr && insErr.code !== "23505") throw insErr;
  }
  return org.id as string;
}
