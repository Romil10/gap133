import { NextResponse } from 'next/server';
import { isUnlocked } from '../../../lib/access';
import { fetchHistoryWithTokens } from '../../../lib/history';

export const dynamic = 'force-dynamic';

// GET /api/market-history?kx=<ticker>&pmclob=<clobTokenIds json>
// Free: 7-day gap series at 60-min buckets (the same data paying desks get;
// the delay/live split lives on the board, not on history).
export async function GET(req: Request) {
  const url = new URL(req.url);
  const kxTicker = url.searchParams.get('kx');
  const pmClob = url.searchParams.get('pmclob');
  const pmId = url.searchParams.get('pmid');
  const kxTitle = url.searchParams.get('kxtitle') ?? '';
  const kxEvent = url.searchParams.get('kxevent') ?? '';

  if (!kxTicker || !pmClob) {
    return NextResponse.json({ error: 'kx and pmclob required' }, { status: 400 });
  }

  // free tier: 10-minute served-from-cache delay is acceptable; auth-free for now
  const unlocked = await isUnlocked();
  void pmId; void kxTitle; void kxEvent; void unlocked;

  try {
    const data = await fetchHistoryWithTokens(
      { ticker: kxTicker, eventTitle: kxEvent, title: kxTitle, yesBid: null, yesAsk: null, volume: 0 },
      { id: pmId ?? '', question: '', outcomes: null, outcomePrices: null, clobTokenIds: pmClob, volume24hr: 0, volume: 0, liquidity: 0, endDate: null, slug: null },
      pmClob
    );
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'history fetch failed' }, { status: 502 });
  }
}
