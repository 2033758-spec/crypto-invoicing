import { unstable_setRequestLocale, getTranslations } from "next-intl/server";
import Link from "next/link";

interface Props {
  params: { locale: string };
  searchParams: { reason?: string; desc?: string };
}

export default async function AuthErrorPage({ params, searchParams }: Props) {
  unstable_setRequestLocale(params.locale);
  const t = await getTranslations({
    locale: params.locale,
    namespace: "auth.callback",
  });

  const signupHref =
    params.locale === "es-AR" ? "/signup" : `/${params.locale}/signup`;

  const detail =
    searchParams.desc ||
    (searchParams.reason ? `Reason: ${searchParams.reason}` : t("errorNoSession"));

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="font-mono text-[13px] text-tertiary mb-3">
          {t("errorTitle")}
        </h1>
        <p
          className="text-on-surface-variant"
          style={{ fontSize: "16px", lineHeight: 1.55 }}
        >
          {detail}
        </p>
        <Link
          href={signupHref}
          className="mt-6 inline-block font-mono text-[13px] text-primary hover:text-primary-hover transition-colors duration-150"
        >
          {t("tryAgain")}
        </Link>
      </div>
    </main>
  );
}
