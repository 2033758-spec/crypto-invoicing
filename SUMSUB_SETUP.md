# Sumsub KYC — Setup guide

**Why:** Terms §5 commits to Sumsub-based identity verification at Tier 3 (USD 1k–10k lifetime processed). This doc walks you through enabling it in sandbox, then switching to production after first paying users.

**Estimated time:** 25 min (sandbox), +1 day for sandbox→production review.

---

## Step 1 — Create Sumsub sandbox account (5 min)

1. Go to [https://sumsub.com](https://sumsub.com) → «Get a demo» → fill the form with «Crypto Invoicing — LATAM USDC invoicing, AR primary».
2. Sales rep sends a sandbox-access email within 24h. Sandbox tier is free for 100 verifications/month — enough for Q1 W4-W12 piloting.
3. Log in at [https://cockpit.sumsub.com](https://cockpit.sumsub.com).

## Step 2 — Create an applicant level (5 min)

1. Cockpit → **Configuration** → **Applicant levels** → **Add level**.
2. Name it `basic-kyc-level` (must match `SUMSUB_LEVEL_NAME` in `.env`).
3. Required documents:
   - **ID document**: national ID (DNI for AR; RG for BR) — front + back
   - **Liveness selfie**
   - **Tax ID** (CUIT for AR; CPF/CNPJ for BR) — entered as field, no document
4. Save.

## Step 3 — Generate API credentials (5 min)

1. Cockpit → **Integrations** → **Dev space** → **App tokens**.
2. **Create new token**.
   - Name: `Crypto Invoicing — production` (or `... sandbox` for now)
   - Token level: **Production** for live; **Sandbox** for dev/testing
   - Permissions: tick `applicantRead`, `applicantWrite`, `accessTokens`, `webhookRead`
3. Copy the `App Token` (starts with `sbx:` for sandbox, `prd:` for prod).
4. Click **Show secret key** — copy the secret. **Won't be shown again.**

## Step 4 — Add to `.env` (3 min)

In `code/calculadora/.env`:

```bash
SUMSUB_APP_TOKEN=sbx:your_token_here
SUMSUB_SECRET_KEY=your_secret_here
SUMSUB_BASE_URL=https://api.sumsub.com
SUMSUB_LEVEL_NAME=basic-kyc-level
```

For Vercel production:

```bash
vercel env add SUMSUB_APP_TOKEN production
vercel env add SUMSUB_SECRET_KEY production
vercel env add SUMSUB_LEVEL_NAME production
```

Paste each value when prompted. Re-deploy.

## Step 5 — Configure webhook (5 min)

Sumsub posts review results (approved / rejected / on hold) to our endpoint. We'll wire `/api/sumsub-webhook` later when the dashboard KYC UI lands; for now, set up the webhook URL pre-emptively so it's ready.

1. Cockpit → **Configuration** → **Webhooks** → **Add webhook**.
2. **URL**: `https://cryptoinvoicing.com/api/sumsub-webhook` (or your Vercel preview URL).
3. **Events**: tick `applicantReviewed`, `applicantPending`, `applicantOnHold`, `applicantRejected`.
4. **Digest type**: `HMAC SHA256`.
5. **Secret**: regenerate one and paste into Vercel env as `SUMSUB_WEBHOOK_SECRET`.
6. Save.

## Step 6 — Smoke test (2 min)

After deploy, run the sandbox flow:

```bash
# In sandbox cockpit, use these test documents:
#   - Tap "Test mode" toggle on the applicant level
#   - Use Sumsub's pre-baked test PDFs (provided in dev-space docs)
```

Test sequence:

1. Sign up to your own app with a throwaway email.
2. From the dashboard (when KYC UI ships), trigger «Verify identity».
3. Sumsub WebSDK opens — submit a test ID + test selfie.
4. Cockpit → **Applicants** → confirm the test applicant appears with `Approved` status within 60 sec (sandbox auto-approves test docs).

## Step 7 — Production switch (after sandbox validation)

When you're ready to take real money:

1. Cockpit → **Settings** → **Switch to production**.
2. Regenerate token + secret with **Production** scope.
3. Update Vercel env vars with the new `prd:`-prefixed token.
4. Submit Sumsub's compliance questionnaire (~30 min — they ask about your AML programme, intended verification volume, jurisdiction).
5. Sumsub review takes 1-3 business days.
6. Re-deploy with new env vars.

---

## Cost & escalation

- **Sandbox** (Q1): free up to 100 verifications/month.
- **Production**, after AR-lawyer redline + first paying users:
  - $1 per applicant verification, $1.50 for liveness + document combined.
  - Volume discount kicks in at 500/mo.
- Budget Q1: assume $0–50 (test verifications only).
- Budget Q2 (post-W11): $50–150 (real verifications from first 30 paying users).

If founder hasn't completed Step 1-4 by W7 (target launch for Sumsub per Terms §5), our `/api/dashboard/kyc-start` endpoint will throw a configured error and surface «KYC temporarily manual — DM founder» to the user. That's a graceful fallback, not a hard error.

---

## Files in this integration

- `code/calculadora/app/lib/kyc/sumsub.ts` — API client (signed requests, applicant + access-token endpoints)
- `code/calculadora/.env.example` — env-var template
- `code/calculadora/SUMSUB_SETUP.md` — this doc
- TODO post-W7: `app/api/sumsub-webhook/route.ts` + dashboard KYC UI

---

## Reversal trigger

- If Sumsub pricing exceeds budget at Q2 scale, candidate replacements: Veriff (cheaper per-verification but worse AR-specific document coverage), Onfido (enterprise contract, premium), or staying with Sumsub at volume-discount tier.
- If Sumsub sandbox flakes during pilot → fallback to manual founder-Telegram document exchange (already documented in Terms §5).
