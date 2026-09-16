// Cross-venue matcher: port of the validated Python prototype, hardened after
// the 2026-09-16 audit (false party-vs-person match ranked #1 on the board).
// Score = 0.5 * token Jaccard + 0.3 * sequence ratio + 0.25 proper-name boost,
// minus 0.25 when one side asks a nomination question and the other an election
// question. >= 0.65 auto-match (plus sanity caps), 0.45-0.65 review band.

import { PMMarket, pmYesPriceChecked } from './polymarket';
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
  reviewReason?: string;
}

const NOMIN = /\bnominee|nomination\b/i;
const PARTY = /\bparty\b/i;

export function matchVenues(kalshi: KXMarket[], polymarket: PMMarket[]): MatchedPair[] {
  const scored: { kx: KXMarket; pm: PMMarket; s: number }[] = [];
  const pmPrepped = polymarket.map((p) => ({
    p,
    toks: norm(p.question),
    joined: norm(p.question).join(' '),
    names: names(p.question),
    nomin: NOMIN.test(p.question),
    party: PARTY.test(p.question),
  }));

  for (const k of kalshi) {
    const combined = `${k.title} ${k.eventTitle}`;
    const ktoks = norm(combined);
    const kjoined = ktoks.join(' ');
    // audit fix: proper names come from the MARKET title only. Event titles are
    // templates ("2028 Democratic presidential nominee") and their words poisoned
    // the name boost, producing the party-vs-person false match at board #1.
    const knames = names(k.title ?? '');
    const kNomin = NOMIN.test(k.title ?? '');
    const kParty = PARTY.test(k.title ?? '') || PARTY.test(k.eventTitle ?? '');

    for (const cand of pmPrepped) {
      // audit fix: hard-block cross-type pairs. A party question can never be
      // the same event as a person question, and vice versa.
      if (kParty !== cand.party) continue;

      let s =
        jaccard(ktoks, cand.toks) * 0.5 +
        seqRatio(kjoined, cand.joined) * 0.3;
      for (const n of knames) if (cand.names.has(n)) { s += 0.25; break; }
      // audit fix: "nominee/nomination" on one side against "president/election"
      // phrasing on the other marks a subtly different question; demote hard.
      if (kNomin !== cand.nomin) s -= 0.25;

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
    const pmYes = pmYesPriceChecked(pm);
    const gapCents = kxYes !== null && pmYes !== null ? Math.abs(kxYes - pmYes) * 100 : null;
    let needsReview = s < 0.65;
    let reviewReason = needsReview ? 'below auto-match confidence' : undefined;
    // audit fix: the same question on two real venues essentially never disagrees
    // by 25c+; a gap that wide almost always means mismatched questions.
    if (!needsReview && gapCents !== null && gapCents > 25) {
      needsReview = true;
      reviewReason = `implausible gap (${gapCents.toFixed(1)}c) — likely mismatched questions`;
    }
    out.push({ kx, pm, score: s, kxYes, pmYes, gapCents, needsReview, reviewReason });
  }
  return out;
}
