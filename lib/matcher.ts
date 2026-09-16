// Cross-venue matcher: port of the validated Python prototype.
// Score = 0.5 * token Jaccard + 0.3 * SequenceMatcher + 0.25 name-overlap boost.
// >= 0.65 is auto-match; 0.45-0.65 goes to the review queue.

import { PMMarket, pmYesPrice } from './polymarket';
import { KXMarket } from './kalshi';

const STOP = new Set(`will the of in on for a an to be at by this that is are was were do does
than over under before after from with without versus vs it its their there win wins
next be before during end who whom whose when what which happen happening`.split(/\s+/));

function norm(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t && !STOP.has(t));
}

function jaccard(a: string[], b: string[]): number {
  const A = new Set(a), B = new Set(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  return inter / (A.size + B.size - inter);
}

function seqRatio(a: string, b: string): number {
  // lightweight LCS-based similarity (adequate at 150x150)
  const la = a.length, lb = b.length;
  if (!la || !lb) return 0;
  let prev = new Array(lb + 1).fill(0);
  for (let i = 1; i <= la; i++) {
    const cur = new Array(lb + 1).fill(0);
    for (let j = 1; j <= lb; j++) {
      cur[j] = a[i - 1] === b[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], cur[j - 1]);
    }
    prev = cur;
  }
  return (2 * prev[lb]) / (la + lb);
}

const NAME = /\b([A-Z][a-z]+(?: [A-Z][a-z]+)?(?: [A-Z][a-z]+)?)\b/g;
function names(s: string): Set<string> {
  return new Set(s.match(NAME) ?? []);
}

export interface MatchedPair {
  kx: KXMarket;
  pm: PMMarket;
  score: number;
  kxYes: number | null;
  pmYes: number | null;
  gapCents: number | null;
  needsReview: boolean;
}

export function matchVenues(kalshi: KXMarket[], polymarket: PMMarket[]): MatchedPair[] {
  const scored: { kx: KXMarket; pm: PMMarket; s: number }[] = [];
  const pmPrepped = polymarket.map((p) => ({
    p,
    toks: norm(p.question),
    joined: norm(p.question).join(' '),
    names: names(p.question),
  }));

  for (const k of kalshi) {
    const combined = `${k.title} ${k.eventTitle}`;
    const ktoks = norm(combined);
    const kjoined = ktoks.join(' ');
    const knames = names(combined);
    for (const cand of pmPrepped) {
      let s =
        jaccard(ktoks, cand.toks) * 0.5 +
        seqRatio(kjoined, cand.joined) * 0.3;
      for (const n of knames) if (cand.names.has(n)) { s += 0.25; break; }
      if (s >= 0.45) scored.push({ kx: k, pm: cand.p, s: Math.min(s, 1) });
    }
  }

  scored.sort((a, b) => b.s - a.s);
  const usedK = new Set<string>(), usedP = new Set<string>(), out: MatchedPair[] = [];
  for (const { kx, pm, s } of scored) {
    if (usedK.has(kx.ticker) || usedP.has(pm.id)) continue;
    usedK.add(kx.ticker);
    usedP.add(pm.id);
    const kxYes = kx.yesBid;
    const pmYes = pmYesPrice(pm);
    out.push({
      kx, pm, score: s, kxYes, pmYes,
      gapCents: kxYes !== null && pmYes !== null ? Math.abs(kxYes - pmYes) * 100 : null,
      needsReview: s < 0.65,
    });
  }
  return out;
}
