// Deep links to the venues. Polymarket gives us the full slug from the API.
// Kalshi market pages need a human-edited 3-segment URL the API doesn't expose:
//   /markets/<series-slug>/<page-slug>/<lowercase-market-ticker>
// Verified 2026-09-16 (live browser): any <series-slug> + lowercase market
// ticker 302-redirects to the canonical event page, which lists every
// candidate market. Wrong first segment 404s; the series ticker lowercased
// works as the first segment (kalshi.com/markets/kxpresnomd/...).
// So: /markets/<lowercase-series>/<lowercase-market-ticker> redirects correctly.

import type { PMMarket } from './polymarket';
import type { KXMarket } from './kalshi';

export function polymarketUrl(m: PMMarket): string | null {
  return m.slug ? `https://polymarket.com/market/${m.slug}` : null;
}

export function kalshiUrl(m: KXMarket): string {
  // KXPRESNOMD-28-HCLI -> series KXPRESNOMD -> kalshi.com/markets/kxpresnomd/kxpresnomd-28-hcli
  const series = m.ticker.split('-')[0] ?? m.ticker;
  return `https://kalshi.com/markets/${series.toLowerCase()}/${m.ticker.toLowerCase()}`;
}
