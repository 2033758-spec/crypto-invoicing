# Sanctions screening — OFAC SDN + planned upgrades

**Why:** Terms §5 commits to screening incoming USDC wallet addresses against OFAC, UN, EU, UIF, COAF sanctions lists. Until Chainalysis enterprise contract (planned W11–W18 along CNV-PSAV path), we cover the OFAC leg automatically via the free public SDN feed.

**Status:** OFAC live; UN / EU / UIF / COAF planned.

---

## What's live (Q1 W4-W7)

**File:** `code/calculadora/app/lib/sanctions/ofac.ts`

- Pulls the OFAC SDN consolidated XML feed (free, no API key).
- Parses Ethereum-format `0x…` addresses (covers Base mainnet USDC).
- Caches 24h in memory; revalidates on miss.
- `isSanctioned(address)` returns boolean — O(1) Set lookup.
- Used inside `/api/auth-hook` and the future on-chain webhook handler.

## What's NOT live (need separate work)

| List | Source | Status | Notes |
|---|---|---|---|
| OFAC SDN | https://www.treasury.gov/ofac/downloads/sdn.xml | ✅ live | Free, public, refreshed daily by Treasury |
| UN Security Council | https://scsanctions.un.org/resources/xml/en/consolidated.xml | ⏸ planned | Free, schema differs from OFAC |
| EU consolidated list | https://webgate.ec.europa.eu/fsd/fsf | ⏸ planned | Free, requires registered access |
| AR UIF | http://www.uif.gob.ar/uif/ | ⏸ planned | PDF — manual ingestion until automated |
| BR COAF | https://www.gov.br/coaf/pt-br | ⏸ planned | PDF — manual ingestion until automated |
| Chainalysis | https://chainalysis.com/api | ⏸ deferred Q2-Q3 | Enterprise contract, $$$$, ~$15k+/yr |

## How to use

```typescript
import { isSanctioned } from "@/app/lib/sanctions/ofac";

// In the on-chain payment-received webhook:
const payerAddress = txEvent.from;
if (await isSanctioned(payerAddress)) {
  // Don't auto-settle. Surface to founder in Telegram with the tx hash.
  // Manual review: refund to source if safe, or report to UIF if required.
  await flagForManualReview({ address: payerAddress, txHash: txEvent.hash });
  return;
}
```

Outside webhook, the same function powers a `/api/admin/screen-wallet` endpoint (TODO) for founder to spot-check addresses manually.

## Reversal triggers

- If OFAC SDN schema changes and our regex parser returns 0 addresses, `ofac.ts` throws — caller wraps in Sentry. Founder sees alert within minutes.
- If we exceed 50 sanctioned-match hits per week (unlikely but possible if pre-existing crypto thieves try to launder), escalate to Chainalysis contract — they have better attribution + de-anonymisation.
- If a clean address is flagged false-positive (collision with a sanctioned wallet via prefix), our `cacheStats()` shows count; we can manually allow-list per founder review.

## Cost (Q1)

- **$0** through W11 (OFAC only, free).
- **$200–500** if we need the EU consolidated list pulled via paid tool like Refinitiv World-Check (only if first AR-lawyer-redline says we need it explicitly).
- **$15k+/yr** if/when Chainalysis enterprise is signed (Q3+ along CNV-PSAV approval).

## What founder doesn't need to do

This integration is fully automated — no dashboard setup, no API keys, no recurring action. The OFAC list refresh happens on the first paid-traffic request after 24h elapse.

The only founder-side decision: when to upgrade to Chainalysis. That's a Q3 cost gate.
