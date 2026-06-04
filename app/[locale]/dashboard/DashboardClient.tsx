"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Logo from "../_components/landing-v3/Logo";
import { getBrowserSupabase } from "../../lib/supabase";

interface Props {
  locale: string;
}

interface InvoiceRequest {
  id: string;
  client_name: string;
  client_email: string | null;
  amount_usd: number;
  description: string | null;
  country: "AR" | "BR";
  status:
    | "pending_setup"
    | "payment_link_ready"
    | "paid"
    | "settled"
    | "cancelled";
  usdc_address: string | null;
  payment_link_sent_at: string | null;
  created_at: string;
}

type FormStatus = "idle" | "submitting" | "ok" | "error";

export default function DashboardClient({ locale }: Props) {
  const t = useTranslations("dashboard");
  const router = useRouter();

  const [email, setEmail] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [requests, setRequests] = useState<InvoiceRequest[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [paginationOffset, setPaginationOffset] = useState(0);
  const [paginationTotal, setPaginationTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  // Form state
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [amountUsd, setAmountUsd] = useState("");
  const [description, setDescription] = useState("");
  const [country, setCountry] = useState<"AR" | "BR">("AR");
  const [formStatus, setFormStatus] = useState<FormStatus>("idle");
  const [formError, setFormError] = useState<string | null>(null);

  const signupHref = locale === "es-AR" ? "/signup" : `/${locale}/signup`;
  const homeHref = locale === "es-AR" ? "/" : `/${locale}`;

  const loadRequests = useCallback(async (offset: number = 0) => {
    setLoadingList(true);
    try {
      const url = new URL("/api/invoice/list", window.location.origin);
      url.searchParams.set("offset", String(offset));
      url.searchParams.set("limit", "50");

      const res = await fetch(url.toString(), { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests ?? []);
        setPaginationOffset(offset);
        setPaginationTotal(data.pagination?.total ?? 0);
        setHasMore(data.pagination?.hasMore ?? false);
      }
    } catch (err) {
      console.error("[dashboard] list fetch failed", err);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const supabase = getBrowserSupabase();
        const { data, error } = await supabase.auth.getUser();
        if (cancelled) return;
        if (error || !data.user) {
          router.replace(signupHref);
          return;
        }
        setEmail(data.user.email ?? null);

        // Autofill from Google profile
        // Google OAuth provides user.user_metadata with name, picture, etc.
        if (data.user.user_metadata?.name) {
          setClientName(data.user.user_metadata.name);
        }
        if (data.user.email) {
          setClientEmail(data.user.email);
        }

        setChecking(false);
        loadRequests();
      } catch (err) {
        console.error("[dashboard] auth check failed", err);
        if (!cancelled) router.replace(signupHref);
      }
    };
    check();
    return () => {
      cancelled = true;
    };
  }, [router, signupHref, loadRequests]);

  const handleSignOut = async () => {
    try {
      const supabase = getBrowserSupabase();
      await supabase.auth.signOut();
    } catch (err) {
      console.error("[dashboard] signOut failed", err);
    }
    router.replace(homeHref);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);

    const amount = parseFloat(amountUsd);
    if (!clientName.trim()) {
      setFormError(t("form.errClientName"));
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setFormError(t("form.errAmount"));
      return;
    }

    setFormStatus("submitting");
    try {
      const res = await fetch("/api/invoice/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_name: clientName.trim(),
          client_email: clientEmail.trim() || undefined,
          amount_usd: amount,
          description: description.trim() || undefined,
          country,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setFormError(data.error || t("form.errGeneric"));
        setFormStatus("error");
        return;
      }
      setFormStatus("ok");
      // Refresh list to show new request
      loadRequests();
      // SUCCESS STATE PERSISTS - user sees confirmation until manual action
      // To create another invoice, they click the success message or navigate
    } catch (err) {
      console.error("[dashboard] submit failed", err);
      setFormError(t("form.errGeneric"));
      setFormStatus("error");
    }
  };

  if (checking) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-4 gap-4">
        <h1 className="sr-only">{t("welcome")}</h1>
        <Logo className="w-12 h-12 animate-pulse" />
        <p
          aria-live="polite"
          className="font-mono text-[12px] uppercase tracking-widest text-on-surface-variant"
        >
          {t("loading")}
        </p>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="relative z-10 border-b border-outline-variant px-4 sm:px-8 lg:px-16 h-20 flex items-center justify-between max-w-shell mx-auto w-full">
        <div className="flex items-center gap-3">
          <Logo className="w-10 h-10" />
          <span className="font-display font-semibold text-[20px] text-on-surface hidden sm:inline">
            Crypto Invoicing
          </span>
        </div>
        <div className="flex items-center gap-4">
          {email && (
            <span className="font-mono text-[13px] text-on-surface-variant hidden sm:inline">
              {email}
            </span>
          )}
          <button
            type="button"
            onClick={handleSignOut}
            className="inline-flex items-center gap-2 rounded border border-outline-variant px-3 py-1.5 font-mono text-[13px] text-on-surface-variant hover:text-on-surface hover:border-primary/60 transition-colors duration-150"
          >
            {t("signOut")}
          </button>
        </div>
      </header>

      <div className="relative z-10 flex-1 px-4 sm:px-8 lg:px-16 py-10 max-w-shell mx-auto w-full">
        {/* Hero block — kept short, the real action is below */}
        <section className="mb-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/15 border border-primary/40 px-3 py-1 mb-4">
            <span className="font-mono text-[10px] uppercase tracking-widest text-primary">
              {t("concierge")}
            </span>
          </div>
          <h1 className="font-display font-bold text-[28px] sm:text-[40px] tracking-[-0.03em] text-on-surface mb-3 leading-[1.05]">
            {t("welcomeShort")}
          </h1>
          <p
            className="text-on-surface-variant max-w-2xl"
            style={{ fontSize: "15px", lineHeight: 1.55 }}
          >
            {t("hero")}
          </p>
        </section>

        <div className="grid lg:grid-cols-[1.2fr_1fr] gap-8">
          {/* LEFT — Create-invoice form */}
          <section
            className="rounded-lg border border-primary/30 bg-surface-container-low p-6 sm:p-8 relative overflow-hidden"
            aria-labelledby="form-heading"
          >
            <div
              aria-hidden
              className="absolute -top-px -inset-x-px h-1"
              style={{
                background:
                  "linear-gradient(90deg, transparent, var(--primary), transparent)",
              }}
            />
            <h2
              id="form-heading"
              className="font-display font-semibold text-[20px] text-on-surface mb-2"
            >
              {t("form.title")}
            </h2>
            <p className="text-[13px] text-on-surface-variant mb-6">
              {t("form.subtitle")}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Field label={t("form.clientName")} htmlFor="client_name">
                <input
                  id="client_name"
                  type="text"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder={t("form.clientNamePlaceholder")}
                  className="w-full rounded border border-outline-variant bg-surface px-3 py-2 text-[14px] text-on-surface placeholder:text-on-surface-placeholder focus:border-primary focus:outline-none transition-colors duration-150"
                />
              </Field>

              <Field
                label={t("form.clientEmail")}
                htmlFor="client_email"
                hint={t("form.clientEmailHint") || "Optional — personal or work email, we'll send payment link"}
              >
                <input
                  id="client_email"
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="client@example.com or jane@her-company.com"
                  className="w-full rounded border border-outline-variant bg-surface px-3 py-2 text-[14px] text-on-surface placeholder:text-on-surface-placeholder focus:border-primary focus:outline-none transition-colors duration-150"
                />
              </Field>

              <div className="grid sm:grid-cols-2 gap-4">
                <Field label={t("form.amount")} htmlFor="amount_usd">
                  <div className="relative">
                    <span
                      id="amount-unit"
                      className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-[12px] text-on-surface-placeholder"
                    >
                      USD
                    </span>
                    <input
                      id="amount_usd"
                      type="number"
                      required
                      min="1"
                      step="0.01"
                      value={amountUsd}
                      onChange={(e) => setAmountUsd(e.target.value)}
                      placeholder="2500"
                      aria-describedby="amount-unit"
                      className="w-full rounded border border-outline-variant bg-surface pl-12 pr-3 py-2 text-[14px] text-on-surface placeholder:text-on-surface-placeholder focus:border-primary focus:outline-none transition-colors duration-150"
                    />
                  </div>
                </Field>

                <Field label={t("form.country")} htmlFor="country">
                  <div
                    role="radiogroup"
                    aria-label={t("form.country")}
                    className="flex gap-0 border border-outline-variant rounded p-[3px] h-[40px]"
                  >
                    {(["AR", "BR"] as const).map((c) => {
                      const active = country === c;
                      return (
                        <button
                          key={c}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          onClick={() => setCountry(c)}
                          className={`flex-1 rounded-[3px] font-mono text-[12px] uppercase tracking-widest transition-colors duration-150 ${
                            active
                              ? "bg-surface-container-high text-on-surface"
                              : "text-on-surface-variant hover:text-on-surface"
                          }`}
                        >
                          {c === "AR" ? "AR · ARS" : "BR · BRL"}
                        </button>
                      );
                    })}
                  </div>
                </Field>
              </div>

              <Field
                label={t("form.description")}
                htmlFor="description"
                hint={t("form.descriptionHint")}
              >
                <textarea
                  id="description"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t("form.descriptionPlaceholder")}
                  maxLength={500}
                  className="w-full rounded border border-outline-variant bg-surface px-3 py-2 text-[14px] text-on-surface placeholder:text-on-surface-placeholder focus:border-primary focus:outline-none transition-colors duration-150 resize-none"
                />
              </Field>

              {formError && (
                <div
                  role="alert"
                  className="rounded border border-tertiary/40 bg-tertiary/10 px-3 py-2 text-[13px] text-tertiary"
                >
                  {formError}
                </div>
              )}

              <button
                type="submit"
                disabled={formStatus === "submitting" || formStatus === "ok"}
                className={`w-full inline-flex items-center justify-center gap-2 rounded px-6 py-3 font-mono text-[13px] uppercase tracking-wider transition-colors duration-150 ${
                  formStatus === "ok"
                    ? "bg-primary/20 text-primary cursor-default"
                    : formStatus === "submitting"
                      ? "bg-primary/60 text-primary-on cursor-wait"
                      : "bg-primary text-primary-on hover:bg-primary-hover"
                }`}
              >
                {formStatus === "ok"
                  ? t("form.submitOk")
                  : formStatus === "submitting"
                    ? t("form.submitSending")
                    : t("form.submit")}
              </button>

              <p className="font-mono text-[11px] text-on-surface-placeholder">
                {t("form.footnote")}
              </p>
            </form>
          </section>

          {/* RIGHT — Request list */}
          <section
            className="rounded-lg border border-outline-variant bg-surface-container-low p-6 sm:p-8"
            aria-labelledby="list-heading"
          >
            <div className="flex items-center justify-between mb-4">
              <h2
                id="list-heading"
                className="font-display font-semibold text-[18px] text-on-surface"
              >
                {t("list.title")}
              </h2>
              {loadingList && (
                <span className="font-mono text-[11px] text-on-surface-placeholder">
                  …
                </span>
              )}
            </div>

            {requests.length === 0 && !loadingList ? (
              <div className="rounded border border-dashed border-outline-variant px-4 py-8 text-center">
                <p className="text-[13px] text-on-surface-variant">
                  {t("list.empty")}
                </p>
              </div>
            ) : (
              <>
                <ul className="space-y-3">
                  {requests.map((r) => (
                  <li
                    key={r.id}
                    className="rounded border border-outline-variant bg-surface px-4 py-3"
                  >
                    <div className="flex items-baseline justify-between gap-2 mb-1">
                      <span className="font-display font-semibold text-[15px] text-on-surface truncate">
                        {r.client_name}
                      </span>
                      <StatusBadge status={r.status} />
                    </div>
                    <div className="flex items-center justify-between text-[12px] text-on-surface-variant">
                      <span className="font-mono">
                        USD {r.amount_usd.toFixed(2)} · {r.country}
                      </span>
                      <span className="font-mono">
                        {new Date(r.created_at).toLocaleDateString(locale)}
                      </span>
                    </div>
                    {r.status === "payment_link_ready" && r.usdc_address && (
                      <div className="mt-3 pt-3 border-t border-outline-variant">
                        <p className="font-mono text-[10px] uppercase tracking-widest text-primary mb-1">
                          {t("list.paymentAddress")}
                        </p>
                        <code className="block text-[11px] text-on-surface break-all">
                          {r.usdc_address}
                        </code>
                      </div>
                    )}
                  </li>
                ))}
                </ul>

                {/* Load more button if more invoices exist */}
                {hasMore && (
                  <button
                    onClick={() => loadRequests(paginationOffset + 50)}
                    disabled={loadingList}
                    className="w-full mt-4 px-4 py-2 rounded border border-outline-variant text-[13px] text-on-surface-variant hover:text-on-surface hover:border-primary transition-colors disabled:opacity-50"
                  >
                    {loadingList ? "Loading..." : `Load more (${paginationTotal - (paginationOffset + 50)} remaining)`}
                  </button>
                )}

                {/* Show total count */}
                {paginationTotal > 0 && (
                  <p className="mt-3 text-[11px] text-on-surface-placeholder text-center">
                    Showing {Math.min(paginationOffset + 50, paginationTotal)} of {paginationTotal}
                  </p>
                )}
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="block font-mono text-[11px] uppercase tracking-widest text-on-surface-variant mb-1.5"
      >
        {label}
      </label>
      {children}
      {hint && (
        <p className="mt-1 text-[11px] text-on-surface-placeholder">{hint}</p>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: InvoiceRequest["status"] }) {
  const t = useTranslations("dashboard.status");
  const styles: Record<InvoiceRequest["status"], string> = {
    pending_setup: "bg-tertiary/15 text-tertiary border-tertiary/30",
    payment_link_ready: "bg-primary/15 text-primary border-primary/40",
    paid: "bg-primary/25 text-primary border-primary/50",
    settled: "bg-primary/30 text-primary border-primary/60",
    cancelled: "bg-outline-variant/20 text-on-surface-placeholder border-outline-variant",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-widest whitespace-nowrap ${styles[status]}`}
    >
      {t(status)}
    </span>
  );
}
