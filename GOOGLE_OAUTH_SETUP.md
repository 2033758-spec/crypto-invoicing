# Google OAuth — Supabase setup

The new signup form at `/[locale]/signup` shows a **«Continue with Google»**
button above the magic-link email form. It calls
`supabase.auth.signInWithOAuth({ provider: "google", ... })`, which means
Google needs to be enabled in your Supabase project. Here's how.

## What's already shipped (code-side, May 2026)

- `app/[locale]/signup/SignupForm.tsx` — adds the Google button + divider + email magic-link.
- `app/[locale]/auth/callback/CallbackClient.tsx` — handles both flows:
  - `?code=...` → `supabase.auth.exchangeCodeForSession(code)` (OAuth + email PKCE)
  - No code → `getSession()` after 250ms (legacy magic-link hash flow)
- `app/lib/supabase.ts` browser client already has `flowType: "pkce"`, `detectSessionInUrl: true`, `persistSession: true` — no change needed.

So once Google OAuth is enabled in Supabase Dashboard, the button **just works**. No code deploy.

---

## 1. Create the Google OAuth client

1. Open Google Cloud Console → APIs & Services → Credentials:
   <https://console.cloud.google.com/apis/credentials>
2. Pick the project you want (or create one — name suggestion: `crypto-invoicing-auth`).
3. Click **CREATE CREDENTIALS → OAuth client ID**.
4. If asked, configure the OAuth consent screen first:
   - User type: **External** (anyone with a Google account).
   - App name: `Crypto Invoicing`.
   - Support email: your founder address.
   - Logo: upload `/Users/macbook/Projects/Crypto_Invoicing/code/calculadora/public/logo.svg` (convert to PNG ≥ 120×120 first).
   - Authorized domains: `cryptoinvoicing.com` (or your actual production domain once you have one).
   - Scopes (only basic ones — Google adds `openid`, `userinfo.email`, `userinfo.profile` automatically).
   - Test users: add your own Gmail (so you can test before publishing the consent screen).
5. Application type: **Web application**.
6. Name: `Crypto Invoicing Web`.
7. **Authorized JavaScript origins** (optional but recommended):
   - `http://localhost:3000`
   - `https://cryptoinvoicing.com` (or whatever production hostname you end up with)
8. **Authorized redirect URIs** — this one is critical:

   ```
   https://wthatxtjzagprunjnzoh.supabase.co/auth/v1/callback
   ```

   That's Supabase's universal OAuth callback. Don't paste your own
   `/auth/callback` URL here — Supabase exchanges the code first, then
   bounces back to your app's `redirectTo`.

9. Click **Create**. Copy the **Client ID** and **Client secret**.

---

## 2. Enable Google in Supabase

1. Go to your Supabase Dashboard:
   <https://supabase.com/dashboard/project/wthatxtjzagprunjnzoh/auth/providers>
2. Find **Google** in the list of Auth Providers.
3. Toggle **Enable**.
4. Paste:
   - **Client ID (for OAuth)** → the one Google gave you.
   - **Client Secret (for OAuth)** → the secret Google gave you.
5. Save.

The Supabase callback URL shown in that panel will be the exact URL you pasted into Google in step 1.8 above. Sanity-check that they match.

---

## 3. Test locally

1. Make sure your local dev server is running on `http://localhost:3000`.
2. Visit `http://localhost:3000/en-US/signup`.
3. Click **«Continue with Google»**.
4. You should bounce to `accounts.google.com`, pick an account, then return to `/auth/callback?code=...` → `/dashboard`.

If you see a `redirect_uri_mismatch` error: your authorized redirect URI in Google Console doesn't match the Supabase one. Re-check step 1.8.

---

## 4. Production checklist (when you have a domain)

- [ ] Add the production origin to **Authorized JavaScript origins**.
- [ ] Publish the OAuth consent screen (switch from Testing → In production).
- [ ] Verify the logo + privacy policy + ToS URLs are real.
- [ ] Optional: request **app verification** from Google if you'll have more than 100 users on the testing scopes (cheap to skip for Q1, becomes mandatory around Q2-Q3).

---

## Where in the code

If you ever need to change the provider or scopes:

- `app/[locale]/signup/SignupForm.tsx`, function `handleGoogle()` — the `signInWithOAuth` call site.
- `app/[locale]/auth/callback/CallbackClient.tsx` — the code-exchange logic.

If you ever need to add a second provider (Apple, GitHub, etc.), it's another `signInWithOAuth` call with a different `provider:` value, plus the provider's setup steps in Supabase Dashboard.

---

## Magic-link fallback stays alive

The email magic-link form below the divider keeps working. Users who don't have Google or prefer email can still sign up that way. Both flows land on `/[locale]/auth/callback` which handles both `?code=` (OAuth + PKCE email) and the legacy hash flow.

— Last updated: 2026-05-26 (Design System v3 redesign batch).
