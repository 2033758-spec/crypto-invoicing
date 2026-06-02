"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { track } from "../../../lib/analytics";

interface Props {
  locale: string;
}

export default function FinalCta({ locale }: Props) {
  const t = useTranslations("finalCta");
  const signupHref = locale === "es-AR" ? "/signup" : `/${locale}/signup`;

  return (
    <section
      className="py-24 text-center border-t"
      style={{
        borderTopColor: "var(--outline-hairline)",
        background:
          "radial-gradient(60% 80% at 50% 0%, rgba(105,218,182,0.05), transparent)",
      }}
      id="cta"
    >
      <div className="shell">
        <p className="eyebrow inline-flex justify-center">{t("eyebrow")}</p>
        <h2
          className="font-display font-bold leading-[1.05] tracking-[-0.04em] m-0 mb-[18px] max-w-[18ch] mx-auto text-on-surface"
          style={{ fontSize: "clamp(36px, 5vw, 64px)" }}
        >
          {t("h2Prefix")}
          <span className="text-primary">{t("h2Accent")}</span>
          {t("h2Suffix")}
        </h2>
        <p
          className="text-on-surface-variant max-w-[56ch] mx-auto mb-8"
          style={{ fontSize: "17px", lineHeight: 1.55 }}
        >
          {t("sub")}
        </p>
        <Link
          href={signupHref}
          className="btn btn-primary btn-lg inline-flex"
          onClick={() => track("cta_clicked", { cta: "start_now_final" })}
        >
          {t("cta")} <span className="arrow">→</span>
        </Link>
        <div
          className="mt-6 font-mono text-[11px] text-on-surface-placeholder"
          style={{ lineHeight: 1.4 }}
        >
          {t("disclaimer")}
        </div>
      </div>
    </section>
  );
}
