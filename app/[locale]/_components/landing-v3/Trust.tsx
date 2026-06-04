"use client";

import { useTranslations } from "next-intl";
import Reveal from "./Reveal";

interface Card {
  title: string;
  body: string;
}

const ICONS = [
  <svg key="t1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>,
  <svg key="t2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="12" r="9" />
    <path d="M8 14s1.5 2 4 2 4-2 4-2 M9 9h.01 M15 9h.01" />
  </svg>,
  <svg key="t3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75" />
    <circle cx="8.5" cy="7" r="4" />
  </svg>,
  <svg key="t4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M9 15l2 2 4-4" />
  </svg>,
];

export default function Trust() {
  const t = useTranslations("trust");
  const cardsRaw = t.raw("cards");
  const cards = Array.isArray(cardsRaw) ? cardsRaw : [];

  return (
    <section
      className="py-32 border-t"
      style={{ borderTopColor: "var(--outline-hairline)" }}
      id="trust"
    >
      <div className="shell">
        <Reveal className="mb-16 max-w-[80ch]">
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
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {cards.map((c, i) => (
            <Reveal
              key={i}
              delay={i * 60}
              className="bg-surface-container border border-outline-variant rounded-lg p-7 flex gap-[18px] items-start transition-[border-color,box-shadow] duration-[240ms] ease-[var(--ease-out)] hover:border-primary hover:shadow-glow-jade"
            >
              <div className="w-[22px] h-[22px] text-primary flex-shrink-0 mt-0.5">
                {ICONS[i]}
              </div>
              <div>
                <h3 className="font-display font-semibold text-[16px] tracking-[-0.01em] m-0 mb-1.5 text-on-surface">
                  {c.title}
                </h3>
                <p
                  className="text-on-surface-variant m-0 trust-body"
                  style={{ fontSize: "13px", lineHeight: 1.55 }}
                  dangerouslySetInnerHTML={{ __html: c.body }}
                />
              </div>
            </Reveal>
          ))}
        </div>
      </div>

      <style>{`
        .trust-body code {
          font-family: var(--font-mono);
          font-size: 12px;
          background: var(--surface);
          padding: 1px 6px;
          border-radius: 3px;
          color: var(--on-surface);
        }
      `}</style>
    </section>
  );
}
