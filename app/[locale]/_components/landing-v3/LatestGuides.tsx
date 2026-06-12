import Link from "next/link";
import { getArticles, RESOURCES_UI } from "../../recursos/_content/articles";

// "Últimas guías" — surfaces the 3 most recent resource articles on the home,
// just above the footer. Two jobs:
//   1. SEO: flows internal-link equity from the highest-authority page (home)
//      into /recursos and the articles, which were orphaned before (audit #3).
//   2. UX: gives first-time visitors a low-commitment, trust-building next step
//      that isn't "sign up".
// Server component — reads typed article data directly, renders fully static.

// Section heading + "see all" label per locale (kept local to avoid widening
// the shared messages files for a single section).
const COPY: Record<string, { heading: string; lead: string; all: string }> = {
  "es-AR": {
    heading: "Últimas guías",
    lead: "Cómo cobrar del exterior y mantenerlo en blanco, sin humo.",
    all: "Ver todos los recursos",
  },
  "pt-BR": {
    heading: "Últimos guias",
    lead: "Como receber do exterior de forma legal, sem enrolação.",
    all: "Ver todos os recursos",
  },
  "en-US": {
    heading: "Latest guides",
    lead: "How to get paid from abroad and keep it on the books — no hype.",
    all: "See all resources",
  },
};

export default function LatestGuides({ locale }: { locale: string }) {
  const articles = getArticles(locale).slice(0, 3);
  // Nothing to show (e.g. en-US has no articles yet) → render nothing rather
  // than an empty section.
  if (articles.length === 0) return null;

  const copy = COPY[locale] ?? COPY["es-AR"];
  const ui = RESOURCES_UI[locale] ?? RESOURCES_UI["es-AR"];
  const prefix = locale === "es-AR" ? "" : `/${locale}`;

  return (
    <section className="border-t" style={{ borderTopColor: "var(--outline-variant)" }}>
      <div className="shell py-16 lg:py-24">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-10">
          <div>
            <p className="font-mono text-[12px] uppercase tracking-widest text-primary mb-3">
              [ {ui.breadcrumbResources} ]
            </p>
            <h2 className="font-display font-semibold text-[clamp(26px,4vw,38px)] tracking-[-0.02em] text-on-surface m-0">
              {copy.heading}
            </h2>
            <p className="text-on-surface-variant text-[16px] leading-relaxed mt-3 max-w-[52ch]">
              {copy.lead}
            </p>
          </div>
          <Link
            href={`${prefix}/recursos`}
            className="font-mono text-[13px] text-primary hover:underline whitespace-nowrap"
          >
            {copy.all} →
          </Link>
        </div>

        <ul className="grid grid-cols-1 md:grid-cols-3 gap-5 list-none p-0 m-0">
          {articles.map((a) => (
            <li key={a.slug}>
              <Link
                href={`${prefix}/recursos/${a.slug}`}
                className="flex flex-col h-full rounded-lg border border-outline-variant bg-surface-container-low p-6 hover:border-primary transition-colors duration-150"
              >
                <span className="font-mono text-[11px] text-on-surface-placeholder mb-3">
                  {a.readingMinutes} {ui.readTime}
                </span>
                <h3 className="font-display font-semibold text-[19px] leading-snug text-on-surface mb-2">
                  {a.title}
                </h3>
                <p className="text-on-surface-variant text-[14px] leading-relaxed m-0">
                  {a.description}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
