import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Motavo from '../../components/Motavo';
import { SUBURBS, suburbBySlug } from '../../../lib/suburbs';

const BASE = 'https://www.motavo.com.au';

// Local fuel-cycle context per state (mirrors the city data)
const STATE_CYCLE: Record<string, string> = {
  NSW: 'roughly a 6-week price cycle',
  VIC: 'roughly a 5–6 week price cycle',
  QLD: 'roughly a 3–4 week price cycle',
  WA:  'a weekly price cycle (cheapest on Tuesdays)',
  SA:  'roughly a 3-week price cycle',
  ACT: 'fairly stable pricing',
  TAS: 'fairly stable pricing',
  NT:  'fairly stable pricing',
};

const STATE_SOURCE: Record<string, string> = {
  NSW: 'NSW FuelCheck', VIC: 'Victorian Servo Saver', QLD: 'QLD Fuel Price Reporting',
  WA: 'WA FuelWatch', SA: 'the SA Fuel Pricing Information Scheme',
  ACT: 'NSW FuelCheck', TAS: 'NSW FuelCheck', NT: 'MyFuel NT',
};

export function generateStaticParams() {
  return SUBURBS.map((s) => ({ suburb: s.slug }));
}

export function generateMetadata({
  params,
}: {
  params: { suburb: string };
}): Metadata {
  const s = suburbBySlug(params.suburb);
  if (!s) return {};

  const title = `Cheapest Fuel in ${s.name}, ${s.state} ${s.postcode} — Live Petrol Prices | Motavo`;
  const description = `Compare live petrol, diesel, E10 and LPG prices around ${s.name} (${s.postcode}), ${s.state}. Free, independent fuel price comparison from official government data — no app, no login, no ads. ${s.name} follows ${STATE_CYCLE[s.state] || 'a local price cycle'}.`;
  const url = `${BASE}/fuel/${s.slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title, description, url, siteName: 'Motavo', locale: 'en_AU', type: 'website',
    },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default function SuburbPage({ params }: { params: { suburb: string } }) {
  const s = suburbBySlug(params.suburb);
  if (!s) notFound();

  const cycle = STATE_CYCLE[s.state] || 'a local price cycle';
  const source = STATE_SOURCE[s.state] || 'official government data';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `Cheapest Fuel in ${s.name}, ${s.state}`,
    description: `Live petrol, diesel and LPG prices around ${s.name} ${s.postcode}, ${s.state}.`,
    url: `${BASE}/fuel/${s.slug}`,
    isPartOf: { '@type': 'WebSite', name: 'Motavo', url: BASE },
    about: {
      '@type': 'Service',
      name: `Fuel price comparison in ${s.name}`,
      areaServed: {
        '@type': 'Place',
        name: `${s.name}, ${s.state} ${s.postcode}`,
        geo: { '@type': 'GeoCoordinates', latitude: s.lat, longitude: s.lng },
      },
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Motavo
        initialLocation={{
          lat: s.lat,
          lng: s.lng,
          label: `${s.name}, ${s.state} ${s.postcode}`,
          state: s.state,
          key: `suburb-${s.slug}`,
        }}
      />
      {/* Unique, indexable copy so each suburb page has real content for SEO,
          not just the live app shell. Visually subtle, below the app. */}
      <section
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          padding: '32px 24px 64px',
          color: 'var(--text-3, #5a6478)',
          fontSize: 15,
          lineHeight: 1.7,
        }}
      >
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12, color: 'var(--text, #1a2233)' }}>
          Finding cheap fuel in {s.name}, {s.state}
        </h2>
        <p style={{ marginBottom: 12 }}>
          Motavo shows live petrol, diesel, E10, 95, 98 and LPG prices for service
          stations around {s.name} ({s.postcode}) and the surrounding {s.state} area.
          Prices come from {source} and update continuously — there's no app to
          download, no login, and no ads.
        </p>
        <p style={{ marginBottom: 12 }}>
          {s.name} follows {cycle}. Timing your fill-up to the bottom of that cycle is
          where the real savings are — often $10–$20 a tank versus filling on a bad day.
          The cycle indicator above tells you whether prices near {s.name} are currently
          near their low or just after a hike.
        </p>
        <p>
          Use the search to check a different suburb or postcode, switch fuel types, or
          sort by cheapest or closest station to {s.name}.
        </p>
      </section>
    </>
  );
}
