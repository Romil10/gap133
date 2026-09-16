import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'gap369 - Cross-Venue Prediction Market Terminal',
  description:
    'Live odds and price gaps between Polymarket and Kalshi on the same events. Divergence ranking, unified order view, updated continuously.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
