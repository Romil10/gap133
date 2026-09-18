import type { Metadata } from 'next';
import Link from 'next/link';
import { SpiralMark } from '../spiral-mark';

export const metadata: Metadata = {
  title: 'Field Guide - gap133',
  description:
    'What gap133 is, what the terminal shows, how to benefit from cross-venue gaps, free vs paid, and frequently asked questions.',
};

const FAQ: { q: string; a: string }[] = [
  {
    q: 'Do I need a wallet or exchange account to use gap133?',
    a: 'No. gap133 is read-only. It never asks for your wallet, your keys, your seed phrase, or an exchange login. Nothing on this site can move your money. You always trade on the venues themselves, through their own apps.',
  },
  {
    q: 'Is this financial advice?',
    a: 'No. gap133 shows you a price difference and nothing else. What you do with it is your decision. Prediction markets involve real risk, including the risk of losing everything you stake. Nothing here is trading advice or a solicitation.',
  },
  {
    q: 'Why do prices differ between Polymarket and Kalshi at all?',
    a: 'Different audiences, different capital, different speeds. Kalshi is a US-regulated exchange settled in dollars; Polymarket is a crypto-native venue settled in USDC and restricted for US traders. Different participants see different news, at different times, with different risk appetites. The disagreement is structural, which is why it keeps appearing.',
  },
  {
    q: 'Is trading the gap risk-free?',
    a: 'No, and be suspicious of anyone who says otherwise. Capturing a gap usually means holding positions on both venues, which introduces settlement timing, fee, and venue-risk considerations. gap133 shows you the signal; managing risk stays your job.',
  },
  {
    q: 'How often does the data update?',
    a: 'The scanner runs every 2 minutes. Free-tier displays are delayed by 10 minutes. Paid desks see the latest scan immediately.',
  },
  {
    q: 'What does the Match percentage mean?',
    a: "It is our matcher's confidence that the two rows are really the same event. Matching is done by title and meaning, and it is deliberately conservative: anything scoring under 65 percent is held out of the main board, and any pair showing an implausibly wide gap (25 cents or more) is demoted automatically, because wide gaps almost always mean the questions are subtly different (a nominee market versus an election-winner market, for example). We would rather hide a real gap than show you a fake one.",
  },
  {
    q: 'What do Net and Size mean?',
    a: 'Net is the gap minus both venues taker fees at their actual traded prices (Kalshi and Polymarket publish different fee schedules; geopolitics questions on Polymarket are fee-free). The net + badge means the gap survives real costs. Size is how much you could put on cross-venue at top of book: the smaller of the two order-book legs. Together they answer the only two questions that matter about a gap: is it real after costs, and is it real at size.',
  },
  {
    q: 'What does the Live column mean?',
    a: 'A green both live badge means both venues printed a trade within the last 24 hours. If one side has gone quiet, the row is marked stale and demoted to grey: a price that stopped moving is a fossil, not a quote. This gate exists because showing stale prices next to live ones is how scanners manufacture fake gaps.',
  },
  {
    q: 'How do I know the pairs are really the same event?',
    a: 'Three gates. A deterministic matcher proposes the match, then Jev (a probabilistic decision model) reads both markets resolution rules and assigns a calibrated probability the two are the same event; below 0.80 a pair never reaches the board, and different-event pairs are dismissed permanently. Then the staleness gate checks both venues are still printing. The full evidence trail for every pair is public on the matching audit page.',
  },
  {
    q: 'Why can I not see some pairs on the board?',
    a: 'They are in the review band: pairs the matcher proposed but the gates did not clear. The matching audit page shows all of them with their scores, Jev probabilities, and dismissal state. Transparency about what we are unsure of is a feature, not a bug.',
  },
  {
    q: 'A row disappeared or changed since I last looked. Why?',
    a: 'Markets close and resolve; volumes shift; the matcher improves. The board is a live view, not a history. Paid desks get per-market history charts, which is where the past lives.',
  },
  {
    q: 'The site looks completely different in another tab. Why?',
    a: 'You found the theme switcher in the header. Day is Daylight (light theme), Nite is Midnight Tape (dark theme). Chrome is the desk-keyholders skin; the padlock means it needs a paid key. Your choice is remembered on this device.',
  },
  {
    q: 'I paid. When do I get access?',
    a: 'Your desk key is sent after your transaction confirms on-chain, usually within the hour. Visit the unlock link in that email once, and paid access stays active in that browser for 30 days.',
  },
  {
    q: 'How do I get a refund?',
    a: 'Email hello@gap133.xyz within 7 days of payment and we will sort it out. We would rather refund fast than have an unhappy desk holder.',
  },
  {
    q: 'Is this available in my country?',
    a: 'gap133 is a data service and works anywhere the site loads. But the venues themselves have their own restrictions: Polymarket restricts US traders, and Kalshi serves US residents. Check your venues terms before you trade. gap133 shows data; it does not grant trading access.',
  },
  {
    q: 'Who built this?',
    a: 'gap133 is an independent, bootstrapped product. No VC, no token, no roadmap promises. It makes money the honest way: people pay for the data because it is worth paying for.',
  },
];

