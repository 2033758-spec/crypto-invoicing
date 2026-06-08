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

  // Native <details> doesn't close on outside tap or Escape (feels broken on
  // iPhone Safari). Close the account menu on Escape + pointer-down outside it.
  const accountMenuRef = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (!user) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && accountMenuRef.current) accountMenuRef.current.open = false;
    };
    const onPointer = (e: PointerEvent) => {
      const el = accountMenuRef.current;
      if (el?.open && !el.contains(e.target as Node)) el.open = false;
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [user]);

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
                  {/* Avatar circle with first letter (decorative — Link carries the label) */}
                  <div aria-hidden="true" className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-on text-[12px] font-semibold">
                    {user.email?.[0]?.toUpperCase() || "U"}
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
