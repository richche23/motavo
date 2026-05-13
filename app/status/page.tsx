/**
 * Status page — visit /status to see which state APIs are responding.
 * Useful after each new API approval to confirm the env var is working.
 */

const STATES = [
  { code: 'nsw', name: 'New South Wales', expected: 'NSW FuelCheck' },
  { code: 'tas', name: 'Tasmania',        expected: 'NSW FuelCheck (shared)' },
  { code: 'act', name: 'ACT',             expected: 'NSW FuelCheck (shared)' },
  { code: 'wa',  name: 'Western Australia', expected: 'FuelWatch RSS' },
  { code: 'vic', name: 'Victoria',        expected: 'Servo Saver' },
  { code: 'qld', name: 'Queensland',      expected: 'QLD Fuel Prices' },
  { code: 'sa',  name: 'South Australia', expected: 'Informed Sources' },
  { code: 'nt',  name: 'Northern Territory', expected: 'MyFuel NT' },
];

// Sample point in each state's capital city
const SAMPLES: Record<string, { lat: number; lng: number }> = {
  nsw: { lat: -33.8688, lng: 151.2093 },
  tas: { lat: -42.8821, lng: 147.3272 },
  act: { lat: -35.2809, lng: 149.1300 },
  wa:  { lat: -31.9523, lng: 115.8613 },
  vic: { lat: -37.8136, lng: 144.9631 },
  qld: { lat: -27.4698, lng: 153.0251 },
  sa:  { lat: -34.9285, lng: 138.6007 },
  nt:  { lat: -12.4634, lng: 130.8456 },
};

async function checkState(code: string) {
  const { lat, lng } = SAMPLES[code];
  try {
    // Note: we hit the public API route directly — works on both dev and prod
    const base = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
    const res = await fetch(`${base}/api/fuel/${code}?lat=${lat}&lng=${lng}&radius=5`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}`, stations: 0, refreshedAt: 0 };
    }
    const data = await res.json();
    return {
      ok: true,
      error: null,
      stations: data.stations?.length ?? 0,
      refreshedAt: data.refreshedAt ?? 0,
      source: data.source,
    };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? 'unknown', stations: 0, refreshedAt: 0 };
  }
}

export const dynamic = 'force-dynamic';

export default async function StatusPage() {
  const checks = await Promise.all(STATES.map(s => checkState(s.code).then(r => ({ ...s, ...r }))));

  return (
    <main style={{ maxWidth: 720, margin: '40px auto', padding: '0 24px', fontFamily: 'ui-sans-serif, system-ui' }}>
      <h1 style={{ fontSize: 28, fontWeight: 600, marginBottom: 8 }}>FuelMate API status</h1>
      <p style={{ color: '#64748b', marginBottom: 24, fontSize: 14 }}>
        Live diagnostic. Each row hits the corresponding state API with a sample lat/lng.
      </p>

      <div style={{ display: 'grid', gap: 8 }}>
        {checks.map(c => {
          const live = c.ok && c.stations > 0;
          const stub = c.ok && c.stations === 0;
          const broken = !c.ok;
          const colorBg = live ? '#e6f7f3' : stub ? '#fef3c7' : '#fee2e2';
          const colorBorder = live ? '#16a085' : stub ? '#f59e0b' : '#dc2626';
          const label = live ? 'Live' : stub ? 'Stub (mock fallback)' : 'Error';
          const refreshedLabel = c.refreshedAt
            ? new Date(c.refreshedAt).toLocaleString('en-AU')
            : '—';
          return (
            <div key={c.code} style={{
              display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: 16,
              padding: '14px 16px', borderRadius: 10,
              background: colorBg, border: `1px solid ${colorBorder}33`,
            }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{c.name} <span style={{ color: '#94a3b8', fontWeight: 400 }}>· {c.code.toUpperCase()}</span></div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                  {c.expected} · {c.stations} stations · refreshed {refreshedLabel}
                </div>
                {c.error && <div style={{ fontSize: 12, color: '#dc2626', marginTop: 2 }}>Error: {c.error}</div>}
              </div>
              <div style={{
                padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 500,
                background: colorBorder, color: '#fff',
              }}>{label}</div>
            </div>
          );
        })}
      </div>

      <p style={{ color: '#94a3b8', marginTop: 32, fontSize: 12 }}>
        <strong>Live</strong> = API key is configured and returning real stations.
        <strong> Stub</strong> = endpoint reachable but returning empty (frontend will use mock data).
        <strong> Error</strong> = HTTP failure or network problem.
      </p>
    </main>
  );
}
