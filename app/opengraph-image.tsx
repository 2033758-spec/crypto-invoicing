import {
  OG_ALT,
  OG_CONTENT_TYPE,
  OG_SIZE,
  renderOgImage,
} from "./_lib/og-image";

// Root-level OG image → served at /opengraph-image. Resolves the default-locale
// (es-AR) share preview that next-intl's prefix-stripping otherwise 404'd. See
// app/_lib/og-image.tsx for the full rationale.

export const runtime = "edge";
export const alt = OG_ALT;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgImage("es-AR");
}
