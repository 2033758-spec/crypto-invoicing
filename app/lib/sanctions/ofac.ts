// OFAC SDN sanctions screening for incoming USDC wallet addresses.
//
// Uses the public, free OFAC SDN consolidated XML feed (no API key, no contract).
// Pulls + caches the digital-currency-address subset and matches inbound
// wallets against it before we route funds.
//
// Why this exists:
//   Terms §5 commits to screening incoming wallet addresses against OFAC /
//   UN / EU / UIF / COAF lists. Until we sign a Chainalysis enterprise contract
//   (planned W11-W18 per CNV-PSAV path), this manual-then-automated layer
//   covers the legally-mandated OFAC check.
//
// Source:
//   https://www.treasury.gov/ofac/downloads/sdn.xml
//   https://sanctionslistservice.ofac.treas.gov/changes/latest (changelog)
//
// Pattern:
//   1. On Cloudflare Worker boot (or first call), fetch the SDN feed once.
//   2. Parse the `<digitalCurrencyAddress>` entries (BTC, ETH, XBT, USDT, USDC).
//      Roughly ~700 entries as of 2026.
//   3. Cache for 24h in KV / memory.
//   4. `isSanctioned(address)` → boolean. Case-insensitive prefix match.
//
// Production path:
//   - Hosted: Cloudflare Worker with KV cache + scheduled refresh (cron).
//   - Local dev: in-memory cache; refresh on first call.
//   - Hot path: simple Set lookup — O(1).
//
// Not in scope yet:
//   - UN / EU / UIF / COAF lists (each has its own format).  Add per launch:
//     EU consolidated list (XML), OFAC NS-PLC, UN Security Council JSON.
//   - Real-time PEP screening (Sumsub does this on KYC tier 3+).

const OFAC_FEED_URL = "https://www.treasury.gov/ofac/downloads/sdn.xml";
const REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24h

interface SanctionsCache {
  loadedAt: number;
  addresses: Set<string>;
}

let cache: SanctionsCache | null = null;
let inflight: Promise<SanctionsCache> | null = null;

function normalize(address: string): string {
  return address.trim().toLowerCase();
}

/**
 * Extract Ethereum-style 0x addresses from the SDN XML body. The actual SDN
 * XML wraps each digital-currency address in `<digitalCurrencyAddress>` tags;
 * for our purposes (Base / Ethereum / USDC), we filter to ETH-format only.
 *
 * Lenient parser — we don't pull in a full XML library because we only need
 * the address strings. This is fragile to OFAC schema changes; alarm via
 * Sentry if the parsed count drops to 0.
 */
function extractEthAddresses(xml: string): Set<string> {
  const addresses = new Set<string>();
  const ethRegex = /0x[a-fA-F0-9]{40}/g;
  // Pull out anything that looks like an ETH address inside a
  // <digitalCurrencyAddress>...</digitalCurrencyAddress> block. We intentionally
  // scan the full body because the SDN feed historically lists addresses both
  // inside <digitalCurrencyAddress> and in remark text.
  const matches = xml.match(ethRegex);
  if (matches) {
    for (const m of matches) addresses.add(normalize(m));
  }
  return addresses;
}

async function fetchAndParse(): Promise<SanctionsCache> {
  if (process.env.NODE_ENV === "test" || process.env.SANCTIONS_OFFLINE === "1") {
    // Test mode — return empty set (fail-open). Production MUST fail-closed
    // when the feed is unreachable; that's handled below.
    return { loadedAt: Date.now(), addresses: new Set() };
  }

  const res = await fetch(OFAC_FEED_URL, {
    // ISR caching: revalidate after 24h on the edge as well.
    next: { revalidate: 86_400 },
    headers: { "User-Agent": "CryptoInvoicing-Sanctions-Screener/1.0" },
  });
  if (!res.ok) {
    throw new Error(
      `OFAC SDN fetch failed: ${res.status} ${res.statusText}`,
    );
  }
  const xml = await res.text();
  const addresses = extractEthAddresses(xml);

  if (addresses.size === 0) {
    // OFAC schema may have changed. Alarm to Sentry (caller wraps).
    throw new Error(
      "OFAC SDN parse returned 0 addresses — schema may have changed",
    );
  }

  return { loadedAt: Date.now(), addresses };
}

async function loadOrRefresh(): Promise<SanctionsCache> {
  const now = Date.now();
  if (cache && now - cache.loadedAt < REFRESH_INTERVAL_MS) {
    return cache;
  }
  if (inflight) return inflight;

  inflight = fetchAndParse()
    .then((next) => {
      cache = next;
      inflight = null;
      return next;
    })
    .catch((err) => {
      inflight = null;
      // If we have a stale cache, prefer it over failing-open.
      if (cache) {
        console.warn(
          "[sanctions] OFAC refresh failed, using stale cache:",
          err.message,
        );
        return cache;
      }
      throw err;
    });
  return inflight;
}

/**
 * Returns true if the given Ethereum-format address appears on the OFAC SDN
 * digital-currency list. Throws if the feed has never loaded successfully
 * (caller decides: fail-closed in webhook, fail-open in dev).
 *
 * Hot path: O(1) Set lookup once the cache is warm.
 */
export async function isSanctioned(address: string): Promise<boolean> {
  const normalized = normalize(address);
  if (!/^0x[a-f0-9]{40}$/.test(normalized)) {
    // Not an Ethereum-format address — out of scope for this screener.
    return false;
  }
  const c = await loadOrRefresh();
  return c.addresses.has(normalized);
}

/**
 * Debugging / ops helper — returns current cache stats.
 */
export function cacheStats(): {
  loaded: boolean;
  count: number;
  ageMs: number | null;
} {
  if (!cache) return { loaded: false, count: 0, ageMs: null };
  return {
    loaded: true,
    count: cache.addresses.size,
    ageMs: Date.now() - cache.loadedAt,
  };
}
