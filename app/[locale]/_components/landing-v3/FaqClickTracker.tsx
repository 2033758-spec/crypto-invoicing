"use client";

// Wires a single delegated event listener on the FAQ section to capture
// `faq_expanded` events. <details> open-state changes fire a `toggle` event
// on the element itself; we listen at the capture phase on the parent.

import { useEffect } from "react";
import { track } from "../../../lib/analytics";

export default function FaqClickTracker() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const root = document.getElementById("faq");
    if (!root) return;

    const handler = (e: Event) => {
      const target = e.target as HTMLElement | null;
      if (!target || target.tagName !== "DETAILS") return;
      const details = target as HTMLDetailsElement;
      if (!details.open) return;
      const id = details.dataset.faqId || "unknown";
      track("faq_expanded", { question_id: id });
    };

    // `toggle` doesn't bubble — use capture phase so a single listener works.
    root.addEventListener("toggle", handler, true);
    return () => root.removeEventListener("toggle", handler, true);
  }, []);

  return null;
}
