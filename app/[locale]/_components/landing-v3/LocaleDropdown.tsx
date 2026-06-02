"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

const OPTIONS = [
  { code: "en-US", label: "EN · US", flag: "🇺🇸" },
  { code: "es-AR", label: "ES · AR", flag: "🇦🇷" },
  { code: "pt-BR", label: "PT · BR", flag: "🇧🇷" },
] as const;

type LocaleCode = (typeof OPTIONS)[number]["code"];

interface Props {
  current: string;
}

/**
 * LocaleDropdown — header locale switcher with flag emoji + label.
 * Persists choice in `NEXT_LOCALE` cookie (read by next-intl middleware) so the
 * server honors the selection on the next request. localStorage mirror as a
 * belt-and-braces fallback. Default locale es-AR has no URL prefix.
 */
export default function LocaleDropdown({ current }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const currentOpt = OPTIONS.find((o) => o.code === current) ?? OPTIONS[0];

  // Close on outside click + Escape
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const handleSelect = (code: LocaleCode) => {
    setOpen(false);
    // CRITICAL: write the cookie next-intl middleware reads on the next request.
    // Without this, middleware may detect from Accept-Language and overwrite the
    // user's explicit choice. `max-age=31536000` = 1 year.
    document.cookie = `NEXT_LOCALE=${code}; path=/; max-age=31536000; SameSite=Lax`;
    try {
      window.localStorage.setItem("ci-locale", code);
    } catch {
      /* SSR / private mode */
    }
    // Rewrite pathname swapping the locale segment. Middleware uses
    // localePrefix='as-needed', so es-AR has no prefix; others do.
    const stripped = stripLocale(pathname);
    const target = code === "es-AR" ? stripped || "/" : `/${code}${stripped}`;
    router.push(target);
    router.refresh();
  };

  return (
    <div ref={rootRef} className="relative w-[64px] sm:w-[152px]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Language: ${currentOpt.label}`}
        className="w-full min-h-[44px] sm:min-h-0 font-mono text-[11px] uppercase tracking-widest text-on-surface-variant bg-transparent border border-outline-variant rounded-[4px] px-3 py-1.5 flex items-center justify-between gap-2 hover:border-outline transition-colors duration-150"
      >
        <span className="flex items-center gap-2">
          <span aria-hidden className="text-[14px] leading-none">{currentOpt.flag}</span>
          {/* Label hidden on phones; flag alone identifies the locale. */}
          <span className="hidden sm:inline">{currentOpt.label}</span>
        </span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          style={{ transition: "transform 150ms ease-out", transform: open ? "rotate(180deg)" : "none" }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute right-0 mt-1 w-full rounded-[4px] border border-outline-variant bg-surface-container shadow-glow-jade z-50 overflow-hidden"
        >
          {OPTIONS.map((o) => (
            <li key={o.code}>
              <button
                type="button"
                role="option"
                aria-selected={o.code === current}
                onClick={() => handleSelect(o.code)}
                className={`w-full text-left px-3 py-2 font-mono text-[11px] uppercase tracking-widest flex items-center gap-2 transition-colors duration-150 ${
                  o.code === current
                    ? "text-primary bg-surface-container-high"
                    : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
                }`}
              >
                <span aria-hidden className="text-[14px] leading-none">{o.flag}</span>
                <span>{o.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function stripLocale(path: string): string {
  // /en-US/foo → /foo  ;  /pt-BR → ""  ;  /foo → /foo  ;  / → ""
  const m = path.match(/^\/(en-US|pt-BR|es-AR)(\/.*)?$/);
  if (m) return m[2] || "";
  return path === "/" ? "" : path;
}
