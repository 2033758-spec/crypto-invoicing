-- 0006_fix_users_select_recursion.sql
--
-- Fixes "Organization not configured" on invoice creation + empty profile load.
--
-- ROOT CAUSE: the 0001 SELECT policy on public.users was self-referential —
--   using ( org_id in (select org_id from public.users where id = auth.uid()) )
-- Querying public.users from inside the users policy makes Postgres recurse
-- ("infinite recursion detected in policy for relation users"), so EVERY
-- RLS-bound read of users fails: the dashboard profile load comes back empty,
-- and invoice/create's `users.org_id` lookup errors → "Organization not
-- configured". (Writes were unaffected because they go through the service-role
-- path, which bypasses RLS.)
--
-- FIX: reading your OWN row only needs `id = auth.uid()` — no self-query, no
-- recursion. Co-org-member reads (Q3 multi-seat) will return later via a
-- non-recursive design (e.g. a SECURITY DEFINER helper), not a self-referential
-- policy.
--
-- Apply: Supabase Dashboard → SQL Editor → Run. Idempotent.

drop policy if exists "users can read own org members" on public.users;
drop policy if exists "users read own profile" on public.users;

create policy "users read own profile"
  on public.users for select
  using (id = auth.uid());
