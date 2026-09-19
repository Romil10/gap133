// Limitless Exchange feed (Base-network prediction market).
// Public market-data API, no auth: GET /markets/active (limit capped at 25,
// page param; totalMarketsCount tells us when to stop). ~16 pages = the whole
// active surface (~400 markets). Normalises into the same shape the matcher
// already consumes so PM/KX pairing logic extends untouched.

const LT_BASE = 'https://api.limitless.exchange';

export interface LTMarket {
  id: string;
  slug: string;
  title: string;
  yesPrice: number | null; // 0-1
  volume24h: number;       // USD (limitless reports lifetime; used as a liquidity proxy)
  volume: number;
  description: string | null;
}

interface RawLTMarket {
  id?: number;
  slug?: string;
  title?: string;
  description?: string;
  status?: string;
  volumeFormatted?: string;
  prices?: number[] | null;
}

function clean(html: string | null | undefined): string | null {
  if (!html) return null;
  const t = html.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
  return t.slice(0, 800) || null;
}

export async function fetchLimitlessTop(maxPages = 16): Promise<LTMarket[]> {
  const out: LTMarket[] = [];
  for (let page = 1; page <= maxPages; page++) {
    let batch: RawLTMarket[] = [];
    try {
      const res = await fetch(`${LT_BASE}/markets/active?limit=25&page=${page}`, {
        next: { revalidate: 300 },
        signal: AbortSignal.timeout(15_000),
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });
      if (!res.ok) break;
      const d: any = await res.json();
      batch = d?.data ?? [];
    } catch {
      break;
    }
    if (!batch.length) break;
    for (const m of batch) {
      if (m.status !== 'FUNDED') continue;
      const prices = Array.isArray(m.prices) ? m.prices : null;
      // unpriced AMM seeds report [50, 50] (percent) — skip them; they have no market
      if (!prices || prices.length < 2 || prices[0] === prices[1]) continue;
      const yes = prices[0] <= 1 ? prices[0] : prices[0] / 100;
      if (!isFinite(yes) || yes <= 0.001 || yes >= 0.999) continue;
      out.push({
        id: String(m.id ?? m.slug ?? ''),
        slug: m.slug ?? '',
        title: m.title ?? '',
        yesPrice: yes,
        volume24h: parseFloat(m.volumeFormatted ?? '0') || 0,
        volume: parseFloat(m.volumeFormatted ?? '0') || 0,
        description: clean(m.description),
      });
    }
  }
  return out;
}

export function limitlessUrl(m: LTMarket): string {
  return `https://limitless.exchange/market/${m.slug}`;
}
