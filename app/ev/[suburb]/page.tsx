import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import EVFinder from '../../components/EVFinder';
import { SUBURBS, suburbBySlug } from '../../../lib/suburbs';
import { fetchStations } from '@/lib/sources/ev-opencharge';

const BASE = 'https://motavo.au';

// Charger networks change slowly — re-render hourly is plenty.
export const revalidate = 3600;

export async function generateStaticParams() {
  return SUBURBS.map((s) => ({ suburb: s.slug }));
}

// Live charger summary for the indexable copy. Null on failure → static copy.
async function getChargerSummary(lat: number, lng: number) {
  try {
    const result = await fetchStations({ lat, lng, radius: 10, limit: 50 });
    const stations = result?.stations ?? [];
    if (stations.length === 0) return null;

    const dc = stations.filter((s) => s.level === 'DC');
    const networks = [...new Set(stations.map((s) => s.network).filter(Boolean))];
    const maxPower = Math.max(0, ...stations.map((s) => s.maxPowerKw || 0));

    return {
      total: stations.length,
      dcCount: dc.length,
      networks: networks.slice(0, 6),
      maxPower: maxPower || null,
    };
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: { suburb: string } }): Promise<Metadata> {
  const s = suburbBySlug(params.suburb);
  if (!s) return {};
  const title = `EV charging stations in ${s.name}, ${s.state} | Motavo`;
  const description = `Find public EV chargers in ${s.name} ${s.postcode} — DC fast charging, connector types, power and indicative network pricing. Live data from Open Charge Map. Free, no app needed.`;
  return {
    title,
    description,
    alternates: { canonical: `${BASE}/ev/${s.slug}` },
    openGraph: { title, description, url: `${BASE}/ev/${s.slug}`, siteName: 'Motavo' },
  };
}

export default async function EVSuburbPage({ params }: { params: { suburb: string } }) {
  const s = suburbBySlug(params.suburb);
  if (!s) notFound();

  const live = await getChargerSummary(s.lat, s.lng);

  const nearby = SUBURBS
    .filter((x) => x.slug !== s.slug)
    .map((x) => ({ ...x, _d: Math.hypot((x.lat - s.lat) * 111, (x.lng - s.lng) * 88) }))
    .sort((a, b) => a._d - b._d)
    .slice(0, 8);

  const faqs = [
    {
      q: `How many EV chargers are there in ${s.name}?`,
      a: live
        ? `There are currently around ${live.total} public charging locations within 10 km of ${s.name}, ${live.dcCount} of them with DC fast charging. The live map above shows each one with connector types and power.`
        : `The live map above shows every public charging location within 10 km of ${s.name}, including connector types and charging speed, using Open Charge Map data.`,
    },
    {
      q: `How much does EV charging cost in ${s.name}?`,
      a: `Public charging in Australia is priced per network, not per charger — typically 40–75c/kWh for DC fast charging depending on the operator and speed. Motavo shows each network's indicative rate next to its chargers; always confirm in the operator's app before charging.`,
    },
    {
      q: `Is there DC fast charging near ${s.name}?`,
      a: live && live.dcCount > 0
        ? `Yes — ${live.dcCount} location${live.dcCount === 1 ? ' has' : 's have'} DC fast charging near ${s.name}${live.maxPower ? `, with speeds up to ${live.maxPower} kW` : ''}. Use the DC filter on the map to show only fast chargers.`
        : `Use the DC filter on the live map to see fast chargers near ${s.name}. If none show locally, widening the radius to 25 km usually finds the nearest DC site.`,
    },
    {
      q: `Do I need an account or app to find chargers in ${s.name}?`,
      a: `Not on Motavo — charger locations, connectors and indicative pricing are free with no login. You'll only need the relevant network's app (or RFID card) to start a charging session at most public chargers.`,
    },
  ];

  return (
    <>
      {/* Live charger map, opened straight at this suburb */}
      <EVFinder initialCoords={{ lat: s.lat, lng: s.lng }} initialLabel={`${s.name}, ${s.state}`} />

      {/* Indexable copy */}
      <section
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          padding: '32px 24px 64px',
          color: 'var(--text-3, #6a655c)',
          fontSize: 15,
          lineHeight: 1.7,
          background: '#e7e4dd',
        }}
      >
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12, color: '#15120e' }}>
          EV charging in {s.name}, {s.state}
        </h2>

        {live && (
          <div style={{ display: 'flex', flexWrap: 'wrap', border: '1px solid #cbc6b9', marginBottom: 24 }}>
            {[
              { value: String(live.total), label: 'Charging locations' },
              { value: String(live.dcCount), label: 'DC fast sites' },
              ...(live.maxPower ? [{ value: `${live.maxPower} kW`, label: 'Fastest charger' }] : []),
              { value: String(live.networks.length), label: 'Networks' },
            ].map((st, i) => (
              <div key={st.label} style={{ flex: '1 1 120px', padding: '14px 18px', borderLeft: i === 0 ? 'none' : '1px solid #cbc6b9' }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#15120e' }}>{st.value}</div>
                <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2 }}>{st.label}</div>
              </div>
            ))}
          </div>
        )}

        <p style={{ marginBottom: 12 }}>
          Motavo shows public EV charging locations around {s.name} ({s.postcode}) and the
          surrounding {s.state} area — connector types, AC and DC charging speeds, and
          indicative network pricing{live && live.networks.length ? ` across operators like ${live.networks.slice(0, 4).join(', ')}` : ''}.
          Charger data comes from Open Charge Map and no network pays for placement.
        </p>
        <p style={{ marginBottom: 28 }}>
          Charging cost is set per network rather than per charger — Motavo lists each
          operator&rsquo;s published rate so you can compare before you plug in. Planning a
          longer trip? The <a href="/ev?route=1" style={{ color: '#ff4a17', textDecoration: 'none', fontWeight: 600 }}>EV route planner</a> finds
          every charger along your drive and flags the longest gap between them.
        </p>

        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12, color: '#15120e' }}>
          {s.name} EV charging FAQs
        </h2>
        <dl style={{ margin: 0 }}>
          {faqs.map((f) => (
            <div key={f.q} style={{ marginBottom: 16 }}>
              <dt style={{ fontWeight: 600, color: '#15120e', marginBottom: 4 }}>{f.q}</dt>
              <dd style={{ margin: 0 }}>{f.a}</dd>
            </div>
          ))}
        </dl>

        <h2 style={{ fontSize: 20, fontWeight: 600, margin: '28px 0 12px', color: '#15120e' }}>
          EV charging near {s.name}
        </h2>
        <p style={{ margin: 0, lineHeight: 2 }}>
          {nearby.map((n, i) => (
            <span key={n.slug}>
              <a href={`/ev/${n.slug}`} style={{ color: '#ff4a17', textDecoration: 'none', fontWeight: 600 }}>
                EV chargers in {n.name}, {n.state}
              </a>
              {i < nearby.length - 1 ? ' · ' : ''}
            </span>
          ))}
        </p>
        <p style={{ marginTop: 20 }}>
          <a href={`/fuel/${s.slug}`} style={{ color: '#ff4a17', textDecoration: 'none', fontWeight: 600 }}>Fuel prices in {s.name}</a>
          {' · '}
          <a href="/ev" style={{ color: '#ff4a17', textDecoration: 'none', fontWeight: 600 }}>EV chargers Australia-wide</a>
          {' · '}
          <a href="/" style={{ color: '#ff4a17', textDecoration: 'none', fontWeight: 600 }}>Compare fuel prices</a>
        </p>
      </section>
    </>
  );
}
