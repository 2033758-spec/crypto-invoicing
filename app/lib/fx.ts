// Live FX rate fetch from CriptoYa (USDC→ARS). Used by the Hero cards so the
// landing always shows a fresh "1 USDC = X ARS" number. Server-side fetch
// with 60-second revalidation — keeps Vercel edge cache hot and avoids
// hammering CriptoYa.
//
// CriptoYa returns a map of exchanges; we prefer Lemon Cash (the wedge ICP
// already uses Lemon, so the comparison is honest) and fall back to a
// reasonable AR-blue-ish hardcoded rate if the request fails.

export interface FxRate {
  /** Ask price (what the freelancer would receive per 1 USDC), ARS. */
  rate: number;
  /** Human-readable source label for the UI. */
  source: string;
}

const FALLBACK: FxRate = {
  rate: 1050,
  source: "Snapshot · CriptoYa Mar 2026",
};

const FALLBACK_BRL: FxRate = {
  rate: 5.41,
  source: "Snapshot · CriptoYa Mar 2026",
};

/**
 * Fetch USDC→ARS ask rate from CriptoYa. Cached 60s by the Next.js fetch
 * cache. Returns `FALLBACK` on any error so the UI never breaks.
 */
export async function fetchUsdcArsRate(): Promise<FxRate> {
  try {
    const res = await fetch(
      "https://criptoya.com/api/usdc/ars/1",
      // Revalidate on a 60s cadence — pricing is cheap so we err on the
      // freshness side. `cache: "force-cache"` would lock the value too long.
      { next: { revalidate: 60 } },
    );
    if (!res.ok) return FALLBACK;

    const data = (await res.json()) as Record<string, unknown>;

    // Try a list of exchanges in priority order. CriptoYa schema:
    // { [exchange]: { ask: number, totalAsk: number, bid: number, time: number } }
    const priority = ["lemoncash", "letsbit", "belo", "ripio", "buenbit", "satoshitango"];
    for (const exchange of priority) {
      const entry = data[exchange] as Record<string, unknown> | undefined;
      if (entry && typeof entry === "object") {
        const ask =
          (entry["totalAsk"] as number | undefined) ??
          (entry["ask"] as number | undefined);
        if (typeof ask === "number" && ask > 100 && ask < 100_000) {
          const labelExchange =
            exchange === "lemoncash"
              ? "Lemon"
              : exchange.charAt(0).toUpperCase() + exchange.slice(1);
          return { rate: ask, source: `CriptoYa · ${labelExchange}` };
        }
      }
    }

    return FALLBACK;
  } catch {
    // Network/parse error — degrade silently.
    return FALLBACK;
  }
}

/**
 * Fetch USDC→BRL ask rate from CriptoYa. Mirrors `fetchUsdcArsRate` — same
 * 60s revalidation cadence, same fallback discipline (UI never breaks).
 *
 * CriptoYa BR coverage is thinner than AR, so the exchange-priority list is
 * shorter. Most freelancers landing on the BR card just need a credible
 * number; the spread between Binance / Mercado Bitcoin / Foxbit is < 0.5%.
 */
export async function fetchUsdcBrlRate(): Promise<FxRate> {
  try {
    const res = await fetch(
      "https://criptoya.com/api/usdc/brl/1",
      { next: { revalidate: 60 } },
    );
    if (!res.ok) return FALLBACK_BRL;

    const data = (await res.json()) as Record<string, unknown>;

    const priority = [
      "binance",
      "mercadobitcoin",
      "foxbit",
      "novadax",
      "bitso",
      "ripio",
    ];
    for (const exchange of priority) {
      const entry = data[exchange] as Record<string, unknown> | undefined;
      if (entry && typeof entry === "object") {
        const ask =
          (entry["totalAsk"] as number | undefined) ??
          (entry["ask"] as number | undefined);
        if (typeof ask === "number" && ask > 1 && ask < 100) {
          const labelExchange =
            exchange === "mercadobitcoin"
              ? "Mercado Bitcoin"
              : exchange.charAt(0).toUpperCase() + exchange.slice(1);
          return { rate: ask, source: `CriptoYa · ${labelExchange}` };
        }
      }
    }

    return FALLBACK_BRL;
  } catch {
    return FALLBACK_BRL;
  }
}
