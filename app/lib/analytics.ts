"use client";

// Analytics singleton — wraps PostHog with consent gating + safe defaults.
//
// Design:
//   - PostHog is initialised LAZILY on the first `capture()` call after
//     consent is granted. Cuts ~30KB from the critical bundle when a user
//     rejects analytics. We import via `await import("posthog-js")` so the
//     module is code-split into its own chunk.
//   - Consent cookie name: `ci_consent` ("granted" | "denied"). Set by the
//     CookieConsent component (app/[locale]/_components/CookieConsent.tsx).
//   - All `capture()` calls are no-ops on the server. PostHog only works in
//     the browser; calling it during SSR throws.
//   - If `NEXT_PUBLIC_POSTHOG_KEY` is unset (dev / unconfigured), every event
//     is silently dropped — never breaks the UI.
//   - `posthog-js` import is dynamic so a missing dependency does not break
//     the build before founder runs `npm install`. The catch is intentionally
//     swallowed in production (failed analytics ≠ broken landing).

type PHCapturePayload = Record<string, unknown>;

let initPromise: Promise<unknown> | null = null;
let phInstance: any = null; // eslint-disable-line @typescript-eslint/no-explicit-any
let warnedMissingKey = false;

function consentGranted(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie
    .split(";")
    .map((c) => c.trim())
    .some((c) => c === "ci_consent=granted");
}

async function ensureInit(): Promise<unknown> {
  if (typeof window === "undefined") return null;
  if (phInstance) return phInstance;
  if (initPromise) return initPromise;

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";
  if (!key) {
    if (!warnedMissingKey && process.env.NODE_ENV !== "production") {
      console.warn(
        "[analytics] NEXT_PUBLIC_POSTHOG_KEY not set — events dropped",
      );
      warnedMissingKey = true;
    }
    return null;
  }

  initPromise = (async () => {
    try {
      // Webpack-compatible dynamic import — code-splits posthog-js into its own
      // chunk so the analytics module stays out of the critical bundle. The
      // earlier `new Function("return import(...)")` indirection broke browser
      // module-specifier resolution (incident 2026-05-28 step-4-PostHog).
      const mod = await import("posthog-js");
      const posthog: any = mod.default ?? mod; // eslint-disable-line @typescript-eslint/no-explicit-any
      posthog.init(key, {
        api_host: host,
        // We gate ourselves via `ci_consent` cookie above; PostHog's own
        // persistence still respects browser privacy modes.
        persistence: "localStorage+cookie",
        // Disable autocapture — too noisy + leaks form values. We only emit
        // explicit events from `track()` below.
        autocapture: false,
        capture_pageview: false,
        capture_pageleave: true,
        // Mask all inputs by default (defence-in-depth: e.g. email at signup).
        session_recording: { maskAllInputs: true },
        loaded: (ph: unknown) => {
          phInstance = ph;
        },
      });
      phInstance = posthog;
      return posthog;
    } catch (err) {
      // Most likely: posthog-js not installed yet (pre-`npm install`). Don't
      // brick the landing — just silently drop events.
      if (process.env.NODE_ENV !== "production") {
        console.warn("[analytics] posthog-js failed to load", err);
      }
      return null;
    }
  })();

  return initPromise;
}

const YM_ID = process.env.NEXT_PUBLIC_YM_ID || "109803222";

/**
 * Mirror an event to Yandex Metrika as a goal (reachGoal). YM is consent-gated
 * via the YandexMetrika component (window.ym only exists after consent), and
 * this runs only after track()'s own consent check — so it never fires without
 * consent. Safe no-op if YM isn't loaded.
 */
function ymReachGoal(event: string, props?: PHCapturePayload): void {
  try {
    const ym = (window as any).ym; // eslint-disable-line @typescript-eslint/no-explicit-any
    if (YM_ID && typeof ym === "function") {
      ym(Number(YM_ID), "reachGoal", event, props);
    }
  } catch {
    /* swallow — analytics must never break UX */
  }
}

/** Capture a custom event. Drops silently if consent not granted or PostHog unconfigured. */
export function track(event: string, props?: PHCapturePayload): void {
  if (typeof window === "undefined") return;
  if (!consentGranted()) return;
  ymReachGoal(event, props);
  void (async () => {
    const ph: any = await ensureInit(); // eslint-disable-line @typescript-eslint/no-explicit-any
    if (!ph) return;
    try {
      ph.capture(event, props);
    } catch {
      /* swallow — analytics must never break UX */
    }
  })();
}

/** Identify the current user (call after login). */
export function identify(userId: string, props?: PHCapturePayload): void {
  if (typeof window === "undefined") return;
  if (!consentGranted()) return;
  void (async () => {
    const ph: any = await ensureInit(); // eslint-disable-line @typescript-eslint/no-explicit-any
    if (!ph) return;
    try {
      ph.identify(userId, props);
    } catch {
      /* swallow */
    }
  })();
}

/** Reset the current user (call after logout). */
export function resetIdentity(): void {
  if (!phInstance) return;
  try {
    phInstance.reset();
  } catch {
    /* swallow */
  }
}
