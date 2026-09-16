import { getSnapshot } from '../lib/snapshot';
import Dashboard from './dashboard-client';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const snap = await getSnapshot();
  return <Dashboard snap={snap} />;
}
