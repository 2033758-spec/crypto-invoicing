import { useTranslations } from "next-intl";
import Reveal from "./Reveal";

interface Card {
  id: string;
  title: string;
  body: string;
  costLabel: string;
  costValue: string;
}

const ICONS = [
  // Spread
  <svg key="i1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M7 7l-4 4 4 4M3 11h14M17 17l4-4-4-4M21 13H7" />
  </svg>,
  // Fees
  <svg key="i2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="12" r="9" />
    <path d="M9 9c0-1.5 1.3-2.5 3-2.5s3 1 3 2.5c0 2.5-3 2.5-3 5 M12 17h.01" />
  </svg>,
  // AFIP
  <svg key="i3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M8 13h8 M8 17h5" />
  </svg>,
];

export default function Problem() {
  const t = useTranslations("problem");
  const cards = t.raw("cards") as Card[];

  return (
    <section
      className="py-32 border-t"
      style={{ borderTopColor: "var(--outline-hairline)" }}
      id="problem"
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
            {t("h2Suffix")}
          </h2>
          <p
            className="text-on-surface-variant max-w-[60ch]"
            style={{ fontSize: "18px", lineHeight: 1.55 }}
          >
            {t("lead")}
          </p>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {cards.map((c, i) => (
            <Reveal key={i} as="article" delay={i * 80} className="bg-surface-container border border-outline-variant rounded-lg p-7 transition-[border-color,box-shadow,transform] duration-[240ms] ease-[var(--ease-out)] hover:border-tertiary hover:-translate-y-0.5" >
              <div
                className="font-mono text-[10px] uppercase text-on-surface-placeholder mb-[18px]"
                style={{ letterSpacing: "0.1em" }}
              >
                {c.id}
              </div>
              <div className="w-8 h-8 text-tertiary mb-3.5">{ICONS[i]}</div>
              <h3 className="font-display font-semibold text-[20px] tracking-[-0.015em] m-0 mb-2.5 text-on-surface">
                {c.title}
              </h3>
              <p
                className="text-on-surface-variant m-0 mb-[18px]"
                style={{ fontSize: "14px", lineHeight: 1.55 }}
              >
                {c.body}
              </p>
              <div
                className="font-mono text-[11px] text-tertiary border-t border-outline-variant pt-3.5 flex justify-between"
                style={{ letterSpacing: "0.04em" }}
              >
                <span>{c.costLabel}</span>
                <b className="font-medium text-on-surface">{c.costValue}</b>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
