// next-intl 3.26 — server-side message loading per locale.
// Middleware validates locale routing; this module provides the async config
// function that next-intl-plugin calls on every request to load messages.

export const locales = ["es-AR", "pt-BR", "en-US"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "es-AR";

// Check if a locale string is in the supported list.
// Used by layout.tsx generateMetadata + root layout for early validation.
export function isSupportedLocale(locale: unknown): locale is Locale {
  return typeof locale === "string" && locales.includes(locale as Locale);
}

// next-intl 3.26 request config — async function that returns messages.
// getRequestConfig is called with { locale } parameter indicating the current locale.
export default async function getRequestConfig({
  locale,
}: {
  locale: string;
}) {
  // Load only the messages for the current locale
  const messages =
    locale === "es-AR"
      ? (await import("./messages/es-AR.json")).default
      : locale === "pt-BR"
        ? (await import("./messages/pt-BR.json")).default
        : locale === "en-US"
          ? (await import("./messages/en-US.json")).default
          : {};

  return {
    messages,
    timeZone: "America/Argentina/Buenos_Aires",
  };
}
