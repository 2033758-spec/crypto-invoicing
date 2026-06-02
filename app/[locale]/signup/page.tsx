import { unstable_setRequestLocale } from "next-intl/server";
import SignupForm from "./SignupForm";

// /[locale]/signup — passwordless email magic-link sign-up.
//
// Founder rewrite v2 (2026-05-26): replaces the previous LeadModal flow.
// Email → Supabase magic link → user clicks link → /auth/callback exchanges
// the code for a session → user lands on /dashboard. No password, no
// country dropdown (we collect that inside the dashboard later).

export default function SignupPage({
  params,
}: {
  params: { locale: string };
}) {
  unstable_setRequestLocale(params.locale);
  return <SignupForm locale={params.locale} />;
}
