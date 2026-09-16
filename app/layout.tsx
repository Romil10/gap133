import type { Metadata } from 'next';
import './globals.css';

// Optional GA4: activates only when NEXT_PUBLIC_GA_ID is set at build time.
// Loads with Consent Mode v2 defaults (denied until the user consents) per the
// standing site standard; the first-party tracker works without any of this.
const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

const gaScript = GA_ID
  ? `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('consent', 'default', { ad_storage: 'denied', analytics_storage: 'denied' });
    gtag('js', new Date());
    gtag('config', '${GA_ID}', { anonymize_ip: true });
  `
  : '';

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
      <head>
        {GA_ID && (
          <>
            <script async src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} />
            <script dangerouslySetInnerHTML={{ __html: gaScript }} />
          </>
        )}
      </head>
      <body>{children}</body>
    </html>
  );
}
