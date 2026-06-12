// Privacy Policy — bundled as a module string (see terms_of_service.ts for why).
// Source of truth: /06_legal/draft/privacy_policy_v1_en.md — keep in sync until
// the W11 lawyer redline. English-only until then (founder decision 2026-05-27).

const privacy = `# Privacy Policy

**Effective:** 2026-05-26
**Applicable frameworks:** Argentine Ley 25.326 (Protección de Datos Personales); GDPR-aware where US/EU clients open payment links; LGPD coverage Q3+ for Brazil beta

---

## 1. Who we are

Crypto Invoicing ("we", "us", "our") operates the website at cryptoinvoicing.co and the underlying invoice-processing service. We are based in Buenos Aires, Argentina.

Data controller of record: Crypto Invoicing (legal entity name pending — to be confirmed after AR-lawyer review, target Week 11, Q1 2026).

## 2. What data we collect

### From freelancer-Users

- **Account identifiers:** email address (and Google profile basics if signed in with Google: email, given name, locale, profile picture URL).
- **Tax identifiers:** CUIT (Argentina) or CPF/CNPJ (Brazil).
- **Banking identifier:** CBU (Argentina) or Pix key (Brazil) for fiat settlement.
- **KYC documents:** identity document image + selfie liveness, processed via Sumsub. Source documents are retained by Sumsub under their compliance policies; we store only the verification result + Sumsub applicantId.
- **Transaction data:** invoice details (client name, amount, description), USDC transaction hashes, conversion rates, fiat settlement timestamps.
- **Communication:** Telegram chat handle (optional), support email correspondence.

### From client-Payers (US/EU clients opening payment links)

- **Wallet address** (necessary to issue refund if requested).
- **Email** (optional — only if Payer enters one to receive receipt confirmation).
- **IP address** (logged for fraud / sanctions purposes, retained 30 days).

### Automatic data

- IP address, user-agent, timezone, locale preference.
- Cookies and similar tracking (see Cookies notice).
- Analytics events via PostHog (anonymized, opt-out available via Settings).
- Product analytics and session replay via Yandex Metrika (Webvisor). Loaded only after you accept analytics cookies; sensitive form fields (email, tax ID, bank details) are masked and never recorded.
- Error reports via Sentry (stack traces; PII is filtered out automatically).

## 3. Why we collect it (lawful bases)

| Purpose | Lawful basis |
|---|---|
| Provide the Service (invoice generation, USDC routing, fiat settlement) | Performance of contract |
| Comply with AML/CFT obligations (KYC, sanctions screening, AFIP/Receita reporting) | Legal obligation |
| Protect against fraud, abuse, sanctions violations | Legitimate interest |
| Improve the Service (analytics, error tracking, A/B testing) | Legitimate interest, opt-out available |
| Marketing communications | Consent, opt-out at any time |

## 4. Who we share data with

We share the **minimum data necessary** with the following processors and third parties:

- **Supabase** — database, authentication, file storage (data hosted in EU region)
- **Vercel** — frontend hosting, edge runtime (data processed in user's nearest region)
- **Cloudflare Workers** — webhook handling, off-ramp orchestration
- **Alchemy** — blockchain RPC and webhook events for Base mainnet
- **Sumsub** — KYC identity verification
- **Resend** — transactional email delivery
- **Binance / Bybit** — off-ramp conversion partners (we share invoice ID + amount; never your KYC documents)
- **Chainalysis** — incoming wallet sanctions screening
- **Sentry** — error reporting (PII automatically filtered)
- **PostHog** — product analytics (anonymized event data)
- **Yandex Metrika** — product analytics and session replay (consent-gated; sensitive fields masked). Data may be processed on Yandex infrastructure outside Argentina, including Russia.
- **Telegram** — notification bot (only if you opt in)

We do not sell User data. We do not share data with advertising networks.

We disclose data to law enforcement only when legally compelled (court order, valid administrative subpoena, sanctions enforcement) or to prevent imminent harm.

## 5. International transfers

Because our processors operate globally (Supabase EU, Vercel multi-region, Sumsub EU, etc.), your data may be transferred outside Argentina. We rely on standard contractual clauses or equivalent safeguards where required.

## 6. Retention

- **Active account data:** retained for the duration of the account plus 5 years (AML record-keeping minimum).
- **Transaction history:** retained 10 years (Argentine tax retention requirement).
- **KYC documents:** retained by Sumsub per their policies (typically 5 years post-account-closure).
- **Marketing-list email (if opted in):** until you opt out.
- **Anonymized analytics:** indefinite.

## 7. Your rights

You have the right to:

- **Access** the personal data we hold about you (email hola@cryptoinvoicing.co)
- **Correct** inaccurate data (most fields editable in Settings; for KYC corrections contact support)
- **Delete** your account and personal data, subject to legal retention (we delete what we can; we retain what AML/tax law requires us to retain, anonymized where possible)
- **Object** to processing based on legitimate interest
- **Withdraw consent** at any time for opt-in marketing
- **Lodge a complaint** with the Argentine data protection authority (AAIP — Agencia de Acceso a la Información Pública) or your local equivalent

We respond to data subject requests within 30 days.

## 8. Security

- All data in transit is encrypted with TLS 1.2+
- Database encryption at rest (AES-256)
- Two-factor authentication available for User accounts (via TOTP)
- Production secrets stored in environment variables, never in source code or logs
- Annual penetration testing (planned Q3 2026)
- Incident response: we will notify affected Users within 72 hours of confirming a personal data breach affecting them

## 9. Children

The Service is not directed at users under 18. We do not knowingly collect data from minors. If you believe we have inadvertently collected data from a minor, contact hola@cryptoinvoicing.co.

## 10. Changes to this Policy

Material changes will be announced via email and in-app banner at least 14 days before they take effect.

## 11. Contact

- General privacy inquiries: hola@cryptoinvoicing.co
- Subject: "Privacy request — [Access | Correction | Deletion | Other]"
`;

export default privacy;
