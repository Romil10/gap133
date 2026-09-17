'use client';
import { useEffect, useState } from 'react';

const KEY = 'gap133-consent';

export default function ConsentBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_GA_ID) return;
    if (localStorage.getItem(KEY)) return;
    setShow(true);
  }, []);

  if (!show) return null;

  const decide = (granted: boolean) => {
    (window as any).dataLayer = (window as any).dataLayer || [];
    (window as any).dataLayer.push({
      event: 'consent_update',
      ad_storage: 'denied',
      analytics_storage: granted ? 'granted' : 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
    });
    localStorage.setItem(KEY, granted ? 'granted' : 'denied');
    setShow(false);
  };

  return (
    <div className="consent" role="dialog" aria-label="Cookie consent">
      <p>
        gap133 uses one functional cookie (desk access) and, only if you allow it, anonymous
        analytics to see which features are used. No ads, no tracking you around the web.
      </p>
      <div>
        <button onClick={() => decide(true)}>Allow analytics</button>
        <button onClick={() => decide(false)} className="ghost">Essential only</button>
        <a href="/privacy">privacy policy</a>
      </div>
    </div>
  );
}
