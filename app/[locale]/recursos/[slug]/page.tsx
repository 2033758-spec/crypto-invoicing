import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { unstable_setRequestLocale } from "next-intl/server";
import { isSupportedLocale, locales } from "../../../../i18n";
import {
  type Article,
  type Block,
  DISCLAIMER,
  RESOURCES_UI,
  getArticle,
  getArticles,
} from "../_content/articles";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://cryptoinvoicing.co";

function prefix(locale: string): string {
  return locale === "es-AR" ? "" : `/${locale}`;
}
function articleUrl(locale: string, slug: string): string {
  return `${SITE}${prefix(locale)}/recursos/${slug}`;
}

// Pre-render every article for this locale at build time (SSG).
export function generateStaticParams({ params }: { params: { locale: string } }) {
  return getArticles(params.locale).map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: { locale: string; slug: string };
}): Promise<Metadata> {
  if (!isSupportedLocale(params.locale)) return {};
  const article = getArticle(params.locale, params.slug);
  if (!article) return { robots: { index: false, follow: false } };

  const canonical = articleUrl(params.locale, params.slug);
  // hreflang only for locales that actually have this slug translated.
  const languages: Record<string, string> = {};
  for (const l of locales) {
    if (getArticle(l, params.slug)) languages[l] = articleUrl(l, params.slug);
  }

  return {
    title: article.title,
    description: article.description,
    alternates: { canonical, languages: Object.keys(languages).length > 1 ? languages : undefined },
    openGraph: {
      title: article.title,
      description: article.description,
      url: canonical,
      type: "article",
      publishedTime: article.datePublished,
      modifiedTime: article.dateModified,
      authors: [article.author],
    },
    robots: { index: true, follow: true },
  };
}

function renderBlock(block: Block, i: number) {
  switch (block.type) {
    case "h2":
      return (
        <h2
          key={i}
          id={block.id}
          className="font-display font-semibold text-[26px] tracking-[-0.01em] text-on-surface mt-10 mb-4 scroll-mt-24"
        >
          {block.text}
        </h2>
      );
    case "p":
      return (
        <p key={i} className="text-on-surface-variant text-[17px] leading-[1.7] mb-5">
          {block.text}
        </p>
      );
    case "ul":
      return (
        <ul key={i} className="list-disc pl-6 mb-5 space-y-2 text-on-surface-variant text-[17px] leading-[1.7]">
          {block.items.map((it, j) => (
            <li key={j}>{it}</li>
          ))}
        </ul>
      );
    case "callout":
      return (
        <aside
          key={i}
          className="my-6 rounded-lg border-l-2 border-primary bg-surface-container-low px-5 py-4 text-on-surface text-[16px] leading-[1.6]"
        >
          {block.text}
        </aside>
      );
  }
}

export default function ArticlePage({
  params,
}: {
  params: { locale: string; slug: string };
}) {
  if (!isSupportedLocale(params.locale)) notFound();
  unstable_setRequestLocale(params.locale);

  const article = getArticle(params.locale, params.slug);
  if (!article) notFound();

  const ui = RESOURCES_UI[params.locale] ?? RESOURCES_UI["es-AR"];
  const canonical = articleUrl(params.locale, params.slug);
  const resourcesHref = `${prefix(params.locale)}/recursos`;
  const home = prefix(params.locale) || "/";
  const headings = article.blocks.filter((b): b is Extract<Block, { type: "h2" }> => b.type === "h2");
  const related = article.related
    .map((slug) => getArticle(params.locale, slug))
    .filter((a): a is Article => Boolean(a));

  // B6: Article JSON-LD (publisher → Organization @id from layout) + BreadcrumbList.
  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    datePublished: article.datePublished,
    dateModified: article.dateModified,
    inLanguage: params.locale,
    author: { "@type": "Organization", name: article.author, url: `${SITE}/` },
    publisher: { "@id": `${SITE}/#organization` },
    mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
    isAccessibleForFree: true,
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: ui.breadcrumbHome, item: `${SITE}${prefix(params.locale) || ""}/` },
      { "@type": "ListItem", position: 2, name: ui.breadcrumbResources, item: `${SITE}${prefix(params.locale)}/recursos` },
      { "@type": "ListItem", position: 3, name: article.title, item: canonical },
    ],
  };

  const dateFmt = new Intl.DateTimeFormat(params.locale, { year: "numeric", month: "long", day: "numeric" });

  return (
    <main className="relative min-h-screen px-4 sm:px-8 lg:px-16 py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      <article className="max-w-2xl mx-auto">
        <nav aria-label="Breadcrumb" className="font-mono text-[12px] text-on-surface-variant mb-8">
          <Link href={home} className="hover:text-on-surface">{ui.breadcrumbHome}</Link>
          <span className="mx-2 text-outline">/</span>
          <Link href={resourcesHref} className="hover:text-on-surface">{ui.breadcrumbResources}</Link>
          <span className="mx-2 text-outline">/</span>
          <span className="text-on-surface">{article.title}</span>
        </nav>

        <header className="mb-8">
          <h1 className="font-display font-semibold text-[clamp(28px,5vw,42px)] tracking-[-0.02em] text-on-surface mb-4 leading-[1.15]">
            {article.title}
          </h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[12px] text-on-surface-placeholder">
            <span>{ui.by} {article.author}</span>
            <span aria-hidden>·</span>
            <span>{ui.updated} {dateFmt.format(new Date(article.dateModified))}</span>
            <span aria-hidden>·</span>
            <span>{article.readingMinutes} {ui.readTime}</span>
          </div>
        </header>

        {headings.length > 1 && (
          <nav aria-label={ui.toc} className="mb-10 rounded-lg border border-outline-variant bg-surface-container-low p-5">
            <p className="font-mono text-[11px] uppercase tracking-widest text-primary mb-3">{ui.toc}</p>
            <ul className="space-y-2">
              {headings.map((h) => (
                <li key={h.id}>
                  <a href={`#${h.id}`} className="text-on-surface-variant text-[15px] hover:text-primary transition-colors">
                    {h.text}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}

        <div>{article.blocks.map((b, i) => renderBlock(b, i))}</div>

        {/* E-E-A-T sources */}
        {article.sources.length > 0 && (
          <section className="mt-10 pt-6 border-t border-outline-variant">
            <p className="font-mono text-[11px] uppercase tracking-widest text-on-surface-placeholder mb-3">{ui.sources}</p>
            <ul className="space-y-1.5">
              {article.sources.map((s) => (
                <li key={s.url}>
                  <a href={s.url} target="_blank" rel="noopener noreferrer nofollow" className="text-[14px] text-primary hover:underline break-words">
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Not-tax-advice disclaimer */}
        <p className="mt-8 text-[13px] text-on-surface-placeholder leading-relaxed italic">
          {DISCLAIMER[params.locale] ?? DISCLAIMER["es-AR"]}
        </p>

        {/* Internal linking */}
        {related.length > 0 && (
          <section className="mt-10 pt-6 border-t border-outline-variant">
            <p className="font-mono text-[11px] uppercase tracking-widest text-primary mb-3">{ui.related}</p>
            <ul className="space-y-2">
              {related.map((r) => (
                <li key={r.slug}>
                  <Link href={`${prefix(params.locale)}/recursos/${r.slug}`} className="text-[15px] text-on-surface hover:text-primary transition-colors">
                    {r.title}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </article>
    </main>
  );
}
