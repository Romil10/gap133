import { NextResponse } from 'next/server';
import { runCycle } from '../../../lib/notifier';

export const dynamic = 'force-dynamic';

// Cron-friendly tick. Protect with CRON_SECRET if set; Railway cron or any
// external scheduler hits this every few minutes.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const provided = new URL(req.url).searchParams.get('key');
    if (provided !== secret) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
  }
  const result = await runCycle();
  return NextResponse.json({ ok: true, ...result });
}
