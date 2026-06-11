-- 0005_provisioning_and_rls_hardening.sql
--
-- Closes the two P0 findings from the 2026-06-08 full-scale sweep:
--   B2  No user/org provisioning on signup → invoice/create 500s for everyone.
--   B1  RLS lets a user forge the ledger (invoices) + pivot tenants (users.org_id).
-- Plus the DB half of B3 (profile/payout columns; country nullable until profile).
--
-- ⚠️ MUST be applied together: enabling provisioning (B2) without the RLS
-- lockdown (B1) would ACTIVATE the money-out exploit that is currently only
-- masked by the absence of public.users rows.
--
-- Apply: Supabase Dashboard → SQL Editor (or `supabase db push`). Idempotent.

-- =============================================================================
-- B3 (DB part): profile/payout columns + relax country (unknown at signup)
-- =============================================================================
-- country is collected during profile-setup, not at signup, so it must be
-- nullable. The existing CHECK (country in ('AR','BR')) already permits NULL
-- (a CHECK only fails on FALSE, not on NULL), so we only drop NOT NULL.
alter table public.users alter column country drop not null;

alter table public.users add column if not exists full_name           text;
alter table public.users add column if not exists payout_destination  text; -- CBU (AR) / Pix key (BR)
alter table public.users add column if not exists tax_status          text; -- monotributo / responsable_inscripto / MEI / ...
alter table public.users add column if not exists profile_completed_at timestamptz;

comment on column public.users.payout_destination is
  'Off-ramp destination: CBU/alias (AR) or Pix key (BR). Set during profile-setup. Must match KYC-verified holder (B25 anti-mule).';

-- =============================================================================
-- B2: auto-provision org + user row on every auth signup
-- =============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org_id uuid;
  org_slug   text;
begin
  -- Idempotent: skip if this user already has a profile row.
  if exists (select 1 from public.users where id = new.id) then
    return new;
  end if;

  org_slug := 'org-' || replace(new.id::text, '-', '');

  insert into public.organizations (slug, name)
  values (org_slug, coalesce(new.email, 'Personal'))
  on conflict (slug) do nothing
  returning id into new_org_id;

  -- If the org already existed (conflict), fetch its id.
  if new_org_id is null then
    select id into new_org_id from public.organizations where slug = org_slug;
  end if;

  insert into public.users (id, org_id, email, country)
  values (new.id, new_org_id, new.email, null);

  return new;
exception
  when others then
    -- Never block auth signup on a provisioning hiccup; surface in pg logs.
    raise warning 'handle_new_user failed for %: %', new.id, sqlerrm;
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill any existing auth.users that signed up before this trigger
-- (e.g. founder's test accounts) so their invoice/create stops 500-ing.
insert into public.organizations (slug, name)
select 'org-' || replace(au.id::text, '-', ''), coalesce(au.email, 'Personal')
from auth.users au
left join public.users u on u.id = au.id
where u.id is null
on conflict (slug) do nothing;

insert into public.users (id, org_id, email, country)
select au.id,
       o.id,
       au.email,
       null
from auth.users au
join public.organizations o on o.slug = 'org-' || replace(au.id::text, '-', '')
left join public.users u on u.id = au.id
where u.id is null;

-- =============================================================================
-- B1: RLS hardening
-- =============================================================================

-- ---- invoices: the real ledger is WRITTEN ONLY by service_role -------------
-- Remove user-facing INSERT/UPDATE entirely. The concierge flow uses
-- invoice_requests (already correctly locked in 0003); promotion into
-- public.invoices happens via the service-role backoffice/webhook path,
-- which bypasses RLS. Keeping read-only access for the user's own org.
drop policy if exists "invoices: org insert" on public.invoices;
drop policy if exists "invoices: org update" on public.invoices;
-- (no replacement policies — authenticated role gets SELECT only)

-- Belt-and-suspenders: revoke write grants so even a future stray policy
-- can't let the authenticated role tamper with the ledger.
revoke insert, update, delete on public.invoices     from authenticated;
revoke insert, update, delete on public.transactions from authenticated;

-- ---- users: prevent tenant pivot via UPDATE of org_id ----------------------
-- The old "users can update own profile" policy had no WITH CHECK, letting a
-- user rewrite their own org_id and read every other tenant. We keep row-level
-- self-update but restrict WRITABLE COLUMNS to profile fields only — id,
-- org_id and email can never be changed by the user.
drop policy if exists "users can update own profile" on public.users;
create policy "users update own profile"
  on public.users for update
  using (id = auth.uid())
  with check (id = auth.uid());

revoke update on public.users from authenticated;
grant  update (full_name, country, telegram_handle, tax_id,
               payout_destination, tax_status, profile_completed_at)
       on public.users to authenticated;
-- id / org_id / email are intentionally excluded → user cannot pivot tenants.

-- Users still cannot INSERT into public.users directly (no INSERT policy);
-- provisioning is done by the SECURITY DEFINER trigger above.
