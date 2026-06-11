-- 0007_ensure_invoice_requests.sql
--
-- Safety net for "Could not save your invoice request": if prod was bootstrapped
-- from the combined SQL that only carried 0001+0002 (audit finding B15), the
-- invoice_requests table / org_id column / RLS policies may be missing. This
-- re-applies 0003 + 0004 idempotently — a no-op if everything already exists.
--
-- Apply: Supabase Dashboard → SQL Editor → Run. Idempotent.

create table if not exists public.invoice_requests (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users(id) on delete cascade,
  client_name           text not null,
  client_email          text,
  amount_usd            numeric(14, 2) not null check (amount_usd > 0),
  description           text,
  country               text not null check (country in ('AR', 'BR')),
  status                text not null default 'pending_setup'
                        check (status in ('pending_setup', 'payment_link_ready',
                                          'paid', 'settled', 'cancelled')),
  usdc_address          text,
  payment_link_sent_at  timestamptz,
  notes                 text,
  created_at            timestamptz not null default now()
);

-- 0004: org_id (multi-tenant key), nullable for Q1.
alter table public.invoice_requests
  add column if not exists org_id uuid references public.organizations(id) on delete cascade;

create index if not exists invoice_requests_user_id_idx    on public.invoice_requests(user_id);
create index if not exists invoice_requests_status_idx     on public.invoice_requests(status);
create index if not exists invoice_requests_created_at_idx on public.invoice_requests(created_at desc);
create index if not exists invoice_requests_org_id_idx     on public.invoice_requests(org_id);
create index if not exists invoice_requests_org_user_idx   on public.invoice_requests(org_id, user_id);

alter table public.invoice_requests enable row level security;

drop policy if exists "users read own invoice requests" on public.invoice_requests;
create policy "users read own invoice requests"
  on public.invoice_requests for select
  using (user_id = auth.uid());

drop policy if exists "users insert own invoice requests" on public.invoice_requests;
create policy "users insert own invoice requests"
  on public.invoice_requests for insert
  with check (user_id = auth.uid());
-- Updates/deletes only via service_role (backoffice).
