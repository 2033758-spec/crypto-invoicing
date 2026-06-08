"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { track } from "../../../lib/analytics";

interface Props {
  locale: string;
  liveRate: number;
  liveSource: string;
  liveBrlRate: number;
  liveBrlSource: string;
  /** When true, the user already has a session — primary CTA points to the dashboard, not signup. */
  isAuthenticated?: boolean;
}

/**
 * Hero — matches `.hero` / `.hero-grid` / `.live-rate` in landing.css.
 *
 *  - Eyebrow + 2-line H1 with jade accent
 *  - Word-by-word stagger reveal on H1 (50ms per word)
 *  - Subtitle (HTML allowed: <strong>, <br>)
 *  - 2-button CTA row
 *  - Trust line
 *  - Live rate widget (USDC→ARS from server + BRL static + jitter on
 *    client every 5.2s for "alive" feel)
 */
export default function Hero({
  locale,
  liveRate,
  liveSource,
  liveBrlRate,
  liveBrlSource,
  isAuthenticated = false,
}: Props) {
  const t = useTranslations("hero");
  const tn = useTranslations("nav");
  const signupHref = locale === "es-AR" ? "/signup" : `/${locale}/signup`;
  const dashboardHref = locale === "es-AR" ? "/dashboard" : `/${locale}/dashboard`;

  return (
    <section className="relative pt-32 pb-24">
      <div className="shell">
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-12 lg:gap-16 items-center">
          <div>
            <p className="eyebrow">{t("eyebrow")}</p>
            <h1
              className="font-display font-bold leading-[1.0] tracking-[-0.04em] mb-7 max-w-[14ch] text-on-surface"
              style={{ fontSize: "clamp(40px, 6.2vw, 80px)" }}
            >
              <RevealWords text={t("h1Line1")} />
              <br />
              <span className="text-primary">
                <RevealWords text={t("h1Line2")} delayOffset={t("h1Line1").split(/\s+/).length * 50} />
              </span>
            </h1>
            <p
              className="text-on-surface-variant mb-9 max-w-[56ch]"
              style={{ fontSize: "clamp(16px, 1.4vw, 19px)", lineHeight: 1.55 }}
              // i18n strings allow inline <strong> and entities.
              dangerouslySetInnerHTML={{ __html: t.raw("subtitle") as string }}
            />
            <div className="flex gap-3 items-center flex-wrap">
              <Link
                href={isAuthenticated ? dashboardHref : signupHref}
                className="btn btn-primary btn-lg"
                onClick={() =>
                  track("cta_clicked", {
                    cta: isAuthenticated ? "go_dashboard_hero" : "start_now_hero",
                  })
                }
              >
                {isAuthenticated ? tn("dashboard") : t("primaryCta")}{" "}
                <span className="arrow">→</span>
              </Link>
              <a
                href="#calc"
                className="btn btn-secondary btn-lg"
                onClick={() => track("cta_clicked", { cta: "calculator" })}
              >
                {t("secondaryCta")}
              </a>
            </div>
            <div
              className="mt-7 font-mono text-[11px] text-on-surface-placeholder flex items-center gap-3.5"
              style={{ letterSpacing: "0.04em" }}
            >
              <span
                className="inline-block w-1.5 h-1.5 rounded-full"
                style={{
                  background: "var(--primary)",
                  boxShadow: "0 0 8px var(--primary)",
                }}
              />
              {t("trustLine")}
            </div>
          </div>

          <LiveRateCard
            liveRate={liveRate}
            liveSource={liveSource}
            liveBrlRate={liveBrlRate}
            liveBrlSource={liveBrlSource}
          />
        </div>
      </div>
    </section>
  );
}

/** Word-by-word reveal — splits a string into words and animates each in. */
function RevealWords({
  text,
  delayOffset = 0,
}: {
  text: string;
  delayOffset?: number;
}) {
  const words = text.trim().split(/\s+/);
  return (
    <>
      {words.map((w, i) => (
        <span
          key={`${w}-${i}`}
          className="reveal-word"
          style={{ animationDelay: `${delayOffset + i * 50}ms` }}
        >
          {w}
          {i < words.length - 1 ? " " : ""}
        </span>
      ))}
    </>
  );
}

