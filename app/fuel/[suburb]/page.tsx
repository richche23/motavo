import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Motavo from '../../components/Motavo';
import { SUBURBS, suburbBySlug } from '../../../lib/suburbs';
// State source fetchers — exact paths from app/api/fuel/[state]/route.ts
import { fetchStations as fetchNSW } from '@/lib/sources/nsw-fuelcheck';
import { fetchStations as fetchVIC } from '@/lib/sources/vic-servosaver';
import { fetchStations as fetchQLD } from '@/lib/sources/qld-fuelprices';
import { fetchStations as fetchWA }  from '@/lib/sources/wa-fuelwatch';
import { fetchStations as fetchSA }  from '@/lib/sources/sa-informedsources';
import { fetchStations as fetchNT }  from '@/lib/sources/nt-myfuelnt';
import type { SourceFetcher, StateCode, FuelType } from '@/lib/types';

const BASE = 'https://motavo.au';

// Re-render with fresh prices ~every 10 min (matches the API's s-maxage=600).
export const revalidate = 600;

// State -> fetcher. TAS and ACT ride on NSW FuelCheck, same as the API route.
const FETCHER: Record<StateCode, SourceFetcher> = {
  NSW: fetchNSW, TAS: fetchNSW, ACT: fetchNSW,
  VIC: fetchVIC, QLD: fetchQLD, WA: fetchWA, SA: fetchSA, NT: fetchNT,
};

// The fuel type used for the server-rendered summary.
const SUMMARY_FUEL: FuelType = 'U91';

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

const cents = (c: number) => `${c.toFixed(1)}c/L`;

// Pull live prices for this suburb and build indexable summary + stats.
// Returns null on any failure so the page falls back to the static copy.
async function getPriceSummary(state: StateCode, lat: number, lng: number, area: string) {
  try {
    const fetcher = FETCHER[state];
    if (!fetcher) return null;
    const result = await fetcher({ lat, lng, radius: 5, limit: 30, state, fuelType: SUMMARY_FUEL });
    const priced = (result?.stations ?? [])
      .map((st) => ({ brand: st.brand, price: st.prices?.[SUMMARY_FUEL] }))
      .filter((x): x is { brand: string; price: number } => typeof x.price === 'number' && x.price > 0)
      .sort((a, b) => a.price - b.price);

    if (priced.length === 0) return null;

    const cheapest = priced[0];
    const dearest = priced[priced.length - 1];
    const avg = priced.reduce((t, p) => t + p.price, 0) / priced.length;
    const spread = dearest.price - cheapest.price;

    const summary =
      `The cheapest unleaded 91 around ${area} right now is ${cents(cheapest.price)} at ${cheapest.brand}, ` +
      `across ${priced.length} station${priced.length === 1 ? '' : 's'} nearby. ` +
      `The average is ${cents(avg)} and prices reach ${cents(dearest.price)} — a spread of ${cents(spread)}, ` +
      `so it pays to compare before you fill up.`;

    return {
      cheapest,
      summary,
      stats: [
        { label: 'Cheapest now', value: cents(cheapest.price) },
        { label: 'Average', value: cents(avg) },
        { label: 'Stations', value: String(priced.length) },
        { label: 'Price spread', value: cents(spread) },
      ],
    };
  } catch {
    return null;
  }
}

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

