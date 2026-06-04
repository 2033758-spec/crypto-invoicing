"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import Logo from "../_components/landing-v3/Logo";
import { getBrowserSupabase } from "../../lib/supabase";
import { track } from "../../lib/analytics";

interface Props {
  locale: string;
}

type Status = "idle" | "submitting" | "ok" | "error" | "rate_limited";
type ErrorType = "validation" | "rate_limit" | "network" | null;

// RFC 5321 compliant email validation
// Requires: local@domain.tld format with reasonable length (min 3 chars after @, min 2 after TLD)
const EMAIL_RE = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
const MAX_EMAIL_LENGTH = 254; // RFC 5321 standard
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const MAX_ATTEMPTS_PER_WINDOW = 3;

/**
 * Sign-up form — Design System v3.
 *
 *   [ Continue with Google ]   (jade outline button; Supabase OAuth)
 *           — or —
 *   Email magic-link form
 *
 * Auth callback at `/[locale]/auth/callback` handles both:
 *   - OAuth code-exchange (`?code=`)
 *   - Magic-link OTP (legacy hash flow → detectSessionInUrl)
 */
export default function SignupForm({ locale }: Props) {
  const t = useTranslations("signup");

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<ErrorType>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [rateLimitRetryIn, setRateLimitRetryIn] = useState<number | null>(null);
  const [submitAttempts, setSubmitAttempts] = useState<number[]>([]); // timestamps of attempts

  const homeHref = locale === "es-AR" ? "/" : `/${locale}`;
  const termsHref =
    locale === "es-AR" ? "/legal/terms" : `/${locale}/legal/terms`;
  const privacyHref =
    locale === "es-AR" ? "/legal/privacy" : `/${locale}/legal/privacy`;

  // Fire `signup_started` once per page visit. Useful to compute the funnel
  // /signup → signup_completed and quantify drop-off at the form itself.
  useEffect(() => {
    track("signup_started", { locale });
  }, [locale]);

  const dashboardPath =
    locale === "es-AR" ? "/dashboard" : `/${locale}/dashboard`;
  const callbackPath =
    locale === "es-AR" ? "/auth/callback" : `/${locale}/auth/callback`;

  const handleGoogle = async () => {
    setGoogleLoading(true);
    setErrorMsg(null);
    track("signup_method_chosen", { method: "google" });
    try {
      const supabase = getBrowserSupabase();
      // Use explicit production domain instead of window.location.origin
      // to avoid redirect URL mismatches with www/non-www versions
      const origin = typeof window !== 'undefined' && window.location.hostname.includes('cryptoinvoicing')
        ? 'https://www.cryptoinvoicing.co'
        : window.location.origin;
      const redirectTo = `${origin}${callbackPath}?next=${encodeURIComponent(
        dashboardPath,
      )}`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });
      if (error) {
        console.error("[signup] signInWithOAuth(google) failed", error);
        setStatus("error");
        setErrorMsg(error.message || t("errorBody"));
        setGoogleLoading(false);
      }
      // On success Supabase redirects, so we never get here.
    } catch (err) {
      console.error("[signup] OAuth unexpected error", err);
      setStatus("error");
      setErrorMsg(t("errorBody"));
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();

    // 1. Email validation (RFC 5321)
    if (!EMAIL_RE.test(trimmed) || trimmed.length > MAX_EMAIL_LENGTH) {
      setStatus("error");
      setErrorType("validation");
      setErrorMsg("Email address format is invalid or too long");
      return;
    }

    // 2. Client-side rate limiting (max 3 attempts per minute)
    const now = Date.now();
    const recentAttempts = submitAttempts.filter(ts => now - ts < RATE_LIMIT_WINDOW_MS);

    if (recentAttempts.length >= MAX_ATTEMPTS_PER_WINDOW) {
      const oldestAttempt = Math.min(...recentAttempts);
      const retryAfterMs = RATE_LIMIT_WINDOW_MS - (now - oldestAttempt);
      const retryAfterSec = Math.ceil(retryAfterMs / 1000);

      setStatus("rate_limited");
      setErrorType("rate_limit");
      setRateLimitRetryIn(retryAfterSec);
      setErrorMsg(`Too many attempts. Please try again in ${retryAfterSec}s`);

      // Decrement counter every second
      const interval = setInterval(() => {
        setRateLimitRetryIn((prev) => {
          const next = prev ? prev - 1 : 0;
          if (next <= 0) {
            clearInterval(interval);
            setStatus("idle");
            setErrorMsg(null);
            setErrorType(null);
            return null;
          }
          setErrorMsg(`Too many attempts. Please try again in ${next}s`);
          return next;
        });
      }, 1000);
      return;
    }

    setStatus("submitting");
    setErrorMsg(null);
    setErrorType(null);
    setSubmitAttempts([...recentAttempts, now]);
    track("signup_method_chosen", { method: "email" });

    try {
      const supabase = getBrowserSupabase();
      const origin = typeof window !== 'undefined' && window.location.hostname.includes('cryptoinvoicing')
        ? 'https://www.cryptoinvoicing.co'
        : window.location.origin;
      const redirectTo = `${origin}${callbackPath}?next=${encodeURIComponent(
        dashboardPath,
      )}`;

      const { error } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: {
          emailRedirectTo: redirectTo,
          shouldCreateUser: true,
        },
      });

      if (error) {
        console.error("[signup] signInWithOtp failed", error);
        setStatus("error");
        setErrorType("network");

        // 3. Differentiate error types
        if (error.message?.includes("429") || error.message?.includes("rate")) {
          setErrorType("rate_limit");
          setErrorMsg("Email service temporarily unavailable. Please try again in a few moments.");
        } else if (error.message?.includes("network") || error.message?.includes("fetch")) {
          setErrorType("network");
          setErrorMsg("Network error. Please check your connection and try again.");
        } else {
          setErrorMsg(error.message || "An error occurred. Please try again.");
        }
        return;
      }
      setStatus("ok");
    } catch (err) {
      console.error("[signup] unexpected error", err);
      setStatus("error");
      setErrorType("network");
      setErrorMsg("An unexpected error occurred. Please try again.");
    }
  };

  return (
    <main className="relative min-h-screen flex flex-col px-4 sm:px-8 lg:px-16 py-10">
      {/* Back link */}
      <div className="relative z-10 max-w-shell mx-auto w-full">
        <Link
          href={homeHref}
          className="inline-flex items-center gap-2 font-mono text-[13px] text-on-surface-variant hover:text-on-surface transition-colors duration-150"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          {t("back")}
        </Link>
      </div>

      <div className="relative z-10 flex-1 flex items-center justify-center">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-3 mb-8 justify-center">
            <Logo className="w-10 h-10" />
            <span className="font-display font-semibold text-[20px] text-on-surface">
              Crypto Invoicing
            </span>
          </div>

          {status === "ok" ? (
            <div className="rounded-lg border border-primary/40 bg-surface-container-low p-8 text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/40 flex items-center justify-center mx-auto mb-5">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-primary">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
              <h1 className="font-display font-semibold text-[32px] tracking-[-0.02em] text-on-surface mb-3">
                {t("successTitle")}
              </h1>
              <p className="text-on-surface-variant" style={{ fontSize: "16px", lineHeight: 1.55 }}>
                {t("successBody", { email: email.trim().toLowerCase() })}
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-outline-variant bg-surface-container-low p-8">
              <h1 className="font-display font-semibold text-[32px] tracking-[-0.02em] text-on-surface mb-2">
                {t("title")}
              </h1>
              <p className="text-on-surface-variant mb-6" style={{ fontSize: "16px", lineHeight: 1.55 }}>
                {t("subtitle")}
              </p>

              {/* Google OAuth */}
              <button
                type="button"
                onClick={handleGoogle}
                disabled={googleLoading || status === "submitting"}
                className="w-full inline-flex items-center justify-center gap-2 rounded-md border border-outline-variant bg-transparent px-6 py-3 font-display font-medium text-[14px] text-on-surface hover:border-primary hover:text-primary-hover transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <GoogleIcon />
                {googleLoading ? t("submitting") : t("googleCta")}
              </button>

              {/* Divider */}
              <div className="my-6 flex items-center gap-3">
                <span className="flex-1 h-px bg-outline-variant" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-on-surface-placeholder">
                  {t("or")}
                </span>
                <span className="flex-1 h-px bg-outline-variant" />
              </div>

              {/* Email magic-link */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="signup-email"
                    className="block font-mono text-[10px] uppercase tracking-widest text-on-surface-placeholder mb-2"
                  >
                    {t("emailLabel")}
                  </label>
                  <input
                    id="signup-email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder={t("emailPlaceholder")}
                    value={email}
                    maxLength={MAX_EMAIL_LENGTH}
                    disabled={status === "rate_limited" || googleLoading}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (status === "error") setStatus("idle");
                    }}
                    aria-invalid={status === "error"}
                    className="w-full rounded-md border border-outline-variant bg-surface-container px-3 py-2.5 text-on-surface placeholder:text-outline focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>

                {(status === "error" || status === "rate_limited") && errorMsg && (
                  <div className={`flex items-start gap-2 rounded-md border p-3 ${
                    errorType === "rate_limit" ? "border-amber-500/30 bg-amber-500/5" : "border-tertiary/30 bg-tertiary/5"
                  }`}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`mt-0.5 flex-shrink-0 ${
                      errorType === "rate_limit" ? "text-amber-500" : "text-tertiary"
                    }`}>
                      {errorType === "rate_limit" ? (
                        <path d="M12 6v6m0 4v2M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" />
                      ) : (
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z M12 9v4 M12 17h.01" />
                      )}
                    </svg>
                    <div>
                      <div className={`font-mono text-[10px] uppercase tracking-widest mb-0.5 ${
                        errorType === "rate_limit" ? "text-amber-500" : "text-tertiary"
                      }`}>
                        {errorType === "rate_limit" ? "Rate Limited" : "Error"}
                      </div>
                      <p className="font-mono text-[12px] text-on-surface-variant">{errorMsg}</p>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={status === "submitting" || status === "rate_limited" || googleLoading}
                  className="btn btn-primary btn-lg w-full justify-center"
                >
                  {status === "submitting" && t("submitting")}
                  {status === "rate_limited" && `Retry in ${rateLimitRetryIn}s`}
                  {status !== "submitting" && status !== "rate_limited" && (
                    <>
                      {t("submit")}
                      <span className="arrow">→</span>
                    </>
                  )}
                </button>

                <p className="font-mono text-[12px] text-on-surface-placeholder text-center">
                  {t.rich("footnoteWithLinks", {
                    terms: (chunks) => (
                      <Link
                        href={termsHref}
                        className="underline hover:text-on-surface"
                      >
                        {chunks}
                      </Link>
                    ),
                    privacy: (chunks) => (
                      <Link
                        href={privacyHref}
                        className="underline hover:text-on-surface"
                      >
                        {chunks}
                      </Link>
                    ),
                  })}
                </p>
              </form>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function GoogleIcon() {
  // Multi-color Google "G" — bundled as inline SVG so no extra request.
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}
