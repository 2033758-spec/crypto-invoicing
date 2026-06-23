"use client";

import { useState } from "react";
import { track } from "../../lib/analytics";

// Lead-capture form for the company smoke-test. Posts to /api/company-lead.
export default function CompanyLeadForm() {
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [contact, setContact] = useState("");
  const [headcount, setHeadcount] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [status, setStatus] = useState<"idle" | "submitting" | "ok" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const input =
    "w-full rounded border border-outline-variant bg-surface px-3 py-2.5 text-[14px] text-on-surface placeholder:text-on-surface-placeholder focus:border-primary focus:outline-none transition-colors duration-150";

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!company.trim() || !email.trim()) {
      setError("Completá empresa y email.");
      return;
    }
    setStatus("submitting");
    try {
      const res = await fetch("/api/company-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: company.trim(),
          email: email.trim(),
          contact_name: contact.trim() || undefined,
          headcount: headcount.trim() || undefined,
          message: message.trim() || undefined,
          website: website || undefined,
        }),
      });
      if (!res.ok) {
        setStatus("error");
        setError("No pudimos enviar tu consulta. Probá de nuevo.");
        return;
      }
      setStatus("ok");
      track("company_lead_submitted");
    } catch {
      setStatus("error");
      setError("No pudimos enviar tu consulta. Probá de nuevo.");
    }
  };

  if (status === "ok") {
    return (
      <div className="rounded-lg border border-primary/50 bg-primary/10 p-6 text-center">
        <p className="font-display font-semibold text-[18px] text-primary">✓ ¡Gracias!</p>
        <p className="text-[14px] text-on-surface-variant mt-1">Te contactamos por email en las próximas horas hábiles.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 ym-hide-content">
      <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Empresa *" aria-label="Empresa" className={input} />
      <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Email de trabajo *" aria-label="Email" className={input} />
      <div className="grid sm:grid-cols-2 gap-3">
        <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Tu nombre" aria-label="Nombre" className={input} />
        <input value={headcount} onChange={(e) => setHeadcount(e.target.value)} placeholder="Contractors/mes (ej: 10–50)" aria-label="Cantidad de contractors por mes" className={input} />
      </div>
      <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={2} placeholder="¿Qué necesitás? (opcional)" aria-label="Mensaje" maxLength={1000} className={`${input} resize-none`} />
      {/* honeypot — hidden from humans */}
      <input value={website} onChange={(e) => setWebsite(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
      {error && <p role="alert" className="text-[13px] text-tertiary">{error}</p>}
      <button
        type="submit"
        disabled={status === "submitting"}
        className={`w-full inline-flex items-center justify-center gap-2 rounded px-5 py-3 font-mono text-[13px] uppercase tracking-wider transition-colors duration-150 ${status === "submitting" ? "bg-primary/60 text-primary-on cursor-wait" : "bg-primary text-primary-on hover:bg-primary-hover"}`}
      >
        {status === "submitting" ? "Enviando…" : "Solicitar acceso →"}
      </button>
      <p className="text-[11px] text-on-surface-placeholder text-center">Nunca compartimos tus datos.</p>
    </form>
  );
}
