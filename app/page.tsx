import { getTieredSnapshot } from '../lib/snapshot';
import { isUnlocked } from '../lib/access';
import Dashboard from './dashboard-client';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const unlocked = await isUnlocked();
  const snap = await getTieredSnapshot(unlocked);
  return <Dashboard snap={snap} unlocked={unlocked} />;
}
