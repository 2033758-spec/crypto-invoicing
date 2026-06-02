import type { MetadataRoute } from "next";

// Web app manifest — served at /manifest.webmanifest. Required for PWA
// install prompt + Android "Add to Home Screen" with branded icon.

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Crypto Invoicing",
    short_name: "CryptoInvoicing",
    description:
      "USDC invoicing for LATAM freelancers. Get paid from abroad in pesos or reais without losing 4% to spreads.",
    start_url: "/",
    display: "standalone",
    background_color: "#0f1513",
    theme_color: "#0f1513",
    orientation: "portrait-primary",
    categories: ["finance", "business", "productivity"],
    icons: [
      {
        src: "/icon",
        sizes: "32x32",
        type: "image/png",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
