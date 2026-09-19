import { NextResponse } from 'next/server';

// Order-book depth for the market drawer: top-of-book size on both venues
// per side. Kalshi sizes ship in the market payload (captured at scan time);
// Polymarket's CLOB book is fetched live here with a 60s cache.
// Executability math: buy YES on the cheap venue (lift the ask), sell on the
// rich venue (hit the bid). Cross-venue executable size = min of the two legs.

export const dynamic = 'force-dynamic';

interface BookLevel { price: string; size: string }

function top(levels: BookLevel[] | undefined, side: 'bid' | 'ask'): { price: number; size: number } | null {
  if (!levels || !levels.length) return null;
  // bids sorted desc, asks asc — first element is top of book
  const l = levels[0];
  const p = parseFloat(l.price);
  const s = parseFloat(l.size);
  if (!isFinite(p) || !isFinite(s)) return null;
  return { price: p, size: s };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const tokenId = searchParams.get('token');
  const kxBidSize = searchParams.get('kxBidSize');
  const kxAskSize = searchParams.get('kxAskSize');
  const kxYesBid = searchParams.get('kxYesBid');
  const pmYes = searchParams.get('pmYes');

  if (!tokenId) return NextResponse.json({ error: 'token required' }, { status: 400 });

  let pmBid: { price: number; size: number } | null = null;
  let pmAsk: { price: number; size: number } | null = null;
  try {
    const res = await fetch(`https://clob.polymarket.com/book?token_id=${encodeURIComponent(tokenId)}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    });
    if (res.ok) {
      const d: any = await res.json();
      pmBid = top(d?.bids, 'bid');
      pmAsk = top(d?.asks, 'ask');
    }
  } catch {}

  // Cross-venue executability: the gap direction decides which leg is the buy
  // (lift ask) and which is the sell (hit bid). Sizes in shares (PM) vs
  // contracts (KX) — both are 1:1 USD-notional units at settlement.
  // direction resolved client-side in DepthPanel (it owns both books)
  const direction = kxYesBid && pmYes && pmBid?.price ? (parseFloat(kxYesBid) < parseFloat(pmYes) ? 'buy-kx-sell-pm' : 'buy-pm-sell-kx') : null;

  return NextResponse.json({
    pm: { bid: pmBid, ask: pmAsk },
    kx: { bidSize: kxBidSize ? parseFloat(kxBidSize) : null, askSize: kxAskSize ? parseFloat(kxAskSize) : null },
    direction,
    fetchedAt: Date.now(),
  });
}
