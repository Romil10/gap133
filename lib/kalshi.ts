// Kalshi feed: public trade-api v2, events with nested markets.
// The flat /markets endpoint is polluted by provisional parley shards; the
// events endpoint with_nested_markets returns real tradable markets.

const KX_BASE = 'https://api.elections.kalshi.com/trade-api/v2';

export interface KXMarket {
  ticker: string;
  eventTitle: string;
  title: string;
  yesBid: number | null;
  yesAsk: number | null;
  volume: number;
}

interface RawKXMarket {
  ticker?: string;
  title?: string;
  volume_fp?: string;
  yes_bid_dollars?: string;
  yes_ask_dollars?: string;
}

export async function fetchKalshiTop(limit = 150): Promise<KXMarket[]> {
  const rows: KXMarket[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < 4; page++) {
    const url = `${KX_BASE}/events?status=open&with_nested_markets=true&limit=200${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;
    const res = await fetch(url, {
      next: { revalidate: 120 },
      signal: AbortSignal.timeout(25_000),
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    if (!res.ok) break;
    const data = await res.json();
    for (const ev of data.events ?? []) {
      for (const m of (ev.markets ?? []) as RawKXMarket[]) {
        rows.push({
          ticker: m.ticker ?? '',
          eventTitle: ev.title ?? '',
          title: m.title ?? '',
          yesBid: m.yes_bid_dollars ? parseFloat(m.yes_bid_dollars) : null,
          yesAsk: m.yes_ask_dollars ? parseFloat(m.yes_ask_dollars) : null,
          volume: parseFloat(m.volume_fp ?? '0') || 0,
        });
      }
    }
    cursor = data.cursor;
    if (!cursor) break;
  }
  return rows.sort((a, b) => b.volume - a.volume).slice(0, limit);
}
