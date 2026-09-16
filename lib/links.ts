// Deep links to the venues. Polymarket gives us the full slug from the API;
// Kalshi market pages resolve from the raw ticker (kalshi.com/markets/<TICKER>).

import type { PMMarket } from './polymarket';
import type { KXMarket } from './kalshi';

export function polymarketUrl(m: PMMarket): string | null {
  return m.slug ? `https://polymarket.com/market/${m.slug}` : null;
}

export function kalshiUrl(m: KXMarket): string {
  return `https://kalshi.com/markets/${encodeURIComponent(m.ticker)}`;
}
