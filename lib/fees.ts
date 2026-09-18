// Taker-fee models per venue, from the published schedules cited by
// PredictMarketCap's audit (2026-08-30). All functions take the YES price
// p in dollars (0-1) and return the taker fee in DOLLARS per $1 share.

// Kalshi: 0.07 * p * (1-p) per contract, rounded up per order (we ignore the
// per-order rounding; negligible at board sizes and conservative here).
export function kalshiTakerFee(p: number): number {
  const pc = Math.min(Math.max(p, 0), 1);
  return 0.07 * pc * (1 - pc);
}

// Polymarket: same shape, category rate r: 0.04 politics/finance/tech,
// 0.05 sports/economics/culture, 0.07 crypto; geopolitics fee-free.
export type PMCategory = 'politics' | 'sports' | 'economics' | 'culture' | 'crypto' | 'geopolitics' | 'other';

const PM_RATES: Record<PMCategory, number> = {
  politics: 0.04,
  sports: 0.05,
  economics: 0.05,
  culture: 0.05,
  crypto: 0.07,
  geopolitics: 0,
  other: 0.05, // unknown category: middle rate, conservative
};

export function pmCategory(eventTitle: string, question: string): PMCategory {
  const t = `${eventTitle} ${question}`.toLowerCase();
  if (/geopolit|war |invasion|cesfire|iraq|iran|russia|ukraine|china|taiwan|venezuela/.test(t)) return 'geopolitics';
  if (/crypto|bitcoin|ethereum|solana|token|memecoin|binance|coinbase/.test(t)) return 'crypto';
  if (/sport|nfl|nba|mlb|nhl|epl|ucl|fifa|world cup|premier league|ufc|tennis|f1|formula/.test(t)) return 'sports';
  if (/fed|rate|inflation|cpi|gdp|unemployment|jobs|recession|treasury|ecb|boj/.test(t)) return 'economics';
  if (/oscar|grammy|box office|movie|album|singer|celebrity|time person|nobel/.test(t)) return 'culture';
  if (/election|nominee|primary|presidential|senate|congress|governor|parliament|chancellor|prime minister/.test(t)) return 'politics';
  return 'other';
}

export function pmTakerFee(p: number, cat: PMCategory): number {
  const pc = Math.min(Math.max(p, 0), 1);
  return PM_RATES[cat] * pc * (1 - pc);
}

/**
 * Net gap in cents for a cross-venue arb: buy YES cheap on one venue, sell
 * (buy NO) on the other. Both legs pay taker. The net edge in cents =
 * raw gap − fee(cheap venue @ cheap price) − fee(rich venue @ rich price).
 * Returns null when either price is missing.
 */
export function netGapCents(
  kxYes: number | null,
  pmYes: number | null,
  kxCategory: PMCategory,
  pmCategoryValue: PMCategory
): { net: number | null; feeKx: number; feePm: number } {
  if (kxYes === null || pmYes === null) return { net: null, feeKx: 0, feePm: 0 };
  const rawCents = Math.abs(kxYes - pmYes) * 100;
  // the fee applies at each venue's own traded price
  const feeKx = kalshiTakerFee(kxYes) * 100;
  const feePm = pmTakerFee(pmYes, pmCategoryValue) * 100;
  return { net: rawCents - feeKx - feePm, feeKx, feePm };
}
