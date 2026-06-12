"use client";

// Yandex Metrika (counter + Webvisor) — CONSENT-GATED, same posture as PostHog
// (app/lib/analytics.ts). The counter does NOT load until the visitor accepts
// the cookie banner (ci_consent=granted). Rationale: Webvisor records session
// replays and Metrika sends data to Yandex; the site's privacy policy promises
// analytics opt-out, so we must not load it before consent (founder decision
// 2026-06-12).
//
// Init happens on two triggers:
//   1. Mount, if consent was already granted in a previous visit.
//   2. The `ci-consent-granted` window event dispatched by CookieConsent on
//      Accept (the banner sets the cookie without a reload).
//
// Goal events (reachGoal) are fired from app/lib/analytics.ts `track()`, mirroring
// the existing PostHog funnel events — no per-component wiring needed.
//
// Field masking: sensitive forms (signup email, payout profile CUIT/CBU,
// invoice client data) carry the `ym-hide-content` CSS class so their contents
// never enter Webvisor recordings.

import { useEffect } from "react";

const YM_ID = process.env.NEXT_PUBLIC_YM_ID || "109803222";

let started = false;

function startYandexMetrika(): void {
  if (started || typeof window === "undefined" || !YM_ID) return;
  started = true;

  // Official Metrika bootstrap (stub queue + async tag.js). The stub lets
  // `ym(...)` calls queue before tag.js finishes loading.
  /* eslint-disable */
  (function (m: any, e: any, t: string, r: string, i: string) {
    m[i] =
      m[i] ||
      function () {
        (m[i].a = m[i].a || []).push(arguments);
      };
    m[i].l = 1 * (new Date() as any);
    for (let j = 0; j < e.scripts.length; j++) {
      if (e.scripts[j].src === r) return;
    }
    const k = e.createElement(t);
    const a = e.getElementsByTagName(t)[0];
    k.async = 1;
    k.src = r;
    a.parentNode.insertBefore(k, a);
  })(window, document, "script", `https://mc.yandex.ru/metrika/tag.js?id=${YM_ID}`, "ym");
  /* eslint-enable */

  (window as any).ym(Number(YM_ID), "init", {
    ssr: true,
    webvisor: true,
    clickmap: true,
    ecommerce: "dataLayer",
    accurateTrackBounce: true,
    trackLinks: true,
  });
}

function consentGranted(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie
    .split(";")
    .map((c) => c.trim())
    .some((c) => c === "ci_consent=granted");
}

export default function YandexMetrika() {
  useEffect(() => {
    if (!YM_ID) return;
    if (consentGranted()) {
      startYandexMetrika();
      return;
    }
    const onGranted = () => startYandexMetrika();
    window.addEventListener("ci-consent-granted", onGranted);
    return () => window.removeEventListener("ci-consent-granted", onGranted);
  }, []);

  // No <noscript> pixel: it would track no-JS visitors who never saw the consent
  // banner, breaking the consent-gating contract. Trade a sliver of no-JS data
  // for a clean privacy posture.
  return null;
}
