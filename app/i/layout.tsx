import type { Metadata } from "next";
import type { Viewport } from "next";
import "../globals.css";

// Root layout for the locale-neutral /i/{token} hosted invoice subtree.
// (The main app's root layout lives under app/[locale]/; this subtree sits
// outside it, so it needs its own <html>/<body>.) Always noindex.

export const metadata: Metadata = {
  robots: { index: false, follow: false, noarchive: true, nosnippet: true },
};

export const viewport: Viewport = {
  themeColor: "#0f1513",
  colorScheme: "dark",
};

export default function HostedInvoiceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      <body className="min-h-screen text-on-surface antialiased font-body">
        {children}
      </body>
    </html>
  );
}
