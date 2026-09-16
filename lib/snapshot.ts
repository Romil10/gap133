import { fetchPolymarketTop, PMMarket } from './polymarket';
import { fetchKalshiTop, KXMarket } from './kalshi';
import { matchVenues, MatchedPair } from './matcher';

export interface Snapshot {
  pairs: MatchedPair[];
  pmCount: number;
  kxCount: number;
  fetchedAt: string;
  // audit fix: per-venue feed health so the UI can fail loudly instead of
  // rendering an empty board as if it were normal data.
  pmHealthy: boolean;
  kxHealthy: boolean;
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

    // audit fix: if a venue feed comes back empty but a previous snapshot
    // exists, keep serving the previous board (marked stale by the fetchedAt
    // age) rather than rendering a half-empty board as normal data.
    const pmHealthy = pm.length > 0;
    const kxHealthy = kx.length > 0;
    const pairs = pmHealthy && kxHealthy ? matchVenues(kx, pm) : cache ? cache.pairs : matchVenues(kx, pm);

    const snap: Snapshot = {
      pairs,
      pmCount: pm.length,
      kxCount: kx.length,
      pmHealthy,
      kxHealthy,
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
