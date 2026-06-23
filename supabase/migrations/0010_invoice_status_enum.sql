-- 0010_invoice_status_enum.sql
-- Convert invoice_requests.status (text) → Postgres enum so the Supabase Table
-- Editor shows a DROPDOWN (no typo'd statuses).
--
-- NOTE: a prior text CHECK constraint (status IN ('pending_setup', ...)) is
-- stored as `status = ANY(ARRAY[...]::text[])`. Casting the column to enum
-- leaves that text[] array in place → "operator does not exist: invoice_status
-- = text". So we DROP any status-referencing CHECK before the cast; the enum
-- type itself then enforces the allowed values (stricter, no array needed).
-- Idempotent + transactional: re-runnable, rolls back fully on any error.

begin;

-- 1. Enum type
do $$
begin
  if not exists (select 1 from pg_type where typname = 'invoice_status') then
    create type public.invoice_status as enum
      ('pending_setup', 'payment_link_ready', 'paid', 'settled', 'cancelled');
  end if;
end$$;

-- 2. Drop the text default (re-added as enum in step 5)
alter table public.invoice_requests alter column status drop default;

-- 3. Drop every CHECK constraint that references the status column
do $$
declare r record;
begin
  for r in
    select con.conname
    from pg_constraint con
    join pg_class      rel on rel.oid = con.conrelid
    join pg_namespace  nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'invoice_requests'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%status%'
  loop
    execute format('alter table public.invoice_requests drop constraint %I', r.conname);
  end loop;
end$$;

-- 4. Convert text → enum (existing values cast cleanly)
alter table public.invoice_requests
  alter column status type public.invoice_status
  using status::public.invoice_status;

-- 5. Restore the default (now enum-typed)
alter table public.invoice_requests alter column status set default 'pending_setup';

commit;
