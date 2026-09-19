import type { MatchedPair } from './matcher';
import { polymarketUrl, kalshiUrl } from './links';

// Shared JSON shape for API + MCP responses: everything a desk needs to act,
// nothing that requires re-deriving on the client.

export const deskData = {
  pairJson(p: MatchedPair) {
    return {
      kx: {
        ticker: p.kx.ticker,
        title: p.kx.title,
        event: p.kx.eventTitle,
        yesBid: p.kxYes,
        yesAsk: p.kx.yesAsk,
        bidSize: p.kx.bidSize,
        askSize: p.kx.askSize,
        url: kalshiUrl(p.kx),
      },
      second: {
        venue: p.venueTag === 'pm' ? 'polymarket' : 'limitless',
        id: p.pm.id,
        question: p.pm.question,
        yes: p.pmYes,
        bid: p.pmYes, // PM board read is the mid; the book call gives the real bid
        ask: null as number | null,
        volume24h: p.pm.volume24hr,
        url: polymarketUrl(p.pm),
      },
      gap: {
        rawCents: p.gapCents,
        netCents: p.netGap,
        feeKxCents: p.feeKxCents,
        feePmCents: p.feePmCents,
        netPositive: p.netPositive,
        buyVenue: p.buyVenue,
        execSizeUsd: p.execSize,
      },
      gates: {
        matchScore: p.score,
        jevProbability: p.jevProbability ?? null,
        needsReview: p.needsReview,
        reviewReason: p.reviewReason ?? null,
        dismissed: p.jevDismissed ?? false,
        lastPrint: { kx: p.kxLastTs, second: p.pmLastTs, stale: p.stale, staleSide: p.staleSide },
      },
    };
  },
};
