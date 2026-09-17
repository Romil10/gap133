import type { Metadata } from 'next';
import './globals.css';
import { startScheduler } from './scheduler';
import ConsentBanner from './consent-banner';

// In-process Telegram scheduler (alerts + daily digest). No-ops until
// TELEGRAM_BOT_TOKEN + TELEGRAM_CHANNEL_ID are set.
if (process.env.NEXT_RUNTIME === 'nodejs') {
  startScheduler();
}

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

const SITE = 'https://gap133-production.up.railway.app';

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: 'gap133 - Cross-Venue Prediction Market Terminal',
    template: '%s - gap133',
  },
  description:
    'Live odds and price gaps between Polymarket and Kalshi on the same events. Divergence ranking, unified order view, updated continuously.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'gap133 - Cross-Venue Prediction Market Terminal',
    description:
      'The price difference between Polymarket and Kalshi on the same events, ranked in cents. Updated continuously.',
    url: SITE,
    siteName: 'gap133',
    type: 'website',
    images: [{ url: '/og.svg', width: 1200, height: 630, alt: 'gap133 terminal' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'gap133',
    description: 'Cross-venue prediction market terminal: Polymarket vs Kalshi gaps in cents.',
  },
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
  manifest: '/manifest.json',
};

// All three theme type systems load up front: Space Mono (Daylight),
// JetBrains Mono (Midnight Tape), Syne + Space Grotesk (Chrome Ledger).
// Each theme declares its own pairing via --font-* tokens.
const FONTS_HREF =
  'https://fonts.googleapis.com/css2?' +
  [
    'family=Space+Mono:ital,wght@0,400;0,700;1,400',
    'family=JetBrains+Mono:wght@400;500;700;800',
    'family=Syne:wght@600;700;800',
    'family=Space+Grotesk:wght@400;500;600;700',
  ].join('&') +
  '&display=swap';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Default theme before hydration: match the visitor's system preference.
  // The client refines on mount (and honours a saved choice).
  const initScript = `
    try {
      var t = localStorage.getItem('gap133-theme');
      if (!t || t === 'chrome') t = matchMedia('(prefers-color-scheme: light)').matches ? 'daylight' : 'midnight';
      document.documentElement.dataset.theme = t;
    } catch (e) {
      document.documentElement.dataset.theme = matchMedia('(prefers-color-scheme: light)').matches ? 'daylight' : 'midnight';
    }
  `;
  return (
    <html lang="en" data-theme="midnight" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={FONTS_HREF} />
        <script dangerouslySetInnerHTML={{ __html: initScript }} />
        {GA_ID && (
          <>
            <script async src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} />
            <script dangerouslySetInnerHTML={{ __html: gaScript }} />
          </>
        )}
      </head>
      <body>
        {children}
        <ConsentBanner />
      </body>
    </html>
  );
}

