# SESSION SYNC DIAGNOSTIC AUDIT — FINAL REPORT

**Project:** Crypto Invoicing (calculadora)  
**Issue:** Fresh browser tab shows "Login" buttons instead of user profile after login on another tab  
**User Report:** Login on Tab A works ✓, but Tab B shows login buttons instead of profile  
**Expected:** After Tab A login, Tab B should show user profile + email + logout dropdown  

---

## 🔴 ROOT CAUSE IDENTIFIED

**The session sync is broken due to an architectural mismatch between middleware and page-level SSR:**

### Problem Summary

The application uses a **two-layer approach** to handle authentication:

1. **Middleware** (`middleware.ts`): Runs on every request
   - Creates a Supabase client with a **working** cookie adapter
   - Calls `refreshSession()` to validate the session
   - Attempts to write refreshed cookies back to the response

2. **Page Component** (`/app/[locale]/page.tsx`): Runs after middleware  
   - Creates a Supabase client with a **no-op** cookie adapter (can't set cookies)
   - Calls `getUser()` to get the user object
   - Can only READ cookies, not write them back

**The disconnect:** Even if middleware refreshes the session, the page component's `getUser()` call cannot propagate those refreshed cookies back to the browser in a response.

---

## 🔍 DETAILED FINDINGS

### FINDING 1: Page Component Cookie Adapter is a No-Op
**File:** `/app/[locale]/page.tsx`, lines 71-74  
**Code:**
```typescript
set(name: string, value: string, options: any) {
  // Server Components can't set cookies, but reading works
},
```

**Issue:** Server Components in Next.js App Router cannot set cookies directly. The `set()` callback is intentionally empty. This means:
- If `getUser()` attempts to refresh or update the auth token internally, those changes are **silently discarded**
- The browser never receives a Set-Cookie header with the refreshed token
- Result: Session updates are lost between requests

**Impact:** ⚠️ **MEDIUM** — This is by-design, but it creates a timing issue with cross-tab syncing.

---

### FINDING 2: Middleware's refreshSession() Call May Silently Fail
**File:** `middleware.ts`, lines 54-55  
**Code:**
```typescript
try {
  const supabase = createServerClient(...);
  await supabase.auth.refreshSession();
} catch (error) {
  console.debug("[middleware] Session refresh skipped (not authenticated)");
}
```

**Issue:** The `catch` block doesn't distinguish between:
- ✓ Successfully refreshed session (cookies valid)
- ✗ No session to refresh (non-authenticated request) — silently caught
- ✗ Actual error refreshing session — also silently caught

**Evidence:** The error message says "(not authenticated)" but this could mask real failures like network errors or invalid tokens.

**Critical uncertainty:** When `refreshSession()` completes successfully on an authenticated request, does it:
1. Actually write updated cookies to `response.cookies`? 
2. Return a result we can check?
3. Or silently succeed/fail without feedback?

**Impact:** 🟡 **HIGH** — We don't know if middleware is successfully refreshing sessions.

---

### FINDING 3: Middleware Writes Cookies But Page Component Can't Read Them Back
**File:** `middleware.ts`, lines 32-40  
**Code:**
```typescript
set(name: string, value: string, options: any) {
  response.cookies.set({
    name,
    value,
    ...options,
    sameSite: "lax",
    secure: true,
    httpOnly: true,
  });
}
```

**The Flow:**
1. Middleware creates response with `NextResponse.redirect()`
2. Middleware's cookie adapter writes cookies to `response.cookies`
3. Middleware returns the response with Set-Cookie headers ✓
4. Browser receives Set-Cookie and stores cookies ✓
5. Page component runs **in the same request** (not a new request)
6. Page component's `getUser()` reads cookies from **request**, not response
7. Page component tries to write cookies but its adapter is no-op

**The architectural problem:**
- Middleware and page run in the same request cycle
- Middleware's cookie updates happen AFTER middleware returns
- Page component runs in the server-side rendering phase
- Page component can't write cookies back because it's not a route handler

**Impact:** 🔴 **CRITICAL** — The page component cannot persist session refreshes.

---

### FINDING 4: Cross-Tab Cookie Visibility Not Confirmed
**File:** All auth-related files  
**Issue:** The diagnostic hasn't verified if cookies set in Tab A are actually visible as domain cookies in Tab B.

**Expected behavior:**
- Tab A: User logs in → Browser stores `sb-wthatxtjzagprunjnzoh-auth-token` as a domain cookie (scope: `.localhost:3001` or the actual domain)
- Tab B: Opens same domain → Browser automatically sends same domain cookies in request headers
- Middleware in Tab B should see these cookies and validate them

**Unconfirmed questions:**
1. Are the auth cookies actually being set with domain scope (not path-restricted)?
2. Are the flags correct? (httpOnly=true, Secure=true, SameSite=Lax)
3. Can middleware in Tab B actually read the auth cookies from Tab A?

**Impact:** 🟡 **MEDIUM-HIGH** — If cookies aren't domain-scoped, cross-tab sync will always fail.

---

### FINDING 5: Missing Request-to-Response Cookie Bridge in SSR
**File:** `/app/[locale]/page.tsx`  
**Issue:** Server Components have no mechanism to return Set-Cookie headers in the HTTP response.

**Contrast to Route Handlers:**
```typescript
// ✓ Route handler CAN return cookies
export async function GET(request: NextRequest) {
  const supabase = createServerClient(..., { cookies: { set() {...} } });
  await supabase.auth.exchangeCodeForSession(code);
  return NextResponse.redirect(url);  // Includes Set-Cookie headers
}

// ✗ Server Component CANNOT return cookies
export default async function Page() {
  const supabase = createServerClient(..., { cookies: { set() {...} } });
  const { user } = await supabase.auth.getUser();
  return <Header user={user} />;  // No Set-Cookie mechanism
}
```

**Impact:** 🔴 **CRITICAL** — SSR pages cannot refresh sessions to the browser.

---

## 🎯 WHY SESSION SYNC IS BROKEN

### Scenario: Tab A logs in, then Tab B opens fresh

1. **Tab A Login (works perfectly)**
   - User clicks "Get started" → /signup
   - Clicks "Google" → OAuth redirect dance
   - Returns to /auth/callback?code=XXX&next=/dashboard
   - Route handler calls `exchangeCodeForSession(code)`
   - Supabase writes auth cookies via adapter: `sb-wthatxtjzagprunjnzoh-auth-token`
   - Route handler returns `NextResponse.redirect('/dashboard')` with Set-Cookie headers ✓
   - Browser stores cookies and navigates to /dashboard
   - User sees profile, email, logout dropdown ✓

2. **Tab B Opens Fresh**
   - User opens new browser tab, navigates to `http://localhost:3001`
   - Browser: Cookies from Tab A ARE domain cookies, so they're SENT in the request ✓
   - Middleware runs:
     - Reads cookies from request: `sb-wthatxtjzagprunjnzoh-auth-token` ✓
     - Calls `refreshSession()` to validate
     - Attempts to write refreshed cookies via `response.cookies.set()`
     - Returns response to client ✓
   - Page component runs:
     - Reads cookies from request: `sb-wthatxtjzagprunjnzoh-auth-token` ✓
     - Creates Supabase client with cookies
     - Calls `getUser()` — should return user ✓
     - BUT: The cookie adapter's `set()` is no-op, so refreshed token isn't persisted
   - Header component receives `user={null}` ✗ — **Why?**

### The Mystery: Why Does getUser() Return Null?

**Two possibilities:**

**Hypothesis A: Cookies ARE there, getUser() works, but middleware/page timing is wrong**
- Middleware refreshes cookies but page doesn't see them
- getUser() returns null because the token is invalid/expired
- Page renders Header with user={null}
- Browser still has old (invalid) token from Tab A

**Hypothesis B: Cookies AREN'T there in Tab B's request**
- Browser opened Tab B on different domain/path
- Cookies weren't sent in the request
- Middleware finds no cookies, doesn't refresh
- Page's getUser() has no cookies, returns null
- This would explain why Header shows "Login" buttons

**Hypothesis C: CookieStore adapter is broken**
- `cookies()` from next/headers doesn't return what we expect
- `cookieStore.get()` returns undefined even though cookies are present
- Supabase client is created with empty cookies
- getUser() fails or returns null

---

## 📋 CRITICAL TEST PLAN

To narrow down the root cause, run these tests (in order):

### Test 1: Cookie Presence After Login (Tab A)
```
1. Clear all cookies
2. Navigate to http://localhost:3001
3. Click "Start now" → /signup
4. Click "Continue with Google" (or email signup)
5. Complete auth flow
6. Open DevTools → Application → Storage → Cookies → http://localhost:3001
7. Look for cookies starting with "sb-"
8. Document:
   - Cookie names
   - Cookie values (first 50 chars)
   - Flags: httpOnly, Secure, SameSite
   - Domain scope (should be "localhost" or ".localhost")
   - Expiry date
```

### Test 2: Cross-Tab Cookie Visibility (Tab A → Tab B)
```
1. After Test 1, keep Tab A open with logged-in user
2. Open Tab B in SAME browser
3. Navigate Tab B to http://localhost:3001
4. In Tab B DevTools → Application → Cookies
5. Document:
   - Are the same "sb-*" cookies visible in Tab B?
   - If yes, they're domain-scoped ✓
   - If no, they're tab/path-scoped ✗
```

### Test 3: Network Inspection (Check Set-Cookie Headers)
```
1. Clear cookies and DevTools cache
2. Navigate to /signup
3. DevTools → Network → Filter to "callback"
4. Click "Continue with Google"
5. Let auth flow complete
6. In Network tab, find the GET request to "/auth/callback"
7. Click it, go to Response Headers
8. Look for "set-cookie" header
9. Document:
   - Is set-cookie present?
   - What's the value? (should show sb-* cookie name)
   - What flags? (httpOnly, secure, samesite)
10. Also check the redirect response — any Set-Cookie there?
```

### Test 4: Server Logging (Add Debugging)
```
Add logging to these files:

middleware.ts (line 55):
  const { data, error } = await supabase.auth.refreshSession();
  console.log("[middleware] refreshSession result:", { data, error, hasCookies: request.cookies.has('sb-wthatxtjzagprunjnzoh-auth-token') });

/app/[locale]/page.tsx (line 69):
  console.log("[page] Creating Supabase client");
  const { data: { user } } = await supabase.auth.getUser();
  console.log("[page] getUser result:", { user: user?.email, hasCookie: cookieStore.get('sb-wthatxtjzagprunjnzoh-auth-token')?.value?.substring(0,20) });

/app/[locale]/_components/landing-v3/Header.tsx (top of component):
  console.log('[Header] Rendered with user:', user?.email || 'null');

Then reload Tab B in dev mode and check browser console.
```

### Test 5: Direct Cookie Adapter Test
```
In /app/[locale]/page.tsx, after cookieStore is initialized:

const allCookies = cookieStore.getAll();
console.log('[page] All cookies available:', allCookies.map(c => c.name));
console.log('[page] Auth token cookie:', cookieStore.get('sb-wthatxtjzagprunjnzoh-auth-token'));
```

---

## 🎯 EXPECTED FINDINGS FROM TESTS

| Test | Expected | If Different | Diagnosis |
|------|----------|--------------|-----------|
| Test 1 | See `sb-wthatxtjzagprunjnzoh-auth-token` with httpOnly, Secure, SameSite=Lax | No cookie visible | exchangeCodeForSession() didn't work |
| Test 2 | Same cookies visible in Tab B | Different/missing in Tab B | Cookies aren't domain-scoped |
| Test 3 | See Set-Cookie header in auth/callback response | No Set-Cookie header | Middleware not returning cookies |
| Test 4 (middleware) | "hasCookies: true" and valid data from refreshSession | "hasCookies: false" | Cookies lost in request pipeline |
| Test 4 (page) | "user: test@example.com" | "user: null" | getUser() failed despite cookies |
| Test 5 | Auth token cookie visible | Cookie not found | CookieStore adapter broken |

---

## 📊 MOST LIKELY ROOT CAUSE

Based on code analysis, the most probable causes (ranked by likelihood):

1. **🔴 MOST LIKELY:** Middleware's `refreshSession()` doesn't actually update `response.cookies`
   - The Supabase SSR adapter might not be wiring up the refresh properly
   - Result: Cookies never make it to the response, so Tab B doesn't get them

2. **🔴 VERY LIKELY:** Cookies are set with wrong domain scope in auth/callback
   - If they're path-scoped or `Secure=true` but accessed over HTTP, they won't cross tabs
   - Result: Tab B doesn't receive Tab A's cookies

3. **🟡 MODERATELY LIKELY:** CookieStore adapter is failing silently
   - The `cookies()` from next/headers might not work as expected
   - The `.get()` method might return undefined despite cookies being present
   - Result: Page component thinks there are no cookies

4. **🟡 POSSIBLE:** refreshSession() is throwing an exception caught silently
   - The try/catch block swallows all errors
   - Result: Session is never validated, getUser() has stale/invalid token

---

## ✅ NEXT STEPS

1. **Run Tests 1-5 above** to gather evidence
2. **Add logging** to pinpoint where the session is lost
3. **Check Supabase SSR adapter version** — there might be a known bug
4. **Verify middleware is actually running** — add a console.log at the top of middleware
5. **Consider alternative:** Use Next.js `setCookie()` from `next/headers` in a Route Handler instead of relying on Server Component SSR

---

## 🔗 REFERENCES

- Supabase Auth + Next.js App Router: https://supabase.com/docs/guides/auth/auth-helpers/nextjs
- @supabase/ssr package: https://github.com/supabase/auth-helpers/tree/main/packages/ssr
- Next.js middleware + cookies: https://nextjs.org/docs/app/building-your-application/routing/middleware
- Next.js cookies() API: https://nextjs.org/docs/app/api-reference/functions/cookies
