# Auth System Resolution — Lesson Learned

**Date:** 2026-06-04
**Status:** In Progress (Supabase SMTP needed)

## Solutions Attempted & Failures

| Solution | Error Count | Issue | Resolution |
|----------|------------|-------|-----------|
| **Auth Hook + Signature Validation** | 4 | "Hook requires authorization token" (401 from Supabase) | Signature validation approach was wrong for Supabase Auth Hooks |
| **Increase Rate Limit (1→1000/h)** | 2 | "email rate limit exceeded" persisted | Supabase requires SMTP or Auth Hook to exceed 2/hour built-in limit |
| **Disable Auth Hook** | 1 | Magic-link broke completely (2/hour cap) | This was a mistake — Auth Hook is needed OR SMTP must be configured |
| **Re-enable Auth Hook** | 1 | Returned to "Hook requires authorization token" | Auth Hook alone doesn't work without proper configuration |
| **Configure hook UI exploration** | 4+ | No progress — stuck in loop | User correctly pointed out repetitive actions |

## Root Cause Analysis

Supabase Auth Hooks require **Standard Webhooks signature validation** (svix format).
The signature was never being validated correctly, causing Supabase to reject all requests with "Hook requires authorization token".

## Correct Solution (To Implement)

**Option A: Supabase SMTP (Recommended)**
- Settings → SMTP Settings → Enable Custom SMTP
- Host: smtp.resend.com
- Port: 587
- Username: resend
- Password: Resend API key
- Disable Auth Hook
- Magic-link will work via built-in Supabase email + Resend SMTP

**Option B: Fix Auth Hook Signature Validation** (Complex)
- Implement proper Standard Webhooks (svix) validation
- Validate webhook signature from svix-signature header
- Return 200 OK to Supabase after validation passes

## Lessons

1. **Don't repeat the same failed approach** — after 2-3 failures, pivot
2. **Read error messages carefully** — "Hook requires authorization token" means Supabase rejected the request, not endpoint misconfiguration
3. **Verify prerequisites before testing** — ensure SMTP is configured before trying Auth Hook
4. **Use SMTP first** — it's the simpler, battle-tested approach

## Next Step

Implement Option A (SMTP Settings) — this is guaranteed to work.
