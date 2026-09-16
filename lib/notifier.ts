// Alert engine: threshold-crossing alerts + daily digest to the Telegram channel.
// All state is in-memory (resets on deploy: worst case one repeat alert; the
// Postgres round replaces this).

import { getSnapshot, Snapshot } from './snapshot';
import { sendToChannel, telegramConfigured } from './telegram';
import { polymarketUrl, kalshiUrl } from './links';
import type { MatchedPair } from './matcher';

const THRESHOLD_CENTS = parseFloat(process.env.ALERT_THRESHOLD_CENTS ?? '3.69');
const ALERT_COOLDOWN_MS = 6 * 60 * 60 * 1000; // 6h per pair
const MAX_ALERTS_PER_RUN = 3;
const DIGEST_HOUR_IST = parseInt(process.env.DIGEST_HOUR_IST ?? '9', 10); // 09:00 IST

const alertHistory = new Map<string, number>();
let lastDigestDate = '';

function istNow(): { date: string; hour: number } {
  const now = new Date(Date.now() + 5.5 * 60 * 60 * 1000); // UTC+5:30
  return {
    date: now.toISOString().slice(0, 10),
    hour: now.getUTCHours(),
  };
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function pairLine(p: MatchedPair): string {
  const kx = p.kxYes !== null ? (p.kxYes * 100).toFixed(1) : '?';
  const pm = p.pmYes !== null ? (p.pmYes * 100).toFixed(1) : '?';
  return `${esc(p.pm.question.slice(0, 70))}\nkx ${kx}¢ vs pm ${pm}¢ → <b>${(p.gapCents ?? 0).toFixed(1)}¢</b>`;
}

export async function runAlerts(snap: Snapshot): Promise<number> {
  const confident = snap.pairs.filter((p) => !p.needsReview);
  const crossing = confident
    .filter((p) => (p.gapCents ?? 0) >= THRESHOLD_CENTS)
    .sort((a, b) => (b.gapCents ?? 0) - (a.gapCents ?? 0))
    .slice(0, MAX_ALERTS_PER_RUN);

  let sent = 0;
  const now = Date.now();
  for (const p of crossing) {
    const key = p.kx.ticker + p.pm.id;
    const last = alertHistory.get(key) ?? 0;
    if (now - last < ALERT_COOLDOWN_MS) continue;
    alertHistory.set(key, now);

    const text =
      `<b>gap alert · ${(p.gapCents ?? 0).toFixed(1)}¢</b>\n` +
      pairLine(p) +
      `\n<a href="${kalshiUrl(p.kx)}">kalshi↗</a> · <a href="${polymarketUrl(p.pm) ?? ''}">polymarket↗</a>\n` +
      `live board: gap369`;
    if (await sendToChannel(text)) sent++;
  }
  return sent;
}

export async function maybeDigest(snap: Snapshot): Promise<boolean> {
  const { date, hour } = istNow();
  if (hour < DIGEST_HOUR_IST || lastDigestDate === date) return false;
  lastDigestDate = date;

  const top = snap.pairs
    .filter((p) => !p.needsReview && (p.gapCents ?? 0) > 0)
    .sort((a, b) => (b.gapCents ?? 0) - (a.gapCents ?? 0))
    .slice(0, 5);

  if (!top.length) return false;

  const lines = top.map(
    (p, i) => `${i + 1}. ${pairLine(p)}`
  );
  const text =
    `<b>gap369 daily · top gaps</b>\n\n` +
    lines.join('\n\n') +
    `\n\nscan of ${snap.kxCount} kalshi + ${snap.pmCount} polymarket markets · ${snap.pairs.length} pairs matched\n` +
    `not financial advice · verify on-venue before acting`;
  return sendToChannel(text);
}

// One scheduler tick: alerts + digest if due. Safe to call from anywhere.
export async function runCycle(): Promise<{ alerts: number; digest: boolean; telegram: boolean }> {
  if (!telegramConfigured()) return { alerts: 0, digest: false, telegram: false };
  const snap = await getSnapshot();
  const alerts = await runAlerts(snap);
  const digest = await maybeDigest(snap);
  return { alerts, digest, telegram: true };
}
