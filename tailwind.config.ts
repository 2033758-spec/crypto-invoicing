import type { Config } from "tailwindcss";

// Design System v3 — Tailwind tokens. (v3.1 — Space Grotesk display)
// Source of truth: Crypto_Invoicing/.design-system/project/colors_and_type.css
// All 92 CSS variables mapped to Tailwind theme. New components use these
// names; CSS variables (still defined in globals.css) are the canonical
// values so `style={{color:'var(--primary)'}}` keeps working too.

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // ── Surfaces (5 tonal steps) ──────────────────────────────
        surface: {
          DEFAULT: "#0f1513",
          dim: "#0f1513",
          bright: "#353a38",
          "container-lowest": "#0a0f0d",
          "container-low": "#171d1b",
          container: "#1b211f",
          "container-high": "#252b29",
          "container-highest": "#303634",
        },
        // ── On-surface (text variants) ─────────────────────────────
        "on-surface": {
          DEFAULT: "#dee4e0",
          variant: "#bccac2",
          placeholder: "#87948d",
        },
        "inverse-surface": "#dee4e0",
        "inverse-on-surface": "#2c322f",

        // ── Hairlines / outlines ───────────────────────────────────
        outline: {
          DEFAULT: "#87948d",
          variant: "#3d4944",
          hairline: "rgba(255, 255, 255, 0.06)",
        },

        // ── Primary (Jade) ─────────────────────────────────────────
        primary: {
          DEFAULT: "#69dab6",
          hover: "#86f7d1",
          pressed: "#27a382",
          on: "#00382a",
          container: "#27a382",
          "on-container": "#003024",
          fixed: "#86f7d1",
          "fixed-dim": "#69dab6",
        },
        jade: {
          DEFAULT: "#69dab6",
          hover: "#86f7d1",
          pressed: "#27a382",
          on: "#00382a",
          fixed: "#86f7d1",
          deep: "#27a382",
          50: "#e8faf3",
          100: "#c0f2dd",
          200: "#86f7d1",
          300: "#69dab6",
          400: "#27a382",
          500: "#009373",
          600: "#006c53",
          700: "#00513e",
          800: "#00382a",
          900: "#003024",
        },

        // ── Secondary (muted moss) ─────────────────────────────────
        secondary: {
          DEFAULT: "#a5d0be",
          on: "#0d372b",
          container: "#264e41",
          "on-container": "#94bead",
        },
        moss: "#a5d0be",

        // ── Tertiary (Coral) ───────────────────────────────────────
        tertiary: {
          DEFAULT: "#ffb4a3",
          on: "#5b1a0b",
          container: "#d47761",
          "on-container": "#521406",
        },
        coral: {
          DEFAULT: "#ffb4a3",
          container: "#d47761",
        },

        // ── Error ──────────────────────────────────────────────────
        error: {
          DEFAULT: "#ffb4ab",
          on: "#690005",
          container: "#93000a",
          "on-container": "#ffdad6",
        },

        // ── Status (workflow) ──────────────────────────────────────
        status: {
          draft: "#87948d",
          sent: "#bccac2",
          pending: "#ffb4a3",
          paid: "#69dab6",
          settled: "#27a382",
          error: "#ffb4ab",
        },

        // ── On-surface text shorthand for old code ────────────────
        // Legacy aliases — kept so existing dashboard/signup classes
        // (`text-mist`, `bg-slate-low`, etc) continue to render with
        // the v3 colors.
        mist: {
          DEFAULT: "#dee4e0",
          dim: "#bccac2",
        },
        slate: {
          DEFAULT: "#0f1513",
          bright: "#353a38",
          lowest: "#0a0f0d",
          low: "#171d1b",
          base: "#1b211f",
          high: "#252b29",
          highest: "#303634",
        },
      },

      // ── Status bg colors (12% / 18% opacity) ───────────────────
      backgroundColor: {
        "status-draft-bg": "rgba(135, 148, 141, 0.12)",
        "status-sent-bg": "rgba(188, 202, 194, 0.12)",
        "status-pending-bg": "rgba(255, 180, 163, 0.12)",
        "status-paid-bg": "rgba(105, 218, 182, 0.12)",
        "status-settled-bg": "rgba(39, 163, 130, 0.18)",
        "status-error-bg": "rgba(255, 180, 171, 0.12)",
      },

      // ── Spacing (4px base) ─────────────────────────────────────
      spacing: {
        "0": "0",
        "1": "4px",
        "2": "8px",
        "3": "12px",
        "4": "16px",
        "5": "20px",
        "6": "24px",
        "8": "32px",
        "10": "40px",
        "12": "48px",
        "16": "64px",
        "20": "80px",
        "24": "96px",
        "32": "128px",
        gutter: "24px",
        "margin-mobile": "16px",
        "margin-desktop": "64px",
      },
      maxWidth: {
        terminal: "1440px",
        shell: "1440px",
      },

      // ── Radii ──────────────────────────────────────────────────
      borderRadius: {
        none: "0",
        sm: "2px",
        DEFAULT: "4px",
        md: "6px",
        lg: "8px",
        xl: "12px",
        full: "9999px",
      },

      // ── Typography ─────────────────────────────────────────────
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        body: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "sans-serif",
        ],
        display: [
          "Space Grotesk",
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "sans-serif",
        ],
        // Legacy `geist` alias — points to Space Grotesk now so any old
        // `font-geist` classes still resolve to a real loaded family.
        geist: [
          "Space Grotesk",
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        mono: [
          "JetBrains Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
      },

      // ── Typographic ROLE sizes ─────────────────────────────────
      fontSize: {
        "display-lg": [
          "clamp(48px, 6vw, 72px)",
          { lineHeight: "1.05", letterSpacing: "-0.04em", fontWeight: "700" },
        ],
        "display-md": [
          "clamp(36px, 4vw, 48px)",
          { lineHeight: "1.1", letterSpacing: "-0.035em", fontWeight: "600" },
        ],
        "display-mobile": [
          "48px",
          { lineHeight: "1.05", letterSpacing: "-0.03em", fontWeight: "700" },
        ],
        "headline-lg": [
          "32px",
          { lineHeight: "1.2", letterSpacing: "-0.02em", fontWeight: "600" },
        ],
        "headline-md": [
          "24px",
          { lineHeight: "1.25", letterSpacing: "-0.015em", fontWeight: "600" },
        ],
        "headline-sm": [
          "20px",
          { lineHeight: "1.4", letterSpacing: "-0.01em", fontWeight: "500" },
        ],
        "body-lg": ["18px", { lineHeight: "1.55", fontWeight: "400" }],
        "body-md": ["16px", { lineHeight: "1.6", fontWeight: "400" }],
        "body-sm": ["14px", { lineHeight: "1.55", fontWeight: "400" }],
        label: ["13px", { lineHeight: "1.4", fontWeight: "500" }],
        eyebrow: ["12px", { lineHeight: "1", letterSpacing: "0.1em", fontWeight: "500" }],
        "technical-label": ["12px", { lineHeight: "1.0", letterSpacing: "0.1em", fontWeight: "500" }],
        "mono-data": ["14px", { lineHeight: "1.5", fontWeight: "400" }],
        "mono-data-lg": ["32px", { lineHeight: "1.1", letterSpacing: "-0.01em", fontWeight: "500" }],
        "mono-data-xl": ["48px", { lineHeight: "1", letterSpacing: "-0.02em", fontWeight: "600" }],
        caption: ["12px", { lineHeight: "1.4", fontWeight: "400" }],
      },

      // ── Motion ─────────────────────────────────────────────────
      transitionTimingFunction: {
        "out-expo": "cubic-bezier(0.22, 1, 0.36, 1)",
        "in-out-snap": "cubic-bezier(0.65, 0, 0.35, 1)",
        snap: "cubic-bezier(0.5, 0, 0, 1)",
      },
      transitionDuration: {
        instant: "80ms",
        fast: "120ms",
        base: "180ms",
        medium: "240ms",
        slow: "400ms",
        reveal: "500ms",
      },

      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "reveal-word": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        marquee: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
        pulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.3" },
        },
        "jade-glow": {
          "0%, 100%": { boxShadow: "0 0 24px 0 rgba(105,218,182,0.10)" },
          "50%": { boxShadow: "0 0 56px 0 rgba(105,218,182,0.22)" },
        },
      },
      animation: {
        "fade-up": "fade-up 500ms cubic-bezier(0.22, 1, 0.36, 1) both",
        "reveal-word": "reveal-word 600ms cubic-bezier(0.22, 1, 0.36, 1) both",
        marquee: "marquee 40s linear infinite",
        pulse: "pulse 2s cubic-bezier(0.65, 0, 0.35, 1) infinite",
        "jade-glow": "jade-glow 3s cubic-bezier(0.22, 1, 0.36, 1) infinite",
      },

      boxShadow: {
        "glow-jade": "0 0 40px 0 rgba(105, 218, 182, 0.10)",
        "glow-jade-strong": "0 0 56px 0 rgba(105, 218, 182, 0.22)",
        "inset-well": "inset 0 1px 0 rgba(0, 0, 0, 0.4)",
      },
    },
  },
  plugins: [],
};

export default config;
