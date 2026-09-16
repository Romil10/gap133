// Polymarket feed: gamma-api public REST.
const PM_BASE = 'https://gamma-api.polymarket.com';

export interface PMMarket {
  id: string;
  question: string;
  outcomePrices: string | null;
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
      outcomePrices: m.outcomePrices ?? null,
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
