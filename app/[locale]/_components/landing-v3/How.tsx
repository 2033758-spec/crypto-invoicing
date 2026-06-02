import { useTranslations } from "next-intl";
import Reveal from "./Reveal";

interface Step {
  num: string;
  title: string;
  body: string;
  time: string;
}

const ICONS = [
  // Generate link
  <svg key="s1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M9 13h6 M9 17h4" />
  </svg>,
  // USDC
  <svg key="s2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M21 7H3a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM21 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v2" />
    <circle cx="17" cy="13" r="1.5" />
  </svg>,
  // FX
  <svg key="s3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M7 7l-4 4 4 4M3 11h14M17 17l4-4-4-4M21 13H7" />
  </svg>,
  // Bank
  <svg key="s4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10l5 5 5-5 M12 15V3" />
  </svg>,
];

export default function How() {
  const t = useTranslations("how");
  const steps = t.raw("steps") as Step[];

  return (
    <section
      className="py-32 border-t"
      style={{ borderTopColor: "var(--outline-hairline)" }}
      id="how"
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

        <Reveal className="how-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0 relative">
          {steps.map((s, i) => (
            <div
              key={i}
              className="how-step group relative p-9 px-6 border border-outline-variant bg-surface-container-low transition-colors duration-[240ms] ease-[var(--ease-out)] hover:bg-surface-container [&:not(:first-child)]:lg:border-l-0 lg:first:rounded-l-lg lg:last:rounded-r-lg sm:[&:nth-child(odd)]:border-r-0 sm:lg:[&:nth-child(odd)]:border-r"
            >
              <div
                className="font-mono text-[11px] uppercase text-on-surface-placeholder mb-[18px] flex items-center gap-2.5 transition-colors duration-[240ms] ease-[var(--ease-out)] group-hover:text-primary"
                style={{ letterSpacing: "0.1em" }}
              >
                <span
                  className="inline-block w-3.5 h-3.5 rounded-full"
                  style={{ border: "1px solid currentColor" }}
                />
                {s.num}
              </div>
              <div className="w-7 h-7 text-primary mb-[18px]">{ICONS[i]}</div>
              <h3 className="font-display font-semibold text-[17px] tracking-[-0.01em] m-0 mb-2 text-on-surface">
                {s.title}
              </h3>
              <p
                className="text-on-surface-variant m-0"
                style={{ fontSize: "13px", lineHeight: 1.55 }}
              >
                {s.body}
              </p>
              <span
                className="block mt-[18px] font-mono text-[10px] text-primary"
                style={{ letterSpacing: "0.08em" }}
              >
                {s.time}
              </span>

              {/* Connector dash (desktop only, hidden on last) */}
              {i < steps.length - 1 && (
                <span
                  aria-hidden
                  className="hidden lg:block absolute top-1/2 -right-2 w-4 h-[1px] z-[2]"
                  style={{
                    background:
                      "repeating-linear-gradient(90deg, var(--primary) 0 4px, transparent 4px 8px)",
                  }}
                />
              )}
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
