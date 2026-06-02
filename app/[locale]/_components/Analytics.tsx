"use client";

// Mounted once in the root layout. Responsible for the two automatic events
// that need broad observation:
//   - landing_view (once per session, only when on `/` / `/{locale}` route)
//   - pricing_viewed (IntersectionObserver, once per session)
//
// Per-CTA / per-component events live next to the components themselves
// (see Hero, Navbar, Pricing, Calculator, FAQ, SignupForm, DashboardClient,
// CallbackClient — search for `track(`).

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { track } from "../../lib/analytics";

const LANDING_VIEW_SESSION_KEY = "ci_lv_fired";
const PRICING_VIEW_SESSION_KEY = "ci_pv_fired";

export default function Analytics() {
  const pathname = usePathname();

  // Fire `landing_view` once per session when we're on the landing page.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!pathname) return;
    // Treat /, /es-AR, /pt-BR, /en-US as the landing page.
    const isLanding =
      pathname === "/" ||
      pathname === "/es-AR" ||
      pathname === "/pt-BR" ||
      pathname === "/en-US";
    if (!isLanding) return;
    try {
      if (sessionStorage.getItem(LANDING_VIEW_SESSION_KEY) === "1") return;
      sessionStorage.setItem(LANDING_VIEW_SESSION_KEY, "1");
    } catch {
      /* sessionStorage blocked → fire anyway, idempotent on PostHog side */
    }
    track("landing_view", { path: pathname });
  }, [pathname]);

  // Fire `pricing_viewed` once per session via IntersectionObserver on the
  // #pricing section. Threshold 0.5 so it's a real intent signal, not a
  // scroll-blow-by.
  useEffect(() => {
    if (typeof window === "undefined") return;
    let alreadyFired = false;
    try {
      alreadyFired = sessionStorage.getItem(PRICING_VIEW_SESSION_KEY) === "1";
    } catch {
      /* ignore */
    }
    if (alreadyFired) return;

    const el = document.getElementById("pricing");
    if (!el) return;

    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            try {
              sessionStorage.setItem(PRICING_VIEW_SESSION_KEY, "1");
            } catch {
              /* ignore */
            }
            track("pricing_viewed");
            obs.disconnect();
            break;
          }
        }
      },
      { threshold: [0.5] },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [pathname]);

  return null;
}
