'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Snapshot } from '../lib/snapshot';
import type { MatchedPair } from '../lib/matcher';
import { polymarketUrl, kalshiUrl } from '../lib/links';

type SortKey = 'gap' | 'volume' | 'confidence';
type Theme = 'daylight' | 'midnight' | 'chrome';

const POLL_MS = 120_000;
const THEME_KEY = 'gap369-theme';

function fmtPct(v: number | null): string {
  return v !== null ? `${(v * 100).toFixed(1)}¢` : '—';
}

// first-party event tracking: fire-and-forget, no PII, no third party
function track(e: string, d?: string) {
  try {
    fetch('/api/track', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ e, d }),
      keepalive: true,
    }).catch(() => {});
  } catch {}
}

// Desk-key access is server-checked via the httpOnly cookie set by /api/unlock;
// the page passes `unlocked` down so the theme switch reflects real access.
export default function Dashboard({ snap, unlocked }: { snap: Snapshot; unlocked: boolean }) {
  const [sort, setSort] = useState<SortKey>('gap');
  const [pairs, setPairs] = useState<MatchedPair[]>(snap.pairs);
  const [meta, setMeta] = useState<Snapshot>(snap);
  const [refreshing, setRefreshing] = useState(false);
  const [nextIn, setNextIn] = useState(POLL_MS / 1000);
  // audit fix (A5): the review band is disclosed, not hidden
  const [showReview, setShowReview] = useState(false);
  // theme: daylight | midnight | chrome (chrome needs a desk key)
  const [theme, setTheme] = useState<Theme>('midnight');
  const chromeUnlocked = useRef(unlocked);
  const prevRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY) as Theme | null;
      if (saved) {
        if (saved === 'chrome' && !chromeUnlocked.current) { localStorage.removeItem(THEME_KEY); }
        else { setTheme(saved); document.documentElement.dataset.theme = saved; return; }
      }
    } catch {}
    const prefersLight = window.matchMedia?.('(prefers-color-scheme: light)').matches;
    const initial: Theme = prefersLight ? 'daylight' : 'midnight';
    setTheme(initial);
    document.documentElement.dataset.theme = initial;
  }, []);

  const applyTheme = (t: Theme) => {
    if (t === 'chrome' && !chromeUnlocked.current) {
      track('chrome_locked');
      return;
    }
    setTheme(t);
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem(THEME_KEY, t); } catch {}
    track('theme', t);
  };

  const poll = async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/snapshot', { cache: 'no-store' });
      if (res.ok) {
        const fresh: Snapshot = await res.json();
        prevRef.current = new Map(pairs.map((p) => [p.kx.ticker + p.pm.id, p.gapCents ?? 0]));
        setPairs(fresh.pairs);
        setMeta(fresh);
        setNextIn(POLL_MS / 1000);
      }
    } catch {
      // audit fix (A6): poll failure keeps data but the scan chip shows staleness
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const t = setInterval(poll, POLL_MS);
    const c = setInterval(() => setNextIn((n) => (n > 0 ? n - 1 : 0)), 1000);
    return () => { clearInterval(t); clearInterval(c); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const confident = useMemo(() => pairs.filter((p) => !p.needsReview), [pairs]);
  const review = useMemo(() => pairs.filter((p) => p.needsReview), [pairs]);
  const sorted = useMemo(() => {
    const arr = [...(showReview ? review : confident)];
    arr.sort((a, b) => {
      if (sort === 'gap') return (b.gapCents ?? -1) - (a.gapCents ?? -1);
      if (sort === 'volume') return (b.pm.volume24hr ?? 0) - (a.pm.volume24hr ?? 0);
      return b.score - a.score;
    });
    return arr;
  }, [confident, review, showReview, sort]);

  const gaps = confident.map((p) => p.gapCents ?? 0);
  const biggest = gaps.length ? Math.max(...gaps) : 0;
  const tradable = confident.filter((p) => (p.gapCents ?? 0) >= 2).length;
  const avgGap = gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 0;

  // ticker items: 10 widest gaps, doubled for seamless marquee
  const tickerItems = useMemo(() => {
    const top = [...confident]
      .filter((p) => (p.gapCents ?? 0) > 0)
      .sort((a, b) => (b.gapCents ?? 0) - (a.gapCents ?? 0))
      .slice(0, 10);
    return top;
  }, [confident]);

  const flashClass = (p: MatchedPair): string => {
    const prev = prevRef.current.get(p.kx.ticker + p.pm.id);
    if (prev === undefined || p.gapCents === null) return '';
    if (p.gapCents > prev) return 'flash-up'; // gap widened
    if (p.gapCents < prev) return 'flash-down'; // gap narrowed
    return '';
  };

  const feedBad = !meta.pmHealthy || !meta.kxHealthy;
  const staleAge = Date.now() - new Date(meta.fetchedAt).getTime();

  return (
    <>
      <header className="hdr">
        <div className="wrap hdr-in">
          <div className="logo">
            <span className="live-dot" aria-hidden="true" />
            GAP<span>/</span>369
          </div>
          <div className="hdr-right">
            <nav className="hdr-nav">
              <a href="#terminal">Terminal</a>
              <a href="#pricing">Access</a>
            </nav>
            <div className="themesw" role="group" aria-label="Theme">
              <button className={theme === 'daylight' ? 'on' : ''} onClick={() => applyTheme('daylight')} title="Daylight">Day</button>
              <button className={theme === 'midnight' ? 'on' : ''} onClick={() => applyTheme('midnight')} title="Midnight Tape">Nite</button>
              <button
                className={theme === 'chrome' ? 'on' : ''}
                onClick={() => applyTheme('chrome')}
                title={chromeUnlocked.current ? 'Chrome Ledger' : 'Chrome Ledger: desk-key holders only'}
              >
                {chromeUnlocked.current ? 'Chrome' : 'Chrome🔒'}
              </button>
            </div>
            <span
              className={`scanchip ${refreshing ? 'refreshing' : ''}`}
              title={staleAge > 10 * 60_000 ? 'Feed may be stale' : 'Time to next scan'}
            >
              <span className="ring" aria-hidden="true" />
              <span className="lbl">{refreshing ? 'scanning' : `next scan ${Math.floor(nextIn / 60)}:${String(nextIn % 60).padStart(2, '0')}`}</span>
            </span>
          </div>
        </div>
      </header>

      {tickerItems.length > 0 && (
        <div className="gapticker" aria-hidden="true">
          <div className="gapticker-track">
            {[...tickerItems, ...tickerItems].map((p, i) => (
              <span className="gi" key={i}>
                <b>{p.pm.question.slice(0, 42)}{p.pm.question.length > 42 ? '…' : ''}</b>{' '}
                <span className="gv" style={{ color: (p.gapCents ?? 0) >= 3 ? 'var(--red)' : 'var(--amber)' }}>
                  {(p.gapCents ?? 0).toFixed(1)}¢
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      <main className="wrap">
        <section className="hero" id="terminal">
          <h1>
            One event. Two venues. <span className="hl">One number matters: the gap.</span>
          </h1>
          <p>
            gap369 ranks the live price difference between Polymarket and Kalshi on the same
            prediction markets. Scanned every 2 minutes from both venues&apos; public order books.
            Data only, no trading, not financial advice.
          </p>
        </section>

        {feedBad && (
          <div className="notice bad" role="alert">
            A venue feed is down (Kalshi {meta.kxHealthy ? 'ok' : 'failing'} · Polymarket{' '}
            {meta.pmHealthy ? 'ok' : 'failing'}). Showing the last good board rather than an empty one.
          </div>
        )}
        {!feedBad && review.length > 0 && (
          <div className="notice" role="status">
            Showing {confident.length} high-confidence pairs. {review.length} more matched below
            confidence and are held back (including any implausibly wide gap, which usually means
            mismatched questions).
            <button onClick={() => setShowReview(!showReview)}>
              {showReview ? 'hide review band' : 'inspect them'}
            </button>
          </div>
        )}

        <div className="statrow">
          <div className="stat">
            <div className="k">Pairs matched</div>
            <div className="v">{confident.length}</div>
          </div>
          <div className="stat">
            <div className="k">Biggest gap now</div>
            <div className="v gap">{biggest.toFixed(1)}¢</div>
          </div>
          <div className="stat">
            <div className="k">Gaps ≥ 2¢</div>
            <div className="v">{tradable}</div>
          </div>
          <div className="stat">
            <div className="k">Avg gap</div>
            <div className="v">{avgGap.toFixed(2)}¢</div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-h">
            <span>{showReview ? 'Review band (held back from the main board)' : 'Cross-venue divergence board'}</span>
            <span className="sortbtns">
              {(['gap', 'volume', 'confidence'] as SortKey[]).map((k) => (
                <button key={k} className={sort === k ? 'on' : ''} onClick={() => setSort(k)}>
                  {k}
                </button>
              ))}
            </span>
          </div>
          <div className="tblwrap">
            <table>
              <caption className="sr-only" style={{ position: 'absolute', left: -9999 }}>
                Price gaps between Kalshi and Polymarket on matched prediction markets
              </caption>
              <thead>
                <tr>
                  <th style={{ width: '38%' }} scope="col">Event</th>
                  <th scope="col">Kalshi yes</th>
                  <th scope="col">Polymarket yes</th>
                  <th scope="col">Gap</th>
                  <th scope="col">PM 24h vol</th>
                  <th scope="col">Match</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((p) => {
                  const gap = p.gapCents ?? 0;
                  const reviewNote = p.reviewReason;
                  return (
                    <tr key={p.kx.ticker + p.pm.id} className={flashClass(p)}>
                      <td className="q">
                        <div className="main">{p.pm.question}</div>
                        <div className="sub">
                          KX {p.kx.eventTitle} · {p.kx.ticker}
                          {reviewNote ? ` · ${reviewNote}` : ''}
                        </div>
                      </td>
                      <td className="price">{fmtPct(p.kxYes)}</td>
                      <td className="price">{fmtPct(p.pmYes)}</td>
                      <td>
                        <div className={`gapmain ${gap >= 3 ? 'down' : gap >= 1 ? '' : 'up'}`}>
                          {p.gapCents !== null ? `${gap.toFixed(1)}¢` : '—'}
                        </div>
                        <div className={`gapbar ${gap >= 3 ? 'big' : ''}`} aria-hidden="true">
                          <i style={{ width: `${Math.min(100, (gap / 6) * 100)}%` }} />
                        </div>
                      </td>
                      <td className="price">${Math.round(p.pm.volume24hr ?? 0).toLocaleString()}</td>
                      <td className="conf">{(p.score * 100).toFixed(0)}%</td>
                      <td className="venue-links">
                        {p.pm.slug && (
                          <a
                            href={polymarketUrl(p.pm) ?? '#'}
                            target="_blank"
                            rel="noopener noreferrer nofollow"
                            className="vlink"
                            title="Open on Polymarket"
                            onClick={() => track('venue_click', 'pm')}
                          >
                            PM↗
                          </a>
                        )}
                        <a
                          href={kalshiUrl(p.kx)}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          className="vlink"
                          title="Open on Kalshi"
                          onClick={() => track('venue_click', 'kx')}
                        >
                          KX↗
                        </a>
                      </td>
                    </tr>
                  );
                })}
                {sorted.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ color: 'var(--muted)', padding: 24 }}>
                      No pairs in this view right now. The scanner refreshes every 2 minutes.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <section id="pricing" style={{ paddingTop: 30 }}>
          <div className="hero" style={{ paddingBottom: 4 }}>
            <h1 style={{ fontSize: 20 }}>Access</h1>
          </div>
          <div className="pricing">
            <div className="tier">
              <h3>Observer</h3>
              <div className="amt">
                Free<small> / forever</small>
              </div>
              <ul>
                <li>Full divergence board, 10-minute delayed</li>
                <li>Daily close snapshot</li>
              </ul>
              <a className="cta ghost" href="#terminal">You are here</a>
            </div>
            <div className="tier hot">
              <h3>Founding desk</h3>
              <div className="amt">
                $15<small> / month · crypto only</small>
              </div>
              <ul>
                <li>Live board (no delay), gap alert thresholds</li>
                <li>Gap history charts per market</li>
                <li>API access (early)</li>
                <li className="chrome-note">
                  <span className="chrome-swatch" aria-hidden="true" />
                  Chrome Ledger terminal skin (desk-key perk)
                </li>
              </ul>
              <a
                className="cta"
                href="mailto:hello@gap369.xyz?subject=Founding desk access"
                onClick={() => track('cta_click', 'founding_desk')}
              >
                Pay with crypto →
              </a>
            </div>
          </div>
          <div className="paynote">
            <b>Payments:</b> founding-desk seats are settled in crypto (USDC / USDT / BTC / ETH).
            Checkout is currently manual while wallets are being wired: email{' '}
            <a href="mailto:hello@gap369.xyz" style={{ color: 'var(--accent)' }}>hello@gap369.xyz</a>{' '}
            and you get a payment address back, your month starts from on-chain confirmation. No
            cards, no auto-renew. <b>Not financial advice.</b> Data from the Polymarket and Kalshi
            public APIs; venues own their marks.
          </div>
        </section>
      </main>

      <footer className="ftr">
        <div className="wrap">
          gap369 · a data terminal for cross-venue prediction markets. Nothing here is trading
          advice or a solicitation. Markets move: verify on-venue before acting. ·{' '}
          <a href="mailto:hello@gap369.xyz">contact</a>
        </div>
      </footer>
    </>
  );
}
