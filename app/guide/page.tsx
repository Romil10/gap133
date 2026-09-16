import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Field Guide - gap369',
  description:
    'What gap369 is, what the terminal shows, how to benefit from cross-venue gaps, free vs paid, and frequently asked questions.',
};

const FAQ: { q: string; a: string }[] = [
  {
    q: 'Do I need a wallet or exchange account to use gap369?',
    a: 'No. gap369 is read-only. It never asks for your wallet, your keys, your seed phrase, or an exchange login. Nothing on this site can move your money. You always trade on the venues themselves, through their own apps.',
  },
  {
    q: 'Is this financial advice?',
    a: 'No. gap369 shows you a price difference and nothing else. What you do with it is your decision. Prediction markets involve real risk, including the risk of losing everything you stake. Nothing here is trading advice or a solicitation.',
  },
  {
    q: 'Why do prices differ between Polymarket and Kalshi at all?',
    a: 'Different audiences, different capital, different speeds. Kalshi is a US-regulated exchange settled in dollars; Polymarket is a crypto-native venue settled in USDC and restricted for US traders. Different participants see different news, at different times, with different risk appetites. The disagreement is structural, which is why it keeps appearing.',
  },
  {
    q: 'Is trading the gap risk-free?',
    a: 'No, and be suspicious of anyone who says otherwise. Capturing a gap usually means holding positions on both venues, which introduces settlement timing, fee, and venue-risk considerations. gap369 shows you the signal; managing risk stays your job.',
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
    q: 'Why can I not see some pairs on the board?',
    a: 'They are in the review band: pairs we matched below the confidence threshold. Click the inspect link in the notice above the board to see them with their scores. Transparency about what we are unsure of is a feature, not a bug.',
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
    a: 'Email hello@gap369.xyz within 7 days of payment and we will sort it out. We would rather refund fast than have an unhappy desk holder.',
  },
  {
    q: 'Is this available in my country?',
    a: 'gap369 is a data service and works anywhere the site loads. But the venues themselves have their own restrictions: Polymarket restricts US traders, and Kalshi serves US residents. Check your venues terms before you trade. gap369 shows data; it does not grant trading access.',
  },
  {
    q: 'Who built this?',
    a: 'gap369 is an independent, bootstrapped product. No VC, no token, no roadmap promises. It makes money the honest way: people pay for the data because it is worth paying for.',
  },
];

export default function Guide() {
  return (
    <main className="wrap guide">
      <header className="guide-head">
        <Link href="/" className="backlink">&larr; back to the terminal</Link>
        <h1>Field Guide</h1>
        <p className="sub">What this is, what it shows, and how to use it. Five minutes, no jargon.</p>
      </header>

      <section>
        <h2>What gap369 is</h2>
        <p>
          gap369 is a cross-venue prediction market terminal. It watches two of the largest
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
          That difference is the gap. gap369 finds it, measures it in cents, ranks every matched
          market by how wide the gap is, and refreshes the whole board continuously.
        </p>
      </section>

      <section>
        <h2>What the terminal shows</h2>
        <p>Every row on the board is one prediction market matched across both venues:</p>
        <ul>
          <li><b>Event:</b> the question being traded, with the Kalshi market ID underneath.</li>
          <li><b>Kalshi yes:</b> the current YES price on Kalshi, in cents.</li>
          <li><b>Polymarket yes:</b> the current YES price on Polymarket, in cents.</li>
          <li><b>Gap:</b> the difference between the two, in cents. The bar under the figure shows relative width at a glance.</li>
          <li><b>PM 24h vol:</b> how much was traded on the Polymarket side in the last 24 hours, a rough gauge of liquidity.</li>
          <li><b>Match:</b> our confidence that these two rows are really the same event. Below 65 percent is held out of the main board.</li>
        </ul>
        <p>
          The board sorts three ways: by gap (biggest disagreements first), by volume, and by match
          confidence. The top strip shows the counts. Every row carries two link chips, PM&nwarr;
          and KX&nwarr; (with arrows), that open the exact market on each venue. Above the board, a
          live ticker scrolls the widest current gaps; the header chip counts down to the next
          scan; and when a gap moves between scans, the row flashes green or red.
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
          Before gap369, that signal meant five browser tabs, two spreadsheets, and a group chat.
          The board replaces the pile with one screen.
        </p>
        <p>
          The habit: verify everything on-venue. gap369 is a data terminal, not a brokerage. The
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
              <li>The full divergence board, 10-minute delayed</li>
              <li>All sorting, the ticker, the stat strip</li>
              <li>The 2-minute scan cycle</li>
            </ul>
          </div>
          <div className="gtier">
            <h3>Founding desk ($15/month, crypto only)</h3>
            <ul>
              <li>Live board, no delay</li>
              <li>Gap alert thresholds you set</li>
              <li>Gap history charts per market</li>
              <li>API access (early)</li>
              <li>The Chrome Ledger terminal skin</li>
            </ul>
          </div>
        </div>
        <p>
          Payment: USDC, USDT, BTC, or ETH. Checkout is currently manual while wallets are being
          wired: email <a href="mailto:hello@gap369.xyz">hello@gap369.xyz</a> and you receive a
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
        <p>
          Nothing on this page is trading advice or a solicitation. Data from the Polymarket and
          Kalshi public APIs; venues own their marks. · <Link href="/">back to the terminal</Link>
        </p>
      </footer>
    </main>
  );
}
