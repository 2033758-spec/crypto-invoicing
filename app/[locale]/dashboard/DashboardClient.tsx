"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Logo from "../_components/landing-v3/Logo";
import { getBrowserSupabase } from "../../lib/supabase";
import { track, identify, resetIdentity } from "../../lib/analytics";

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
  public_token: string | null;
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
  const [listError, setListError] = useState(false);

  // Form state
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [amountUsd, setAmountUsd] = useState("");
  const [description, setDescription] = useState("");
  const [country, setCountry] = useState<"AR" | "BR">("AR");
  const [formStatus, setFormStatus] = useState<FormStatus>("idle");
  const [formError, setFormError] = useState<string | null>(null);
  const [spoofingWarning, setSpoofingWarning] = useState<string | null>(null);

  // B3: payout profile (CUIT/CBU/Pix/tax) — concierge can't settle without it.
  const [pFirstName, setPFirstName] = useState("");
  const [pLastName, setPLastName] = useState("");
  const [pCountry, setPCountry] = useState<"AR" | "BR">("AR");
  const [pTaxId, setPTaxId] = useState("");
  const [pPayout, setPPayout] = useState("");
  const [pTaxStatus, setPTaxStatus] = useState("");
  const [pTelegram, setPTelegram] = useState("");
  const [profileStatus, setProfileStatus] = useState<FormStatus>("idle");
  const [profileComplete, setProfileComplete] = useState(false);
  const [profileFieldError, setProfileFieldError] = useState<string | null>(null);

  const signupHref = locale === "es-AR" ? "/signup" : `/${locale}/signup`;
  const homeHref = locale === "es-AR" ? "/" : `/${locale}`;

  const loadRequests = useCallback(async (offset: number = 0) => {
    setLoadingList(true);
    setListError(false);
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
      } else {
        // B20: surface load failures instead of an eternal empty-state.
        setListError(true);
      }
    } catch (err) {
      console.error("[dashboard] list fetch failed", err);
      setListError(true);
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

        // B9: tie funnel events to the user + record the bottom-of-funnel view.
        identify(data.user.id);
        track("dashboard_viewed");

        // B8: do NOT prefill client_name/client_email with the user's own
        // identity — these fields describe the user's CLIENT (the payer), not
        // the user. Prefilling made the default "client" = the freelancer.
        setChecking(false);
        loadRequests();

        // B3: load the payout profile (row provisioned by the signup trigger;
        // maybeSingle → null is fine before the migration is applied).
        supabase
          .from("users")
          .select("full_name,country,tax_id,payout_destination,tax_status,telegram_handle")
          .eq("id", data.user.id)
          .maybeSingle()
          .then(({ data: prof }: { data: Record<string, string | null> | null }) => {
            if (cancelled) return;
            // Prefill name: saved profile first, else the Google profile name.
            const savedName = prof?.full_name;
            const metaName =
              typeof data.user.user_metadata?.name === "string"
                ? data.user.user_metadata.name
                : "";
            const nameSource = (savedName || metaName).trim();
            if (nameSource) {
              const parts = nameSource.split(/\s+/);
              setPFirstName(parts[0] ?? "");
              setPLastName(parts.slice(1).join(" "));
            }
            if (!prof) return;
            if (prof.country === "AR" || prof.country === "BR") setPCountry(prof.country);
            if (prof.tax_id) setPTaxId(prof.tax_id);
            if (prof.payout_destination) setPPayout(prof.payout_destination);
            if (prof.tax_status) setPTaxStatus(prof.tax_status);
            if (prof.telegram_handle) setPTelegram(prof.telegram_handle);
            setProfileComplete(
              Boolean(prof.country && prof.tax_id && prof.payout_destination),
            );
          });
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
      resetIdentity(); // B9: detach analytics identity on logout
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
    // B17: mirror the server's upper bound (≤1,000,000) with a localized message
    // so the user never sees the raw English API error.
    if (amount > 1_000_000) {
      setFormError(t("form.errAmountMax"));
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
      // B9: bottom-funnel conversion event (H2/H5 measurement).
      track("invoice_requested", { amount_usd: amount, country });
      // Refresh list to show the new request.
      loadRequests();
      // B12: clear the form and return to idle so the user can create another
      // invoice without reloading the page (the success state used to lock the
      // button forever). The new request is already visible in the list.
      setClientName("");
      setClientEmail("");
      setAmountUsd("");
      setDescription("");
      setSpoofingWarning(null);
      setTimeout(() => {
        setFormStatus((s) => (s === "ok" ? "idle" : s));
      }, 2500);
    } catch (err) {
      console.error("[dashboard] submit failed", err);
      setFormError(t("form.errGeneric"));
      setFormStatus("error");
    }
  };

  const handleSaveProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setProfileFieldError(null);

    // Client-side validation with field highlight (mirrors the server).
    if (!pFirstName.trim()) return setProfileFieldError("first_name");
    if (!pLastName.trim()) return setProfileFieldError("last_name");
    if (!pTaxId.trim()) return setProfileFieldError("tax_id");
    if (!pPayout.trim()) return setProfileFieldError("payout_destination");
    // Telegram is optional, but if filled it must look like @handle.
    const tg = pTelegram.trim();
    if (tg && !/^@?[a-zA-Z0-9_]{4,32}$/.test(tg)) {
      return setProfileFieldError("telegram_handle");
    }

    setProfileStatus("submitting");
    try {
      // Save via the server API (service-role; self-heals a missing user row).
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: `${pFirstName.trim()} ${pLastName.trim()}`.trim(),
          country: pCountry,
          tax_id: pTaxId.trim(),
          payout_destination: pPayout.trim(),
          tax_status: pTaxStatus.trim(),
          telegram_handle: tg,
        }),
      });
      if (res.status === 401) {
        router.replace(signupHref);
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.field) {
          setProfileFieldError(data.field);
          setProfileStatus("idle");
        } else {
          setProfileStatus("error");
        }
        return;
      }
      setProfileComplete(true);
      track("profile_completed", { country: pCountry });
      setProfileStatus("ok");
      setTimeout(() => setProfileStatus((s) => (s === "ok" ? "idle" : s)), 2500);
    } catch (err) {
      console.error("[dashboard] profile save error", err);
      setProfileStatus("error");
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

        {/* B3: payout profile — concierge can't settle without CUIT/CBU/Pix. */}
        <section className="mb-8 rounded-lg border border-outline-variant bg-surface-container-low overflow-hidden">
          <details open={!profileComplete}>
            <summary className="list-none cursor-pointer flex items-center justify-between gap-3 px-6 py-4">
              <span className="flex items-center gap-3">
                <span className="font-display font-semibold text-[16px] text-on-surface">
                  {t("profile.title")}
                </span>
                {profileComplete && (
                  <span className="font-mono text-[10px] uppercase tracking-widest text-primary border border-primary/40 rounded px-2 py-0.5">
                    {t("profile.complete")}
                  </span>
                )}
              </span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden className="text-on-surface-variant">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </summary>
            <div className="px-6 pb-6">
              {!profileComplete && (
                <div className="mb-4 rounded border border-primary/40 bg-primary/10 px-3 py-2 text-[13px] text-on-surface">
                  {t("profile.incomplete")}
                </div>
              )}
              <p className="text-on-surface-variant text-[14px] mb-5" style={{ lineHeight: 1.55 }}>
                {t("profile.subtitle")}
              </p>
              {/* ym-hide-content: name / CUIT / CBU-CVU-alias / Telegram must never
                  enter Yandex Webvisor session recordings (PII + financial). */}
              <form onSubmit={handleSaveProfile} className="space-y-4 ym-hide-content">
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label={t("profile.firstName")} htmlFor="p_first">
                    <input id="p_first" type="text" value={pFirstName} onChange={(e) => { setPFirstName(e.target.value); if (profileFieldError === "first_name") setProfileFieldError(null); }} placeholder={t("profile.firstNamePlaceholder")} aria-invalid={profileFieldError === "first_name"} className={`w-full rounded border ${profileFieldError === "first_name" ? "border-tertiary" : "border-outline-variant"} bg-surface px-3 py-2 text-[14px] text-on-surface placeholder:text-on-surface-placeholder focus:border-primary focus:outline-none transition-colors duration-150`} />
                    {profileFieldError === "first_name" && <p className="mt-1 text-[11px] text-tertiary">{t("profile.errRequired")}</p>}
                  </Field>
                  <Field label={t("profile.lastName")} htmlFor="p_last">
                    <input id="p_last" type="text" value={pLastName} onChange={(e) => { setPLastName(e.target.value); if (profileFieldError === "last_name") setProfileFieldError(null); }} placeholder={t("profile.lastNamePlaceholder")} aria-invalid={profileFieldError === "last_name"} className={`w-full rounded border ${profileFieldError === "last_name" ? "border-tertiary" : "border-outline-variant"} bg-surface px-3 py-2 text-[14px] text-on-surface placeholder:text-on-surface-placeholder focus:border-primary focus:outline-none transition-colors duration-150`} />
                    {profileFieldError === "last_name" && <p className="mt-1 text-[11px] text-tertiary">{t("profile.errRequired")}</p>}
                  </Field>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label={t("profile.country")} htmlFor="p_country">
                    <div role="radiogroup" aria-label={t("profile.country")} className="flex gap-0 border border-outline-variant rounded p-[3px] h-[40px]">
                      {(["AR", "BR"] as const).map((c) => {
                        const active = pCountry === c;
                        return (
                          <button key={c} type="button" role="radio" aria-checked={active} onClick={() => setPCountry(c)} className={`flex-1 rounded-[3px] font-mono text-[12px] uppercase tracking-widest transition-colors duration-150 ${active ? "bg-surface-container-high text-on-surface" : "text-on-surface-variant hover:text-on-surface"}`}>
                            {c === "AR" ? "AR · ARS" : "BR · BRL"}
                          </button>
                        );
                      })}
                    </div>
                  </Field>
                  <Field label={t("profile.taxId")} htmlFor="p_taxid" hint={t("profile.taxIdHint")}>
                    <input id="p_taxid" type="text" value={pTaxId} onChange={(e) => { setPTaxId(e.target.value); if (profileFieldError === "tax_id") setProfileFieldError(null); }} placeholder={t("profile.taxIdPlaceholder")} aria-invalid={profileFieldError === "tax_id"} className={`w-full rounded border ${profileFieldError === "tax_id" ? "border-tertiary" : "border-outline-variant"} bg-surface px-3 py-2 text-[14px] text-on-surface placeholder:text-on-surface-placeholder focus:border-primary focus:outline-none transition-colors duration-150`} />
                    {profileFieldError === "tax_id" && <p className="mt-1 text-[11px] text-tertiary">{t("profile.errRequired")}</p>}
                  </Field>
                </div>
                <Field label={pCountry === "AR" ? t("profile.payoutAR") : t("profile.payoutBR")} htmlFor="p_payout" hint={t("profile.payoutHint")}>
                  <input id="p_payout" type="text" value={pPayout} onChange={(e) => { setPPayout(e.target.value); if (profileFieldError === "payout_destination") setProfileFieldError(null); }} placeholder={t("profile.payoutPlaceholder")} aria-invalid={profileFieldError === "payout_destination"} className={`w-full rounded border ${profileFieldError === "payout_destination" ? "border-tertiary" : "border-outline-variant"} bg-surface px-3 py-2 text-[14px] text-on-surface placeholder:text-on-surface-placeholder focus:border-primary focus:outline-none transition-colors duration-150`} />
                  {profileFieldError === "payout_destination" && <p className="mt-1 text-[11px] text-tertiary">{t("profile.errRequired")}</p>}
                </Field>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label={t("profile.taxStatus")} htmlFor="p_taxstatus">
                    <input id="p_taxstatus" type="text" value={pTaxStatus} onChange={(e) => setPTaxStatus(e.target.value)} placeholder={t("profile.taxStatusPlaceholder")} className="w-full rounded border border-outline-variant bg-surface px-3 py-2 text-[14px] text-on-surface placeholder:text-on-surface-placeholder focus:border-primary focus:outline-none transition-colors duration-150" />
                  </Field>
                  <Field label={t("profile.telegram")} htmlFor="p_tg">
                    <input id="p_tg" type="text" value={pTelegram} onChange={(e) => { setPTelegram(e.target.value); if (profileFieldError === "telegram_handle") setProfileFieldError(null); }} placeholder={t("profile.telegramPlaceholder")} aria-invalid={profileFieldError === "telegram_handle"} className={`w-full rounded border ${profileFieldError === "telegram_handle" ? "border-tertiary" : "border-outline-variant"} bg-surface px-3 py-2 text-[14px] text-on-surface placeholder:text-on-surface-placeholder focus:border-primary focus:outline-none transition-colors duration-150`} />
                    {profileFieldError === "telegram_handle" && <p className="mt-1 text-[11px] text-tertiary">{t("profile.errTelegram")}</p>}
                  </Field>
                </div>
                <div className="flex items-center gap-3">
                  <button type="submit" disabled={profileStatus === "submitting" || profileStatus === "ok"} className={`inline-flex items-center justify-center gap-2 rounded px-5 py-2.5 font-mono text-[13px] uppercase tracking-wider transition-colors duration-150 ${profileStatus === "ok" ? "bg-primary/20 text-primary cursor-default" : profileStatus === "submitting" ? "bg-primary/60 text-primary-on cursor-wait" : "bg-primary text-primary-on hover:bg-primary-hover"}`}>
                    {profileStatus === "ok" ? t("profile.saved") : profileStatus === "submitting" ? t("profile.saving") : t("profile.save")}
                  </button>
                  {profileStatus === "error" && (
                    <p role="alert" className="text-[13px] text-tertiary">{t("profile.errSave")}</p>
                  )}
                </div>
              </form>
            </div>
          </details>
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

            {/* ym-hide-content: invoice client names / amounts out of Webvisor. */}
            <form onSubmit={handleSubmit} className="space-y-4 ym-hide-content">
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
                hint={t("form.clientEmailHint")}
              >
                <input
                  id="client_email"
                  type="email"
                  value={clientEmail}
                  onChange={(e) => {
                    const email = e.target.value;
                    setClientEmail(email);
                    // Check for spoofing: if client_email domain matches our domain
                    if (email && email.endsWith("@cryptoinvoicing.co")) {
                      setSpoofingWarning(t("form.spoofingWarning"));
                    } else {
                      setSpoofingWarning(null);
                    }
                  }}
                  placeholder={t("form.clientEmailPlaceholder")}
                  className="w-full rounded border border-outline-variant bg-surface px-3 py-2 text-[14px] text-on-surface placeholder:text-on-surface-placeholder focus:border-primary focus:outline-none transition-colors duration-150"
                />
              </Field>

              {spoofingWarning && (
                <div className="rounded border border-tertiary bg-tertiary/10 px-3 py-2 text-[13px] text-tertiary">
                  {spoofingWarning}
                </div>
              )}

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

            {listError && !loadingList ? (
              <div
                role="alert"
                className="rounded border border-tertiary/40 bg-tertiary/10 px-4 py-6 text-center"
              >
                <p className="text-[13px] text-tertiary mb-3">{t("list.error")}</p>
                <button
                  type="button"
                  onClick={() => loadRequests(paginationOffset)}
                  className="px-4 py-2 rounded border border-outline-variant text-[13px] text-on-surface-variant hover:text-on-surface hover:border-primary transition-colors"
                >
                  {t("list.retry")}
                </button>
              </div>
            ) : requests.length === 0 && !loadingList ? (
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
                    {r.public_token && (
                      <div className="mt-3 pt-3 border-t border-outline-variant flex items-center justify-between gap-2">
                        <a
                          href={`/i/${r.public_token}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-[11px] text-primary hover:underline"
                        >
                          Ver / compartir factura →
                        </a>
                        <button
                          type="button"
                          onClick={() => {
                            const url = `${window.location.origin}/i/${r.public_token}`;
                            navigator.clipboard?.writeText(url).catch(() => {});
                            track("invoice_link_copied");
                          }}
                          className="font-mono text-[11px] uppercase tracking-widest text-on-surface-variant hover:text-primary whitespace-nowrap"
                        >
                          Copiar link
                        </button>
                      </div>
                    )}
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
                    {loadingList
                      ? t("list.loading")
                      : t("list.loadMore", {
                          count: paginationTotal - (paginationOffset + 50),
                        })}
                  </button>
                )}

                {/* Show total count */}
                {paginationTotal > 0 && (
                  <p className="mt-3 text-[11px] text-on-surface-placeholder text-center">
                    {t("list.showing", {
                      shown: Math.min(paginationOffset + 50, paginationTotal),
                      total: paginationTotal,
                    })}
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
