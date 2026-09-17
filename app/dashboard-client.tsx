'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Snapshot, TieredSnapshot } from '../lib/snapshot';
import type { MatchedPair } from '../lib/matcher';
import { polymarketUrl, kalshiUrl } from '../lib/links';
import { SpiralMark } from './spiral-mark';

type SortKey = 'gap' | 'volume' | 'confidence';
type Theme = 'daylight' | 'midnight' | 'chrome';

const POLL_MS = 120_000;
const THEME_KEY = 'gap133-theme';

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
export default function Dashboard({ snap, unlocked }: { snap: TieredSnapshot; unlocked: boolean }) {
  const [sort, setSort] = useState<SortKey>('gap');
  const [pairs, setPairs] = useState<MatchedPair[]>(snap.pairs);
  const [meta, setMeta] = useState<TieredSnapshot>(snap);
  const [refreshing, setRefreshing] = useState(false);
  const [nextIn, setNextIn] = useState(POLL_MS / 1000);
  // audit fix (A5): the review band is disclosed, not hidden
  const [showReview, setShowReview] = useState(false);
  // theme: daylight | midnight | chrome (chrome needs a desk key)
  const [theme, setTheme] = useState<Theme>('midnight');
  const chromeUnlocked = useRef(unlocked);
  const prevRef = useRef<Map<string, number>>(new Map());
  const [expanded, setExpanded] = useState<string | null>(null);

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
        const fresh: TieredSnapshot = await res.json();
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
  // search: keyword filter across question text, event title, and tickers
  const [query, setQuery] = useState('');
  const searching = query.trim().length > 0;
  const matchQuery = (p: MatchedPair, q: string): boolean => {
    const hay = `${p.pm.question} ${p.kx.eventTitle} ${p.kx.title} ${p.kx.ticker}`.toLowerCase();
    // every whitespace-separated term must appear (AND semantics)
    return q.toLowerCase().split(/\s+/).filter(Boolean).every((t) => hay.includes(t));
  };
  const filteredConf = useMemo(
    () => (searching ? confident.filter((p) => matchQuery(p, query)) : confident),
    [confident, query, searching]
  );
  const filteredRev = useMemo(
    () => (searching ? review.filter((p) => matchQuery(p, query)) : review),
    [review, query, searching]
  );
  const sorted = useMemo(() => {
    const pool = showReview ? filteredRev : filteredConf;
    const arr = [...pool];
    arr.sort((a, b) => {
      if (sort === 'gap') return (b.gapCents ?? -1) - (a.gapCents ?? -1);
      if (sort === 'volume') return (b.pm.volume24hr ?? 0) - (a.pm.volume24hr ?? 0);
      return b.score - a.score;
    });
    return arr;
  }, [filteredConf, filteredRev, showReview, sort]);

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

  // Deep-link highlight: /?m=<kx ticker> scrolls to and flashes that row.
  // Telegram digests and alerts link here per market.
  const [hlKey, setHlKey] = useState<string | null>(null);
  useEffect(() => {
    const m = new URLSearchParams(window.location.search).get('m');
    if (!m) return;
    const key = pairs.find((p) => p.kx.ticker.toUpperCase() === m.toUpperCase());
    if (!key) return;
    const k = key.kx.ticker + key.pm.id;
    setHlKey(k);
    const t = setTimeout(() => setHlKey(null), 6000);
    try { document.getElementById('row-' + k)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch {}
    return () => clearTimeout(t);
  }, [pairs]);

  return (
    <>
      <header className="hdr">
        <div className="wrap hdr-in">
          <div className="logo">
            <SpiralMark size={44} />
            <span className="logo-txt">
              GAP<span>/</span><b>133</b>
            </span>
          </div>
          <div className="hdr-right">
            <nav className="hdr-nav">
              <a href="/guide">Guide</a>
              <a href="#pricing">Access</a>
              <a href="https://t.me/gap133_alert" target="_blank" rel="noopener noreferrer" onClick={() => track('tg_click', 'header')}>Telegram↗</a>
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
            gap133 ranks the price difference between Polymarket and Kalshi on the same
            prediction markets. We cover the overlap: if it trades on both venues, it&apos;s on
            the board; if it doesn&apos;t yet, it&apos;s in the watch below. Scanned every 2
            minutes. Data only, no trading, not financial advice.
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
        {!unlocked && meta.totalPairs > meta.pairs.length && (
          <div className="notice upsell" role="status">
            Free tier: top {meta.pairs.length} of {meta.totalPairs} pairs,
            {' '}{meta.delayed ? 'delayed 10 minutes' : 'warming up the delay buffer'}. The desk
            tier gets every pair live, gap alerts, history and API.
            <a href="#pricing" onClick={() => track('upsell_click')}>see the desk tier</a>
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
            <span>
              {searching
                ? `Search: ${sorted.length} result${sorted.length === 1 ? '' : 's'} for "${query}"`
                : showReview
                  ? 'Review band (held back from the main board)'
                  : 'Cross-venue divergence board'}
            </span>
            <span className="board-ctl">
              <input
                type="search"
                className="searchbox"
                placeholder="search markets…"
                value={query}
                onChange={(e) => { setQuery(e.target.value); if (!searching && e.target.value) track('search'); }}
                aria-label="Search markets by keyword"
              />
              <span className="sortbtns">
                {(['gap', 'volume', 'confidence'] as SortKey[]).map((k) => (
                  <button key={k} className={sort === k ? 'on' : ''} onClick={() => { setSort(k); track('sort', k); }}>
                    {k}
                  </button>
                ))}
              </span>
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
                  const rowKey = p.kx.ticker + p.pm.id;
                  return (
                    <RowWithDrawer
                      key={rowKey}
                      rowKey={rowKey}
                      p={p}
                      rowId={'row-' + rowKey}
                      className={`${flashClass(p)} ${hlKey === rowKey ? 'hl' : ''}`}
                      expanded={expanded === rowKey}
                      onToggle={() => {
                        const next = expanded === rowKey ? null : rowKey;
                        setExpanded(next);
                        if (next) track('chart_open', p.kx.ticker);
                      }}
                    >
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
                            onClick={(e) => { e.stopPropagation(); track('venue_click', 'pm'); }}
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
                          onClick={(e) => { e.stopPropagation(); track('venue_click', 'kx'); }}
                        >
                          KX↗
                        </a>
                      </td>
                    </RowWithDrawer>
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

        {meta.watch && meta.watch.length > 0 && !searching && (
          <div className="panel">
            <div className="panel-h">
              <span>Single-venue watch · hottest markets the overlap hasn&apos;t reached yet</span>
            </div>
            <div className="watchgrid">
              {meta.watch.slice(0, 8).map((w, i) => (
                <a
                  key={i}
                  className="watchitem"
                  href={w.venueUrl}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  onClick={() => track('watch_click', w.venue)}
                >
                  <div className="wq">{w.title}</div>
                  <div className="wv">
                    {w.venue === 'kx' ? 'kalshi' : 'polymarket'} · ${Math.round(w.volume).toLocaleString()} · awaiting the other venue
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

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
                $17<small> / month · crypto only</small>
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
                href="mailto:hello@gap133.xyz?subject=Founding desk access"
                onClick={() => track('cta_click', 'founding_desk')}
              >
                Pay with crypto →
              </a>
              <p className="tier-sub">
                Free alerts land in the Telegram channel first:{' '}
                <a
                  href="https://t.me/gap133_alert"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => track('tg_click', 'pricing')}
                >t.me/gap133_alert↗</a>
              </p>
            </div>
          </div>
          <div className="paynote">
            <b>Payments:</b> founding-desk seats are settled in crypto (USDC / USDT / BTC / ETH).
            Checkout is currently manual while wallets are being wired: email{' '}
            <a href="mailto:hello@gap133.xyz">hello@gap133.xyz</a>{' '}
            and you get a payment address back, your month starts from on-chain confirmation. No
            cards, no auto-renew. <b>Not financial advice.</b> Data from the Polymarket and Kalshi
            public APIs; venues own their marks.
          </div>
        </section>
      </main>

      <footer className="ftr">
        <div className="wrap">
          <p className="ftr-line1">
            gap133 · a data terminal for cross-venue prediction markets. Nothing here is trading
            advice or a solicitation. Markets move: verify on-venue before acting.
          </p>
          <p className="ftr-line2">
            <a href="/guide">guide</a> · <a href="/privacy">privacy</a> ·{' '}
            <a href="/terms">terms</a> ·{' '}
            <a href="https://t.me/gap133_alert" target="_blank" rel="noopener noreferrer" onClick={() => track('tg_click', 'footer')}>telegram</a> ·{' '}
            <a href="mailto:hello@gap133.xyz">contact</a>
          </p>
        </div>
      </footer>
    </>
  );
}

/* ---------------- expandable row with analytics drawer ---------------- */

interface GapPoint { t: number; kx: number | null; pm: number | null; gap: number | null; }
interface VolumePoint { t: number; kxVol: number | null; pmVol: number | null; }

function RowWithDrawer({
  rowKey, p, rowId, className, expanded, onToggle, children,
}: {
  rowKey: string;
  p: MatchedPair;
  rowId: string;
  className: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <>
      <tr id={rowId} className={`${className} ${expanded ? 'exp' : ''}`} onClick={onToggle} style={{ cursor: 'pointer' }} title="Click for market analytics">
        {children}
      </tr>
      {expanded && (
        <tr className="drawer-tr">
          <td colSpan={7} style={{ padding: 0 }}>
            <Drawer p={p} rowKey={rowKey} />
          </td>
        </tr>
      )}
    </>
  );
}

function Drawer({ p, rowKey }: { p: MatchedPair; rowKey: string }) {
  const [data, setData] = useState<{ gap: GapPoint[]; volume: VolumePoint[] } | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let dead = false;
    const params = new URLSearchParams({
      kx: p.kx.ticker,
      pmclob: p.pm.clobTokenIds ?? '',
      pmid: p.pm.id,
      kxtitle: p.kx.title ?? '',
      kxevent: p.kx.eventTitle ?? '',
    });
    fetch(`/api/market-history?${params}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('fetch failed'))))
      .then((d) => { if (!dead) setData({ gap: d.gap, volume: d.volume }); })
      .catch(() => { if (!dead) setErr(true); });
    return () => { dead = true; };
  }, [p.kx.ticker, p.pm.clobTokenIds, p.pm.id, p.kx.title, p.kx.eventTitle]);

  return (
    <div className="drawer" onClick={(e) => e.stopPropagation()}>
      <div className="dcharts">
        <div className="dchart">
          <div className="dlabel">gap · last 7 days (cents)</div>
          {err && <div className="dempty">history unavailable for this pair right now</div>}
          {!err && !data && <div className="dempty">loading history…</div>}
          {data && <GapChart points={data.gap} />}
        </div>
        <div className="dchart">
          <div className="dlabel">each venue · last 7 days (¢)</div>
          {data && <VenueChart points={data.gap} />}
        </div>
        <div className="dchart">
          <div className="dlabel">kalshi volume · hourly</div>
          {data && <VolumeChart points={data.volume} />}
        </div>
      </div>
      <div className="dmeta">
        <span>match confidence {(p.score * 100).toFixed(0)}%</span>
        <span>{p.kx.ticker}</span>
        <span>kalshi {fmtPct(p.kxYes)} · polymarket {fmtPct(p.pmYes)}</span>
      </div>
    </div>
  );
}

function path(points: { x: number; y: number }[]): string {
  if (!points.length) return '';
  return points.map((pt, i) => `${i === 0 ? 'M' : 'L'}${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(' ');
}

function GapChart({ points }: { points: GapPoint[] }) {
  const W = 420, H = 110, PAD = 6;
  const valid = points.filter((pt) => pt.gap !== null);
  if (valid.length < 2) return <div className="dempty">not enough history yet</div>;
  const t0 = valid[0].t, t1 = valid[valid.length - 1].t;
  const maxGap = Math.max(1, ...valid.map((v) => v.gap ?? 0));
  const X = (t: number) => PAD + ((t - t0) / Math.max(1, t1 - t0)) * (W - 2 * PAD);
  const Y = (g: number) => H - PAD - (g / maxGap) * (H - 2 * PAD);
  const line = path(valid.map((v) => ({ x: X(v.t), y: Y(v.gap ?? 0) })));
  const area = `${line} L${X(valid[valid.length - 1].t)},${H - PAD} L${X(valid[0].t)},${H - PAD} Z`;
  const last = valid[valid.length - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart" preserveAspectRatio="none">
      <path d={area} fill="var(--accent)" opacity="0.12" />
      <path d={line} fill="none" stroke="var(--accent)" strokeWidth="2" />
      <circle cx={X(last.t)} cy={Y(last.gap ?? 0)} r="3.5" fill="var(--accent)" />
      <text x={PAD} y={12} className="chart-y">{maxGap.toFixed(1)}¢</text>
      <text x={PAD} y={H - PAD - 4} className="chart-y">0¢</text>
    </svg>
  );
}

function VenueChart({ points }: { points: GapPoint[] }) {
  const W = 420, H = 110, PAD = 6;
  const valid = points.filter((pt) => pt.kx !== null || pt.pm !== null);
  if (valid.length < 2) return <div className="dempty">not enough history yet</div>;
  const t0 = valid[0].t, t1 = valid[valid.length - 1].t;
  const X = (t: number) => PAD + ((t - t0) / Math.max(1, t1 - t0)) * (W - 2 * PAD);
  const Y = (p: number) => H - PAD - p * (H - 2 * PAD);
  const kxLine = path(valid.filter((v) => v.kx !== null).map((v) => ({ x: X(v.t), y: Y(v.kx ?? 0) })));
  const pmLine = path(valid.filter((v) => v.pm !== null).map((v) => ({ x: X(v.t), y: Y(v.pm ?? 0) })));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart" preserveAspectRatio="none">
      <path d={kxLine} fill="none" stroke="var(--amber)" strokeWidth="2" />
      <path d={pmLine} fill="none" stroke="var(--green)" strokeWidth="2" strokeDasharray="4 3" />
      <text x={PAD} y={12} className="chart-y"><tspan fill="var(--amber)">kx</tspan> <tspan fill="var(--green)">pm</tspan></text>
    </svg>
  );
}

function VolumeChart({ points }: { points: VolumePoint[] }) {
  const W = 420, H = 110, PAD = 6;
  const valid = points.filter((pt) => (pt.kxVol ?? 0) > 0);
  if (valid.length < 2) return <div className="dempty">no volume data yet</div>;
  const maxV = Math.max(...valid.map((v) => v.kxVol ?? 0));
  const bw = (W - 2 * PAD) / valid.length;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart" preserveAspectRatio="none">
      {valid.map((v, i) => {
        const h = ((v.kxVol ?? 0) / maxV) * (H - 2 * PAD);
        return <rect key={i} x={PAD + i * bw} y={H - PAD - h} width={Math.max(1, bw - 1)} height={h} fill="var(--amber)" opacity="0.7" />;
      })}
      <text x={PAD} y={12} className="chart-y">{Math.round(maxV).toLocaleString()}</text>
    </svg>
  );
}

