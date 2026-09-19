import { NextRequest, NextResponse } from 'next/server';
import { deskKeyValid } from '../../../../lib/access';
import { getTieredSnapshot, Snapshot } from '../../../../lib/snapshot';
import { deskData } from '../../../../lib/deskdata';

// gap133 desk API v1. Auth: X-API-Key header (or ?key=). Desk keys only —
// there is no free API tier (the free product is the website).
// Endpoints: /api/v1/pairs, /api/v1/pairs/[ticker] handled here via ?ticker=.

export const dynamic = 'force-dynamic';

const RATE = new Map<string, { n: number; win: number }>();
const RATE_LIMIT = 120; // requests per 10-min window per key (desk tier)
const WINDOW = 600_000;

function rateLimited(key: string): boolean {
  const now = Date.now();
  const e = RATE.get(key);
  if (!e || now - e.win > WINDOW) {
    RATE.set(key, { n: 1, win: now });
    return false;
  }
  e.n++;
  return e.n > RATE_LIMIT;
}

function auth(req: NextRequest): string | null {
  const header = req.headers.get('x-api-key');
  const query = req.nextUrl.searchParams.get('key');
  const key = header || query;
  return key && deskKeyValid(key) ? key : null;
}

export async function GET(req: NextRequest) {
  const key = auth(req);
  if (!key) {
    return NextResponse.json(
      { error: 'desk key required', how: 'X-API-Key header (desk holders). See /api-docs' },
      { status: 401 }
    );
  }
  if (rateLimited(key)) {
    return NextResponse.json({ error: 'rate limit exceeded (120 req / 10 min)' }, { status: 429 });
  }

  const snap: Snapshot = await getTieredSnapshot(true); // API is desk-only: full board
  const { searchParams } = req.nextUrl;
  const ticker = searchParams.get('ticker');

  if (ticker) {
    const p = snap.pairs.find((x) => x.kx.ticker.toLowerCase() === ticker.toLowerCase());
    if (!p) {
      return NextResponse.json({ error: `no matched pair for ticker ${ticker}` }, { status: 404 });
    }
    return NextResponse.json(deskData.pairJson(p));
  }

  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10) || 50, 250);
  const minNet = parseFloat(searchParams.get('minNet') ?? '');
  let pairs = snap.pairs;
  if (isFinite(minNet)) pairs = pairs.filter((p) => (p.netGap ?? -999) >= minNet);

  return NextResponse.json({
    tier: 'api',
    fetchedAt: snap.fetchedAt,
    scanned: { pm: snap.pmCount, kx: snap.kxCount },
    count: pairs.length,
    pairs: pairs.slice(0, limit).map(deskData.pairJson),
  });
}
