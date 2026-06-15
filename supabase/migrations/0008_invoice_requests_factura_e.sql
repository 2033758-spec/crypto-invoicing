-- 0008_invoice_requests_factura_e.sql
-- Завершённый продукт v1 — factura-E-ready инвойс + хостед-страница.
--
-- ADDITIVE & IDEMPOTENT. Money-path safe: ничего не удаляем, все новые
-- колонки nullable / с дефолтом. Существующие INSERT в /api/invoice/create
-- (client_name, amount_usd, country, …) и SELECT-список /api/invoice/list
-- продолжают работать без изменений. RLS-политики invoice_requests/users
-- НЕ трогаем (публичное чтение хостед-страницы идёт через service-role по
-- public_token в серверном роуте, RLS не ослабляем).
--
-- Откат: alter table ... drop column ... (колонки изолированы).

begin;

-- ── users: поля эмитента factura E (префилл в инвойс, не дублируем в каждую строку) ──
alter table public.users
  add column if not exists legal_name     text,
  add column if not exists fiscal_address text,
  add column if not exists iva_condition  text,
  add column if not exists punto_venta    text;

-- мягкая валидация iva_condition (только новые/изменённые строки; не ломает существующие NULL)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'users_iva_condition_chk'
  ) then
    alter table public.users
      add constraint users_iva_condition_chk
      check (iva_condition is null or iva_condition in ('monotributo','responsable_inscripto'))
      not valid;  -- not valid → не проверяет старые строки, только новые
  end if;
end$$;

-- ── invoice_requests: получатель + позиции + итоги + payment + публичный токен ──
alter table public.invoice_requests
  add column if not exists public_token    text,
  add column if not exists issuer_snapshot jsonb,
  add column if not exists recipient       jsonb,
  add column if not exists line_items      jsonb not null default '[]'::jsonb,
  add column if not exists subtotal_usd    numeric(14,2),
  add column if not exists total_usd       numeric(14,2),
  add column if not exists tax_note        text,
  add column if not exists terms_notes     text,
  add column if not exists invoice_number  text,
  add column if not exists issue_date      date default current_date,
  add column if not exists currency        text not null default 'USD',
  add column if not exists payment         jsonb;

-- public_token: capability-URL для /i/{token}. Нативный gen_random_uuid (без
-- pgcrypto-зависимости), 32-символьный hex, неугадываемый. Бэкфилл существующих.
update public.invoice_requests
  set public_token = replace(gen_random_uuid()::text, '-', '')
  where public_token is null;

alter table public.invoice_requests
  alter column public_token set default replace(gen_random_uuid()::text, '-', '');

create unique index if not exists invoice_requests_public_token_idx
  on public.invoice_requests(public_token);

commit;
