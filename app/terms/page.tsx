import type { Metadata } from 'next';
import Link from 'next/link';
import { SpiralMark } from '../spiral-mark';

export const metadata: Metadata = {
  title: 'Terms of Service - gap133',
  description:
    'The rules for using gap133: what the service does and does not do, subscription terms, disclaimers, and liability limits.',
};

const UPDATED = '17 September 2026';

export default function Terms() {
  return (
    <main className="wrap legal">
      <header className="guide-head">
        <Link href="/" className="backlink">&larr; back to the terminal</Link>
        <div className="guide-brand">
          <SpiralMark size={44} />
          <h1>Terms of Service</h1>
        </div>
        <p className="sub">Last updated: {UPDATED}</p>
      </header>

      <section>
        <h2>1. What gap133 is</h2>
        <p>
          gap133 is a data terminal displaying price differences between prediction markets
          (Polymarket and Kalshi) on matched events. It is a read-only information service: it
          does not execute trades, hold funds, provide investment advice, or make
          recommendations.
        </p>
      </section>

      <section>
        <h2>2. Not financial advice</h2>
        <p>
          All data, alerts, digests, and charts shown by gap133 are informational only and do
          not constitute financial, investment, or trading advice, nor a solicitation to buy or
          sell anything. Prediction markets involve substantial risk, including total loss of
          capital. You are solely responsible for your trading decisions. Verify every price
          on-venue before acting: data on gap133 may be delayed, incomplete, or wrong.
        </p>
      </section>

      <section>
        <h2>3. Subscriptions</h2>
        <p>
          The Founding desk tier costs $17 per month, payable in advance in cryptocurrency
          (USDC, USDT, BTC, or ETH). A subscription grants one person desk-tier access for 30
          days from confirmation. Subscriptions do not auto-renew: you renew manually. Access is
          per person; sharing keys or scraping the API may result in termination without refund.
        </p>
      </section>

      <section>
        <h2>4. Refunds</h2>
        <p>
          Request a refund within 7 days of payment by emailing
          hello@gap133.xyz; approved refunds are returned in the same asset at the amount
          received. After 7 days, no refunds, but you keep access for the remaining term.
        </p>
      </section>

      <section>
        <h2>5. Availability</h2>
        <p>
          gap133 aims for continuous availability but is provided as is, without warranty of
          any kind. Venue APIs change and break; the service may be interrupted, delayed, or
          discontinued. We are not liable for any losses resulting from downtime, data errors,
          or discontinuation.
        </p>
      </section>

      <section>
        <h2>6. Limitation of liability</h2>
        <p>
          To the maximum extent permitted by law, gap133's total liability for any claim is
          limited to the amount you paid us in the 12 months before the claim. We are not
          liable for indirect, incidental, or consequential damages, including lost profits or
          lost trading opportunities.
        </p>
      </section>

      <section>
        <h2>7. Acceptable use</h2>
        <p>
          Do not scrape the service abusively, resell data feeds, attempt to circumvent access
          controls, or use the service for any unlawful purpose. We may terminate access for
          violations.
        </p>
      </section>

      <section>
        <h2>8. Governing law</h2>
        <p>
          These terms are governed by the laws of India. Disputes are subject to the exclusive
          jurisdiction of the courts of Bengaluru, Karnataka.
        </p>
      </section>

      <section>
        <h2>9. Contact</h2>
        <p>
          Questions: <a href="mailto:hello@gap133.xyz">hello@gap133.xyz</a>. Postal address:
          SJR Commercial Complex, Bengaluru, Karnataka 560103, India.
        </p>
      </section>

      <footer className="ftr">
        <p>
          <Link href="/">terminal</Link> · <Link href="/privacy">privacy policy</Link>
        </p>
      </footer>
    </main>
  );
}
