import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'gap369 - Cross-Venue Prediction Market Terminal',
  description:
    'Live odds and price gaps between Polymarket and Kalshi on the same events. Divergence ranking, unified order view, updated continuously.',
  icons: {
    icon: 'data:image/svg+xml,' + encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="#0b0e11"/><path d="M7 22 L14 10 L19 17 L25 8" stroke="#4f8ef7" stroke-width="3" fill="none"/><circle cx="25" cy="8" r="3" fill="#ffc94d"/></svg>'
    ),
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
