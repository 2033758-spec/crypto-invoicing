"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import Logo from "./Logo";
import LocaleDropdown from "./LocaleDropdown";
import { track } from "../../../lib/analytics";

interface Props {
  locale: string;
  user?: any; // Supabase User object, passed from server
}

/**
 * Header — sticky top bar, frosted blur, brand + nav + locale + login + CTA.
 * If user is logged in, show email + dashboard + logout instead of login CTA.
 */
export default function Header({ locale, user }: Props) {
  const t = useTranslations("nav");
  const signupHref = locale === "es-AR" ? "/signup" : `/${locale}/signup`;
  const dashboardHref = locale === "es-AR" ? "/dashboard" : `/${locale}/dashboard`;
  const logoutHref = locale === "es-AR" ? "/auth/logout" : `/${locale}/auth/logout`;
  // /recursos is a real route (blog/guides hub), not an in-page anchor — kept
  // separate from NAV_LINKS so the homepage actually links to it (SEO audit
  // 2026-06-11, finding #3: /recursos was an internal-link orphan).
  const resourcesHref = locale === "es-AR" ? "/recursos" : `/${locale}/recursos`;

  // Native <details> doesn't close on outside tap or Escape (feels broken on
  // iPhone Safari). Close the account menu on Escape + pointer-down outside it.
  const accountMenuRef = useRef<HTMLDetailsElement>(null);
  // B18: mobile nav drawer (<lg, where the inline nav is hidden).
  const mobileNavRef = useRef<HTMLDetailsElement>(null);
  const closeMobileNav = () => {
    if (mobileNavRef.current) mobileNavRef.current.open = false;
  };

  // In-page section links — shared by the desktop nav and the mobile drawer so
  // they never drift apart.
  const NAV_LINKS = [
    { href: "#how", key: "how" },
    { href: "#calc", key: "calculator" },
    { href: "#pricing", key: "pricing" },
    { href: "#faq", key: "faq" },
    { href: "#trust", key: "trust" },
  ] as const;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (accountMenuRef.current) accountMenuRef.current.open = false;
      if (mobileNavRef.current) mobileNavRef.current.open = false;
    };
    const onPointer = (e: PointerEvent) => {
      for (const el of [accountMenuRef.current, mobileNavRef.current]) {
        if (el?.open && !el.contains(e.target as Node)) el.open = false;
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, []);

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
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-[13px] text-on-surface-variant hover:text-on-surface hover:bg-white/[0.04] px-3.5 py-2 rounded-[4px] transition-colors duration-150"
              >
                {t(l.key)}
              </a>
            ))}
            <Link
              href={resourcesHref}
              className="text-[13px] text-on-surface-variant hover:text-on-surface hover:bg-white/[0.04] px-3.5 py-2 rounded-[4px] transition-colors duration-150"
            >
              {t("resources")}
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            {/* B18: mobile nav — hamburger drawer, only <lg where inline nav is hidden */}
            <details ref={mobileNavRef} className="relative lg:hidden">
              <summary
                aria-label={t("menu")}
                className="list-none cursor-pointer flex items-center justify-center w-11 h-11 rounded hover:bg-white/[0.04] transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden className="text-on-surface">
                  <path d="M3 6h18M3 12h18M3 18h18" />
                </svg>
              </summary>
              <div className="absolute left-0 top-full mt-1 min-w-[200px] rounded border border-outline-variant bg-surface-container-high shadow-lg z-10 py-1">
                {NAV_LINKS.map((l) => (
                  <a
                    key={l.href}
                    href={l.href}
                    onClick={closeMobileNav}
                    className="block px-4 py-3 text-[14px] text-on-surface-variant hover:text-on-surface hover:bg-white/[0.04] transition-colors"
                  >
                    {t(l.key)}
                  </a>
                ))}
                <Link
                  href={resourcesHref}
                  onClick={closeMobileNav}
                  className="block px-4 py-3 text-[14px] text-on-surface-variant hover:text-on-surface hover:bg-white/[0.04] transition-colors"
                >
                  {t("resources")}
                </Link>
              </div>
            </details>

            <LocaleDropdown current={locale} />

            {user ? (
              // User is logged in — show compact profile icon + email + dropdown
              <div className="flex items-center gap-3 ml-2">
                {/* Profile icon + email (acts as menu button) */}
                <Link
                  href={dashboardHref}
                  className="flex items-center gap-2 px-3 py-2 rounded hover:bg-white/[0.04] transition-colors"
                  title={user.email}
                  aria-label={`${t("dashboard")} — ${user.email}`}
                >
                  {/* User icon (decorative — Link carries the accessible label) */}
                  <div aria-hidden="true" className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-on">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                  {/* Email (hidden on mobile) */}
                  <span className="text-[13px] text-on-surface hidden sm:inline truncate max-w-[150px]">
                    {user.email}
                  </span>
                </Link>

                {/* Logout dropdown button */}
                <details ref={accountMenuRef} className="relative">
                  <summary aria-label={t("accountMenu")} className="account-menu-summary btn btn-ghost list-none cursor-pointer flex items-center justify-center">
                    ⋮
                  </summary>
                  <div className="absolute right-0 top-full mt-1 rounded border border-outline-variant bg-surface-container-high shadow-lg z-10">
                    <Link
                      href={logoutHref}
                      className="block px-4 py-2 text-[13px] text-on-surface hover:bg-white/[0.04] rounded-t transition-colors"
                      onClick={() => track("cta_clicked", { cta: "logout" })}
                    >
                      {t("logout") || "Cerrar sesión"}
                    </Link>
                  </div>
                </details>
              </div>
            ) : (
              // User is not logged in — show login + get started
              <>
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
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
