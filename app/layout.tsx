import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FuelMate — Cheapest fuel near you, Australia-wide',
  description:
    'Real-time fuel prices for Australian drivers. Compare petrol, diesel and LPG across NSW, VIC, QLD, WA, SA, NT, TAS and ACT. Free, independent, government data.',
  keywords: ['fuel prices Australia', 'cheap petrol', 'fuel comparison', 'petrol prices', 'diesel prices'],
};

const ADSENSE_CLIENT = 'ca-pub-8867825238666070';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-AU">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        {/* AdSense verification meta tag — checked by Google's crawler */}
        <meta name="google-adsense-account" content={ADSENSE_CLIENT} />
        {/* AdSense script — inline in <head> so crawlers see it in raw HTML */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script
          async
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
          crossOrigin="anonymous"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
