"use client";

// app/global-error.tsx — React render-error catch-all for the entire app.
//
// Without this, React render crashes (e.g. uncaught render in a Server
// Component) bypass Sentry and show the Next.js default error page. With
// it, the error is forwarded to Sentry before a minimal fallback UI is
// shown. Per @sentry/nextjs convention this MUST be a client component
// and live at app/global-error.tsx (not inside a [locale] segment).

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="es-AR">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          background: "#0f1513",
          color: "#dee4e0",
          fontFamily:
            "system-ui, -apple-system, 'Segoe UI', sans-serif",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "32px",
        }}
      >
        <div style={{ maxWidth: 480, textAlign: "center" }}>
          <p
            style={{
              fontFamily: "ui-monospace, monospace",
              fontSize: 12,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: "#69dab6",
              margin: 0,
              marginBottom: 16,
            }}
          >
            Something went wrong
          </p>
          <h1
            style={{
              fontSize: 32,
              fontWeight: 600,
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
              margin: 0,
              marginBottom: 12,
            }}
          >
            We hit an unexpected error.
          </h1>
          <p
            style={{
              fontSize: 15,
              lineHeight: 1.55,
              color: "#bccac2",
              margin: 0,
              marginBottom: 24,
            }}
          >
            Our team has been notified. Reload the page, or write us at{" "}
            <a
              href="mailto:hola@cryptoinvoicing.com"
              style={{ color: "#69dab6", textDecoration: "underline" }}
            >
              hola@cryptoinvoicing.com
            </a>
            .
          </p>
          <a
            href="/"
            style={{
              display: "inline-block",
              padding: "10px 18px",
              borderRadius: 6,
              border: "1px solid #69dab6",
              color: "#69dab6",
              textDecoration: "none",
              fontWeight: 500,
              fontFamily: "ui-monospace, monospace",
              fontSize: 13,
            }}
          >
            ← Back to home
          </a>
        </div>
      </body>
    </html>
  );
}
