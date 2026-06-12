// Absolute Open Graph image URL.
//
// We serve a SINGLE OG image from the root route /opengraph-image (es-AR primary
// copy — x-default market). Rationale: the per-locale file-convention route under
// app/[locale]/ auto-injected an og:image at /es-AR/opengraph-image, which
// next-intl 307-redirects to /opengraph-image — a redirect hop some scrapers
// mishandle, plus it desynced og:image vs twitter:image. One root image at 200
// (no redirect, identical og + twitter) is the robust choice. The `locale`
// param is accepted for call-site symmetry but intentionally unused.

export function ogImageUrl(site: string, _locale?: string): string {
  return `${site}/opengraph-image`;
}
