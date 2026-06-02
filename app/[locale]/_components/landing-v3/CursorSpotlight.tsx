"use client";

import { useEffect } from "react";

/**
 * CursorSpotlight — updates --cursor-x / --cursor-y CSS vars on document.body
 * (consumed by the body background gradient in globals.css). Throttled to one
 * frame per RAF; no-op under prefers-reduced-motion.
 */
export default function CursorSpotlight() {
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    let rafId = 0;
    const onMove = (e: MouseEvent) => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(() => {
        document.body.style.setProperty("--cursor-x", `${e.clientX}px`);
        document.body.style.setProperty("--cursor-y", `${e.clientY}px`);
        rafId = 0;
      });
    };

    document.addEventListener("mousemove", onMove, { passive: true });
    return () => document.removeEventListener("mousemove", onMove);
  }, []);

  return null;
}
