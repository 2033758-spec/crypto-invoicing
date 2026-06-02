"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { track } from "../../../lib/analytics";

type ToolKey = "lemon" | "paypal" | "payoneer" | "wise";

const TOOL_RATES: Record<ToolKey, { spread: number; fee: number; name: string }> = {
  lemon: { spread: 0.025, fee: 0.015, name: "Lemon Cash" },
  paypal: { spread: 0.04, fee: 0.044, name: "PayPal" },
  payoneer: { spread: 0.03, fee: 0.02, name: "Payoneer" },
  wise: { spread: 0.015, fee: 0.009, name: "Wise" },
};
const OUR_FEE = 0.01;

const TOOLS: { key: ToolKey; label: string }[] = [
  { key: "lemon", label: "Lemon" },
  { key: "paypal", label: "PayPal" },
  { key: "payoneer", label: "Payoneer" },
  { key: "wise", label: "Wise" },
];

const fmt = (n: number) =>
  "$" +
  Math.round(n).toLocaleString("en-US");

/**
 * Calculator — loss-vs-Crypto-Invoicing widget.
 *
 *   Left column: monthly amount input + slider, tool segmented, country segmented (AR active, BR beta)
 *   Right column: animated yearly loss number (rAF tick), breakdown rows, "you save" highlight.
 *
 * Math matches `landing.js`:
 *   yearly = monthly * 12
 *   loss = yearly*spread + yearly*fee  (where rates depend on tool)
 *   ours = yearly * 0.01
 *   save = loss - ours
 */
