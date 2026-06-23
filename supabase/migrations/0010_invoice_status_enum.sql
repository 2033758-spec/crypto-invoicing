-- 0010_invoice_status_enum.sql
-- Convert invoice_requests.status (text) → Postgres enum so the Supabase Table
-- Editor shows a DROPDOWN (no typo'd statuses). Safe: all existing values are
-- already in the enum; the cast runs in a transaction (rolls back on any
-- unexpected value). The create API inserts string literals that cast cleanly.

begin;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'invoice_status') then
    create type public.invoice_status as enum
      ('pending_setup', 'payment_link_ready', 'paid', 'settled', 'cancelled');
  end if;
end$$;

alter table public.invoice_requests alter column status drop default;
alter table public.invoice_requests
  alter column status type public.invoice_status using status::public.invoice_status;
alter table public.invoice_requests alter column status set default 'pending_setup';

commit;
