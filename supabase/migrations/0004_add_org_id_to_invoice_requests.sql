-- 0004_add_org_id_to_invoice_requests.sql — Multi-tenant wiring
--
-- Adds org_id (foreign key to organizations) to invoice_requests.
-- This was missing from the initial schema and breaks multi-tenant RLS.
--
-- Q1 W4-W6: Only 1 user (founder) so org_id = founder's org. Q2+ enforces
-- the constraint across all signup flows (users must belong to an org).

alter table public.invoice_requests
add column org_id uuid references public.organizations(id) on delete cascade;

-- For existing Q1 data: assume all requests belong to founder's org
-- The founder manually sets this via Supabase Dashboard or script (W7).
-- TODO: Create backoffice script to hydrate org_id for existing requests (W7).

-- Create index for org-scoped queries
create index if not exists invoice_requests_org_id_idx
  on public.invoice_requests(org_id);

-- Create compound index for org + user queries (common filter)
create index if not exists invoice_requests_org_user_idx
  on public.invoice_requests(org_id, user_id);

comment on column public.invoice_requests.org_id is
  'Organization this invoice belongs to. Multi-tenant key. NULL during Q1 beta (manual provisioning).';