export default async function SuburbPage({ params }: { params: { suburb: string } }) {
  const s = suburbBySlug(params.suburb);
  if (!s) notFound();

  const cycle = STATE_CYCLE[s.state] || 'a local price cycle';
  const source = STATE_SOURCE[s.state] || 'official government data';
  const url = `${BASE}/fuel/${s.slug}`;

  // Live, server-rendered price data — indexable, refreshes via ISR.
  const live = await getPriceSummary(s.state as StateCode, s.lat, s.lng, s.name);

  // Nearest suburbs by straight-line distance — internal links for SEO + UX.
  const nearby = SUBURBS
    .filter((x) => x.slug !== s.slug)
    .map((x) => ({
      ...x,
      _d: Math.hypot((x.lat - s.lat) * 111, (x.lng - s.lng) * 88),
    }))
    .sort((a, b) => a._d - b._d)
    .slice(0, 8);

  const faqs = [
    {
      q: `Where is the cheapest fuel in ${s.name}?`,
      a: live
        ? `Right now the cheapest unleaded 91 around ${s.name} (${s.postcode}) is ${cents(live.cheapest.price)} at ${live.cheapest.brand}. Prices come from ${source} and update through the day — see the live list above for every fuel type.`
        : `Motavo lists live prices for service stations around ${s.name} (${s.postcode}) and highlights the cheapest for your chosen fuel type. Prices come from ${source} and update through the day.`,
    },
    {
      q: `When is the best time to buy petrol in ${s.name}?`,
      a: `${s.name} follows ${cycle}. Filling up near the bottom of that cycle can save around $10–$20 a tank versus a bad day. The cycle indicator above shows where ${s.state} prices currently sit.`,
    },
    {
      q: `What fuel types can I compare in ${s.name}?`,
      a: `Unleaded 91, E10, premium 95 and 98, diesel and LPG — wherever stations near ${s.name} report them. Switch fuel type using the controls above.`,
    },
    {
      q: `Is Motavo free to use?`,
      a: `Yes. Motavo is free and independent, with no login, no app to download and no sponsored listings — just live ${s.state} fuel data.`,
    },
  ];

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: `Cheapest Fuel in ${s.name}, ${s.state}`,
      description: `Live petrol, diesel and LPG prices around ${s.name} ${s.postcode}, ${s.state}.`,
      url,
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
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Motavo', item: BASE },
        { '@type': 'ListItem', position: 2, name: `Fuel prices in ${s.name}`, item: url },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    },
  ];

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

        {live && (
          <>
            <p style={{ marginBottom: 16, color: 'var(--text, #1a2233)' }}>{live.summary}</p>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                border: '1px solid var(--border, #cbc6b9)',
                marginBottom: 24,
              }}
            >
              {live.stats.map((st, i) => (
                <div
                  key={st.label}
                  style={{
                    flex: '1 1 120px',
                    padding: '14px 18px',
                    borderLeft: i === 0 ? 'none' : '1px solid var(--border, #cbc6b9)',
                  }}
                >
                  <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text, #1a2233)' }}>{st.value}</div>
                  <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2 }}>
                    {st.label}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

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
        <p style={{ marginBottom: 28 }}>
          Use the search to check a different suburb or postcode, switch fuel types, or
          sort by cheapest or closest station to {s.name}.
        </p>

        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12, color: 'var(--text, #1a2233)' }}>
          {s.name} fuel price FAQs
        </h2>
        <dl style={{ margin: 0 }}>
          {faqs.map((f) => (
            <div key={f.q} style={{ marginBottom: 16 }}>
              <dt style={{ fontWeight: 600, color: 'var(--text, #1a2233)', marginBottom: 4 }}>{f.q}</dt>
              <dd style={{ margin: 0 }}>{f.a}</dd>
            </div>
          ))}
        </dl>

        {/* Internal links: nearby suburbs + site hubs. These keep the suburb
            pages out of orphan/dead-end territory for crawlers AND give users
            a path sideways. Plain <a> tags, server-rendered. */}
        <h2 style={{ fontSize: 20, fontWeight: 600, margin: '28px 0 12px', color: 'var(--text, #1a2233)' }}>
          Fuel prices near {s.name}
        </h2>
        <p style={{ margin: 0, lineHeight: 2 }}>
          {nearby.map((n, i) => (
            <span key={n.slug}>
              <a href={`/fuel/${n.slug}`} style={{ color: 'var(--accent, #ff4a17)', textDecoration: 'none', fontWeight: 600 }}>
                Fuel prices in {n.name}, {n.state}
              </a>
              {i < nearby.length - 1 ? ' · ' : ''}
            </span>
          ))}
        </p>
        <p style={{ marginTop: 20 }}>
          <a href="/" style={{ color: 'var(--accent, #ff4a17)', textDecoration: 'none', fontWeight: 600 }}>Compare fuel prices Australia-wide</a>
          {' · '}
          <a href="/ev" style={{ color: 'var(--accent, #ff4a17)', textDecoration: 'none', fontWeight: 600 }}>Find EV chargers near {s.name}</a>
        </p>
      </section>
    </>
  );
}
