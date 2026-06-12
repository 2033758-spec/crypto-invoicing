// Terms of Service — bundled as a module string so it ships with the Vercel
// deploy. (Previously read via fs from the parent repo's /06_legal/draft, which
// is NOT included in the app's deployment → "Document missing" placeholder in
// prod, an E-E-A-T hit on a YMYL fintech domain. Source of truth for the legal
// text remains /06_legal/draft/terms_of_service_v1_en.md — keep in sync until
// the W11 lawyer redline replaces both.)
//
// English-only until the AR-lawyer redline (founder decision 2026-05-27).

const terms = `# Terms of Service

**Effective:** 2026-05-26
**Governing law:** Republic of Argentina (CABA)

---

## 1. Acceptance

By creating an account at cryptoinvoicing.co (the "Service") or using any feature of the Service, you ("User") agree to be bound by these Terms of Service. If you do not agree, do not use the Service.

## 2. The Service

Crypto Invoicing is a software tool that enables freelancers and small agencies in Latin America to:

- Generate invoices for international clients
- Receive payments in USDC stablecoin (Base mainnet)
- Convert USDC to local fiat currency (ARS, BRL) via licensed third-party off-ramp partners
- Generate tax-compliant invoice documents (factura E for Argentina; generic transaction reports for Brazil during beta)

**Crypto Invoicing is NOT:**

- A bank, financial institution, or payment processor
- A registered Virtual Asset Service Provider (PSAV/VASP) under CNV Resolución 1085/2024 *as of 2026-05-26* (registration pending — see §10 Compliance)
- A tax advisor, accountant, or legal counsel
- An investment platform or wealth manager
- A custodian of User funds (see §6 Non-custodial design)

## 3. Eligibility

You may use the Service if you:

- Are at least 18 years of age (or the legal age of majority in your jurisdiction)
- Are a tax resident of Argentina, Brazil, or another jurisdiction explicitly enabled by Crypto Invoicing
- Are not listed on any sanctions list (OFAC, UN, EU, UIF Argentina, COAF Brazil)
- Conduct lawful economic activity in your jurisdiction
- Provide accurate identification information when requested under KYC

We reserve the right to refuse service or terminate accounts at our sole discretion.

## 4. Fees

- **Starter plan:** 1% commission per processed transaction, capped at USD 50 per invoice. No subscription, no minimums. **Live today.**
- **Pro plan:** USD 9 per month, billed monthly. Includes all Starter features plus auto-generated factura E, monthly + annual AFIP reports, CSV export for accountants, multi-client management (up to 25), priority Telegram support. **Pro features are rolling out between Weeks 7 and 12 of Q1 2026.** Until then, Pro subscribers receive the equivalent benefits via concierge service (manual generation by the founder).
- **Pro money-back guarantee:** if you are not satisfied during your first 30 days on Pro, contact support and we refund the full first month's plan fee — no questions asked.
- Fees are charged in USDC and deducted from the gross invoice amount.
- Off-ramp conversion rates are sourced from licensed P2P partners (Binance, Bybit) and shown to the User before each settlement. We do not add hidden spreads beyond the visible 1% / $9 fee.

## 5. KYC and AML

KYC is tiered by lifetime USDC volume processed through your account. Tiers escalate automatically — you do not request them.

- **Tier 1 — below USD 500 lifetime:** email or Google account at signup. No additional identity verification required.
- **Tier 2 — between USD 500 and USD 1,000 lifetime:** lightweight verification — a photo of a government-issued ID and confirmation of your tax ID (CUIT for AR; CPF/CNPJ for BR).
- **Tier 3 — between USD 1,000 and USD 10,000 lifetime:** full identity verification via Sumsub (ID document + selfie liveness, approximately 5 minutes). **Sumsub integration is rolling out between Weeks 7 and 12 of Q1 2026; until then, verification is performed manually by the founder via Telegram and a secure document exchange.**
- **Tier 4 — above USD 10,000 lifetime processed:** enhanced due diligence (proof of address, source-of-funds questionnaire).

We screen incoming USDC wallet addresses against industry sanctions data and reserve the right to freeze or return funds linked to sanctioned or known criminal addresses. **Automated screening via Chainalysis is rolling out between Weeks 7 and 12 of Q1 2026; until then, screening is performed manually using publicly available sanctions lists (OFAC, UN, EU, UIF, COAF) by the founder for any incoming transaction above USD 1,000.**

## 6. Non-custodial design

Crypto Invoicing operates under a **non-custodial pass-through architecture**. We never hold User funds as our own; every incoming USDC is routed through a transit wallet on a fixed, auditable timeline:

- Incoming USDC is received by a multi-signature smart-contract wallet (Safe on Base mainnet) for which Crypto Invoicing is the technical signer of record. The wallet exists solely to relay funds to their off-ramp destination.
- **We do not commingle User funds with our operating capital.** Operating reserves are held in a separate, segregated account.
- **Steady-state balance in the Safe is capped at USD 5,000 maximum.** Any balance above the cap is swept automatically within 24 hours of receipt.
- Off-ramp conversion is executed via licensed third-party exchanges (Binance Argentina, Bybit) using their compliance infrastructure, not ours.
- Final fiat settlement is delivered to the User's bank CBU (Argentina) or Pix key (Brazil) via standard banking rails.
- A complete on-chain audit trail of every transit is publicly verifiable on Base mainnet using the transaction hash provided to the User after each settlement.

## 7. User obligations

You agree to:

- Provide accurate and current tax identification (CUIT for Argentina; CPF/CNPJ for Brazil)
- Comply with all applicable tax obligations (régimen informativo RG 5642/2025 for AR; DeCripto where applicable for BR)
- Not use the Service for money laundering, terrorism financing, fraud, or any unlawful activity
- Not attempt to bypass KYC thresholds via account splitting
- Not transmit malware, conduct denial-of-service attacks, or probe the Service for vulnerabilities outside our published responsible-disclosure policy

## 8. Service availability

- The Service is provided "as is" and "as available."
- We aim for 99% monthly availability but do not guarantee uninterrupted access.
- Scheduled maintenance windows are announced via in-app banner and Telegram.
- Off-ramp settlement times are typically 2-4 business hours but may extend during banking holidays, exchange downtime, or blockchain congestion.

## 9. Limitation of liability

To the maximum extent permitted by law:

- Crypto Invoicing is not liable for losses arising from market volatility, USDC de-peg events, exchange downtime, blockchain reorganizations, or counterparty failure of third-party off-ramp partners.
- Our total aggregate liability to any User is capped at the lesser of (a) USD 1,000 or (b) the total fees paid by that User to Crypto Invoicing in the 12 months preceding the claim.
- We are not liable for any User's tax filings, errors in self-reported tax IDs, or interactions with AFIP / ARCA / Receita Federal.

## 10. Compliance

- Crypto Invoicing operates under Argentina law. We are pursuing CNV PSAV registration under Resolución 1085/2024.
- We do not provide tax advice. Consult your accountant before relying on any generated PDF or report.
- We comply with applicable AML / CFT regulations including reporting obligations to UIF Argentina where required.

## 11. Termination

- You may close your account at any time via Settings.
- We may suspend or terminate accounts for breach of these Terms, sanctions-list matches, or regulatory order, with notice except where prohibited by law.
- Upon termination, pending settlements are completed and any residual balance is returned to your verified bank account within 10 business days.

## 12. Changes to these Terms

We will notify Users of material changes via email and in-app banner at least 14 days before the change takes effect. Continued use of the Service after the effective date constitutes acceptance.

## 13. Governing law and dispute resolution

These Terms are governed by the laws of the Republic of Argentina. Any dispute will first be addressed in good-faith negotiation between the parties. If unresolved, the dispute will be submitted to binding arbitration in the City of Buenos Aires under the rules of the Centro Empresarial de Mediación y Arbitraje (CEMA), in Spanish, with the exception of small-claims matters which may be brought in the competent courts of CABA.

## 14. Contact

- Email: hola@cryptoinvoicing.co
`;

export default terms;
