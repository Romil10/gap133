import { NextResponse } from 'next/server';
import { isUnlocked } from '../../../lib/access';
import { fetchHistoryWithTokens } from '../../../lib/history';
import { getRecordedGap } from '../../../lib/persist';

export const dynamic = 'force-dynamic';

// GET /api/market-history?kx=<ticker>&pmclob=<clobTokenIds json>
// TIERED: free = 24h hourly, desk key = 90d daily. Enforced server-side.
// Desk charts merge OUR recorded snapshots (grows forever) with venue-API
// history, so the series extends beyond Polymarket's native ~1 month.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const kxTicker = url.searchParams.get('kx');
  const pmClob = url.searchParams.get('pmclob');
  const pmId = url.searchParams.get('pmid') ?? '';

  if (!kxTicker || !pmClob) {
    return NextResponse.json({ error: 'kx and pmclob required' }, { status: 400 });
  }

  const tier: 'desk' | 'free' = (await isUnlocked()) ? 'desk' : 'free';

  try {
    const [venue, recorded] = await Promise.all([
      fetchHistoryWithTokens(
        { ticker: kxTicker, eventTitle: url.searchParams.get('kxevent') ?? '', title: url.searchParams.get('kxtitle') ?? '', yesBid: null, yesAsk: null, volume: 0, updatedAt: null },
        { id: pmId, question: '', outcomes: null, outcomePrices: null, clobTokenIds: pmClob, volume24hr: 0, volume: 0, liquidity: 0, endDate: null, slug: null },
        pmClob,
        tier
      ),
      getRecordedGap(kxTicker, pmId, tier === 'desk' ? 90 : 1).catch(() => [] as any[]),
    ]);

    // merge: DB points win inside their timestamps, venue data fills the rest
    const byT = new Map<number, any>();
    for (const p of venue.gap) byT.set(p.t, p);
    for (const p of recorded) {
      const bucket = tier === 'desk' ? Math.floor(p.t / 86_400_000) * 86_400_000 : Math.floor(p.t / 3_600_000) * 3_600_000;
      byT.set(bucket, { ...p, t: bucket });
    }
    const gap = [...byT.values()].sort((a, b) => a.t - b.t);

    return NextResponse.json({ ...venue, gap });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'history fetch failed' }, { status: 502 });
  }
}
