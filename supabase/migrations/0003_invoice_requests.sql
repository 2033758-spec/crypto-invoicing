-- 0003_invoice_requests.sql — concierge MVP intake table
--
-- DESIGN NOTE: separate from `public.invoices` (which is the future
-- machine-validated ledger requiring org_id + usdc_address). This table is
-- the user-submitted intake: founder reviews, provisions the Safe address
-- manually, then notifies user. Status `payment_link_ready` is the founder
-- handoff trigger. Once paid, founder copies the record into `invoices`
-- with a real `tx_hash` and marks this request `settled`.
--
-- Why not patch `invoices`: making usdc_address nullable + relaxing org_id
-- breaks downstream code that assumes a fully-formed invoice. Keeping the
-- intake table separate preserves the invariants on the real ledger.

create table if not exists public.invoice_requests (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users(id) on delete cascade,
  -- Form fields collected from dashboard.
  client_name           text not null,
  client_email          text,
  amount_usd            numeric(14, 2) not null check (amount_usd > 0),
  description           text,
  -- Country determines off-ramp partner + tax doc (factura E vs generic PDF).
  country               text not null check (country in ('AR', 'BR')),
  -- Concierge flow status. `pending_setup` = founder hasn't provisioned the
  -- Safe address yet. `payment_link_ready` = address + on-chain monitor
  -- live, user can share with their client. `paid` = USDC received on Base.
  -- `settled` = off-ramped to fiat + delivered to user's bank. `cancelled`
  -- terminal at any stage.
  status                text not null default 'pending_setup'
                        check (status in ('pending_setup', 'payment_link_ready',
                                          'paid', 'settled', 'cancelled')),
  -- Filled by founder once provisioned.
  usdc_address          text,
  payment_link_sent_at  timestamptz,
  -- Founder's internal notes — never shown to user.
  notes                 text,
  created_at            timestamptz not null default now()
);

create index if not exists invoice_requests_user_id_idx on public.invoice_requests(user_id);
create index if not exists invoice_requests_status_idx on public.invoice_requests(status);
create index if not exists invoice_requests_created_at_idx on public.invoice_requests(created_at desc);

comment on table public.invoice_requests is
  'Concierge MVP intake — user-submitted invoice requests. Founder provisions Safe address manually, then promotes to public.invoices once the on-chain leg confirms.';

-- =============================================================================
-- ROW-LEVEL SECURITY
-- =============================================================================
alter table public.invoice_requests enable row level security;

-- User can read their own requests.
drop policy if exists "users read own invoice requests" on public.invoice_requests;
create policy "users read own invoice requests"
  on public.invoice_requests for select
  using (user_id = auth.uid());

-- User can create new requests for themselves.
drop policy if exists "users insert own invoice requests" on public.invoice_requests;
create policy "users insert own invoice requests"
  on public.invoice_requests for insert
  with check (user_id = auth.uid());

-- User cannot update or delete (only founder via service_role).
-- Founder updates status / usdc_address from Supabase Dashboard or via
-- service-role key from a backoffice script (TODO Q1 W7).
