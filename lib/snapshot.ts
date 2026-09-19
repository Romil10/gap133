import { fetchPolymarketTop, PMMarket } from './polymarket';
import { fetchKalshiTop, KXMarket } from './kalshi';
import { matchVenues, enrichStaleness, MatchedPair } from './matcher';
import { fetchLimitlessTop, LTMarket } from './limitless';
import { kalshiUrl, polymarketUrl } from './links';

export interface Snapshot {
  pairs: MatchedPair[];
  pmCount: number;
  kxCount: number;
  fetchedAt: string;
  // audit fix: per-venue feed health so the UI can fail loudly instead of
  // rendering an empty board as if it were normal data.
  pmHealthy: boolean;
  kxHealthy: boolean;
  // single-venue watch: hottest markets with NO cross-venue overlap. The
  // overlap is the product; this is the "future gaps" strip. Each entry keeps
  // enough data to deep-link its venue.
  watch: {
    venue: 'kx' | 'pm';
    title: string;
    venueUrl: string;
    volume: number;
  }[];
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

// Build the single-venue watch: top markets by volume with no cross-venue
// counterpart. Normalized-token overlap test against matched questions, plus
// exclusion of anything already paired. Kept cheap: top 8 per venue.
function buildWatch(
  kx: KXMarket[],
  pm: PMMarket[],
  matched: MatchedPair[]
): Snapshot['watch'] {
  const matchedKx = new Set(matched.map((p) => p.kx.ticker));
  const matchedPm = new Set(matched.map((p) => p.pm.id));
  const pmQuestions = new Set(pm.map((m) => normalizeQ(m.question)));

  const normCache = new Map<string, Set<string>>();
  const toks = (s: string): Set<string> => {
    let v = normCache.get(s);
    if (!v) {
      v = new Set(s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean));
      normCache.set(s, v);
    }
    return v;
  };

  const overlapsPm = (title: string): boolean => {
    const a = toks(title);
    if (!a.size) return false;
    for (const q of pmQuestions) {
      let inter = 0;
      for (const t of a) if (q.has(t)) inter++;
      if (inter / Math.max(1, a.size) > 0.55) return true;
    }
    return false;
  };

  const watch: Snapshot['watch'] = [];

  // Kalshi-only: real-volume markets whose topic isn't on Polymarket at all
  const kxSorted = [...kx].filter((m) => !matchedKx.has(m.ticker) && m.volume > 0);
  kxSorted.sort((a, b) => b.volume - a.volume);
  for (const m of kxSorted) {
    if (watch.length >= 8) break;
    if (overlapsPm(`${m.title} ${m.eventTitle}`)) continue;
    watch.push({
      venue: 'kx',
      title: m.title || m.eventTitle,
      venueUrl: `https://kalshi.com/markets/${(m.ticker.split('-')[0] || m.ticker).toLowerCase()}/${m.ticker.toLowerCase()}`,
      volume: m.volume,
    });
  }

  // Polymarket-only: top by 24h volume without a kalshi partner
  const kxTitles = kx.map((m) => `${m.title} ${m.eventTitle}`);
  const kxTok = kxTitles.map((t) => toks(t));
  const pmSorted = [...pm]
    .filter((m) => !matchedPm.has(m.id) && (m.volume24hr ?? 0) > 0)
    .sort((a, b) => (b.volume24hr ?? 0) - (a.volume24hr ?? 0));
  for (const m of pmSorted) {
    if (watch.length >= 16) break;
    const a = toks(m.question);
    let hasPartner = false;
    for (const kt of kxTok) {
      let inter = 0;
      for (const t of a) if (kt.has(t)) inter++;
      if (inter / Math.max(1, a.size) > 0.55) { hasPartner = true; break; }
    }
    if (hasPartner) continue;
    watch.push({
      venue: 'pm',
      title: m.question,
      venueUrl: polymarketUrl(m) ?? 'https://polymarket.com',
      volume: m.volume24hr ?? 0,
    });
  }

  return watch;
}

function normalizeQ(s: string): Set<string> {
  return new Set(s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean));
}

export async function getSnapshot(maxAgeMs = 120_000): Promise<Snapshot> {  if (cache && Date.now() - new Date(cache.fetchedAt).getTime() < maxAgeMs) return cache;
  if (inflight) return inflight;

  inflight = (async () => {
    // Full-catalog pulls: Kalshi paginates to 2000 events (10 pages), PM to
    // 1200 markets (12 pages of 100), Limitless to its full ~400 (16 pages of 25).
    const [pm, kx, lt] = await Promise.all([
      fetchPolymarketTop(1200, 12).catch(() => [] as PMMarket[]),
      fetchKalshiTop(6000, 10).catch(() => [] as KXMarket[]),
      fetchLimitlessTop(16).catch(() => [] as LTMarket[]),
    ]);

    // audit fix: if a venue feed comes back empty but a previous snapshot
    // exists, keep serving the previous board (marked stale by the fetchedAt
    // age) rather than rendering a half-empty board as normal data.
    const pmHealthy = pm.length > 0;
    const kxHealthy = kx.length > 0;
    const ltHealthy = lt.length > 0;
    const pairs = pmHealthy && kxHealthy
      ? matchVenues(kx, pm, ltHealthy ? lt : [])
      : cache ? cache.pairs : matchVenues(kx, pm, []);

    // staleness gate: last-print age per venue per pair (PM prints fetched
    // per pair with a 2-min cache; Kalshi's updated_time ships in the payload)
    try {
      await enrichStaleness(pairs.slice(0, 60)); // top-60 only: tier caps at 49 desk pairs anyway
    } catch {}

    // Jev review layer: judges the review band (verdicts cached in Postgres,
    // budgeted per cycle), promoting same-event pairs and dismissing different ones.
    try {
      const { reviewBand } = await import('./review');
      await reviewBand(pairs);
    } catch {}

    const snap: Snapshot = {
      pairs,
      pmCount: pm.length,
      kxCount: kx.length,
      pmHealthy,
      kxHealthy,
      fetchedAt: new Date().toISOString(),
      watch: buildWatch(kx, pm, pairs),
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
