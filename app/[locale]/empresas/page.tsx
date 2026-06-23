import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { unstable_setRequestLocale } from "next-intl/server";
import { isSupportedLocale } from "../../../i18n";
import Seams from "../_components/landing-v3/Seams";
import Header from "../_components/landing-v3/Header";
import Footer from "../_components/landing-v3/Footer";
import CompanyLeadForm from "./CompanyLeadForm";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://cryptoinvoicing.co";

export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  if (!isSupportedLocale(params.locale)) return {};
  const prefix = params.locale === "es-AR" ? "" : `/${params.locale}`;
  const title = "Pagá a tus contractors del exterior en cripto · Crypto Invoicing";
  const description =
    "Empresas de LATAM: pagá a contractors y equipos remotos en USDC, con facturación masiva y conversión a moneda local sin spread oculto. Dejá tu consulta.";
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: `${SITE}${prefix}/empresas` },
    openGraph: { title, description, url: `${SITE}${prefix}/empresas`, type: "website" },
    robots: { index: true, follow: true },
  };
}

const VALUE = [
  ["Facturación masiva", "Cargá hasta decenas de pagos por CSV/planilla y enviá los links de cobro de una vez. Sin armar cada factura a mano."],
  ["Costo transparente", "Comisión fija y tipo de cambio a la vista. Sin spread escondido en la conversión a moneda local."],
  ["En blanco", "Cada pago con su comprobante, listo para tu contabilidad y la de tus contractors (factura E en Argentina)."],
  ["Rápido", "USDC sobre red de bajo costo → moneda local en la cuenta del contractor en horas, no días."],
];

export default function EmpresasPage({ params }: { params: { locale: string } }) {
  if (!isSupportedLocale(params.locale)) notFound();
  unstable_setRequestLocale(params.locale);

  return (
    <>
      <Seams />
      <Header locale={params.locale} />
      <main className="relative isolate">
        <div className="shell py-16 lg:py-24">
          <div className="max-w-3xl">
            <p className="font-mono text-[12px] uppercase tracking-widest text-primary mb-4">[ Para empresas ]</p>
            <h1 className="font-display font-bold text-[clamp(32px,6vw,56px)] tracking-[-0.03em] text-on-surface leading-[1.05] mb-5">
              Pagá a tus contractors del exterior <span className="text-primary">en cripto</span>.
            </h1>
            <p className="text-on-surface-variant text-[18px] leading-relaxed max-w-2xl">
              Rápido, sin spread oculto y en blanco. Para empresas de LATAM que trabajan con freelancers
              y equipos remotos — facturación masiva y conversión a moneda local en un solo lugar.
            </p>
          </div>

          <div className="grid lg:grid-cols-[1.3fr_1fr] gap-12 mt-14 items-start">
            {/* Value props */}
            <div className="grid sm:grid-cols-2 gap-6">
              {VALUE.map(([title, desc]) => (
                <div key={title} className="rounded-lg border border-outline-variant bg-surface-container-low p-5">
                  <p className="font-display font-semibold text-[16px] text-on-surface mb-2">{title}</p>
                  <p className="text-on-surface-variant text-[14px] leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>

            {/* Lead form */}
            <div className="rounded-xl border border-primary/30 bg-surface-container-low p-6 sm:p-7">
              <p className="font-display font-semibold text-[18px] text-on-surface mb-1">Dejá tu consulta</p>
              <p className="text-on-surface-variant text-[13px] mb-5">Te contactamos para ver tu caso. Estamos sumando empresas piloto.</p>
              <CompanyLeadForm />
            </div>
          </div>

          <p className="mt-12 font-mono text-[11px] uppercase tracking-widest text-on-surface-placeholder">
            Non-custodial · Circle USDC · Buenos Aires · LATAM
          </p>
        </div>
      </main>
      <Footer locale={params.locale} />
    </>
  );
}
