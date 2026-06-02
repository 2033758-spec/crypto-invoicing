# Supabase Email Setup — Magic-Link Deliverability

**Why this exists:** Supabase free-tier auth emails (magic-link, password
reset, etc.) are sent via Supabase's built-in SMTP at a **hard cap of 4
emails/hour**. For any meaningful launch (>4 signups/hour), the 5th
magic-link will silently drop and the user will think the link "never
arrived". This is a P0 deliverability issue that has to be fixed before
public launch — even closed-beta-of-30 can spike past 4/hour during a
single Sysarmy thread.

The fix: wire **Resend** as Supabase Auth's custom SMTP provider. Resend
free tier is **3,000 emails/month**, which fits Q1-Q2 trajectory
comfortably.

This setup is **founder-only** (requires Supabase admin access + a verified
domain). Estimated time: 30-45 min.

---

## Prerequisites

- A Resend account (sign up free at https://resend.com).
- Your custom domain DNS access (Cloudflare / Namecheap / etc.).
- Supabase Dashboard admin access.

---

## 1. Set up Resend domain

1. Resend Dashboard → **Domains** → **Add Domain** → enter
   `cryptoinvoicing.com`.
2. Resend shows DNS records to add (SPF + DKIM + DMARC). Copy them.
3. In your DNS provider, add the records exactly as shown.
4. Wait 5-15 min for propagation, then click **Verify** in Resend.
   Status should turn green.

---

## 2. Create an API key (SMTP)

1. Resend Dashboard → **API Keys** → **Create API Key**.
2. Name: `supabase-auth-smtp`.
3. Permission: **Sending access** (only — not full access).
4. Copy the key (`re_...`). You won't see it again.

---

## 3. Configure Supabase to use Resend SMTP

1. Supabase Dashboard → your project → **Authentication** → **Settings** →
   scroll to **SMTP Settings** section.
2. Toggle **Enable Custom SMTP** ON.
3. Fill in:
   - **Sender email:** `hola@cryptoinvoicing.com`
   - **Sender name:** `Crypto Invoicing`
   - **Host:** `smtp.resend.com`
   - **Port:** `587`
   - **Username:** `resend`
   - **Password:** paste the Resend API key from step 2 (`re_...`)
   - **Minimum interval between emails:** `1` (sec, default is fine)
4. Click **Save**.

---

## 4. Customise the magic-link email template (optional but recommended)

1. Supabase Dashboard → Authentication → **Email Templates** → **Magic Link**.
2. Override the subject / body to match Crypto Invoicing voice. Keep the
   `{{ .ConfirmationURL }}` placeholder.

Example (ES):

```
Subject: Tu acceso a Crypto Invoicing

Body:
Hola,

Acá tenés el enlace para entrar a tu cuenta:

{{ .ConfirmationURL }}

Si no pediste este enlace, podés ignorar el email — no se creó cuenta.

— Crypto Invoicing
hola@cryptoinvoicing.com
```

---

## 5. Verify Email provider is ON

While you're in Supabase Auth Settings:

1. **Authentication** → **Providers** → confirm **Email** is enabled (it
   usually is by default).
2. If you also added Google OAuth, verify it's wired with the correct
   client ID + redirect URLs (see `GOOGLE_OAUTH_SETUP.md`).

---

## 6. Test deliverability

```
http://localhost:3000/signup → enter your email → "Send magic link"
```

You should receive the email within 5-15 sec at your inbox. If it lands in
spam:
- Check Resend Dashboard → Logs (status `delivered` vs `bounced`).
- Verify SPF/DKIM/DMARC records are green in Resend Domains.
- Add Sender to contacts on the receiving side once and re-test.

If you don't receive it at all:
- Check Supabase Dashboard → Authentication → Logs for `email.send.failed`.
- Verify the Resend API key wasn't pasted with leading/trailing whitespace.

---

## 7. Monitor

- Resend Dashboard → Logs: shows delivery rate, bounces.
- Set a Resend alert (free tier) when bounce rate > 5%.
- Resend free tier: 3,000 emails / month. Buy Pro tier ($20/mo for 50k) if
  growth crosses 2,500/month — that means we're seeing ~80 signups/day,
  which is a great problem to have.

---

## Rollback

If Resend ever has an outage and you need to fall back:

1. Supabase Dashboard → Authentication → Settings → SMTP Settings →
   toggle **Enable Custom SMTP** OFF.
2. Supabase reverts to its built-in 4/hour limit. Inform users via Telegram
   bot that signups may be delayed.

---

**Last updated:** 2026-05-27
