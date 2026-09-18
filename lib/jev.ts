// Jev System One match-verification layer, via OpenRouter's Decisions API.
// Reviews the matcher's review band: are these two markets REALLY the same
// event? One noul question per pair, calibrated probability back, verdict
// cached in Postgres (match_verdicts) so each pair is judged once.

// OpenRouter route: https://openrouter.ai/api/alpha/decisions
// Model: ~typesafe/jev-latest (redirects to the newest Jev)
const JEV_URL = 'https://openrouter.ai/api/alpha/decisions';
const JEV_MODEL = '~typesafe/jev-latest';

export interface JevVerdict {
  probability: number; // 0-1: probability the two markets are the same event
  judgedBy: 'jev';
}

function jevConfigured(): boolean {
  return !!process.env.OPENROUTER_API_KEY;
}

/** Ask Jev: is this Kalshi market and this Polymarket market the same event? */
export async function jevSameEvent(
  kxTitle: string,
  kxEvent: string,
  kxRules: string | null,
  pmQuestion: string,
  pmDescription: string | null
): Promise<JevVerdict | null> {
  if (!jevConfigured()) return null;

  const state = {
    kalshi_market: { market_title: kxTitle, event_title: kxEvent, resolution_rules: kxRules ?? '(not provided)' },
    polymarket_market: { question: pmQuestion, description: pmDescription ?? '(not provided)' },
  };

  try {
    const res = await fetch(JEV_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'X-OpenRouter-Title': 'gap133',
      },
      body: JSON.stringify({
        model: JEV_MODEL,
        state,
        questions: {
          sameEvent: {
            type: 'noul',
            instructions:
              'Do these two prediction markets resolve on the SAME real-world event, with the same outcome definition, deadline semantics, and settlement source? Judge strictly: if the wording could mean different things (nominee vs election winner, different deadlines, different resolution sources), that counts as NOT the same.',
            criteria: {
              true: 'Same real-world event, same outcome semantics, compatible deadlines and settlement',
              false: 'Different events, different outcome definitions, incompatible deadlines or settlement sources',
            },
          },
        },
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return null;
    const d: any = await res.json();
    const p = d?.answers?.sameEvent?.noul;
    return typeof p === 'number' ? { probability: p, judgedBy: 'jev' } : null;
  } catch {
    return null;
  }
}
