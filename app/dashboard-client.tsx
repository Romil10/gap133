'use client';

import { useEffect, useState } from 'react';
import { Snapshot } from '../lib/snapshot';
import { MatchedPair } from '../lib/matcher';

type SortKey = 'gap' | 'volume' | 'confidence';

export default function Dashboard({ snap }: { snap: Snapshot }) {
  const [sort, setSort] = useState<SortKey>('gap');
  const [pairs, setPairs] = useState<MatchedPair[]>(snap.pairs);
  const [meta, setMeta] = useState(snap);

  useEffect(() => {
    async function poll() {
      try {
        const res = await fetch('/api/snapshot', { cache: 'no-store' });
        if (res.ok) {
          const fresh: Snapshot = await res.json();
          setPairs(fresh.pairs);
          setMeta(fresh);
        }
      } catch {}
    }
    const t = setInterval(poll, 120_000);
    return () => clearInterval(t);
  }, []);

  const confident = pairs.filter((p) => !p.needsReview);
  const sorted = [...confident].sort((a, b) => {
    if (sort === 'gap') return (b.gapCents ?? -1) - (a.gapCents ?? -1);
    if (sort === 'volume') return (b.pm.volume24hr ?? 0) - (a.pm.volume24hr ?? 0);
    return b.score - a.score;
  });

  const gaps = confident.map((p) => p.gapCents ?? 0);
  const biggest = gaps.length ? Math.max(...gaps) : 0;
  const tradable = confident.filter((p) => (p.gapCents ?? 0) >= 2).length;
  const avgGap = gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 0;

  return (
    <>
      <header className="hdr">
        <div className="wrap hdr-in">
          <div className="logo">
            GAP<span>/</span>369
          </div>
          <nav className="hdr-nav">
            <a href="#terminal">Terminal</a>
            <a href="#pricing">Access</a>
          </nav>
        </div>
      </header>

      <div className="tick">
        <div className="wrap">
          live feed · fetched <b>{new Date(meta.fetchedAt).toISOString().slice(11, 19)}Z</b> ·{' '}
          <b>{meta.kxCount}</b> Kalshi + <b>{meta.pmCount}</b> Polymarket top markets scanned ·{' '}
          <b>{confident.length}</b> cross-venue pairs matched
        </div>
      </div>

      <main className="wrap">
        <section className="hero" id="terminal">
          <h1>One event. Two venues. Two prices.</h1>
          <p>
            gap369 surfaces the price difference between Polymarket and Kalshi on the same
            prediction markets, ranked in cents. Updated continuously from both venues' public
            order books. Data only, no trading, not financial advice.
          </p>
        </section>

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
            <span>Cross-venue divergence board</span>
            <span style={{ display: 'flex', gap: 10 }}>
              {(['gap', 'volume', 'confidence'] as SortKey[]).map((k) => (
                <button
                  key={k}
                  onClick={() => setSort(k)}
                  style={{
                    background: 'none',
                    border: sort === k ? '1px solid var(--accent)' : '1px solid transparent',
                    color: sort === k ? 'var(--accent)' : 'var(--muted)',
                    font: 'inherit',
                    cursor: 'pointer',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    padding: '2px 8px',
                  }}
                >
                  {k}
                </button>
              ))}
            </span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th style={{ width: '38%' }}>Event</th>
                  <th>Kalshi yes</th>
                  <th>Polymarket yes</th>
                  <th>Gap</th>
                  <th>PM 24h vol</th>
                  <th>Match</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((p) => (
                  <tr key={p.kx.ticker + p.pm.id}>
                    <td className="q">
                      <div className="main">{p.pm.question}</div>
                      <div className="sub">
                        KX {p.kx.eventTitle} · {p.kx.ticker}
                      </div>
                    </td>
                    <td className="price">{p.kxYes !== null ? `${(p.kxYes * 100).toFixed(1)}¢` : '—'}</td>
                    <td className="price">
                      {p.pmYes !== null ? `${(p.pmYes * 100).toFixed(1)}¢` : '—'}
                    </td>
                    <td className={`gapcell ${(p.gapCents ?? 0) >= 3 ? 'big' : ''}`}>
                      {p.gapCents !== null ? `${p.gapCents.toFixed(1)}¢` : '—'}
                    </td>
                    <td className="price">${Math.round(p.pm.volume24hr ?? 0).toLocaleString()}</td>
                    <td className="conf">{(p.score * 100).toFixed(0)}%</td>
                  </tr>
                ))}
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
                <li>Divergence board, 10-minute delayed</li>
                <li>Top 25 matched pairs</li>
                <li>Daily close snapshot</li>
              </ul>
              <a className="cta" href="#terminal" style={{ background: 'var(--panel-2)', border: '1px solid var(--line)' }}>
                You are here
              </a>
            </div>
            <div className="tier hot">
              <h3>Founding desk</h3>
              <div className="amt">
                $15<small> / month · crypto only</small>
              </div>
              <ul>
                <li>Live board, full pair list</li>
                <li>Realtime divergence + volume anomaly alerts</li>
                <li>Gap history charts per market</li>
                <li>API access (early)</li>
              </ul>
              <a className="cta" href="mailto:hello@gap369.xyz?subject=Founding desk access">
                Pay with crypto →
              </a>
            </div>
          </div>
          <div className="paynote">
            <b>Payment:</b> stablecoins (USDC / USDT), BTC, and ETH. Send to the address shown at
            checkout, paste your transaction hash and email, and the desk tier activates on
            confirmation, usually within the hour. No cards, no auto-renew: your month starts from
            payment. <b>Not financial advice.</b> Data attributable to Polymarket and Kalshi public
            APIs.
          </div>
        </section>
      </main>

      <footer className="ftr">
        <div className="wrap">
          gap369 · a data terminal for cross-venue prediction markets. Prices from
          Polymarket and Kalshi public APIs; venues own their marks. Nothing here is trading advice
          or a solicitation. Markets move: verify on-venue before acting. ·{' '}
          <a href="mailto:hello@gap369.xyz">contact</a>
        </div>
      </footer>
    </>
  );
}


