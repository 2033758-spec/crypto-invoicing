import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { unstable_setRequestLocale } from "next-intl/server";
import { isSupportedLocale } from "../../../i18n";
import { ogImageUrl } from "../../lib/og";
import { getArticles, RESOURCES_UI } from "./_content/articles";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://cryptoinvoicing.co";

function prefix(locale: string): string {
  return locale === "es-AR" ? "" : `/${locale}`;
}
function resourcesUrl(locale: string): string {
  return `${SITE}${prefix(locale)}/recursos`;
}

export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Promise<Metadata> {
  if (!isSupportedLocale(params.locale)) return {};
  const ui = RESOURCES_UI[params.locale] ?? RESOURCES_UI["es-AR"];
  const canonical = resourcesUrl(params.locale);
  return {
    title: ui.indexTitle,
    description: ui.indexDescription,
    alternates: {
      canonical,
      languages: {
        "es-AR": resourcesUrl("es-AR"),
        "pt-BR": resourcesUrl("pt-BR"),
        "en-US": resourcesUrl("en-US"),
        "x-default": resourcesUrl("es-AR"),
      },
    },
    openGraph: {
      title: ui.indexTitle,
      description: ui.indexDescription,
      url: canonical,
      type: "website",
      images: [{ url: ogImageUrl(SITE, params.locale), width: 1200, height: 630, alt: ui.indexTitle }],
    },
    twitter: {
      card: "summary_large_image",
      title: ui.indexTitle,
      description: ui.indexDescription,
      images: [ogImageUrl(SITE, params.locale)],
    },
    robots: { index: true, follow: true },
  };
}

export default function ResourcesIndex({
  params,
}: {
  params: { locale: string };
}) {
  if (!isSupportedLocale(params.locale)) notFound();
  unstable_setRequestLocale(params.locale);

  const ui = RESOURCES_UI[params.locale] ?? RESOURCES_UI["es-AR"];
  const articles = getArticles(params.locale);
  const home = prefix(params.locale) || "/";

  // BreadcrumbList JSON-LD (Home › Recursos).
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: ui.breadcrumbHome, item: `${SITE}${prefix(params.locale) || ""}/` },
      { "@type": "ListItem", position: 2, name: ui.breadcrumbResources, item: resourcesUrl(params.locale) },
    ],
  };

  return (
    <main className="relative min-h-screen px-4 sm:px-8 lg:px-16 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <div className="max-w-3xl mx-auto">
        <nav aria-label="Breadcrumb" className="font-mono text-[12px] text-on-surface-variant mb-8">
          <Link href={home} className="hover:text-on-surface">{ui.breadcrumbHome}</Link>
          <span className="mx-2 text-outline">/</span>
          <span className="text-on-surface">{ui.breadcrumbResources}</span>
        </nav>

        <header className="mb-10">
          <p className="font-mono text-[12px] uppercase tracking-widest text-primary mb-3">
            [ {ui.breadcrumbResources} ]
          </p>
          <h1 className="font-display font-semibold text-[clamp(32px,5vw,48px)] tracking-[-0.02em] text-on-surface mb-4">
            {ui.indexTitle}
          </h1>
          <p className="text-on-surface-variant text-[18px] leading-relaxed">{ui.indexLead}</p>
        </header>

        {articles.length === 0 ? (
          <div className="rounded-lg border border-dashed border-outline-variant px-6 py-12 text-center">
            <p className="text-on-surface-variant">—</p>
          </div>
        ) : (
          <ul className="space-y-4">
            {articles.map((a) => (
              <li key={a.slug}>
                <Link
                  href={`${prefix(params.locale)}/recursos/${a.slug}`}
                  className="block rounded-lg border border-outline-variant bg-surface-container-low p-6 hover:border-primary transition-colors duration-150"
                >
                  <div className="flex items-baseline justify-between gap-3 mb-2">
                    <h2 className="font-display font-semibold text-[20px] text-on-surface">{a.title}</h2>
                    <span className="font-mono text-[11px] text-on-surface-placeholder whitespace-nowrap">
                      {a.readingMinutes} {ui.readTime}
                    </span>
                  </div>
                  <p className="text-on-surface-variant text-[15px] leading-relaxed">{a.description}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
