import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSupabase } from "../../lib/supabase";
import CopyButton from "./CopyButton";

// Public hosted invoice page — /i/{token}. The artifact a freelancer shares
// with their overseas client. NO auth: access is via the unguessable
// public_token (capability URL, like Stripe payment links). Read goes through
// the service-role client (RLS untouched), selecting ONLY whitelisted fields —
// never user_id / org_id / internal notes / payout details.
//
// Lives outside the [locale] tree (middleware matcher excludes `i/`) so the
// shared link is a neutral /i/{token}, not /es-AR/i/...

export const dynamic = "force-dynamic"; // live status; never CDN-cache someone's invoice
export const metadata: Metadata = {
  robots: { index: false, follow: false, noarchive: true, nosnippet: true },
};

const SAFE_ADDRESS = process.env.SAFE_MULTISIG_ADDRESS || "";

interface LineItem {
  description?: string;
  qty?: number;
  unit_price?: number;
  amount?: number;
}
interface Issuer {
  legal_name?: string;
  cuit?: string;
  fiscal_address?: string;
  iva_condition?: string;
  punto_venta?: string;
  email?: string;
}
interface Recipient {
  name?: string;
  company?: string;
  address?: string;
  country?: string;
  tax_id?: string;
  email?: string;
}
interface Payment {
  usdc_address?: string;
  network?: string;
  reference?: string;
}

const STATUS: Record<string, { label: string; tone: string }> = {
  pending_setup: { label: "Preparando el link de pago", tone: "text-tertiary" },
  payment_link_ready: { label: "Esperando el pago", tone: "text-primary" },
  paid: { label: "Pago recibido", tone: "text-primary" },
  settled: { label: "Pagado y liquidado", tone: "text-primary" },
  cancelled: { label: "Cancelada", tone: "text-on-surface-placeholder" },
};

