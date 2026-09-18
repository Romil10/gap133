import type { Metadata } from 'next';
import Link from 'next/link';
import { getTieredSnapshot } from '../../lib/snapshot';
import { SpiralMark } from '../spiral-mark';
import { polymarketUrl, kalshiUrl } from '../../lib/links';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Matching Audit',
  description:
    'Every cross-venue pair on gap133 with its match score, Jev probability, staleness and last-print ages. Transparency as a product.',
};

function age(ts: number | null | undefined): string {
  if (!ts) return 'unverified';
  const h = (Date.now() - ts) / 3_600_000;
  if (h < 1) return `${(h * 60).toFixed(0)}m ago`;
  if (h < 48) return `${h.toFixed(1)}h ago`;
  return `${(h / 24).toFixed(0)}d ago`;
}

export default async function AuditPage() {
  const snap = await getTieredSnapshot(true); // audit page shows everything, that's its point
  const conf = snap.pairs.filter((p) => !p.needsReview);
  const held = snap.pairs.filter((p) => p.needsReview && !p.jevDismissed);
  const dismissed = snap.pairs.filter((p) => p.jevDismissed);

  const row = (p: (typeof snap.pairs)[number], state: 'confident' | 'held' | 'dismissed') => {
    const cls = state === 'dismissed' ? 'dismissed' : state === 'held' ? 'held' : '';
    return (
      <tr key={p.kx.ticker + p.pm.id} className={cls}>
        <td className="aq">
          <div className="main">{p.pm.question}</div>
          <div className="sub">
            KX {p.kx.eventTitle} · {p.kx.ticker}
          </div>
        </td>
        <td className="num">{(p.score * 100).toFixed(0)}%</td>
        <td className="num">{p.jevProbability !== undefined ? p.jevProbability.toFixed(2) : '—'}</td>
        <td className="num">{p.kxLastTs ? age(p.kxLastTs) : 'unverified'}</td>
        <td className="num">{p.pmLastTs ? age(p.pmLastTs) : 'unverified'}</td>
        <td className="num">{p.netGap !== null ? `${p.netGap >= 0 ? '+' : ''}${p.netGap.toFixed(1)}¢` : '—'}</td>
        <td className="statecell">
          {state === 'confident' ? 'on board' : state === 'held' ? 'held (review)' : 'dismissed'}
        </td>
      </tr>
    );
  };

  return (
    <main className="wrap legal audit">
      <header className="guide-head">
        <Link href="/" className="backlink">&larr; back to the terminal</Link>
        <div className="guide-brand">
          <SpiralMark size={52} />
          <h1>Matching Audit</h1>
        </div>
        <p className="sub">
          Every pair the matcher produces, with its full paper trail: the deterministic match
          score, Jev&apos;s same-event probability, when each venue last printed, and where the
          pair ended up. Most terminals hide this layer. Ours is the product.
        </p>
      </header>

      <section>
        <h2>The three gates</h2>
        <p>
          A pair reaches the board only after passing three independent checks. First, the
          deterministic matcher: token overlap and sequence similarity, with hard blocks on
          cross-type questions (party vs person) and a demotion for nomination-vs-election wording.
          Second, Jev, a System One model that reads both markets&apos; resolution rules and returns
          a calibrated probability the two are the same event; promoted at 0.80, dismissed at 0.35.
          Third, the staleness gate: either venue silent for 24 hours demotes the pair, because a
          price that stopped moving is a fossil, not a quote.
        </p>
        <p>
          Counts right now: <b>{conf.length} on board</b>, <b>{held.length} held</b> (Jev
          uncertain), <b>{dismissed.length} dismissed</b> (different events). The board is small
          because the gate is strict; that is deliberate.
        </p>
      </section>

      <section>
        <h2>All pairs</h2>
        <div className="tblwrap">
          <table>
            <caption className="sr-only" style={{ position: 'absolute', left: -9999 }}>
              Full matching audit: every pair with scores and print ages
            </caption>
            <thead>
              <tr>
                <th scope="col">Pair</th>
                <th scope="col">Match</th>
                <th scope="col">Jev P</th>
                <th scope="col">KX printed</th>
                <th scope="col">PM printed</th>
                <th scope="col">Net</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {conf.map((p) => row(p, 'confident'))}
              {held.map((p) => row(p, 'held'))}
              {dismissed.map((p) => row(p, 'dismissed'))}
            </tbody>
          </table>
        </div>
      </section>

      <footer className="ftr">
        <p className="ftr-line1">
          gap133 matching audit · nothing here is trading advice or a solicitation.
        </p>
        <p className="ftr-line2">
          <Link href="/">terminal</Link> · <Link href="/guide">guide</Link> ·{' '}
          <Link href="/privacy">privacy</Link> · <Link href="/terms">terms</Link> ·{' '}
          <a href="https://t.me/gap133_alert" target="_blank" rel="noopener noreferrer">telegram</a>
        </p>
      </footer>
    </main>
  );
}
