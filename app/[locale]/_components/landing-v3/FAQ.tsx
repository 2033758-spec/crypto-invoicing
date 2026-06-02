import { useTranslations } from "next-intl";
import Reveal from "./Reveal";
import FaqClickTracker from "./FaqClickTracker";

interface Item {
  q: string;
  a: string;
}

export default function FAQ() {
  const t = useTranslations("faq");
  const items = t.raw("items") as Item[];

  // FAQPage JSON-LD — eligible for SERP rich-result (expanded accordions).
  // Built from the same i18n strings rendered visually below, so it stays in
  // sync per locale automatically.
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return (
    <section
      className="py-32 border-t"
      style={{ borderTopColor: "var(--outline-hairline)" }}
      id="faq"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <FaqClickTracker />
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

        <Reveal className="max-w-[800px]">
          {items.map((item, i) => (
            <details
              key={i}
              data-faq-id={`faq-${i + 1}`}
              className="faq-item group border-t border-outline-variant last:border-b py-[22px] cursor-pointer transition-colors duration-150"
              open={i === 0}
            >
              <summary className="font-display font-medium text-[17px] tracking-[-0.01em] text-on-surface flex justify-between items-center cursor-pointer hover:text-primary-hover transition-colors duration-150">
                {item.q}
                <svg
                  className="faq-plus w-[18px] h-[18px] text-on-surface-placeholder flex-shrink-0 ml-4 transition-[transform,color] duration-[240ms] ease-[var(--ease-out)]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </summary>
              <p
                className="text-on-surface-variant pt-3.5 pr-8 m-0 max-w-[70ch]"
                style={{ fontSize: "14px", lineHeight: 1.65 }}
              >
                {item.a}
              </p>
            </details>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
