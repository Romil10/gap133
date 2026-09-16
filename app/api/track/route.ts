import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// First-party event tracker: zero dependency, in-memory (per instance, resets on
// deploy). Enough to see what early users do without any third-party script.
// For durable analytics set NEXT_PUBLIC_GA_ID and GA4 loads with Consent Mode v2.

const MAX_RECENT = 200;
const counts = new Map<string, number>();
const recent: { e: string; d?: string; t: number }[] = [];

function bump(e: string, d?: string) {
  counts.set(e, (counts.get(e) ?? 0) + 1);
  recent.push({ e, d, t: Date.now() });
  if (recent.length > MAX_RECENT) recent.shift();
  // durable record (no-op if DB unavailable)
  import('../../../lib/persist')
    .then(({ recordEvent }) => recordEvent(e, d))
    .catch(() => {});
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const e = typeof body?.e === 'string' ? body.e.slice(0, 40) : null;
    if (!e) return NextResponse.json({ ok: false }, { status: 400 });
    const d = typeof body?.d === 'string' ? body.d.slice(0, 120) : undefined;
    bump(e, d);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({
    totals: Object.fromEntries([...counts.entries()].sort((a, b) => b[1] - a[1])),
    recent: recent.slice(-25).reverse(),
  });
}
