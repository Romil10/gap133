import { runCycle } from '../lib/notifier';

export const dynamic = 'force-dynamic';

export function startScheduler() {
  if (process.env.G369_SCHEDULER === 'off') return;
  // First tick after 2 min, then every 5 min. Idempotent: runCycle is a no-op
  // when Telegram isn't configured, and alerts are cooldown-guarded.
  setInterval(() => {
    runCycle().catch(() => {});
  }, 5 * 60 * 1000);
  setTimeout(() => {
    runCycle().catch(() => {});
  }, 2 * 60 * 1000);
}
