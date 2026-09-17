import type { Metadata } from 'next';
import Link from 'next/link';
import { SpiralMark } from '../spiral-mark';

export const metadata: Metadata = {
  title: 'Privacy Policy - gap133',
  description:
    'How gap133 collects, uses, and protects data: what we store, what we never touch, third-party services, and your rights.',
};

const UPDATED = '17 September 2026';

export default function Privacy() {
  return (
    <main className="wrap legal">
      <header className="guide-head">
        <Link href="/" className="backlink">&larr; back to the terminal</Link>
        <div className="guide-brand">
          <SpiralMark size={44} />
          <h1>Privacy Policy</h1>
        </div>
        <p className="sub">Last updated: {UPDATED}</p>
      </header>

      <section>
        <h2>What gap133 is</h2>
        <p>
          gap133 is a read-only data terminal that displays price differences between the
          Polymarket and Kalshi prediction markets. It never asks for, stores, or has any access
          to your wallets, private keys, seed phrases, exchange accounts, or funds.
        </p>
      </section>

      <section>
        <h2>What we collect</h2>
        <ul>
          <li>
            <b>Anonymous usage events.</b> When you interact with the terminal (search, sort,
            open a chart, click a venue link), we record the action type and nothing else: no
            name, no email, no IP-linked identity, no persistent identifier. This data is used
            only to understand which features are used.
          </li>
          <li>
            <b>Theme preference.</b> Your chosen theme and desk-key status are stored in your
            browser (localStorage and a cookie). They never leave your device except as an
            anonymous key check with our server.
          </li>
          <li>
            <b>Payment correspondence.</b> If you buy a desk subscription, we store your email
            address, transaction hash, and subscription dates, solely to operate your access and
            renewals. We never share it.
          </li>
        </ul>
      </section>

      <section>
        <h2>What we never collect</h2>
        <ul>
          <li>Wallet addresses, private keys, or seed phrases.</li>
          <li>Exchange credentials or API keys.</li>
          <li>Browsing history beyond what is described above.</li>
          <li>Any data from your Telegram account (the Telegram channel is broadcast-only).</li>
        </ul>
      </section>

      <section>
        <h2>Third-party services</h2>
        <p>
          gap133 displays data from the public Polymarket and Kalshi APIs. When you click a venue
          link (PM↗ or KX↗), you leave gap133 and their own privacy policies apply. We do not run
          third-party analytics on this site: all usage tracking is first-party and anonymous. If
          Google Analytics is enabled in the future, it will load only with your consent (see
          Cookies).
        </p>
      </section>

      <section>
        <h2>Cookies</h2>
        <p>
          gap133 sets one functional cookie: a desk-key access cookie, used only if you purchase
          a subscription, to keep you logged in for 30 days. No advertising, tracking, or
          analytics cookies are set by default. If Google Analytics is ever enabled, it will be
          consent-gated (denied until you opt in, per Google Consent Mode v2).
        </p>
      </section>

      <section>
        <h2>Your rights</h2>
        <p>
          You can request a copy of any data associated with your email, or its deletion, at any
          time by writing to <a href="mailto:hello@gap133.xyz">hello@gap133.xyz</a>. We will
          respond within 30 days. Deleting your data ends your subscription access.
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>
          Questions about this policy: <a href="mailto:hello@gap133.xyz">hello@gap133.xyz</a>.
          Postal address: SJR Commercial Complex, Bengaluru, Karnataka 560103, India.
        </p>
      </section>

      <footer className="ftr">
        <p>
          <Link href="/">terminal</Link> · <Link href="/terms">terms of service</Link>
        </p>
      </footer>
    </main>
  );
}
