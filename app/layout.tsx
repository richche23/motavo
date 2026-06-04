import type { Metadata, Viewport } from 'next';
import './globals.css';

const BASE = 'https://www.motavo.com.au';

export const metadata: Metadata = {
  metadataBase: new URL(BASE),
  title: 'Motavo — Cheapest fuel near you, Australia-wide',
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
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    apple: [{ url: '/apple-icon.png', sizes: '180x180' }],
  },
  openGraph: {
    title: 'Motavo — Cheapest fuel near you, Australia-wide',
    description:
      'Real-time fuel prices for Australian drivers. Free, independent, government data.',
    url: BASE,
    siteName: 'Motavo',
    locale: 'en_AU',
    type: 'website',
    images: [{ url: '/opengraph-image.png', width: 1200, height: 630, alt: 'Motavo — Go further for less' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Motavo — Cheapest fuel near you',
    description: 'Real-time Australian fuel prices. Free and independent.',
    images: ['/opengraph-image.png'],
  },
};

export const viewport: Viewport = {
  themeColor: '#0e7c6b',
  width: 'device-width',
  initialScale: 1,
};

// Site-wide structured data
const siteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Motavo',
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
  name: 'Motavo',
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
