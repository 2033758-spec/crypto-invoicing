"use client";

// Minimal cookie-consent banner — GDPR-aware lite.
//
//   - Renders only if `ci_consent` cookie is missing (i.e. user hasn't decided).
//   - Two actions: Accept analytics / Reject. Both set the cookie (1-year
//     expiry) and hide the banner. PostHog initialisation is gated on
//     `ci_consent=granted` via app/lib/analytics.ts.
//   - Locale-aware copy via the `cookies.consent` namespace.
//   - No third-party CMP (one less vendor + free-tier-safe).

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

interface Props {
  locale: string;
}

function readConsent(): "granted" | "denied" | null {
  if (typeof document === "undefined") return null;
  for (const raw of document.cookie.split(";")) {
    const c = raw.trim();
    if (c === "ci_consent=granted") return "granted";
    if (c === "ci_consent=denied") return "denied";
  }
  return null;
}

function writeConsent(value: "granted" | "denied"): void {
  const year = 60 * 60 * 24 * 365;
  document.cookie = `ci_consent=${value}; path=/; max-age=${year}; SameSite=Lax`;
}

export default function CookieConsent({ locale: _locale }: Props) {
  const t = useTranslations("cookies.consent");
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (readConsent() === null) setShow(true);
  }, []);

  if (!show) return null;

  const handleAccept = () => {
    writeConsent("granted");
    setShow(false);
    // Signal consent-gated analytics to start now (banner sets the cookie
    // without a reload). YandexMetrika listens for this; PostHog picks it up
    // lazily on the next track() call.
    try {
      window.dispatchEvent(new Event("ci-consent-granted"));
    } catch {
      /* no-op */
    }
  };
  const handleReject = () => {
    writeConsent("denied");
    setShow(false);
  };

  return (
    <div
      // role="region" (not "dialog") — we don't trap focus and don't modal-block
      // the page; the banner is dismissible asynchronously without keyboard
      // hijack. WCAG-friendlier for non-blocking cookie notices.
      role="region"
      aria-live="polite"
      aria-label={t("title")}
      style={{
        position: "fixed",
        bottom: 16,
        left: 16,
        right: 16,
        zIndex: 50,
        maxWidth: 560,
        marginInline: "auto",
        background: "var(--surface-container)",
        border: "1px solid var(--outline-variant)",
        borderRadius: 8,
        padding: "16px 18px",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.35)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        pointerEvents: "auto",
      }}
    >
      <p
        style={{
          margin: 0,
          fontFamily: "var(--font-mono, ui-monospace)",
          fontSize: 11,
          letterSpacing: 2,
          textTransform: "uppercase",
          color: "var(--primary)",
        }}
      >
        {t("title")}
      </p>
      <p
        style={{
          margin: 0,
          fontSize: 13,
          lineHeight: 1.5,
          color: "var(--on-surface-variant)",
        }}
      >
        {t("body")}
      </p>
      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          marginTop: 4,
        }}
      >
        <button
          type="button"
          onClick={handleAccept}
          className="btn btn-primary"
          style={{ fontSize: 12 }}
        >
          {t("accept")}
        </button>
        <button
          type="button"
          onClick={handleReject}
          className="btn btn-ghost"
          style={{ fontSize: 12 }}
        >
          {t("reject")}
        </button>
      </div>
    </div>
  );
}
