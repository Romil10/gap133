import { getSnapshot } from '../lib/snapshot';
import { isUnlocked } from '../lib/access';
import Dashboard from './dashboard-client';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const [snap, unlocked] = await Promise.all([getSnapshot(), isUnlocked()]);
  return <Dashboard snap={snap} unlocked={unlocked} />;
}
