// Blog/resources content (SEO TZ Block B). Stored as typed data — NOT MDX — so
// articles render fully static (SSG), stay type-checked, need zero new build
// deps, and slot cleanly into next-intl locale routing. /mar expands this set
// (B4 es-AR, B5 pt-BR) following the B1 keyword cluster; the shape below is the
// contract content must satisfy.

import esExtraRaw from "./es-extra.json";
import ptRaw from "./pt.json";

export type Block =
  | { type: "p"; text: string }
  | { type: "h2"; id: string; text: string }
  | { type: "ul"; items: string[] }
  | { type: "callout"; text: string };

export interface Article {
  slug: string;
  /** Hub (pillar) or spoke — drives internal-link emphasis. */
  kind: "pillar" | "spoke";
  title: string;
  /** <=160 chars — meta description + listing teaser. */
  description: string;
  /** ISO date. */
  datePublished: string;
  dateModified: string;
  author: string;
  /** Estimated reading time in minutes. */
  readingMinutes: number;
  /** Slugs of related articles for internal linking. */
  related: string[];
  /** Authoritative sources shown in an E-E-A-T "Fuentes" block. */
  sources: { label: string; url: string }[];
  blocks: Block[];
}

// One disclaimer per locale — appended to every article (B4: "not tax advice").
export const DISCLAIMER: Record<string, string> = {
  "es-AR":
    "Esta nota es informativa y no constituye asesoramiento impositivo ni legal. Las normas de AFIP/ARCA cambian: verificá tu situación con tu contador antes de tomar decisiones.",
  "pt-BR":
    "Este conteúdo é informativo e não constitui aconselhamento fiscal ou jurídico. As regras da Receita Federal mudam: confirme sua situação com seu contador antes de decidir.",
  "en-US":
    "This article is informational and is not tax or legal advice. AFIP/ARCA rules change — confirm your situation with your accountant before acting.",
};

// Labels for article chrome, per locale.
export const RESOURCES_UI: Record<
  string,
  {
    indexTitle: string;
    indexDescription: string;
    indexLead: string;
    breadcrumbHome: string;
    breadcrumbResources: string;
    toc: string;
    sources: string;
    related: string;
    updated: string;
    readTime: string;
    by: string;
  }
> = {
  "es-AR": {
    indexTitle: "Recursos — cobrar del exterior en blanco",
    indexDescription:
      "Guías prácticas para freelancers argentinos: cómo cobrar del exterior, factura E, USDC a pesos y comparativas de costos.",
    indexLead:
      "Guías claras, sin humo, para cobrar del exterior y mantenerlo en blanco. Escritas desde Buenos Aires.",
    breadcrumbHome: "Inicio",
    breadcrumbResources: "Recursos",
    toc: "En esta nota",
    sources: "Fuentes",
    related: "Seguí leyendo",
    updated: "Actualizado",
    readTime: "min de lectura",
    by: "Por",
  },
  "pt-BR": {
    indexTitle: "Recursos — receber do exterior de forma legal",
    indexDescription:
      "Guias práticos para freelancers brasileiros: como receber do exterior, USDC para reais e comparativos de custo.",
    indexLead:
      "Guias claros, sem enrolação, para receber do exterior. Escritos de Buenos Aires.",
    breadcrumbHome: "Início",
    breadcrumbResources: "Recursos",
    toc: "Neste artigo",
    sources: "Fontes",
    related: "Continue lendo",
    updated: "Atualizado",
    readTime: "min de leitura",
    by: "Por",
  },
  "en-US": {
    indexTitle: "Resources — getting paid from abroad, legally",
    indexDescription:
      "Practical guides for LATAM freelancers: how to get paid from abroad, Factura E, USDC to local currency, and cost comparisons.",
    indexLead:
      "Clear, no-hype guides on getting paid from abroad and keeping it on the books. Written from Buenos Aires.",
    breadcrumbHome: "Home",
    breadcrumbResources: "Resources",
    toc: "In this article",
    sources: "Sources",
    related: "Keep reading",
    updated: "Updated",
    readTime: "min read",
    by: "By",
  },
};

