import { NextResponse } from 'next/server';
import { analyticsSummary } from '../../../lib/persist';

export const dynamic = 'force-dynamic';

// Persistence health: row counts + recent activity. Private-ish (no secrets
// returned); useful for Romil to confirm the DB round-trip works in prod.
export async function GET() {
  try {
    const { poolInstance } = await import('../../../lib/persist');
    const pool = poolInstance();
    const snap = await pool.query(
      "SELECT count(*)::int AS n, max(taken_at) AS latest FROM pair_snapshots"
    );
    const alerts = await pool.query('SELECT count(*)::int AS n FROM alert_log');
    const events = await analyticsSummary(7);
    return NextResponse.json({
      ok: true,
      pairSnapshots: snap.rows[0].n,
      latestSnapshot: snap.rows[0].latest,
      alertsLogged: alerts.rows[0].n,
      events7d: events,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? 'db unavailable' }, { status: 503 });
  }
}
