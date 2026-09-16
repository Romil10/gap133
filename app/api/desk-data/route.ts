import { NextResponse } from 'next/server';
import { isUnlocked } from '../../../lib/access';
import { getTieredSnapshot } from '../../../lib/snapshot';

export const dynamic = 'force-dynamic';

// Desk-only data feed (early API). Requires a desk key cookie.
// GET /api/desk-data -> full live snapshot as structured JSON.
export async function GET() {
  const unlocked = await isUnlocked();
  if (!unlocked) {
    return NextResponse.json(
      { error: 'desk key required', hint: 'founders desk: $15/mo, crypto only. hello@gap133.xyz' },
      { status: 401 }
    );
  }
  const snap = await getTieredSnapshot(true);
  return NextResponse.json(snap);
}
