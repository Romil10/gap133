// Jev-backed review of the matcher's review band.
// Pipeline per scan cycle: review-band pairs are checked against the verdict
// cache (Postgres); uncached pairs are judged by Jev (noul: same event?)
// within a per-cycle budget; verdicts are cached. Promoted pairs (probability
// >= 0.80) join the confident board; rejected pairs (< 0.35) are demoted to
// a hard 'different event' state so they never resurface.

import { jevSameEvent } from './jev';
import { getVerdict, saveVerdict, titleHash } from './persist';
import type { MatchedPair } from './matcher';

export const PROMOTE_P = 0.8;
export const REJECT_P = 0.35;

// budget: max Jev judgements per scan cycle (cost control; the rest wait for
// the next cycle). ~200 pairs in the band => fully reviewed in ~2-3 cycles.
const JUDGE_BUDGET_PER_CYCLE = 40;

export async function reviewBand(pairs: MatchedPair[]): Promise<{ judged: number; promoted: number; rejected: number }> {
  const band = pairs.filter((p) => p.needsReview && p.reviewReason !== 'below auto-match confidence' || (p.needsReview && p.score >= 0.45));
  const toJudge = band
    .filter((p) => !p.jevDismissed)
    .slice(0, JUDGE_BUDGET_PER_CYCLE);

  let judged = 0, promoted = 0, rejected = 0;

  await Promise.all(
    toJudge.map(async (p) => {
      const h = titleHash(p.kx.title ?? '', p.pm.question ?? '');
      let prob: number | null = null;

      const cached = await getVerdict(p.kx.ticker, p.pm.id).catch(() => null);
      if (cached && cached.titleHash === h) {
        prob = cached.probability;
      } else {
        const v = await jevSameEvent(
          p.kx.title ?? '',
          p.kx.eventTitle ?? '',
          null,
          p.pm.question ?? '',
          null
        );
        if (v) {
          prob = v.probability;
          await saveVerdict(p.kx.ticker, p.pm.id, v.probability, h).catch(() => {});
        }
      }

      if (prob === null) return;
      judged++;
      p.jevProbability = prob;
      if (prob >= PROMOTE_P) {
        p.needsReview = false;
        p.jevDismissed = false;
        p.reviewReason = undefined;
        promoted++;
      } else if (prob <= REJECT_P) {
        p.jevDismissed = true;
        p.reviewReason = `jev: different event (${prob.toFixed(2)})`;
        rejected++;
      }
    })
  );

  return { judged, promoted, rejected };
}
