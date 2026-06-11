# Deferred Tasks — Crypto Invoicing

Issues deferred during the v1.0.1 orchestrator verify cycle (2026-06-08).
P0/P1 were fixed in-release; the items below are P2 (non-blocking) plus one
P1 deliberately deferred with reason. Triage before W8-W9 hardening.

## P1 — deferred WITH REASON (do as a focused, session-tested change)

- **Server-side auth gate on `/dashboard`.** Currently client-side redirect only.
  Data is NOT exposed (RLS on `invoice_requests` + `getUser()` 401 on the APIs —
  verified by DEV + test-sec), so this is defense-in-depth, not a leak. NOT slipped
  into the verify cycle because `lib/supabase.ts:123` documents "Server Components
  can't set cookies", and the auth/cookie path only stabilized 2026-06-08. Implement
  with a read-only server client + `redirect('/signup')`, then smoke-test the live
  session flow (login → dashboard → refresh → 2 tabs) before merge.

## P2 — backlog (W8-W9)

- **`/api/send-email-hook` has no webhook-signature verification** (rate-limit only).
  `auth-hook` does it right via `crypto.timingSafeEqual`; add HMAC parity here before
  any high-volume email use. (DEV + test-sec, P2.)
- **Rate-limit is in-memory `Map`** (`lib/rate-limit.ts:9`) — doesn't survive restart
  or share across Vercel regions. OK at concierge-MVP volume; move to Upstash. (DEV.)
- **`/api/invoice/list` relies solely on RLS** — add explicit `.eq("user_id", user.id)`
  as defense-in-depth. (DEV, P2.)
- **Header logo link is 26×26px** (below 44px touch target) and has no `aria-label`.
  Pad hit area + add label. (WEB, P2 a11y.)
- **Hardcoded English strings in signup** (rate-limit msg, "Load more", "Showing X of Y")
  not routed through next-intl. (WEB, P2 i18n.)
- **Cookie banner overlaps the hero CTA on mobile (375px)** — first CTA hidden until
  accept/reject. Use a thin bottom bar or keep banner out of the hero fold. (test-real.)
- **FAQ accordion may not open before hydration on slow 3G** — verify it works without
  waiting on heavy JS. (test-real.)
- **`mailto:hola@cryptoinvoicing.com` uses `.com` while the site lives on `.co`.**
  Confirm `.com` MX receives, or switch to `.co`. (test-real.)

## Founder-gated (NOT code — escalated 2026-06-08)

- **Rotate 4 leaked secrets before public push** — see `ROTATION_AND_DEPLOY_RUNBOOK.md` §A.
- **CNV/VASP "registered" trust-line** — landing states registration as fact, but
  roadmap puts VASP at Q3-Q4. Confirm actual filing status or soften copy (compliance,
  not just wording). (MAR, P2-compliance.)
- **H1/H3 validation gate (W3, due 2026-06-01) not closed with data** — 0 transcripts,
  2 interviews. Run the validation sprint before scaling acquisition. (CPO, P0-business.)
