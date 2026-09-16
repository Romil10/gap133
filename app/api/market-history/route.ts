import { NextResponse } from 'next/server';
import { isUnlocked } from '../../../lib/access';
import { fetchHistoryWithTokens } from '../../../lib/history';

export const dynamic = 'force-dynamic';

// GET /api/market-history?kx=<ticker>&pmclob=<clobTokenIds json>
// TIERED: free = 24h hourly, desk key = 90d daily. Enforced server-side.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const kxTicker = url.searchParams.get('kx');
  const pmClob = url.searchParams.get('pmclob');

  if (!kxTicker || !pmClob) {
    return NextResponse.json({ error: 'kx and pmclob required' }, { status: 400 });
  }

  const tier: 'desk' | 'free' = (await isUnlocked()) ? 'desk' : 'free';

  try {
    const data = await fetchHistoryWithTokens(
      { ticker: kxTicker, eventTitle: url.searchParams.get('kxevent') ?? '', title: url.searchParams.get('kxtitle') ?? '', yesBid: null, yesAsk: null, volume: 0 },
      { id: url.searchParams.get('pmid') ?? '', question: '', outcomes: null, outcomePrices: null, clobTokenIds: pmClob, volume24hr: 0, volume: 0, liquidity: 0, endDate: null, slug: null },
      pmClob,
      tier
    );
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'history fetch failed' }, { status: 502 });
  }
}
