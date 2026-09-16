// Per-market history for the expandable analytics drawer, TIERED:
//   free: 24 hours, hourly buckets
//   desk key: 90 days, daily buckets (Kalshi period_interval=1440)
// Volume bars: Kalshi candlestick volume. Polymarket history carries no volume.

import { KXMarket } from './kalshi';
import { PMMarket } from './polymarket';

const HOUR = 3_600_000;

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

export interface HistoryData {
  gap: GapPoint[];
  volume: VolumePoint[];
  windowHours: number;
  tier: 'desk' | 'free';
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

export async function fetchHistoryWithTokens(
  kx: KXMarket,
  _pm: PMMarket,
  pmClobTokenIds: string | null,
  tier: 'desk' | 'free'
): Promise<HistoryData> {
  const windowMs = tier === 'desk' ? 90 * 86_400_000 : 24 * HOUR;
  const endTs = Math.floor(Date.now() / 1000);
  const startTs = Math.floor((Date.now() - windowMs) / 1000);
  const interval = tier === 'desk' ? 1440 : 60; // daily : hourly

  const series = kx.ticker.split('-')[0];
  let pmToken: string | null = null;
  try {
    const tokens = pmClobTokenIds ? JSON.parse(pmClobTokenIds) : null;
    pmToken = tokens?.[0] ?? null;
  } catch {}

  // PM CLOB quirk (verified 2026-09-16): startTs/endTs with fidelity > 60
  // returns empty; only fidelity=60 (hourly) respects a window, and interval=
  // "max" returns the full available history at the data's native resolution
  // (Polymarket only keeps ~1 month, 2026-08-16 to today at time of test).
  // Desk tier pulls interval=max and clips to 90d locally; free pulls 24h hourly.
  const [kxC, pmH] = await Promise.all([
    jsonFetch(`https://api.elections.kalshi.com/trade-api/v2/series/${series}/markets/${kx.ticker}/candlesticks?start_ts=${startTs}&end_ts=${endTs}&period_interval=${interval}`)
      .catch(() => null),
    pmToken
      ? (tier === 'desk'
          ? jsonFetch(`https://clob.polymarket.com/prices-history?market=${pmToken}&interval=max`)
          : jsonFetch(`https://clob.polymarket.com/prices-history?market=${pmToken}&startTs=${startTs}&endTs=${endTs}&fidelity=60`)
        ).catch(() => null)
      : Promise.resolve(null),
  ]);

  // bucket by window: daily windows bucket per day, hourly per hour.
  // PM buckets are offset past the boundary, KX buckets are aligned: round
  // BOTH to the bucket start, last value in a bucket wins.
  const bucketMs = tier === 'desk' ? 86_400_000 : HOUR;
  const clipFrom = Date.now() - windowMs;
  const kxBuckets = new Map<number, { close: number; vol: number }>();
  for (const c of kxC?.candlesticks ?? []) {
    const t = (c.end_period_ts ?? 0) * 1000;
    if (t < clipFrom) continue;
    const close = parseFloat(c.price?.close_dollars ?? 'NaN');
    const vol = parseFloat(c.volume_fp ?? '0') || 0;
    if (Number.isFinite(close)) {
      const b = Math.floor(t / bucketMs) * bucketMs;
      kxBuckets.set(b, { close, vol });
    }
  }
  const pmBuckets = new Map<number, { close: number; vol: number }>();
  for (const h of pmH?.history ?? []) {
    const t = (h.t ?? 0) * 1000;
    if (t < clipFrom) continue;
    if (!Number.isFinite(h.p)) continue;
    pmBuckets.set(Math.floor(t / bucketMs) * bucketMs, { close: h.p, vol: 0 });
  }

  const times = [...new Set([...kxBuckets.keys(), ...pmBuckets.keys()])].sort((a, b) => a - b);
  const gap: GapPoint[] = times.map((t) => {
    const kxV = kxBuckets.get(t)?.close ?? null;
    const pmV = pmBuckets.get(t)?.close ?? null;
    return {
      t,
      kx: kxV,
      pm: pmV,
      gap: kxV !== null && pmV !== null ? Math.abs(kxV - pmV) * 100 : null,
    };
  });
  const volume: VolumePoint[] = times.map((t) => ({
    t,
    kxVol: kxBuckets.get(t)?.vol ?? null,
    pmVol: pmBuckets.get(t)?.vol ?? null,
  }));

  return { gap, volume, windowHours: windowMs / HOUR, tier };
}

export async function fetchHistory(kx: KXMarket, pm: PMMarket, tier: 'desk' | 'free' = 'free') {
  return fetchHistoryWithTokens(kx, pm, pm.clobTokenIds, tier);
}