export default function Guide() {
  return (
    <main className="wrap guide">
      <header className="guide-head">
        <Link href="/" className="backlink">&larr; back to the terminal</Link>
        <div className="guide-brand">
          <SpiralMark size={52} />
          <h1>Field Guide</h1>
        </div>
        <p className="sub">What this is, what it shows, and how to use it. Five minutes, no jargon.</p>
      </header>

      <section>
        <h2>What gap133 is</h2>
        <p>
          gap133 is a cross-venue prediction market terminal. It watches two of the largest
          prediction markets in the world, Polymarket and Kalshi, at the same time, and shows you
          one number most traders never see clearly: the price gap on the same event between the
          two venues.
        </p>
        <p>
          Prediction markets are exchanges where people trade on the outcomes of real events:
          elections, Fed decisions, sports, crypto prices. Prices are quoted in cents, and a price
          of 42&cent; means the market believes there is a 42 percent chance of that outcome.
          Polymarket and Kalshi are the two biggest venues. They are open to different audiences,
          run on different infrastructure, and are priced by different crowds. So the same
          real-world event often trades at two different prices at the same moment.
        </p>
        <p>
          That difference is the gap. gap133 finds it, measures it in cents, then does the two
          things other scanners skip: it subtracts the taker fees so you see the net edge, and it
          reads both order books so you see the size you could actually put on. It refreshes the
          whole board continuously, and it publishes its own matching evidence so you can check
          the checker.
        </p>
      </section>

      <section>
        <h2>What the terminal shows</h2>
        <p>Every row on the board is one prediction market matched across both venues:</p>
        <ul>
          <li><b>Event:</b> the question being traded, with the Kalshi market ID underneath.</li>
          <li><b>Kalshi yes:</b> the current YES price on Kalshi, in cents.</li>
          <li><b>Polymarket yes:</b> the current YES price on Polymarket, in cents.</li>
          <li><b>Gap:</b> the raw difference between the two, in cents. The bar under the figure shows relative width at a glance.</li>
          <li><b>Net:</b> the gap minus both venues&apos; taker fees at their actual traded prices. The <b>net&nbsp;+</b> badge appears only when a gap survives real costs — the figure most scanners leave out.</li>
          <li><b>Size:</b> how much you could actually put on cross-venue at top of book, in notional dollars. A 3¢ gap with $400 behind it is a rounding error; the same gap with $40,000 is a trade.</li>
          <li><b>Live:</b> both venues printed a trade within the last 24 hours (green <b>both live</b>), or one side has gone quiet and the row is demoted to grey (<b>stale</b>). A price that stopped moving is a fossil, not a quote.</li>
          <li><b>PM 24h vol:</b> how much was traded on the Polymarket side in the last 24 hours, a rough gauge of liquidity.</li>
          <li><b>Match:</b> our confidence that these two rows are really the same event. Below 65 percent is held out of the main board.</li>
        </ul>
        <p>
          The board sorts four ways: by gap (biggest disagreements first), by size (most
          executable first), by volume, and by match confidence. The top strip shows the counts.
          Every row carries two link chips, PM&nwarr; and KX&nwarr; (with arrows), that open the
          exact market on each venue. Above the board, a live ticker scrolls the widest current
          gaps; the header chip counts down to the next scan; and when a gap moves between scans,
          the row flashes green or red.
        </p>
        <p>
          Open any row and the drawer gives the full workup: seven-day gap and venue charts,
          hourly Kalshi volume, and the order-book panel — top-of-book price and size on both
          venues, plus the cross-venue executable figure (the smaller of the two legs, with the
          buy side resolved from the gap direction).
        </p>
      </section>

      <section>
        <h2>Why you can trust it</h2>
        <p>
          Every pair on the board passes three independent gates. First, a deterministic matcher
          (token overlap, sequence similarity, hard blocks on party-vs-person pairs) proposes the
          match. Second, Jev — a System One model — reads both markets&apos; actual resolution rules
          and returns a calibrated probability the two are the same event; anything below 0.80
          stays out of the board, and different-event pairs are dismissed permanently. Third, the
          staleness gate: either venue silent for 24 hours demotes the row.
        </p>
        <p>
          The receipts are public. The <Link href="/audit">matching audit</Link> shows every pair
          we&apos;ve ever matched — the ones on the board, the ones held, and the ones dismissed —
          with match scores, Jev probabilities, and last-print ages. Most terminals hide this
          layer. Ours is the product.
        </p>
      </section>

      <section>
        <h2>How you benefit</h2>
        <p>
          The insight: when two liquid venues disagree on the same event, one of them is slower to
          price reality. A 3&cent; disagreement on an election market is information. It tells you
          where the crowd is wrong, where money is moving, and occasionally where a low-risk trade
          exists on one or both venues. Cross-venue disagreement is one of the cleanest signals in
          the market, because it comes from structure, not opinion.
        </p>
        <p>
          Before gap133, that signal meant five browser tabs, two spreadsheets, and a group chat.
          The board replaces the pile with one screen.
        </p>
        <p>
          The habit: verify everything on-venue. gap133 is a data terminal, not a brokerage. The
          venue chips exist so every number you act on can be checked at the source in seconds.
          Prices move; your edge depends on acting on live prices, not cached ones.
        </p>
      </section>

      <section>
        <h2>Free vs paid</h2>
        <div className="guide-tiers">
          <div className="gtier">
            <h3>Observer (free)</h3>
            <ul>
              <li>Top 25 pairs by gap, 10-minute delayed</li>
              <li>Net (fee-adjusted) figures and the Live column</li>
              <li>All sorting, the ticker, the stat strip</li>
              <li>The 2-minute scan cycle</li>
              <li>The matching audit, in full</li>
            </ul>
          </div>
          <div className="gtier">
            <h3>Founding desk ($17/month, crypto only)</h3>
            <ul>
              <li>Live board, no delay: all matched pairs, not 25</li>
              <li>Executable size at top of book, per pair</li>
              <li>Gap alert thresholds you set (Telegram)</li>
              <li>Gap history charts per market</li>
              <li>API access (early)</li>
              <li>The Chrome Ledger terminal skin</li>
            </ul>
          </div>
        </div>
        <p>
          Payment: USDC, USDT, BTC, or ETH. Checkout is currently manual while wallets are being
          wired: email <a href="mailto:hello@gap133.xyz">hello@gap133.xyz</a> and you receive a
          payment address back. Your desk key arrives once the transaction confirms on-chain, and
          unlocks paid access in your browser for 30 days. No cards, no auto-renewals.
        </p>
      </section>

      <section>
        <h2>FAQ</h2>
        <div className="faq">
          {FAQ.map((f, i) => (
            <details key={i} {...(i === 0 ? { open: true } : {})}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <footer className="ftr">
        <p style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <SpiralMark size={26} />
          <span>
            gap133 field guide · nothing here is trading advice or a solicitation. Data from the
            Polymarket and Kalshi public APIs; venues own their marks. · <Link href="/">terminal</Link>
          </span>
        </p>
      </footer>
    </main>
  );
}