/** Live rate widget — server-rendered initial value, then jitters client-side. */
function LiveRateCard({
  liveRate,
  liveSource,
  liveBrlRate,
  liveBrlSource: _liveBrlSource,
}: {
  liveRate: number;
  liveSource: string;
  liveBrlRate: number;
  liveBrlSource: string;
}) {
  const t = useTranslations("hero.rate");
  const [rate, setRate] = useState(liveRate);
  const [brlRate, setBrlRate] = useState(liveBrlRate);
  const [seconds, setSeconds] = useState(12);
  const baseRef = useRef(liveRate);
  const baseBrlRef = useRef(liveBrlRate);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    const jitterTimer = window.setInterval(() => {
      // ARS jitter (~±0.6 ARS) — same magnitude as the original implementation.
      baseRef.current += (Math.random() - 0.5) * 1.2;
      // BRL jitter much smaller (~±0.005 BRL = ~0.1%) to look realistic.
      baseBrlRef.current += (Math.random() - 0.5) * 0.01;

      const curArs = rate;
      const targetArs = baseRef.current;
      const curBrl = brlRate;
      const targetBrl = baseBrlRef.current;
      const start = performance.now();
      const step = (now: number) => {
        const ttt = Math.min(1, (now - start) / 600);
        const eased = 1 - Math.pow(1 - ttt, 3);
        setRate(curArs + (targetArs - curArs) * eased);
        setBrlRate(curBrl + (targetBrl - curBrl) * eased);
        if (ttt < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
      setSeconds(0);
    }, 5200);
    const tickTimer = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => {
      clearInterval(jitterTimer);
      clearInterval(tickTimer);
    };
    // We intentionally include `rate` only via ref pattern; eslint-disable below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formattedArs = `$${rate.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
  const formattedBrl = `R$ ${brlRate.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
  // Synthetic delta-percent — same approach as ARS card.
  const brlDelta = ((brlRate - liveBrlRate) / liveBrlRate) * 100;
  const brlDeltaLabel = `${brlDelta >= 0 ? "+" : ""}${brlDelta.toFixed(2)}%`;

  // Compute relative time label, swapping the source for the fresh stamp.
  const timeLabel = `${liveSource} · ${seconds}s`;

  return (
    <div className="reveal in lg:reveal lg:opacity-0 group bg-surface-container border border-outline-variant rounded-lg p-6 relative transition-[border-color,box-shadow] duration-[240ms] ease-[var(--ease-out)] hover:border-primary hover:shadow-glow-jade">
      <div className="flex justify-between items-center pb-3.5 border-b border-outline-variant mb-[18px]">
        <span
          className="font-mono text-[10px] uppercase text-on-surface-placeholder"
          style={{ letterSpacing: "0.1em" }}
        >
          {t("label")}
        </span>
        <span className="font-mono text-[10px] text-primary flex items-center gap-1.5">
          <span
            className="w-1.5 h-1.5 rounded-full bg-primary"
            style={{ animation: "ci-pulse 2s cubic-bezier(0.65,0,0.35,1) infinite" }}
          />
          <span>{timeLabel}</span>
        </span>
      </div>
      <div className="flex justify-between items-baseline py-2.5">
        <span className="font-mono text-[13px] text-on-surface-variant">
          {t("from")}
        </span>
        <span
          className="font-mono text-[24px] font-semibold text-on-surface"
          style={{
            letterSpacing: "-0.01em",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {formattedArs}
          <span className="font-mono text-[11px] text-primary ml-1.5">
            +0.12%
          </span>
        </span>
      </div>
      <div className="flex justify-between items-baseline py-2.5">
        <span className="font-mono text-[13px] text-on-surface-variant">
          {t("fromBr")}
        </span>
        <span
          className="font-mono text-[18px] text-on-surface-variant"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {formattedBrl}{" "}
          <span
            className={`font-mono text-[11px] ml-1 ${
              brlDelta >= 0 ? "text-primary" : "text-tertiary"
            }`}
          >
            {brlDeltaLabel}
          </span>
        </span>
      </div>
      <div className="mt-3.5 pt-3.5 border-t border-outline-variant font-mono text-[10px] text-on-surface-placeholder flex justify-between">
        <span>{t("footerRouting")}</span>
        <span>{t("footerSources")}</span>
      </div>
    </div>
  );
}
