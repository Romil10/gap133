import { NextResponse } from 'next/server';
import { getTieredSnapshot } from '../../../lib/snapshot';
import { isUnlocked } from '../../../lib/access';

export const dynamic = 'force-dynamic';

export async function GET() {
  const unlocked = await isUnlocked();
  const snap = await getTieredSnapshot(unlocked);
  return NextResponse.json(snap);
}
