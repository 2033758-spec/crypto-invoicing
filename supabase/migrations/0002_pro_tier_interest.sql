-- 0002_pro_tier_interest.sql — Pro tier fake-door lead capture
--
-- DESIGN NOTE: Q1 measures Pro demand WITHOUT building Stripe billing.
-- Landing has a "Pro tier" modal — visitor submits email + checks which
-- features motivated them. We collect signal, ship Stripe in Q2 only if
-- conversion threshold met (per decisions_log fake-door validation pattern).
--
-- NO org_id — это pre-signup lead, как waitlist_signups. Если конвертим
-- в paying user, копируем в users.* при первой подписке.

CREATE TABLE IF NOT EXISTS pro_tier_interest (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email                text NOT NULL,
  -- Array of feature-ids checked in modal (e.g. {'afip_auto','batch_export','priority_support'}).
  features_interested  text[] DEFAULT '{}',
  -- Open-ended "what else would you pay for" field — high-signal for roadmap.
  free_text            text,
  utm_source           text,
  user_agent           text,
  ip_address           inet,
  created_at           timestamptz DEFAULT now(),
  -- Toggle when we ship Pro and email the lead. Lets us measure waitlist→activation.
  notified_when_ready  boolean DEFAULT false
);

CREATE INDEX IF NOT EXISTS pro_tier_interest_email_idx
  ON pro_tier_interest (email);
CREATE INDEX IF NOT EXISTS pro_tier_interest_created_idx
  ON pro_tier_interest (created_at DESC);

ALTER TABLE pro_tier_interest ENABLE ROW LEVEL SECURITY;

-- API route inserts via service_role key → bypasses RLS, but we declare
-- the policy explicitly for defence-in-depth + audit clarity.
CREATE POLICY "Allow service role insert"
  ON pro_tier_interest FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Allow service role read"
  ON pro_tier_interest FOR SELECT
  TO service_role
  USING (true);

COMMENT ON TABLE pro_tier_interest IS
  'Fake-door lead capture для Pro tier validation. Q1 measure demand without Stripe billing.';
