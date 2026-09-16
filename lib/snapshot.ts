import { fetchPolymarketTop, PMMarket } from './polymarket';
import { fetchKalshiTop, KXMarket } from './kalshi';
import { matchVenues, MatchedPair } from './matcher';

export interface Snapshot {
  pairs: MatchedPair[];
  pmCount: number;
  kxCount: number;
  fetchedAt: string;
}

// Simple in-process cache; the UI revalidates on a timer.
let cache: Snapshot | null = null;
let inflight: Promise<Snapshot> | null = null;

export async function getSnapshot(maxAgeMs = 120_000): Promise<Snapshot> {
  if (cache && Date.now() - new Date(cache.fetchedAt).getTime() < maxAgeMs) return cache;
  if (inflight) return inflight;

  inflight = (async () => {
    const [pm, kx] = await Promise.all([
      fetchPolymarketTop(150).catch(() => [] as PMMarket[]),
      fetchKalshiTop(150).catch(() => [] as KXMarket[]),
    ]);
    const snap: Snapshot = {
      pairs: matchVenues(kx, pm),
      pmCount: pm.length,
      kxCount: kx.length,
      fetchedAt: new Date().toISOString(),
    };
    cache = snap;
    return snap;
  })();

  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}