const AUTHOR_AR = "Equipo Crypto Invoicing";

// ── es-AR seed cluster (pillar + spoke). /mar (B4) extends to ≥6. ───────────
const ES_AR: Article[] = [
  {
    slug: "como-cobrar-del-exterior-en-argentina",
    kind: "pillar",
    title: "Cómo cobrar del exterior en Argentina (sin perder 4% en el camino)",
    description:
      "Guía 2026 para freelancers: las formas reales de cobrar a clientes del exterior, qué te cuesta cada una y cómo mantenerlo en blanco con factura E.",
    datePublished: "2026-06-08",
    dateModified: "2026-06-08",
    author: AUTHOR_AR,
    readingMinutes: 7,
    related: [
      "factura-e-servicios-al-exterior",
      "usdc-a-pesos-cbu",
      "lemon-payoneer-wise-comparativa",
      "monotributo-exportacion-de-servicios",
    ],
    sources: [
      {
        label: "ARCA/AFIP — Factura electrónica de exportación (E)",
        url: "https://www.afip.gob.ar/facturadecreditoelectronica/",
      },
      {
        label: "CriptoYa — cotizaciones USDC/ARS",
        url: "https://criptoya.com/",
      },
    ],
    blocks: [
      {
        type: "p",
        text: "Si trabajás para clientes de Estados Unidos o Europa, ya lo viviste: el cliente paga en dólares, pero para cuando la plata llega a tu cuenta son bastantes menos pesos de los que mirabas en la planilla. Entre el spread cambiario, las comisiones y el trámite de la factura E, se te va una tajada todos los meses. Esta guía repasa las formas reales de cobrar del exterior en 2026, qué te cuesta cada una y cómo mantenerlo en blanco.",
      },
      {
        type: "h2",
        id: "opciones",
        text: "Las cuatro formas de cobrar (y qué te cuesta cada una)",
      },
      {
        type: "p",
        text: "No hay una opción perfecta para todos. Depende de cuánto cobrás, con qué frecuencia y de qué tan exigente sea tu cliente con los medios de pago. Estas son las cuatro rutas más usadas por freelancers argentinos:",
      },
      {
        type: "ul",
        items: [
          "Billeteras tipo Lemon / Belo: cómodas, pero el costo real se esconde en un tipo de cambio peor, no en una comisión visible.",
          "PayPal: aceptado en todos lados, pero suma una comisión alta al recibir más el spread cuando convertís a pesos.",
          "Payoneer / Wise: pensadas para servicios, con comisiones más claras; aun así pagás el spread bancario al pasar a pesos.",
          "USDC (stablecoin) a tu CBU: el cliente paga en dólares digitales y vos convertís al mejor tipo de cambio del mercado. Es lo que resuelve Crypto Invoicing.",
        ],
      },
      {
        type: "callout",
        text: "Regla práctica: la comisión que ves no es el costo total. Sumá siempre el spread (la diferencia entre el dólar que te liquidan y el dólar real). Ahí suele estar la mayor pérdida.",
      },
      {
        type: "h2",
        id: "en-blanco",
        text: "Cobrar en blanco: la factura E",
      },
      {
        type: "p",
        text: "Para exportación de servicios (un cliente del exterior que te paga por tu trabajo), el comprobante que corresponde es la factura electrónica clase E. La emitís desde AFIP/ARCA y va atada a tu condición fiscal: monotributo según tu categoría, o responsable inscripto con IVA. Mantenerlo en blanco no solo te evita problemas: te deja demostrar ingresos para alquilar, pedir crédito o simplemente dormir tranquilo.",
      },
      {
        type: "p",
        text: "El cuello de botella suele ser el trámite mensual: volcar los montos, calcular el cambio del día, armar el PDF y mandárselo al contador. Es una hora que se repite doce veces al año. La factura E y el reporte del régimen informativo se pueden generar automáticamente a partir de cada cobro, que es justamente lo que hacemos.",
      },
      {
        type: "h2",
        id: "que-elegir",
        text: "Entonces, ¿qué conviene?",
      },
      {
        type: "p",
        text: "Si cobrás montos chicos y esporádicos, una billetera puede alcanzar. Si cobrás todos los meses y te importa cuánto llega y que quede documentado, la ruta USDC→CBU con factura E automática es la que menos te hace perder. Antes de decidir, calculá tu caso puntual: cuánto cobrás por mes y con qué método. La diferencia anual suele sorprender.",
      },
    ],
  },
  {
    slug: "factura-e-servicios-al-exterior",
    kind: "spoke",
    title: "Factura E para servicios al exterior: qué es y cómo se emite",
    description:
      "Qué es la factura electrónica clase E, cuándo corresponde para exportación de servicios y cómo encaja con el monotributo y el régimen informativo.",
    datePublished: "2026-06-08",
    dateModified: "2026-06-08",
    author: AUTHOR_AR,
    readingMinutes: 6,
    related: ["como-cobrar-del-exterior-en-argentina"],
    sources: [
      {
        label: "ARCA/AFIP — Comprobantes clase E",
        url: "https://www.afip.gob.ar/facturadecreditoelectronica/",
      },
    ],
    blocks: [
      {
        type: "p",
        text: "Cuando un cliente del exterior te paga por un servicio, ese cobro es una exportación de servicios. El comprobante que corresponde no es la factura A, B o C que usás para clientes locales, sino la factura electrónica clase E. Acá va lo esencial, sin vueltas.",
      },
      {
        type: "h2",
        id: "que-es",
        text: "Qué es la factura E",
      },
      {
        type: "p",
        text: "Es el comprobante electrónico de AFIP/ARCA para operaciones con el exterior. Documenta que prestaste un servicio a un cliente que no está en Argentina, lo que tiene un tratamiento impositivo distinto al de una venta local. La emitís con tu CUIT desde los servicios de AFIP, atada a tu condición fiscal.",
      },
      {
        type: "h2",
        id: "monotributo",
        text: "Monotributo y responsable inscripto",
      },
      {
        type: "ul",
        items: [
          "Monotributo: emitís factura E según tu categoría. Tené presente los límites de facturación de tu categoría para no quedar desfasado.",
          "Responsable inscripto: la exportación de servicios tiene un tratamiento de IVA particular; tu contador te confirma cómo liquidarlo.",
        ],
      },
      {
        type: "callout",
        text: "Tip: guardá el comprobante de cada cobro junto con el tipo de cambio del día. El régimen informativo (RG 5642/2025) te lo va a pedir, y reconstruirlo después es un dolor de cabeza.",
      },
      {
        type: "h2",
        id: "automatizar",
        text: "Cómo evitar el trámite manual",
      },
      {
        type: "p",
        text: "La parte tediosa no es emitir una factura: es hacerlo todos los meses, con el cambio correcto, y dejar todo ordenado para el contador. Si cobrás en USDC y convertís a pesos, la factura E y el reporte del mes pueden salir armados de cada operación, sin volcar nada a mano.",
      },
    ],
  },
];

// es-extra.json (B4) + pt.json (B5) authored by /mar in the schema above.
// JSON widens literal types to string, so cast through unknown.
const ES_EXTRA = esExtraRaw as unknown as Article[];
const PT_BR = ptRaw as unknown as Article[];

const BY_LOCALE: Record<string, Article[]> = {
  "es-AR": [...ES_AR, ...ES_EXTRA],
  "pt-BR": PT_BR,
  "en-US": [],
};

export function getArticles(locale: string): Article[] {
  return BY_LOCALE[locale] ?? [];
}

export function getArticle(locale: string, slug: string): Article | undefined {
  return getArticles(locale).find((a) => a.slug === slug);
}

/** Every (locale, slug) pair that has content — for generateStaticParams + sitemap. */
export function allArticleParams(): { locale: string; slug: string }[] {
  return Object.entries(BY_LOCALE).flatMap(([locale, list]) =>
    list.map((a) => ({ locale, slug: a.slug })),
  );
}

/** Locales that currently have at least one article (for sitemap index rows). */
export function localesWithArticles(): string[] {
  return Object.entries(BY_LOCALE)
    .filter(([, list]) => list.length > 0)
    .map(([locale]) => locale);
}
