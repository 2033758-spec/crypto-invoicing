"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Reveal — opacity 0 → 1 + translateY 16px → 0 when element enters viewport.
 * Uses IntersectionObserver (no framer-motion overhead). Respects
 * prefers-reduced-motion: the element renders in its final state.
 *
 * Class names match .reveal / .reveal.in in globals.css.
 */
type RevealAs = "div" | "section" | "article" | "ul" | "ol" | "header" | "footer";

interface Props {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: RevealAs;
}

export default function Reveal({
  children,
  className = "",
  delay = 0,
  as = "div",
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReduced) {
      el.classList.add("in");
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            el.classList.add("in");
            io.unobserve(el);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -60px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const cls = `reveal ${className}`.trim();
  const style = delay ? { transitionDelay: `${delay}ms` } : undefined;

  switch (as) {
    case "section":
      return <section ref={ref as React.RefObject<HTMLElement>} className={cls} style={style}>{children}</section>;
    case "article":
      return <article ref={ref as React.RefObject<HTMLElement>} className={cls} style={style}>{children}</article>;
    case "ul":
      return <ul ref={ref as React.RefObject<HTMLUListElement>} className={cls} style={style}>{children}</ul>;
    case "ol":
      return <ol ref={ref as React.RefObject<HTMLOListElement>} className={cls} style={style}>{children}</ol>;
    case "header":
      return <header ref={ref as React.RefObject<HTMLElement>} className={cls} style={style}>{children}</header>;
    case "footer":
      return <footer ref={ref as React.RefObject<HTMLElement>} className={cls} style={style}>{children}</footer>;
    case "div":
    default:
      return <div ref={ref} className={cls} style={style}>{children}</div>;
  }
}
