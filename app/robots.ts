import type { MetadataRoute } from "next";

// Next.js 14 convention — served at /robots.txt.
//
// Allow crawling of the public landing + sign-up + legal pages. Block:
//   - /api/* — internal endpoints (auth-hook is webhook-only, lead/waitlist deprecated)
//   - /*/dashboard — gated, stub copy, would embarrass us in SERP
//   - /*/auth/* — short-lived OAuth callback URLs
//   - /monitoring — Sentry tunnel route (next.config matcher excludes it but defence-in-depth)

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://cryptoinvoicing.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/dashboard",
          "/es-AR/dashboard",
          "/pt-BR/dashboard",
          "/en-US/dashboard",
          "/auth/",
          "/es-AR/auth/",
          "/pt-BR/auth/",
          "/en-US/auth/",
          "/monitoring",
        ],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
