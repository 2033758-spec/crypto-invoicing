"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import Logo from "./Logo";

interface Props {
  locale: string;
}

export default function Footer({ locale }: Props) {
  const t = useTranslations("footer");
  const homeHref = locale === "es-AR" ? "/" : `/${locale}`;
  const prefix = locale === "es-AR" ? "" : `/${locale}`;
  const termsHref = `${prefix}/legal/terms`;
  const privacyHref = `${prefix}/legal/privacy`;
  const cookiesHref = `${prefix}/legal/cookies`;
  const resourcesHref = `${prefix}/recursos`;
  const productLinks = t.raw("productLinks") as Record<string, string>;
  const companyLinks = t.raw("companyLinks") as Record<string, string>;
  const legalLinks = t.raw("legalLinks") as Record<string, string>;
  const bottom = t.raw("bottom") as { left: string; right: string };

  return (
    <footer
      className="border-t pt-14 pb-8"
      style={{
        borderTopColor: "var(--outline-variant)",
        background: "var(--surface-container-lowest)",
      }}
    >
      <div className="shell">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr] gap-12 mb-12">
          <div>
            <Link href={homeHref} className="flex items-center gap-2.5 font-display font-medium text-[15px] tracking-[-0.01em] text-on-surface">
              <Logo className="w-[26px] h-[26px]" />
              <span>Crypto Invoicing</span>
            </Link>
            <p
              className="text-on-surface-variant mt-3 m-0 max-w-[36ch]"
              style={{ fontSize: "13px", lineHeight: 1.6 }}
            >
              {t("about")}
            </p>
          </div>

          <FooterCol heading={t("product")}>
            <a href="#how">{productLinks.how}</a>
            <a href="#calc">{productLinks.calc}</a>
            <a href="#features">{productLinks.features}</a>
            <a href="#pricing">{productLinks.pricing}</a>
          </FooterCol>

          <FooterCol heading={t("company")}>
            <ComingSoonLink>{companyLinks.about}</ComingSoonLink>
            <a href="#trust">{companyLinks.compliance}</a>
            <Link href={resourcesHref}>{companyLinks.blog}</Link>
            <a href={`mailto:${companyLinks.email}`}>{companyLinks.email}</a>
          </FooterCol>

          <FooterCol heading={t("legal")}>
            <Link href={termsHref}>{legalLinks.terms}</Link>
            <Link href={privacyHref}>{legalLinks.privacy}</Link>
            <Link href={cookiesHref}>{legalLinks.cookies}</Link>
            <ComingSoonLink>{legalLinks.security}</ComingSoonLink>
          </FooterCol>
        </div>

        <div
          className="border-t pt-6 flex justify-between items-center flex-wrap gap-3 font-mono text-[11px] text-on-surface-placeholder"
          style={{ borderTopColor: "var(--outline-variant)" }}
        >
          <span>{bottom.left}</span>
          <span>{bottom.right}</span>
        </div>
      </div>
    </footer>
  );
}

/**
 * `ComingSoonLink` — a footer link that has no destination yet (About,
 * Blog, Security disclosure page). We render a non-interactive `<span>` so
 * the link is visible (don't hide it; recruiters/journalists look) but it
 * doesn't promise navigation it can't deliver. `aria-disabled` keeps it out
 * of the focus ring for keyboard users.
 */
function ComingSoonLink({ children }: { children: React.ReactNode }) {
  return (
    <span
      aria-disabled="true"
      className="opacity-50 cursor-not-allowed select-none"
      title="Coming soon"
    >
      {children}
    </span>
  );
}

function FooterCol({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <div className="footer-col">
      <h4
        className="font-mono text-[10px] uppercase text-on-surface-placeholder m-0 mb-[18px] font-medium"
        style={{ letterSpacing: "0.12em" }}
      >
        {heading}
      </h4>
      <div className="flex flex-col [&_a]:block [&_a]:text-[13px] [&_a]:text-on-surface-variant [&_a]:py-[5px] [&_a]:transition-colors [&_a]:duration-150 [&_a:hover]:text-on-surface [&>span]:block [&>span]:text-[13px] [&>span]:text-on-surface-variant [&>span]:py-[5px]">
        {children}
      </div>
    </div>
  );
}
