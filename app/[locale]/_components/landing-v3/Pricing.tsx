"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import Reveal from "./Reveal";
import { track } from "../../../lib/analytics";

interface Props {
  locale: string;
}

const Check = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M20 6L9 17l-5-5" />
  </svg>
);
const X = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

export default function Pricing({ locale }: Props) {
  const t = useTranslations("pricing");
  const signupHref = locale === "es-AR" ? "/signup" : `/${locale}/signup`;
  const starter = t.raw("starter") as {
    plan: string;
    amt: string;
    unit: string;
    tagline: string;
    features: string[];
    muted: string[];
    cta: string;
  };
  const pro = t.raw("pro") as {
    ribbon: string;
    plan: string;
    amt: string;
    unit: string;
    tagline: string;
    features: string[];
    cta: string;
    guarantee: string;
  };

  return (
    <section
      className="py-32 border-t"
      style={{ borderTopColor: "var(--outline-hairline)" }}
      id="pricing"
    >
      <div className="shell">
        <Reveal className="mb-16 max-w-[80ch]">
          <p className="eyebrow">{t("eyebrow")}</p>
          <h2
            className="font-display font-semibold leading-[1.05] tracking-[-0.035em] mb-[18px] max-w-[20ch] text-on-surface"
            style={{ fontSize: "clamp(32px, 4vw, 52px)" }}
          >
            {t("h2Prefix")}
            <span className="text-primary">{t("h2Accent")}</span>
          </h2>
          <p
            className="text-on-surface-variant max-w-[60ch]"
            style={{ fontSize: "18px", lineHeight: 1.55 }}
          >
            {t("lead")}
          </p>
        </Reveal>

        <Reveal className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* Starter */}
          <div className="bg-surface-container border border-outline-variant rounded-lg p-8 relative transition-[border-color,box-shadow] duration-[240ms] ease-[var(--ease-out)] hover:border-primary hover:shadow-glow-jade">
            <div
              className="font-mono text-[11px] uppercase text-on-surface-placeholder"
              style={{ letterSpacing: "0.12em" }}
            >
              {starter.plan}
            </div>
            <div
              className="font-mono font-semibold text-on-surface mt-4 mb-1 leading-[1]"
              style={{
                fontSize: "56px",
                letterSpacing: "-0.02em",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {starter.amt}
              <span className="text-[16px] text-on-surface-placeholder font-normal ml-1">
                {starter.unit}
              </span>
            </div>
            <p
              className="text-on-surface-variant m-0 mb-[22px]"
              style={{ fontSize: "14px" }}
            >
              {starter.tagline}
            </p>
            <ul className="list-none p-0 m-0 mb-7 border-t border-outline-variant pt-[22px]">
              {starter.features.map((f, i) => (
                <li
                  key={i}
                  className="text-on-surface py-[7px] flex items-center gap-2.5"
                  style={{ fontSize: "13px" }}
                >
                  <span className="w-3.5 h-3.5 text-primary flex-shrink-0">
                    <Check />
                  </span>
                  {f}
                </li>
              ))}
              {starter.muted.map((f, i) => (
                <li
                  key={`m${i}`}
                  className="text-on-surface-placeholder py-[7px] flex items-center gap-2.5"
                  style={{ fontSize: "13px" }}
                >
                  <span className="w-3.5 h-3.5 text-on-surface-placeholder flex-shrink-0">
                    <X />
                  </span>
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href={signupHref}
              className="btn btn-secondary btn-lg"
              style={{ width: "100%", justifyContent: "center" }}
              onClick={() =>
                track("cta_clicked", { cta: "start_now_pricing_starter" })
              }
            >
              {starter.cta}
            </Link>
          </div>

          {/* Pro (featured) */}
          <div
            className="border rounded-lg p-8 relative transition-[border-color,box-shadow] duration-[240ms] ease-[var(--ease-out)] hover:border-primary hover:shadow-glow-jade"
            style={{
              borderColor: "var(--primary-pressed)",
              background:
                "linear-gradient(180deg, rgba(105,218,182,0.04), transparent 70%), var(--surface-container)",
            }}
          >
            <span
              className="absolute top-[18px] right-[18px] font-mono text-[10px] text-primary border px-2.5 py-1"
              style={{
                letterSpacing: "0.1em",
                background: "var(--surface)",
                borderColor: "var(--primary-pressed)",
                borderRadius: 9999,
              }}
            >
              {pro.ribbon}
            </span>
            <div
              className="font-mono text-[11px] uppercase text-primary"
              style={{ letterSpacing: "0.12em" }}
            >
              {pro.plan}
            </div>
            <div
              className="font-mono font-semibold text-on-surface mt-4 mb-1 leading-[1]"
              style={{
                fontSize: "56px",
                letterSpacing: "-0.02em",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {pro.amt}
              <span className="text-[16px] text-on-surface-placeholder font-normal ml-1">
                {pro.unit}
              </span>
            </div>
            <p
              className="text-on-surface-variant m-0 mb-[22px]"
              style={{ fontSize: "14px" }}
            >
              {pro.tagline}
            </p>
            <ul className="list-none p-0 m-0 mb-7 border-t border-outline-variant pt-[22px]">
              {pro.features.map((f, i) => (
                <li
                  key={i}
                  className="text-on-surface py-[7px] flex items-center gap-2.5"
                  style={{ fontSize: "13px" }}
                >
                  <span className="w-3.5 h-3.5 text-primary flex-shrink-0">
                    <Check />
                  </span>
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href={signupHref}
              className="btn btn-primary btn-lg"
              style={{ width: "100%", justifyContent: "center" }}
              onClick={() =>
                track("cta_clicked", { cta: "start_now_pricing_pro" })
              }
            >
              {pro.cta} <span className="arrow">→</span>
            </Link>
            <div
              className="font-mono text-[11px] text-on-surface-placeholder mt-3.5 pt-3.5 border-t border-outline-variant"
              style={{ lineHeight: 1.4 }}
            >
              {pro.guarantee}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
