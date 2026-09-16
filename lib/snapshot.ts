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

// ---- tier enforcement (2026-09-16) ----
export const FREE_MAX_PAIRS = 25;
export const FREE_DELAY_MS = 10 * 60 * 1000;

export interface TieredSnapshot extends Snapshot {
  tier: 'desk' | 'free';
  delayed: boolean;
  totalPairs: number;
}

/**
 * Desk keys: live snapshot, all pairs.
 * Free: a 10-minute-delayed view (served from the cache ring, never fresher),
 * capped at the top FREE_MAX_PAIRS pairs by gap.
 */
export async function getTieredSnapshot(unlocked: boolean): Promise<TieredSnapshot> {
  const live = await getSnapshot();

  if (unlocked) {
    return { ...live, tier: 'desk', delayed: false, totalPairs: live.pairs.length };
  }

  // Free delay: find the newest cached snapshot that is at least 10 min old.
  // The live scan keeps running for the Telegram engine either way.
  const cutoff = Date.now() - FREE_DELAY_MS;
  const stale = [...cacheRing].reverse().find((s) => new Date(s.fetchedAt).getTime() <= cutoff);

  const base = stale ?? cacheRing[0] ?? live; // cold start: degrade honestly
  const confident = base.pairs.filter((p) => !p.needsReview);
  const shown = [...confident]
    .sort((a, b) => (b.gapCents ?? -1) - (a.gapCents ?? -1))
    .slice(0, FREE_MAX_PAIRS);

  return {
    ...base,
    pairs: shown,
    tier: 'free',
    delayed: !stale,
    totalPairs: base.pairs.length,
  };
}

// Ring of recent snapshots for the free-delay mechanism.
const cacheRing: Snapshot[] = [];
const RING_MAX = 8; // ~16 min of history at 2-min scans
function pushRing(snap: Snapshot) {
  const last = cacheRing[cacheRing.length - 1];
  if (last && last.fetchedAt === snap.fetchedAt) return;
  cacheRing.push(snap);
  if (cacheRing.length > RING_MAX) cacheRing.shift();
}

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
    pushRing(snap);
    return snap;
  })();

  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}