export default function Calculator() {
  const t = useTranslations("calc");

  const [monthly, setMonthly] = useState(4200);
  const [tool, setTool] = useState<ToolKey>("lemon");
  // country is visual only for now (BR is BETA tag, calc math is identical)
  const [country, setCountry] = useState<"AR" | "BR">("AR");

  // Debounced `calc_used` event — fires 700ms after the last input change so
  // a slider drag emits one event, not 50. Skips the initial mount.
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const id = window.setTimeout(() => {
      track("calc_used", { monthly, tool, country });
    }, 700);
    return () => window.clearTimeout(id);
  }, [monthly, tool, country]);

  const r = TOOL_RATES[tool];
  const yearly = monthly * 12;
  const spread = yearly * r.spread;
  const fee = yearly * r.fee;
  const loss = spread + fee;
  const ours = yearly * OUR_FEE;
  const save = loss - ours;

  return (
    <section
      className="py-32 border-t"
      style={{ borderTopColor: "var(--outline-hairline)" }}
      id="calc"
    >
      <div className="shell">
        <div className="mb-16 max-w-[80ch]">
          <p className="eyebrow">{t("eyebrow")}</p>
          <h2
            className="font-display font-semibold leading-[1.05] tracking-[-0.035em] mb-[18px] max-w-[20ch] text-on-surface"
            style={{ fontSize: "clamp(32px, 4vw, 52px)" }}
          >
            {t("h2")}
          </h2>
          <p
            className="text-on-surface-variant max-w-[60ch]"
            style={{ fontSize: "18px", lineHeight: 1.55 }}
          >
            {t("lead")}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] bg-surface-container-low border border-outline-variant rounded-lg overflow-hidden">
          {/* INPUTS */}
          <div className="p-9 border-b lg:border-b-0 lg:border-r border-outline-variant">
            <Field label={t("monthlyLabel")}>
              <div className="flex items-baseline gap-2.5 border-b border-outline-variant pb-2.5 focus-within:border-b-primary transition-colors duration-200">
                <span className="font-mono text-[13px] text-on-surface-placeholder">
                  {t("currency")}
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={monthly.toLocaleString("en-US")}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^0-9]/g, "");
                    const num = Number(v) || 0;
                    setMonthly(Math.min(50000, num));
                  }}
                  className="font-mono font-medium text-[28px] bg-transparent border-none outline-none text-on-surface w-full"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                />
              </div>
              <input
                type="range"
                min={500}
                max={10000}
                step={100}
                value={Math.min(10000, Math.max(500, monthly))}
                onChange={(e) => setMonthly(Number(e.target.value))}
                className="calc-slider"
              />
            </Field>

            <Field label={t("toolLabel")}>
              <Segmented>
                {TOOLS.map((opt) => (
                  <SegBtn
                    key={opt.key}
                    active={tool === opt.key}
                    onClick={() => setTool(opt.key)}
                  >
                    {opt.label}
                  </SegBtn>
                ))}
              </Segmented>
            </Field>

            <Field label={t("countryLabel")} last>
              <Segmented>
                <SegBtn active={country === "AR"} onClick={() => setCountry("AR")}>
                  {t("countryAR")}
                </SegBtn>
                <SegBtn active={country === "BR"} onClick={() => setCountry("BR")}>
                  {t("countryBR")}
                  <span
                    className="ml-1.5 font-mono text-[9px] text-on-surface-placeholder"
                    style={{ letterSpacing: "0.1em" }}
                  >
                    {t("betaTag")}
                  </span>
                </SegBtn>
              </Segmented>
            </Field>
          </div>

          {/* OUTPUT */}
          <div className="p-9 bg-surface-container relative">
            <div
              className="font-mono text-[10px] uppercase text-on-surface-placeholder mb-3"
              style={{ letterSpacing: "0.1em" }}
            >
              {t("outLabel")} <TickText value={r.name} />
            </div>

            <div
              className="font-mono font-bold text-tertiary leading-[1] my-1.5 mb-1"
              style={{
                fontSize: "clamp(48px, 5vw, 72px)",
                letterSpacing: "-0.02em",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              <TickNum value={loss} />
            </div>
            <div className="text-on-surface-variant mb-6" style={{ fontSize: "14px" }}>
              {t("lossOnLabel")}{" "}
              <span className="font-mono" style={{ fontVariantNumeric: "tabular-nums" }}>
                <TickNum value={yearly} />
              </span>
              {t("lossOnSuffix")}
            </div>

            <div className="border-t border-outline-variant pt-5">
              <BrRow k={t("spreadLabel")}>
                <TickNum value={spread} />
              </BrRow>
              <BrRow k={t("feeLabel")}>
                <TickNum value={fee} />
              </BrRow>
              <BrRow k={t("oursLabel")} accent>
                <TickNum value={ours} />
              </BrRow>
            </div>

            <div
              className="mt-6 px-4 py-3.5 border rounded flex justify-between items-center"
              style={{
                background: "rgba(105, 218, 182, 0.08)",
                borderColor: "var(--primary-pressed)",
              }}
            >
              <span
                className="font-mono text-[11px] uppercase text-primary"
                style={{ letterSpacing: "0.08em" }}
              >
                {t("saveLabel")}
              </span>
              <span
                className="font-mono text-[22px] font-semibold text-primary-hover"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                <TickNum value={save} />
              </span>
            </div>

            <div
              className="mt-3.5 font-mono text-[10px] text-on-surface-placeholder"
              style={{ lineHeight: 1.4 }}
            >
              {t("footnote")}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Field({
  label,
  children,
  last = false,
}: {
  label: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div className={last ? "" : "mb-7"}>
      <label
        className="block font-mono text-[10px] uppercase text-on-surface-placeholder mb-3"
        style={{ letterSpacing: "0.1em" }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function Segmented({ children }: { children: React.ReactNode }) {
  // On phones (<480px) we let segments wrap to two rows instead of crushing
  // them below WCAG 2.5.5 (44×44) — much better tap accuracy than squeezing.
  return (
    <div
      className="flex flex-wrap min-[480px]:flex-nowrap gap-1 min-[480px]:gap-0 border border-outline-variant rounded p-[3px]"
      style={{ background: "var(--surface)" }}
    >
      {children}
    </div>
  );
}

function SegBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      // min-h-[44px] satisfies WCAG 2.5.5 touch-target. Reverts to compact
      // 12px-padded button on desktop where mouse precision is fine.
      className={`flex-1 min-h-[44px] min-[480px]:min-h-0 font-display font-medium text-[13px] min-[480px]:text-[12px] border-none px-3 py-2 rounded-[3px] cursor-pointer transition-all duration-150 ${
        active
          ? "bg-surface-container-high text-on-surface"
          : "bg-transparent text-on-surface-variant"
      }`}
    >
      {children}
    </button>
  );
}

function BrRow({
  k,
  accent = false,
  children,
}: {
  k: string;
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex justify-between py-2 font-mono text-[13px]">
      <span className="text-on-surface-variant">{k}</span>
      <span
        className={accent ? "text-primary-hover" : "text-on-surface"}
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {children}
      </span>
    </div>
  );
}

/** Smoothly animates a number from previous → current via rAF. */
function TickNum({ value }: { value: number }) {
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setDisplay(value);
      prevRef.current = value;
      return;
    }
    const from = prevRef.current;
    const to = value;
    if (from === to) {
      setDisplay(to);
      return;
    }
    const start = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const ttt = Math.min(1, (now - start) / 400);
      const eased = 1 - Math.pow(1 - ttt, 3);
      setDisplay(from + (to - from) * eased);
      if (ttt < 1) raf = requestAnimationFrame(step);
      else prevRef.current = to;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return <>{fmt(display)}</>;
}

/** Just renders text — kept as a separate component so we can swap to ticker. */
function TickText({ value }: { value: string }) {
  return <>{value}</>;
}
