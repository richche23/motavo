import type { Metadata, Viewport } from 'next';
import './globals.css';

const BASE = 'https://www.fuelmate.au';

export const metadata: Metadata = {
  metadataBase: new URL(BASE),
  title: 'FuelMate — Cheapest fuel near you, Australia-wide',
  description:
    'Real-time fuel prices for Australian drivers. Compare petrol, diesel and LPG across NSW, VIC, QLD, WA, SA, NT, TAS and ACT. Free, independent, government data.',
  keywords: [
    'fuel prices Australia',
    'cheap petrol',
    'fuel comparison',
    'petrol prices',
    'diesel prices',
  ],
  alternates: { canonical: BASE },
  manifest: '/manifest.webmanifest',
  openGraph: {
    title: 'FuelMate — Cheapest fuel near you, Australia-wide',
    description:
      'Real-time fuel prices for Australian drivers. Free, independent, government data.',
    url: BASE,
    siteName: 'FuelMate',
    locale: 'en_AU',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FuelMate — Cheapest fuel near you',
    description: 'Real-time Australian fuel prices. Free and independent.',
  },
};

export const viewport: Viewport = {
  themeColor: '#1e5fe0',
  width: 'device-width',
  initialScale: 1,
};

// Site-wide structured data
const siteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'FuelMate',
  url: BASE,
  description:
    'Real-time fuel price comparison for Australian drivers, using official government data.',
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${BASE}/?q={search_term_string}`,
    },
    'query-input': 'required name=search_term_string',
  },
};

const orgJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'FuelMate',
  url: BASE,
  description: 'Independent Australian fuel price comparison.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-AU">
      <head>
        {/* Start the Leaflet CDN connection early so the map paints faster */}
        <link rel="preconnect" href="https://unpkg.com" crossOrigin="" />
        <link rel="dns-prefetch" href="https://unpkg.com" />
        <link rel="preconnect" href="https://tile.openstreetmap.org" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
