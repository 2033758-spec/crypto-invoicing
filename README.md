# Calculadora de pérdidas

Lead-magnet landing для Crypto Invoicing: интерактивный калькулятор потерь от Lemon/Belo/Wise/Bitwage vs USDC directo. Standalone Next.js app в `code/calculadora/` — позже мигрируется в монорепо `apps/web/`.

Spec: `04_marketing/lead_magnet.md`, copy: `04_marketing/hooks_es.md`, ToV: `01_strategy/positioning.md`.

## Stack

- Next.js 14 (App Router) + React 18 + TypeScript (strict)
- Tailwind CSS, dark mode default, accent `#56c8a5`
- Zero external deps beyond next/react — calculation полностью клиентская
- Share-loop через URL params (`?monto=2000&pais=AR&metodo=lemon`)

## Local dev

```bash
cd code/calculadora
npm install
npm run dev
```

Откроется на http://localhost:3000.

Дополнительно:

```bash
npm run typecheck   # tsc --noEmit, strict mode
npm run build       # production build
npm run start       # serve production build
npm run test        # vitest run (unit tests for lib/calc.ts)
npm run test:watch  # vitest in watch mode
npm run test:ui     # vitest browser UI
```

## Backend wiring (W2)

### Supabase

1. Создать project на [supabase.com](https://supabase.com) (free tier).
2. SQL editor → выполнить `supabase/migrations/0001_init.sql`.
3. Settings → API → скопировать `URL`, `anon key`, `service_role key` в `.env.local`.
4. Тест: POST на `/api/waitlist` с `{ "email": "test@test.com" }` → 200 + строка в `waitlist_signups`.

Schema includes `org_id` на всех tenant tables с day 1 (per `decisions_log` 2026-05-12 — спасает Q3 full rewrite).

### Sentry

1. Создать project на [sentry.io](https://sentry.io) → выбрать Next.js.
2. Скопировать DSN в `.env.local` как `NEXT_PUBLIC_SENTRY_DSN` и `SENTRY_DSN` (одинаковый).
3. Для source-maps upload в prod: создать auth-token (Settings → Account → API → Auth Tokens) → `SENTRY_AUTH_TOKEN` + `SENTRY_ORG` + `SENTRY_PROJECT`.
4. Без DSN билд работает (Sentry init становится no-op) — удобно для локальной разработки.

## Структура

```
app/
├── layout.tsx              # html + metadata (es-AR, OG/Twitter cards)
├── page.tsx                # hero + calculator + trust signals + footer
├── globals.css             # Tailwind + range-slider styles
├── components/
│   └── Calculator.tsx      # 'use client' — slider/select/result/email/share
└── lib/
    └── calc.ts             # pure formulas + URL params encoder/decoder
```

## Calculation logic

См. `app/lib/calc.ts`. Все % — placeholder из `lead_magnet.md`, TODO W1: верифицировать через CriptoYa daily snapshot.

| Method (AR) | Effective fee |
|-------------|--------------|
| Lemon       | 4.0% (2.5 spread + 1.5 comisión) |
| Belo        | 3.3% (2.3 + 1.0) |
| Wise        | 1.2% |
| Bitwage     | 1.3% (1.0 + 0.3 spread) |
| Otra        | 3.0% (estimado) |
| **USDC directo** | **1.0%** (tope US$50/mes) |

Sanity-check: `amount=2000, AR, lemon` → loss = $80/mes, USDC = $20/mes, savings = $60/mes = **$720/año**.

## Share-loop

При share copy URL содержит query params, и recipient видит тот же расчёт. Twitter intent + WhatsApp `wa.me` + `navigator.clipboard`.

Twitter pre-fill:
> Acabo de calcular que pierdo US$X/año cobrando con Lemon. La calculadora gratis: [link]

## Deploy на Vercel

1. Push папку `code/calculadora/` как отдельный проект (или указать root directory).
2. Vercel auto-detect Next.js. Build command: `npm run build`, output: `.next`.
3. Скопировать `.env.example` → environment variables в Vercel dashboard (для будущих TODO).
4. Custom domain: `calculadora.[domain]` или `/calculadora` rewrite из основного сайта.

## TODO (для следующих агентов)

- **W1 — данные:** валидировать % через CriptoYa snapshot марта 2026 (lemon/belo/wise/bitwage). Заменить placeholder $237 в hero на actual median.
- **W1 — proofread:** прогнать все ES-строки через Fiverr native rioplatense.
- **W2 — analytics:** PostHog events — page view / slider change (debounced) / email submit / share click. UTM-pipeline.
- **W2 — Resend:** confirmation email с расчётом + CTA на сайт.
- **W2 — rate limit:** Upstash Redis / Vercel KV на `/api/waitlist` (5 req/min/IP).
- **W3 — BR:** PT-BR proofread всех строк, выделить `/br/calculadora` или toggle, country-aware copy.
- **W4 — variants:** «savings over 5 years» toggle, A/B loss vs gain frame.
- **a11y:** ручной audit на screen reader (VoiceOver) + контраст-чек.

## Что сделано в Wave 2 (W2 backend)

- Vitest setup + 20+ test cases для `app/lib/calc.ts` (boundary, $0, malformed URL params, roundtrip).
- Supabase schema (`supabase/migrations/0001_init.sql`): organizations / users / waitlist_signups / invoices / transactions. `org_id` на всех tenant tables с day 1. RLS enabled, default deny.
- `/api/waitlist` route с email validation, insert в `waitlist_signups`, Calculator.tsx wired через `fetch`.
- Sentry init (client + server + edge configs, `withSentryConfig` wrap).

## Что НЕ сделано

- Rate limiting на `/api/waitlist` — TODO comment в коде.
- Unit tests для Calculator.tsx component (требует @testing-library/react — пока calc.ts pure-функции покрывают логику).
- PostHog / Resend wiring.
- PT-BR локаль, лого/favicon/OG-image.
