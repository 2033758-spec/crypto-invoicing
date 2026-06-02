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
