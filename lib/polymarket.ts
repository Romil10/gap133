// Polymarket feed: gamma-api public REST.
const PM_BASE = 'https://gamma-api.polymarket.com';

export interface PMMarket {
  id: string;
  question: string;
  outcomes: string | null;
  outcomePrices: string | null;
  clobTokenIds: string | null;
  volume24hr: number | null;
  volume: number | null;
  liquidity: number | null;
  endDate: string | null;
  slug: string | null;
}

export async function fetchPolymarketTop(limit = 150): Promise<PMMarket[]> {
  const raw: any[] = [];
  for (let off = 0; off < 1000; off += 500) {
    const res = await fetch(
      `${PM_BASE}/markets?closed=false&limit=500&offset=${off}`,
      { next: { revalidate: 120 }, signal: AbortSignal.timeout(20_000) }
    );
    if (!res.ok) break;
    const batch = await res.json();
    raw.push(...batch);
    if (batch.length < 500) break;
  }
  return raw
    .filter((m) => (m.volume24hr ?? 0) > 0)
    .sort((a, b) => (b.volume24hr ?? 0) - (a.volume24hr ?? 0))
    .slice(0, limit)
    .map((m) => ({
      id: m.id,
      question: m.question,
      outcomes: m.outcomes ?? null,
      outcomePrices: m.outcomePrices ?? null,
      clobTokenIds: m.clobTokenIds ?? null,
      volume24hr: m.volume24hr ?? 0,
      volume: m.volume ?? 0,
      liquidity: m.liquidity ?? 0,
      endDate: m.endDate ?? null,
      slug: m.slug ?? null,
    }));
}

export function pmYesPrice(m: PMMarket): number | null {
  if (!m.outcomePrices) return null;
  try {
    const arr = JSON.parse(m.outcomePrices);
    const v = parseFloat(arr[0]);
    return Number.isFinite(v) ? v : null;
  } catch {
    return null;
  }
}
// audit fix (A8): outcomePrices[0] is only "Yes" if the outcomes array says so.
// Neg-risk and secondary markets can order outcomes differently; a blind [0]
// read inverts every gap on those rows.
export function pmYesPriceChecked(m: PMMarket): number | null {
  if (!m.outcomePrices || !m.outcomes) return null;
  try {
    const outcomes: string[] = JSON.parse(m.outcomes);
    const prices: string[] = JSON.parse(m.outcomePrices);
    const i = outcomes.findIndex((o) => o.toLowerCase() === 'yes');
    if (i === -1) return null;
    const v = parseFloat(prices[i]);
    return Number.isFinite(v) ? v : null;
  } catch {
    return null;
  }
}

// Staleness gate: fetch the last trade print for a market from the CLOB
// prices-history endpoint (fidelity=10, 1d window; the last point is the
// freshest print). One call per market, cached 2 min. We only need this for
// the pairs shown on the board (~33), not the full top-150 universe.
const printCache = new Map<string, { at: number; lastTs: number | null }>();
const PRINT_TTL = 120_000;
const printInflight = new Map<string, Promise<number | null>>();

export async function pmLastPrintTs(clobTokenIds: string | null): Promise<number | null> {
  if (!clobTokenIds) return null;
  let token: string | undefined;
  try {
    token = JSON.parse(clobTokenIds)[0];
  } catch { return null; }
  if (!token) return null;

  const cached = printCache.get(token);
  if (cached && Date.now() - cached.at < PRINT_TTL) return cached.lastTs;

  let p = printInflight.get(token);
  if (!p) {
    p = (async () => {
      try {
        const res = await fetch(
          `https://clob.polymarket.com/prices-history?market=${token}&interval=1d&fidelity=10`,
          { next: { revalidate: 120 }, signal: AbortSignal.timeout(12_000) }
        );
        if (!res.ok) return null;
        const d: any = await res.json();
        const h: any[] = d?.history ?? [];
        return h.length ? h[h.length - 1].t * 1000 : null;
      } catch {
        return null;
      } finally {
        printInflight.delete(token);
      }
    })();
    printInflight.set(token, p);
  }
  const ts = await p;
  printCache.set(token, { at: Date.now(), lastTs: ts });
  return ts;
}
