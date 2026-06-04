"use client";

import { useTranslations } from "next-intl";
import Reveal from "./Reveal";

interface Item {
  title: string;
  body: string;
}

const ICONS = [
  // Doc
  <svg key="f1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M8 13h8 M8 17h5" />
  </svg>,
  // Chart up
  <svg key="f2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M3 3v18h18 M7 14l4-4 4 4 5-5" />
  </svg>,
  // Arrows
  <svg key="f3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M7 7l-4 4 4 4M3 11h14M17 17l4-4-4-4M21 13H7" />
  </svg>,
  // Layers
  <svg key="f4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M3 7l9 5 9-5M3 7v10l9 5 9-5V7M3 7l9-5 9 5" />
  </svg>,
  // Bubble
  <svg key="f5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.5 8.5 0 0 1 12.6-11.1A8.4 8.4 0 0 1 21 11.5z" />
  </svg>,
  // Shield
  <svg key="f6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z M9 12l2 2 4-4" />
  </svg>,
];

export default function Features() {
  const t = useTranslations("features");
  const itemsRaw = t.raw("items");
  const items = Array.isArray(itemsRaw) ? itemsRaw : [];

  return (
    <section
      className="py-32 border-t"
      style={{ borderTopColor: "var(--outline-hairline)" }}
      id="features"
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

        <Reveal
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[1px] border border-outline-variant rounded-lg overflow-hidden"
          // gap-[1px] + outline bg gives us the hairline separators between tiles
        >
          {items.map((item, i) => (
            <div
              key={i}
              className="group bg-surface p-8 px-7 transition-colors duration-[240ms] ease-[var(--ease-out)] hover:bg-surface-container-low"
              style={{ outline: "1px solid var(--outline-variant)", outlineOffset: "-1px" }}
            >
              <div className="w-6 h-6 text-on-surface-variant mb-[18px] transition-colors duration-[240ms] ease-[var(--ease-out)] group-hover:text-primary">
                {ICONS[i]}
              </div>
              <h3 className="font-display font-semibold text-[16px] tracking-[-0.01em] m-0 mb-1.5 text-on-surface">
                {item.title}
              </h3>
              <p
                className="text-on-surface-variant m-0"
                style={{ fontSize: "13px", lineHeight: 1.55 }}
              >
                {item.body}
              </p>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
