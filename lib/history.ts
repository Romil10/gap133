// Per-market history for the expandable analytics drawer.
// Kalshi: candlesticks endpoint (series_ticker/market_ticker), 60-min buckets.
// Polymarket: CLOB prices-history by CLOB token id (from clobTokenIds[0] = YES),
// same bucket size. We compute the GAP series = |pm - kx| per aligned bucket.

import { KXMarket } from './kalshi';
import { PMMarket } from './polymarket';

const DAY = 86_400_000;

export interface GapPoint {
  t: number; // epoch ms
  kx: number | null; // 0-1
  pm: number | null;
  gap: number | null; // cents, 0-100
}

export interface VolumePoint {
  t: number;
  kxVol: number | null;
  pmVol: number | null;
}

async function jsonFetch(url: string, revalidate = 300): Promise<any> {
  const res = await fetch(url, {
    next: { revalidate },
    signal: AbortSignal.timeout(15_000),
    headers: { 'User-Agent': 'Mozilla/5.0' },
  });
  if (!res.ok) return null;
  return res.json();
}

export async function fetchHistory(kx: KXMarket, pm: PMMarket): Promise<{ gap: GapPoint[]; volume: VolumePoint[] }> {
  const endTs = Math.floor(Date.now() / 1000);
  const startTs = Math.floor((Date.now() - 7 * DAY) / 1000);

  // Kalshi: series ticker = market ticker minus the last dash segment
  // (KXPRESNOMD-28-AOC -> KXPRESNOMD); per verified API shape.
  const series = kx.ticker.split('-')[0];
  const [kxC, pmH] = await Promise.all([
    jsonFetch(`https://api.elections.kalshi.com/trade-api/v2/series/${series}/markets/${kx.ticker}/candlesticks?start_ts=${startTs}&end_ts=${endTs}&period_interval=60`)
      .catch(() => null),
    (async () => {
      try {
        const tokens = pm.clobTokenIds ? JSON.parse(pm.clobTokenIds) : null;
        if (!tokens?.[0]) return null;
        return await jsonFetch(`https://clob.polymarket.com/prices-history?market=${tokens[0]}&startTs=${startTs}&endTs=${endTs}&fidelity=60`);
      } catch { return null; }
    })(),
  ]);

  // PM token ids needed for history; thread them through the market object.
  return assemble(kxC, pmH, kx, pm);
}

// exported for caching in the market route (clobTokenIds is on the raw PM row)
export async function fetchHistoryWithTokens(
  kx: KXMarket,
  pm: PMMarket,
  pmClobTokenIds: string | null
): Promise<{ gap: GapPoint[]; volume: VolumePoint[] }> {
  const endTs = Math.floor(Date.now() / 1000);
  const startTs = Math.floor((Date.now() - 7 * DAY) / 1000);

  const series = kx.ticker.split('-')[0];
  const [kxC, pmH] = await Promise.all([
    jsonFetch(`https://api.elections.kalshi.com/trade-api/v2/series/${series}/markets/${kx.ticker}/candlesticks?start_ts=${startTs}&end_ts=${endTs}&period_interval=60`)
      .catch(() => null),
    (async () => {
      try {
        const tokens = pmClobTokenIds ? JSON.parse(pmClobTokenIds) : null;
        if (!tokens?.[0]) return null;
        return await jsonFetch(`https://clob.polymarket.com/prices-history?market=${tokens[0]}&startTs=${startTs}&endTs=${endTs}&fidelity=60`);
      } catch { return null; }
    })(),
  ]);

  return assemble(kxC, pmH, kx, pm);
}

function assemble(
  kxC: any,
  pmH: any,
  kx: KXMarket,
  _pm: PMMarket
): { gap: GapPoint[]; volume: VolumePoint[] } {
  const kxBuckets = new Map<number, { close: number; vol: number }>();
  for (const c of kxC?.candlesticks ?? []) {
    const t = (c.end_period_ts ?? 0) * 1000;
    const close = parseFloat(c.price?.close_dollars ?? 'NaN');
    const vol = parseFloat(c.volume_fp ?? '0') || 0;
    if (Number.isFinite(close)) kxBuckets.set(t, { close, vol });
  }

  const pmBuckets = new Map<number, { close: number; vol: number }>();
  for (const h of pmH?.history ?? []) {
    const t = (h.t ?? 0) * 1000;
    pmBuckets.set(t, { close: h.p, vol: 0 });
  }

  // PM buckets are offset from the hour (e.g. :24s past), Kalshi buckets are
  // hour-aligned. Round BOTH to the hour bucket, taking the last value in each.
  const roundHour = (t: number) => Math.floor(t / 3_600_000) * 3_600_000;
  const kxHours = new Map<number, { close: number; vol: number }>();
  for (const [t, v] of kxBuckets) kxHours.set(roundHour(t), v);
  const pmHours = new Map<number, { close: number; vol: number }>();
  for (const [t, v] of pmBuckets) pmHours.set(roundHour(t), v);

  // align on union of hour buckets
  const times = [...new Set([...kxHours.keys(), ...pmHours.keys()])].sort((a, b) => a - b);
  const gap: GapPoint[] = [];
  for (const t of times) {
    const kxV = kxHours.get(t)?.close ?? null;
    const pmV = pmHours.get(t)?.close ?? null;
    gap.push({
      t,
      kx: kxV,
      pm: pmV,
      gap: kxV !== null && pmV !== null ? Math.abs(kxV - pmV) * 100 : null,
    });
  }

  // volume series from kalshi candlesticks + pm 24h fallback (pm gives none here)
  const volume: VolumePoint[] = times.map((t) => ({
    t,
    kxVol: kxHours.get(t)?.vol ?? null,
    pmVol: pmHours.get(t)?.vol ?? null,
  }));

  return { gap, volume };
}

export { DAY };
