# Analytics goals — разметка (Yandex Metrika #109803222 + PostHog)

Каждое событие летит из `app/lib/analytics.ts` → `track(event, props)`, который:
1. шлёт в PostHog (`capture`)
2. шлёт в Yandex Metrika как цель: `ym(109803222, 'reachGoal', event, props)`

Оба — **за consent-гейтом** (`ci_consent=granted`). YM-счётчик грузится только после принятия cookie-баннера (компонент `app/[locale]/_components/YandexMetrika.tsx`, смонтирован в layout → доступен на всех страницах, включая `/signup` и `/dashboard`).

## Как создать цели в YM
Метрика → **Настройка → Цели → Добавить цель** → тип **«JavaScript-событие»** → поле «Идентификатор» = точное имя из колонки `event` ниже. Имя цели — любое.

## Главные цели (registered-воронка)

| Цель (имя) | event (идентификатор) | Когда срабатывает | Где в коде |
|---|---|---|---|
| Начало регистрации | `signup_started` | открытие формы регистрации | SignupForm.tsx:55 |
| Метод выбран | `signup_method_chosen` | клик Google / отправка email (`params.method`) | SignupForm.tsx:66,146 |
| Профиль заполнен | `profile_completed` | **успех** `/api/profile` (после `res.ok`) | DashboardClient.tsx:282 |
| 🎯 Запрос счёта | `invoice_requested` | **успех** `/api/invoice/create` (после `res.ok`) | DashboardClient.tsx:216 |

> `invoice_requested` и `profile_completed` стреляют только на успешном ответе API (не на клике, не на ошибке).

## Микро-цели (intent / воронка)

| Цель | event | Когда | Где |
|---|---|---|---|
| Просмотр лендинга | `landing_view` | 1 раз/сессия на `/` | Analytics.tsx:39 |
| Калькулятор использован | `calc_used` | расчёт в калькуляторе (`params.monthly,tool,country`) | Calculator.tsx:57 |
| Просмотр цен | `pricing_viewed` | секция #pricing видна ≥50% | Analytics.tsx:67 |
| FAQ раскрыт | `faq_expanded` | открытие пункта FAQ | FaqClickTracker |
| Клик CTA | `cta_clicked` | кнопки (`params.cta`: get_started/login/calculator/logout) | Hero/Pricing/FinalCta/Header |

## Параметры целей
`track()` передаёт `props` 4-м аргументом `reachGoal` → в YM это параметры цели (видны в отчёте по параметрам). Напр. `invoice_requested` несёт `{amount_usd, country}`.

## YM-цели (созданы в дашборде)
| Цель | event | YM goal id |
|---|---|---|
| Начало регистрации | `signup_started` | 568314097 |
| Профиль заполнен | `profile_completed` | 568314133 |
| Запрос счёта | `invoice_requested` | 568314271 |
| Калькулятор | `calc_used` | 568314519 |

JS-событие сопоставляется по строковому `event`, не по числовому id — id здесь только для справки.
