-- 0009_company_leads.sql
-- Company-side demand smoke-test (LATAM). Captures "we pay contractors in
-- crypto" interest from the /empresas landing. NOT a product — just lead capture.
--
-- Isolated table, no org_id, deny-all RLS (inserts go via service-role from the
-- /api/company-lead route, like waitlist_signups). Additive, safe.

begin;

create table if not exists public.company_leads (
  id            uuid primary key default gen_random_uuid(),
  company       text not null,
  contact_name  text,
  email         text not null,
  headcount     text,            -- free-text range ("1-10", "50+"), not aggregated
  message       text,
  source        text,            -- utm / referer
  created_at    timestamptz not null default now()
);

create index if not exists company_leads_created_at_idx on public.company_leads(created_at desc);

alter table public.company_leads enable row level security;
drop policy if exists "company_leads: deny all select" on public.company_leads;
create policy "company_leads: deny all select" on public.company_leads for select using (false);

commit;