function fmt(n: number | null | undefined): string {
  const v = typeof n === "number" ? n : 0;
  return v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default async function HostedInvoice({ params }: { params: { token: string } }) {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("invoice_requests")
    .select(
      "client_name, amount_usd, description, country, status, usdc_address, created_at, invoice_number, issue_date, currency, issuer_snapshot, recipient, line_items, subtotal_usd, total_usd, tax_note, terms_notes, payment",
    )
    .eq("public_token", params.token)
    .maybeSingle();

  // 404 (not 403) on unknown/invalid token — don't confirm existence.
  if (error || !data) notFound();

  const status = (data.status as string) || "pending_setup";
  const st = STATUS[status] ?? STATUS.pending_setup;
  const isPaid = status === "paid" || status === "settled";
  const isCancelled = status === "cancelled";

  const issuer = (data.issuer_snapshot as Issuer | null) ?? null;
  const recipient = (data.recipient as Recipient | null) ?? null;
  const items = (Array.isArray(data.line_items) ? (data.line_items as LineItem[]) : []).filter(
    (i) => i && (i.description || i.amount),
  );
  const payment = (data.payment as Payment | null) ?? null;

  const currency = (data.currency as string) || "USD";
  const total = (data.total_usd as number | null) ?? (data.amount_usd as number);
  const subtotal = (data.subtotal_usd as number | null) ?? total;
  const taxNote = (data.tax_note as string | null) || "IVA exento — exportación de servicios";

  const address = payment?.usdc_address || (data.usdc_address as string | null) || SAFE_ADDRESS;
  const reference =
    payment?.reference || (data.invoice_number as string | null) || params.token.slice(0, 8).toUpperCase();
  const network = payment?.network || "Base";
  const number = (data.invoice_number as string | null) || `FE-${params.token.slice(0, 8).toUpperCase()}`;
  const issueDate = (data.issue_date as string | null) || (data.created_at as string);

  return (
    <main className="relative min-h-screen px-4 sm:px-6 py-8 bg-[var(--surface-container-lowest,#0a0f0d)]">
      <div className="mx-auto max-w-[720px]">
        {/* Brand bar */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <span className="font-display font-medium text-[15px] text-on-surface">Crypto Invoicing</span>
        </div>

        {/* Status bar */}
        <div className="rounded-lg border border-outline-variant bg-surface px-5 py-3 mb-5 flex items-center justify-between gap-3">
          <span className={`font-mono text-[11px] uppercase tracking-widest ${st.tone}`}>● {st.label}</span>
          <span className="font-mono text-[11px] text-on-surface-placeholder">{number}</span>
        </div>

        {/* Invoice document */}
        <article className="rounded-xl border border-outline-variant bg-surface p-6 sm:p-8">
          <p className="font-mono text-[11px] uppercase tracking-widest text-primary mb-1">
            [ FACTURA E · EXPORTACIÓN DE SERVICIOS ]
          </p>
          <div className="flex items-baseline justify-between gap-3 mb-6">
            <h1 className="font-display font-semibold text-[22px] text-on-surface">{number}</h1>
            <span className="font-mono text-[12px] text-on-surface-variant">
              {new Date(issueDate).toLocaleDateString("es-AR")}
            </span>
          </div>

          {/* From / To */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-7">
            <div className="rounded-lg border border-outline-variant/60 p-4">
              <p className="font-mono text-[10px] uppercase tracking-widest text-on-surface-placeholder mb-2">De</p>
              <p className="text-[14px] text-on-surface font-medium">
                {issuer?.legal_name || "Crypto Invoicing"}
              </p>
              {issuer?.cuit && <p className="text-[13px] text-on-surface-variant">CUIT {issuer.cuit}</p>}
              {issuer?.fiscal_address && (
                <p className="text-[13px] text-on-surface-variant">{issuer.fiscal_address}</p>
              )}
              <p className="text-[13px] text-on-surface-variant">{(data.country as string) || "AR"}</p>
            </div>
            <div className="rounded-lg border border-outline-variant/60 p-4">
              <p className="font-mono text-[10px] uppercase tracking-widest text-on-surface-placeholder mb-2">Para</p>
              <p className="text-[14px] text-on-surface font-medium">
                {recipient?.company || recipient?.name || (data.client_name as string)}
              </p>
              {recipient?.address && <p className="text-[13px] text-on-surface-variant">{recipient.address}</p>}
              {(recipient?.country || recipient?.tax_id) && (
                <p className="text-[13px] text-on-surface-variant">
                  {[recipient?.country, recipient?.tax_id].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>
          </div>

          {/* Items */}
          {items.length > 0 ? (
            <table className="w-full text-[14px] mb-2">
              <thead>
                <tr className="border-b border-outline-variant text-on-surface-placeholder">
                  <th className="text-left font-mono text-[10px] uppercase tracking-widest py-2">Descripción</th>
                  <th className="text-right font-mono text-[10px] uppercase tracking-widest py-2">Cant.</th>
                  <th className="text-right font-mono text-[10px] uppercase tracking-widest py-2">Precio</th>
                  <th className="text-right font-mono text-[10px] uppercase tracking-widest py-2">Importe</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, i) => (
                  <tr key={i} className="border-b border-outline-variant/40 text-on-surface-variant">
                    <td className="py-2 text-on-surface">{it.description}</td>
                    <td className="py-2 text-right font-mono">{it.qty ?? 1}</td>
                    <td className="py-2 text-right font-mono">{fmt(it.unit_price)}</td>
                    <td className="py-2 text-right font-mono text-on-surface">{fmt(it.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="border-b border-outline-variant/40 pb-2 mb-2 flex justify-between text-[14px]">
              <span className="text-on-surface">{(data.description as string) || "Servicios profesionales"}</span>
              <span className="font-mono text-on-surface">{fmt(total)}</span>
            </div>
          )}

          {/* Totals */}
          <div className="flex flex-col items-end gap-1 mt-4">
            <div className="flex justify-between w-full sm:w-1/2 text-[13px] text-on-surface-variant">
              <span>Subtotal</span>
              <span className="font-mono">{currency} {fmt(subtotal)}</span>
            </div>
            <div className="w-full sm:w-1/2">
              <span className="inline-block rounded bg-primary/15 text-primary font-mono text-[10px] uppercase tracking-widest px-2 py-1 my-1">
                {taxNote}
              </span>
            </div>
            <div className="flex justify-between w-full sm:w-1/2 text-[18px] text-on-surface font-display font-semibold border-t border-outline-variant pt-2">
              <span>Total</span>
              <span className="font-mono text-primary">{currency} {fmt(total)}</span>
            </div>
          </div>

          {/* Payment block (only while awaiting payment) */}
          {!isPaid && !isCancelled && address && (
            <div className="mt-7 rounded-lg border border-primary/40 bg-surface-container-high p-5">
              <p className="font-mono text-[11px] uppercase tracking-widest text-primary mb-3">[ Pagar con USDC ]</p>
              <div className="rounded bg-primary/10 text-on-surface text-[12px] px-3 py-2 mb-4">
                ⚠ Send only <strong>USDC on the {network} network</strong>. Other networks or tokens may be lost.
              </div>
              <div className="space-y-3">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-on-surface-placeholder mb-1">
                    Wallet address ({network})
                  </p>
                  <div className="flex items-center justify-between gap-3">
                    <code className="text-[12px] text-on-surface break-all">{address}</code>
                    <CopyButton value={address} />
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-widest text-on-surface-placeholder mb-1">Monto</p>
                    <span className="font-mono text-[15px] text-primary">{fmt(total)} USDC</span>
                  </div>
                  <CopyButton value={String(total)} label="Copiar monto" />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-widest text-on-surface-placeholder mb-1">Referencia</p>
                    <span className="font-mono text-[13px] text-on-surface">{reference}</span>
                  </div>
                  <CopyButton value={reference} label="Copiar ref" />
                </div>
              </div>
              <p className="mt-4 font-mono text-[11px] text-on-surface-placeholder">
                1 Enviás USDC → 2 La red {network} confirma → 3 Marcamos pagado
              </p>
            </div>
          )}

          {isPaid && (
            <div className="mt-7 rounded-lg border border-primary/50 bg-primary/10 p-5 text-center">
              <p className="font-display font-semibold text-[16px] text-primary">✓ Pago recibido</p>
              <p className="text-[13px] text-on-surface-variant mt-1">Esta factura ya fue abonada. No es necesario pagar de nuevo.</p>
            </div>
          )}

          {(data.terms_notes as string | null) && (
            <p className="mt-6 text-[12px] text-on-surface-placeholder italic">{data.terms_notes as string}</p>
          )}
        </article>

        {/* Trust footer */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 font-mono text-[10px] uppercase tracking-widest text-on-surface-placeholder">
          <span>Non-custodial · Safe multisig</span>
          <span>Circle USDC</span>
          <span>Buenos Aires · LATAM</span>
        </div>
        <p className="mt-3 text-center text-[11px] text-on-surface-placeholder">
          <Link href="/" className="hover:text-on-surface">Crypto Invoicing</Link>
        </p>
      </div>
    </main>
  );
}
