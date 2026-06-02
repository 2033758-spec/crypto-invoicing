-- 0001_init.sql — Crypto Invoicing initial schema
--
-- DESIGN NOTE: org_id is present on every tenant-owned table from day 1,
-- even though Q1 has 1 user = 1 org. This is intentional per decisions_log
-- 2026-05-12 ("org_id multi-tenant W7 — saves Q3 full rewrite"). Adding
-- org_id later means rewriting every RLS policy + every query.
--
-- waitlist_signups is the only table WITHOUT org_id — это pre-signup events,
-- лид может вообще не сконвертиться в user/org.

-- =============================================================================
-- ORGANIZATIONS
-- =============================================================================
create table if not exists public.organizations (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  name        text not null,
  created_at  timestamptz not null default now()
);

comment on table public.organizations is
  'Tenant root. Q1: 1 user = 1 org (auto-created on signup). Q3+: real multi-seat orgs.';

-- =============================================================================
-- USERS
-- =============================================================================
-- We mirror supabase auth.users via id (1:1) для удобства joins,
-- but tax_id/country/telegram_handle живут здесь — auth.users.raw_user_meta_data
-- неудобен для запросов.
create table if not exists public.users (
  id               uuid primary key references auth.users(id) on delete cascade,
  org_id           uuid not null references public.organizations(id) on delete cascade,
  email            text unique not null,
  telegram_handle  text,
  country          text not null check (country in ('AR', 'BR')),
  -- tax_id (CUIT for AR, CPF for BR) is nullable in W1 concierge phase:
  -- we onboard before they finish AFIP/Receita registration.
  tax_id           text,
  created_at       timestamptz not null default now()
);

create index if not exists users_org_id_idx on public.users(org_id);
create index if not exists users_email_idx on public.users(email);

comment on table public.users is
  'App-level user profile. Mirrors auth.users(id). tax_id nullable W1 (concierge onboarding before AFIP/CPF registration finishes).';

-- =============================================================================
-- WAITLIST_SIGNUPS (pre-signup, NO org_id)
-- =============================================================================
create table if not exists public.waitlist_signups (
  id                uuid primary key default gen_random_uuid(),
  email             text not null,
  -- Snapshot of Calculadora state at submit time: { amount, country, method,
  -- monthlySavings, yearlySavings, ... }. Lets us segment outreach by ICP signal.
  calculator_data   jsonb,
  -- utm_source/utm_medium/utm_campaign or HTTP Referer fallback.
  source            text,
  created_at        timestamptz not null default now()
);

create index if not exists waitlist_signups_email_idx on public.waitlist_signups(email);
create index if not exists waitlist_signups_created_at_idx on public.waitlist_signups(created_at desc);

comment on table public.waitlist_signups is
  'Pre-signup leads from Calculadora landing. NO org_id — lead may never convert. Convert to users.* on real signup.';

-- =============================================================================
-- INVOICES
-- =============================================================================
create table if not exists public.invoices (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references public.organizations(id) on delete cascade,
  user_id       uuid not null references public.users(id) on delete cascade,
  client_name   text not null,
  client_email  text,
  amount_usd    numeric(14, 2) not null check (amount_usd > 0),
  usdc_address  text not null,
  status        text not null default 'pending'
                check (status in ('pending', 'paid', 'cancelled', 'settled')),
  -- On-chain tx hash after USDC received on Base. Nullable while pending.
  tx_hash       text,
  created_at    timestamptz not null default now(),
  paid_at       timestamptz
);

create index if not exists invoices_org_id_idx on public.invoices(org_id);
create index if not exists invoices_user_id_idx on public.invoices(user_id);
create index if not exists invoices_status_idx on public.invoices(status);
create index if not exists invoices_tx_hash_idx on public.invoices(tx_hash);

comment on table public.invoices is
  'Freelancer-issued invoices. status flow: pending → paid (USDC arrived) → settled (off-ramped to ARS/BRL). cancelled is terminal.';

-- =============================================================================
-- TRANSACTIONS
-- =============================================================================
create table if not exists public.transactions (
  id                  uuid primary key default gen_random_uuid(),
  invoice_id          uuid not null references public.invoices(id) on delete cascade,
  org_id              uuid not null references public.organizations(id) on delete cascade,
  usdc_amount         numeric(18, 6) not null,
  ars_amount          numeric(18, 2),
  brl_amount          numeric(18, 2),
  -- USDC → fiat rate at settlement time (e.g. 1050.50 ARS/USD).
  conversion_rate     numeric(18, 6) not null,
  off_ramp_partner    text not null
                      check (off_ramp_partner in ('binance', 'bybit', 'brla', 'manual')),
  settled_at          timestamptz
);

create index if not exists transactions_invoice_id_idx on public.transactions(invoice_id);
create index if not exists transactions_org_id_idx on public.transactions(org_id);
create index if not exists transactions_settled_at_idx on public.transactions(settled_at desc);

comment on table public.transactions is
  'Off-ramp leg: USDC → ARS/BRL. One invoice can have multiple txs (e.g. partial settlement). Conversion_rate captured per-tx for AFIP/Receita reporting.';

-- =============================================================================
-- ROW-LEVEL SECURITY
-- =============================================================================
-- Pattern: deny-by-default, then allow "user can access rows in their own org".
-- auth.uid() returns the JWT-bound user id; we join → users → org_id.
-- These policies are placeholder — refine per role (owner/member) in W26+.

alter table public.organizations    enable row level security;
alter table public.users            enable row level security;
alter table public.waitlist_signups enable row level security;
alter table public.invoices         enable row level security;
alter table public.transactions     enable row level security;

-- organizations: user can read their own org
drop policy if exists "org members can read own org" on public.organizations;
create policy "org members can read own org"
  on public.organizations for select
  using (
    id in (select org_id from public.users where id = auth.uid())
  );

-- users: user can read own profile + co-org members (Q3 multi-seat ready)
drop policy if exists "users can read own org members" on public.users;
create policy "users can read own org members"
  on public.users for select
  using (
    org_id in (select org_id from public.users where id = auth.uid())
  );

drop policy if exists "users can update own profile" on public.users;
create policy "users can update own profile"
  on public.users for update
  using (id = auth.uid());

-- waitlist_signups: NO public read (only service_role via API route).
-- Inserts from API route bypass RLS via service_role key.
drop policy if exists "waitlist: deny all by default" on public.waitlist_signups;
create policy "waitlist: deny all by default"
  on public.waitlist_signups for select
  using (false);

-- invoices: org-scoped read + insert
drop policy if exists "invoices: org read" on public.invoices;
create policy "invoices: org read"
  on public.invoices for select
  using (
    org_id in (select org_id from public.users where id = auth.uid())
  );

drop policy if exists "invoices: org insert" on public.invoices;
create policy "invoices: org insert"
  on public.invoices for insert
  with check (
    org_id in (select org_id from public.users where id = auth.uid())
  );

drop policy if exists "invoices: org update" on public.invoices;
create policy "invoices: org update"
  on public.invoices for update
  using (
    org_id in (select org_id from public.users where id = auth.uid())
  );

-- transactions: org-scoped read (writes via service_role from webhook handler)
drop policy if exists "transactions: org read" on public.transactions;
create policy "transactions: org read"
  on public.transactions for select
  using (
    org_id in (select org_id from public.users where id = auth.uid())
  );
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
