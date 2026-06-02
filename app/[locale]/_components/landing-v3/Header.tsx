"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import Logo from "./Logo";
import LocaleDropdown from "./LocaleDropdown";
import { track } from "../../../lib/analytics";

interface Props {
  locale: string;
}

/**
 * Header — sticky top bar, frosted blur, brand + nav + locale + login + CTA.
 * Matches `.header` / `.row` / `.brand` / `.nav` / `.actions` in landing.css.
 */
export default function Header({ locale }: Props) {
  const t = useTranslations("nav");
  const signupHref = locale === "es-AR" ? "/signup" : `/${locale}/signup`;

  return (
    <header
      className="sticky top-0 z-[100] border-b"
      style={{
        background: "rgba(15, 21, 19, 0.72)",
        backdropFilter: "blur(12px) saturate(140%)",
        WebkitBackdropFilter: "blur(12px) saturate(140%)",
        borderBottomColor: "var(--outline-hairline)",
      }}
    >
      <div className="shell">
        <div className="flex items-center justify-between py-3.5">
          <Link href={locale === "es-AR" ? "/" : `/${locale}`} className="flex items-center gap-2.5 font-display font-medium text-[15px] tracking-[-0.01em] text-on-surface">
            <Logo className="w-[26px] h-[26px]" />
            {/* Wordmark hidden under 400px to make room for locale + CTA on phones. */}
            <span className="hidden min-[400px]:inline">Crypto Invoicing</span>
          </Link>

          <nav className="hidden lg:flex items-center gap-1">
            <a
              href="#how"
              className="text-[13px] text-on-surface-variant hover:text-on-surface hover:bg-white/[0.04] px-3.5 py-2 rounded-[4px] transition-colors duration-150"
            >
              {t("how")}
            </a>
            <a
              href="#calc"
              className="text-[13px] text-on-surface-variant hover:text-on-surface hover:bg-white/[0.04] px-3.5 py-2 rounded-[4px] transition-colors duration-150"
            >
              {t("calculator")}
            </a>
            <a
              href="#pricing"
              className="text-[13px] text-on-surface-variant hover:text-on-surface hover:bg-white/[0.04] px-3.5 py-2 rounded-[4px] transition-colors duration-150"
            >
              {t("pricing")}
            </a>
            <a
              href="#faq"
              className="text-[13px] text-on-surface-variant hover:text-on-surface hover:bg-white/[0.04] px-3.5 py-2 rounded-[4px] transition-colors duration-150"
            >
              {t("faq")}
            </a>
            <a
              href="#trust"
              className="text-[13px] text-on-surface-variant hover:text-on-surface hover:bg-white/[0.04] px-3.5 py-2 rounded-[4px] transition-colors duration-150"
            >
              {t("trust")}
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <LocaleDropdown current={locale} />
            <Link
              href={signupHref}
              className="btn btn-ghost hidden sm:inline-flex"
              onClick={() => track("cta_clicked", { cta: "login" })}
            >
              {t("login")}
            </Link>
            <Link
              href={signupHref}
              className="btn btn-primary"
              onClick={() => track("cta_clicked", { cta: "get_started" })}
            >
              {t("cta")} <span className="arrow">→</span>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
