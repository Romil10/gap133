// Postgres persistence for gap133. Every scanner cycle records the full pair
// set; history queries merge recorded data with venue APIs so charts extend
// beyond Polymarket's native ~1-month limit as the database grows.
// Durable analytics (events) and alert history live here too.

import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 4,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 8_000,
  // internal Railway hostname needs no TLS; public proxy works either way
  ssl: false,
});

let initialized = false;

export async function ensureSchema(): Promise<void> {
  if (initialized) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS pair_snapshots (
      id          BIGSERIAL PRIMARY KEY,
      taken_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
      kx_ticker   TEXT NOT NULL,
      pm_id       TEXT NOT NULL,
      question    TEXT NOT NULL,
      event_title TEXT,
      kx_yes      REAL,
      pm_yes      REAL,
      gap_cents   REAL,
      pm_vol24h   REAL,
      score       REAL NOT NULL,
      needs_review BOOLEAN NOT NULL DEFAULT false
    );
    CREATE INDEX IF NOT EXISTS idx_ps_ticker_time ON pair_snapshots (kx_ticker, taken_at DESC);
    CREATE INDEX IF NOT EXISTS idx_ps_taken ON pair_snapshots (taken_at);

    CREATE TABLE IF NOT EXISTS analytics_events (
      id         BIGSERIAL PRIMARY KEY,
      event      TEXT NOT NULL,
      dimension  TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_ae_event ON analytics_events (event, created_at DESC);

    CREATE TABLE IF NOT EXISTS alert_log (
      id         BIGSERIAL PRIMARY KEY,
      fired_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
      kx_ticker  TEXT NOT NULL,
      pm_id      TEXT NOT NULL,
      gap_cents  REAL NOT NULL,
      delivered  BOOLEAN NOT NULL DEFAULT false
    );
    CREATE INDEX IF NOT EXISTS idx_al_ticker ON alert_log (kx_ticker, fired_at DESC);

    CREATE TABLE IF NOT EXISTS match_verdicts (
      kx_ticker   TEXT NOT NULL,
      pm_id       TEXT NOT NULL,
      probability REAL NOT NULL,
      judged_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
      judged_by   TEXT NOT NULL DEFAULT 'jev',
      title_hash  TEXT NOT NULL,
      PRIMARY KEY (kx_ticker, pm_id)
    );
  `);
  initialized = true;
}

export interface RecordablePair {
  kxTicker: string;
  pmId: string;
  question: string;
  eventTitle: string;
  kxYes: number | null;
  pmYes: number | null;
  gapCents: number | null;
  pmVol24h: number | null;
  score: number;
  needsReview: boolean;
}

export async function recordSnapshot(pairs: RecordablePair[]): Promise<void> {
  if (!pairs.length) return;
  await ensureSchema();
  const values: any[] = [];
  const rows: string[] = [];
  let i = 1;
  for (const p of pairs) {
    rows.push(`($${i++},$${i++},$${i++},$${i++},$${i++},$${i++},$${i++},$${i++},$${i++},$${i++})`);
    values.push(
      p.kxTicker, p.pmId, p.question, p.eventTitle,
      p.kxYes, p.pmYes, p.gapCents, p.pmVol24h, p.score, p.needsReview
    );
  }
  await pool.query(
    `INSERT INTO pair_snapshots (kx_ticker, pm_id, question, event_title, kx_yes, pm_yes, gap_cents, pm_vol24h, score, needs_review)
     VALUES ${rows.join(',')}`,
    values
  );
}

export async function recordEvent(event: string, dimension?: string): Promise<void> {
  await ensureSchema();
  await pool.query('INSERT INTO analytics_events (event, dimension) VALUES ($1, $2)', [
    event, dimension ?? null,
  ]);
}

// ---- match verdicts (Jev review layer) ----

export async function getVerdict(kxTicker: string, pmId: string): Promise<{ probability: number; titleHash: string } | null> {
  await ensureSchema();
  const r = await pool.query(
    'SELECT probability, title_hash FROM match_verdicts WHERE kx_ticker = $1 AND pm_id = $2',
    [kxTicker, pmId]
  );
  return r.rows[0] ? { probability: r.rows[0].probability, titleHash: r.rows[0].title_hash } : null;
}

export async function saveVerdict(kxTicker: string, pmId: string, probability: number, titleHash: string): Promise<void> {
  await ensureSchema();
  await pool.query(
    `INSERT INTO match_verdicts (kx_ticker, pm_id, probability, title_hash)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (kx_ticker, pm_id) DO UPDATE SET probability = $3, title_hash = $4, judged_at = now()`,
    [kxTicker, pmId, probability, titleHash]
  );
}

import crypto from 'crypto';
export function titleHash(kxTitle: string, pmQuestion: string): string {
  return crypto.createHash('sha256').update(`${kxTitle}||${pmQuestion}`).digest('hex').slice(0, 16);
}

export async function recordAlert(kxTicker: string, pmId: string, gapCents: number, delivered: boolean): Promise<void> {
  await ensureSchema();
  await pool.query(
    'INSERT INTO alert_log (kx_ticker, pm_id, gap_cents, delivered) VALUES ($1, $2, $3, $4)',
    [kxTicker, pmId, gapCents, delivered]
  );
}

export interface MergedPoint {
  t: number;
  kx: number | null;
  pm: number | null;
  gap: number | null;
}

/**
 * Gap series for one pair from OUR database (any window we've recorded).
 * Venue-API data (history.ts) is merged on top: DB wins inside its window,
 * venue API fills anything before recording began.
 */
export async function getRecordedGap(kxTicker: string, pmId: string, days: number): Promise<MergedPoint[]> {
  await ensureSchema();
  const since = new Date(Date.now() - days * 86_400_000);
  const r = await pool.query(
    `SELECT taken_at, kx_yes, pm_yes, gap_cents
     FROM pair_snapshots
     WHERE kx_ticker = $1 AND pm_id = $2 AND taken_at >= $3
     ORDER BY taken_at ASC`,
    [kxTicker, pmId, since.toISOString()]
  );
  return r.rows.map((row: any) => ({
    t: new Date(row.taken_at).getTime(),
    kx: row.kx_yes,
    pm: row.pm_yes,
    gap: row.gap_cents,
  }));
}

export async function analyticsSummary(days = 7): Promise<Record<string, number>> {
  await ensureSchema();
  const since = new Date(Date.now() - days * 86_400_000);
  const r = await pool.query(
    `SELECT event, count(*)::int AS n FROM analytics_events
     WHERE created_at >= $1 GROUP BY event ORDER BY n DESC`,
    [since.toISOString()]
  );
  return Object.fromEntries(r.rows.map((row: any) => [row.event, row.n]));
}

export function poolInstance() {
  return pool;
}
