# Supabase Auth Webhook → Telegram Founder Notification

**Purpose:** Fire a Telegram ping to the founder every time a new user signs up
(Google OAuth or email magic-link). Replaces the deprecated `/api/lead` flow.

**Endpoint:** `POST /api/auth-hook` (Next.js route in `app/api/auth-hook/route.ts`).

---

## 1. Generate a shared secret

In a local shell:

```bash
openssl rand -hex 32
```

Copy the 64-char hex output. This is the **webhook secret** — it lives in
both `.env.local` (for the Next.js app) and Supabase Dashboard (for the
webhook caller).

---

## 2. Add the secret to your environment

In `code/calculadora/.env.local` (and Vercel env vars for production):

```
SUPABASE_AUTH_WEBHOOK_SECRET=<paste the 64-char hex here>
```

Restart `npm run dev` to pick it up.

---

## 3. Configure the webhook in Supabase

1. Open Supabase Dashboard → your project → **Database** → **Webhooks**.
2. Click **Create a new hook**.
3. Fill the form:
   - **Name:** `auth-users-insert-telegram`
   - **Table:** select `auth` schema → `users` table
   - **Events:** check **INSERT** only (not UPDATE / DELETE)
   - **Type:** HTTP Request
   - **HTTP Method:** POST
   - **HTTP URL:**
     - Dev: `https://<your-ngrok-domain>.ngrok.io/api/auth-hook`
     - Prod: `https://cryptoinvoicing.com/api/auth-hook`
   - **HTTP Headers:**
     - `Content-Type` → `application/json` (default)
     - `X-Webhook-Secret` → paste the same 64-char hex
   - **HTTP Params:** leave default
   - **HTTP Body:** leave default (Supabase auto-fills with the new row)
4. Click **Confirm**.

---

## 4. Test it

Create a test user in the app:

```
http://localhost:3000/signup → "Continue with Google"
```

You should see:
- A new row in `auth.users` (visible in Supabase Dashboard → Authentication → Users)
- A Telegram message in the founder chat:

  ```
  🆕 New signup

  Email: `you@example.com`
  Provider: `google`
  At: `2026-05-27T18:30:00.000Z`
  ```

If the Telegram message doesn't arrive:
1. Check `TELEGRAM_BOT_TOKEN` + `TELEGRAM_FOUNDER_CHAT_ID` are set in `.env.local`.
2. Check Supabase Dashboard → Database → Webhooks → click the hook → **Logs**
   tab. A 200 means we accepted it; 401 means the secret doesn't match;
   500 means the bot creds are missing.
3. Tail `/tmp/cryptoinv-dev.log` for `[auth-hook]` or `Telegram notify failed`
   lines.

---

## 5. Production deployment notes

- Set `SUPABASE_AUTH_WEBHOOK_SECRET` in Vercel project env (Production +
  Preview). Rotate quarterly.
- The webhook URL must be publicly reachable — `vercel.app` and the custom
  domain both work. `localhost` does NOT (use `ngrok` for local testing).
- Supabase Free tier limits Webhook fan-out to ~2 calls/sec; for a launch
  this is plenty.

---

## 6. Rollback / disable

If founder wants to silence the bot temporarily:
1. Supabase Dashboard → Database → Webhooks → toggle the hook OFF.
2. Or remove `TELEGRAM_BOT_TOKEN` from env — the `/api/auth-hook` route
   will still return 200 but skip the Telegram send.

The webhook is idempotent on the founder side (Telegram dupes are
acceptable). If a single signup fires the webhook twice (Supabase retry),
the founder gets two messages — not a real abuse risk.
