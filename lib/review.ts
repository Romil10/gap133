// Jev-backed review of the matcher's review band.
// Per cycle: resolve ALL cached verdicts instantly (Postgres match_verdicts),
// then spend a judgement budget on genuinely-unjudged pairs. Cached pairs do
// NOT consume budget — otherwise the budget is wasted re-resolving.

import { jevSameEvent } from './jev';
import { getVerdict, saveVerdict, titleHash } from './persist';
import type { MatchedPair } from './matcher';

export const PROMOTE_P = 0.8;
export const REJECT_P = 0.35;
const JUDGE_BUDGET_PER_CYCLE = 40;

function applyVerdict(p: MatchedPair, prob: number): 'promoted' | 'dismissed' | 'held' {
  p.jevProbability = prob;
  if (prob >= PROMOTE_P) {
    p.needsReview = false;
    p.jevDismissed = false;
    p.reviewReason = undefined;
    return 'promoted';
  }
  if (prob <= REJECT_P) {
    p.jevDismissed = true;
    p.reviewReason = `jev: different event (${prob.toFixed(2)})`;
    return 'dismissed';
  }
  return 'held';
}

export async function reviewBand(pairs: MatchedPair[]): Promise<{ judged: number; promoted: number; rejected: number }> {
  const band = pairs.filter((p) => p.needsReview && !p.jevDismissed);

  let promoted = 0, rejected = 0, judged = 0;

  // pass 1: resolve every cached verdict (no budget cost)
  const uncached: MatchedPair[] = [];
  await Promise.all(
    band.map(async (p) => {
      const h = titleHash(p.kx.title ?? '', p.pm.question ?? '');
      const cached = await getVerdict(p.kx.ticker, p.pm.id).catch(() => null);
      if (cached && cached.titleHash === h) {
        const r = applyVerdict(p, cached.probability);
        if (r === 'promoted') promoted++;
        if (r === 'dismissed') rejected++;
      } else {
        uncached.push(p);
      }
    })
  );

  // pass 2: spend the budget on genuinely-unjudged pairs
  const toJudge = uncached.slice(0, JUDGE_BUDGET_PER_CYCLE);
  await Promise.all(
    toJudge.map(async (p) => {
      const h = titleHash(p.kx.title ?? '', p.pm.question ?? '');
      const v = await jevSameEvent(p.kx.title ?? '', p.kx.eventTitle ?? '', null, p.pm.question ?? '', null);
      if (!v) return;
      judged++;
      await saveVerdict(p.kx.ticker, p.pm.id, v.probability, h).catch(() => {});
      const r = applyVerdict(p, v.probability);
      if (r === 'promoted') promoted++;
      if (r === 'dismissed') rejected++;
    })
  );

  return { judged, promoted, rejected };
}
