// app/components/EVFinder.jsx — standalone /ev page (Direction B / industrial)
// Mirrors the homepage hero pattern: orange CTA → search → trust line, with
// browse-by-city on the right. Hero shows until a location is chosen.
'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { SUBURBS } from '@/lib/suburbs';

const INDICATIVE_NOTE =
  'Indicative network rates (verified June 2026) — not live per-charger prices. Check the operator’s app for the exact cost before charging.';

const EV_CITIES = [
  { slug: 'sydney',    name: 'Sydney',    state: 'NSW', lat: -33.8688, lng: 151.2093 },
  { slug: 'melbourne', name: 'Melbourne', state: 'VIC', lat: -37.8136, lng: 144.9631 },
  { slug: 'brisbane',  name: 'Brisbane',  state: 'QLD', lat: -27.4698, lng: 153.0251 },
  { slug: 'perth',     name: 'Perth',     state: 'WA',  lat: -31.9523, lng: 115.8613 },
  { slug: 'adelaide',  name: 'Adelaide',  state: 'SA',  lat: -34.9285, lng: 138.6007 },
  { slug: 'canberra',  name: 'Canberra',  state: 'ACT', lat: -35.2809, lng: 149.1300 },
  { slug: 'hobart',    name: 'Hobart',    state: 'TAS', lat: -42.8821, lng: 147.3272 },
  { slug: 'darwin',    name: 'Darwin',    state: 'NT',  lat: -12.4634, lng: 130.8456 },
];

const MotavoMark = ({ size = 30 }) => (
  <svg viewBox="30 30 68 68" width={size} height={size} fill="none" aria-hidden="true">
    <path d="M37 86 L37 43 L64 72.5 L91 43 L91 86" fill="none" stroke="currentColor"
      strokeWidth="11.5" strokeLinejoin="round" strokeLinecap="round" />
  </svg>
);

const MotavoWordmark = ({ size = 20 }) => (
  <svg viewBox="0 0 3499 667" height={size} width={size * 5.246} fill="currentColor"
       aria-hidden="true" style={{ display: 'block' }}>
    <g transform="translate(-73,653) scale(1,-1)"><path d="M73.0 0V494H186.0V439H203.0Q216.0 464 246.5 483.5Q277.0 503 328.0 503Q382.0 503 415.0 481.0Q448.0 459 465.0 425H481.0Q498.0 459 530.0 481.0Q562.0 503 621.0 503Q667.0 503 704.5 483.0Q742.0 463 764.5 424.0Q787.0 385 787.0 327V0H672.0V319Q672.0 362 649.0 384.5Q626.0 407 585.0 407Q540.0 407 513.5 377.5Q487.0 348 487.0 293V0H373.0V319Q373.0 362 350.0 384.5Q327.0 407 286.0 407Q240.0 407 214.0 377.5Q188.0 348 188.0 293V0Z M1154.0 -14Q1080.0 -14 1021.5 16.5Q963.0 47 929.5 103.5Q896.0 160 896.0 239V255Q896.0 334 929.5 391.0Q963.0 448 1021.5 478.0Q1080.0 508 1154.0 508Q1228.0 508 1286.0 478.0Q1344.0 448 1377.5 391.0Q1411.0 334 1411.0 255V239Q1411.0 160 1377.5 103.5Q1344.0 47 1286.0 16.5Q1228.0 -14 1154.0 -14ZM1154.0 88Q1217.0 88 1257.0 128.5Q1297.0 169 1297.0 242V252Q1297.0 325 1257.0 365.5Q1217.0 406 1154.0 406Q1091.0 406 1051.0 365.5Q1011.0 325 1011.0 252V242Q1011.0 169 1051.0 128.5Q1091.0 88 1154.0 88Z M1713.0 0Q1665.0 0 1636.5 28.5Q1608.0 57 1608.0 106V399H1479.0V494H1608.0V653H1723.0V494H1865.0V399H1723.0V125Q1723.0 95 1751.0 95H1850.0V0Z M2127.0 -14Q2075.0 -14 2033.0 4.5Q1991.0 23 1966.5 58.0Q1942.0 93 1942.0 144Q1942.0 194 1966.5 228.0Q1991.0 262 2034.0 279.5Q2077.0 297 2132.0 297H2275.0V327Q2275.0 366 2251.0 390.5Q2227.0 415 2176.0 415Q2126.0 415 2100.5 391.5Q2075.0 368 2067.0 331L1961.0 366Q1973.0 405 1999.5 437.0Q2026.0 469 2070.0 488.5Q2114.0 508 2178.0 508Q2275.0 508 2330.5 459.5Q2386.0 411 2386.0 319V125Q2386.0 95 2414.0 95H2456.0V0H2375.0Q2339.0 0 2316.0 18.0Q2293.0 36 2293.0 67V69H2276.0Q2270.0 55 2255.0 35.0Q2240.0 15 2209.5 0.5Q2179.0 -14 2127.0 -14ZM2146.0 80Q2203.0 80 2239.0 112.5Q2275.0 145 2275.0 200V210H2139.0Q2102.0 210 2079.0 194.0Q2056.0 178 2056.0 147Q2056.0 117 2080.0 98.5Q2104.0 80 2146.0 80Z M2652.0 0 2490.0 494H2612.0L2734.0 84H2751.0L2874.0 494H2996.0L2834.0 0Z M3315.0 -14Q3241.0 -14 3182.5 16.5Q3124.0 47 3090.5 103.5Q3057.0 160 3057.0 239V255Q3057.0 334 3090.5 391.0Q3124.0 448 3182.5 478.0Q3241.0 508 3315.0 508Q3389.0 508 3447.0 478.0Q3505.0 448 3538.5 391.0Q3572.0 334 3572.0 255V239Q3572.0 160 3538.5 103.5Q3505.0 47 3447.0 16.5Q3389.0 -14 3315.0 -14ZM3315.0 88Q3378.0 88 3418.0 128.5Q3458.0 169 3458.0 242V252Q3458.0 325 3418.0 365.5Q3378.0 406 3315.0 406Q3252.0 406 3212.0 365.5Q3172.0 325 3172.0 252V242Q3172.0 169 3212.0 128.5Q3252.0 88 3315.0 88Z"/></g>
  </svg>
);

function priceLabel(s) {
  if (s.tariff && (s.tariff.dcPerKwh != null || s.tariff.acPerKwh != null)) {
    const parts = [];
    if (s.tariff.dcPerKwh != null) parts.push(`${s.tariff.dcPerKwh}c/kWh DC`);
    if (s.tariff.acPerKwh != null) parts.push(`${s.tariff.acPerKwh}c/kWh AC`);
    return parts.join(' · ');
  }
  if (s.usageCostRaw) return s.usageCostRaw.length > 40 ? s.usageCostRaw.slice(0, 38) + '…' : s.usageCostRaw;
  return 'Price varies';
}

export default function EVFinder() {
  const [dark, setDark] = useState(false);
  const [coords, setCoords] = useState(null);       // null = hero showing
  const [locLabel, setLocLabel] = useState('');
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState(false);
  const [radius, setRadius] = useState(10);
  const [level, setLevel] = useState('ALL');        // ALL | AC | DC
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  // theme — shares the main app's localStorage key
  useEffect(() => {
    try {
      const saved = localStorage.getItem('fm:color-scheme');
      setDark(saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches);
    } catch {}
  }, []);
  const toggleTheme = () => {
    setDark(d => {
      const next = !d;
      try { localStorage.setItem('fm:color-scheme', next ? 'dark' : 'light'); } catch {}
      return next;
    });
  };

  const load = useCallback(async (lat, lng, r = radius, lvl = level) => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams({ lat: String(lat), lng: String(lng), radius: String(r), limit: '40' });
      if (lvl !== 'ALL') params.set('level', lvl);
      const res = await fetch(`/api/ev?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.details || data?.error || 'Request failed');
      setStations(data.stations || []);
    } catch (e) {
      setError(e.message || 'Could not load chargers');
      setStations([]);
    } finally {
      setLoading(false);
    }
  }, [radius, level]);

  // (re)load whenever coords/radius/level change
  useEffect(() => { if (coords) load(coords.lat, coords.lng, radius, level); }, [coords, radius, level, load]);

  const useMyLocation = () => {
    if (!navigator.geolocation) { setLocError(true); return; }
    setLocating(true); setLocError(false);
    navigator.geolocation.getCurrentPosition(
      pos => { setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocLabel('your location'); setQuery(''); setLocating(false); },
      () => { setLocError(true); setLocating(false); },
      { timeout: 8000 }
    );
  };

  const suburbOptions = useMemo(
    () => SUBURBS.map(s => ({ key: s.slug, label: `${s.name}, ${s.state}`, lat: s.lat, lng: s.lng })),
    []
  );
  const onSuburbPick = (value) => {
    setQuery(value);
    const match = suburbOptions.find(o => o.label.toLowerCase() === value.toLowerCase());
    if (match) { setCoords({ lat: match.lat, lng: match.lng }); setLocLabel(match.label); setLocError(false); }
  };

  const reset = () => { setCoords(null); setLocLabel(''); setQuery(''); setStations([]); };

  return (
    <div className="ev" data-theme={dark ? 'dark' : 'light'}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Anton&family=Hanken+Grotesk:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
        .ev {
          --bg:#e7e4dd; --bg-2:#ddd9cf; --surface:#f2f0ea; --surface-2:#e7e4dd; --surface-3:#d9d5ca;
          --border:#cbc6b9; --border-strong:#15120e;
          --text:#15120e; --text-2:#4a453d; --text-3:#6a655c; --text-4:#938c81;
          --accent:#ff4a17; --accent-dark:#d6390e; --accent-soft:#fbe7df;
          --warn:#b4530a; --danger:#b91c1c;
          min-height:100vh; background:var(--bg); color:var(--text);
          font-family:'Hanken Grotesk',system-ui,sans-serif; letter-spacing:-0.006em;
        }
        .ev[data-theme="dark"] {
          --bg:#14110d; --bg-2:#1b1813; --surface:#1b1813; --surface-2:#221e18; --surface-3:#2c2820;
          --border:#322d25; --border-strong:#4a4338;
          --text:#efe9df; --text-2:#cfc7ba; --text-3:#9a9183; --text-4:#6f675b;
          --accent:#ff5e30; --accent-dark:#d6390e; --accent-soft:rgba(255,94,48,0.12);
        }
        .ev * { box-sizing:border-box; border-radius:0 !important; }
        .ev .wrap { max-width:1152px; margin:0 auto; padding:0 20px; }
        .ev .display { font-family:'Anton','Hanken Grotesk',system-ui,sans-serif; text-transform:uppercase; letter-spacing:0.005em; font-weight:400; }
        .ev .mono { font-family:'JetBrains Mono',ui-monospace,monospace; font-feature-settings:'tnum' on; letter-spacing:-0.01em; }
        .ev .track { font-family:'JetBrains Mono',ui-monospace,monospace; letter-spacing:0.16em; text-transform:uppercase; }

        .ev header { border-bottom:1px solid var(--border); position:sticky; top:0; background:var(--bg); z-index:5; }
        .ev .bar { display:flex; align-items:center; gap:16px; height:58px; }
        .ev .logo { display:inline-flex; align-items:center; gap:10px; color:var(--text); text-decoration:none; }
        .ev .spacer { flex:1; }
        .ev .navlink { color:var(--text-2); text-decoration:none; font-weight:500; font-size:14px; padding:7px 12px; }
        .ev .navlink:hover { background:var(--surface); color:var(--text); }
        .ev .navlink.active { color:var(--text); background:var(--surface); border:1px solid var(--border); }
        .ev .icon-btn { border:1px solid var(--border); background:var(--surface); color:var(--text-2); width:34px; height:34px; cursor:pointer; font-size:14px; display:inline-flex; align-items:center; justify-content:center; }
        .ev .icon-btn:hover { color:var(--text); }

        /* HERO — two columns, mirrors homepage */
        .ev .hero { padding-top:clamp(3rem,8vw,5.5rem); padding-bottom:clamp(3rem,6vw,5rem); }
        .ev .hero-grid { display:grid; grid-template-columns:1fr; gap:2.5rem; align-items:start; }
        @media (min-width:768px) { .ev .hero-grid { grid-template-columns:1fr 1fr; gap:4rem; } }
        .ev h1 { font-size:clamp(3rem,7vw,5.2rem); line-height:0.84; letter-spacing:0.005em; margin:0 0 1.1rem; }
        .ev h1 .a { color:var(--accent); }
        .ev .sub { color:var(--text-3); font-size:1.05rem; line-height:1.6; max-width:440px; margin:0 0 2rem; }

        .ev .cta { width:100%; display:inline-flex; align-items:center; justify-content:center; gap:8px;
                   padding:14px 20px; font:inherit; font-weight:600; font-size:14px;
                   background:var(--accent); color:#fff; border:none; cursor:pointer; margin-bottom:0.75rem; }
        .ev .cta:hover { opacity:0.92; }
        .ev .cta:disabled { opacity:0.6; cursor:default; }

        .ev .ev-search { position:relative; margin-bottom:0.5rem; }
        .ev .ev-search svg { position:absolute; left:18px; top:50%; transform:translateY(-50%); color:var(--text-4); }
        .ev .ev-search input { width:100%; padding:18px 18px 18px 48px; font:inherit; font-size:1.05rem; border:1px solid var(--border); background:var(--surface); color:var(--text); }
        .ev .ev-search input::placeholder { color:var(--text-4); }
        .ev .ev-search input:focus { outline:none; border-color:var(--border-strong); }

        .ev .locerr { font-size:12px; color:var(--warn); margin-top:6px; }
        .ev .trust { margin-top:2rem; padding-top:1.25rem; border-top:1px solid var(--border); color:var(--text-3); font-size:14px; line-height:1.6; }

        .ev .browse-label { font-size:11px; font-weight:500; color:var(--text-4); margin-bottom:12px; }
        .ev .cities { display:flex; flex-direction:column; gap:6px; }
        .ev .city { display:flex; align-items:center; justify-content:space-between; width:100%;
                    padding:12px 16px; background:var(--surface); border:1px solid var(--border);
                    font:inherit; cursor:pointer; color:var(--text); }
        .ev .city:hover { border-color:var(--border-strong); }
        .ev .city .st { font-family:'JetBrains Mono',monospace; font-size:12px; font-weight:600; color:var(--accent); min-width:34px; text-align:left; }
        .ev .city .nm { font-weight:500; font-size:14px; }
        .ev .city .go { font-size:12px; color:var(--text-4); }

        /* RESULTS */
        .ev .results { padding:1.5rem 0 4rem; }
        .ev .rhead { display:flex; align-items:flex-end; justify-content:space-between; flex-wrap:wrap; gap:12px; margin-bottom:1.25rem; }
        .ev .rkicker { font-size:10px; font-weight:500; color:var(--text-4); margin-bottom:8px; }
        .ev h2 { font-size:clamp(1.8rem,4vw,2.4rem); line-height:1.05; margin:0; }
        .ev h2 .a { color:var(--accent); }
        .ev .rsub { color:var(--text-3); font-size:14px; margin-top:6px; }
        .ev .reset { font:inherit; font-size:13px; font-weight:600; padding:9px 14px; background:var(--surface); color:var(--text-2); border:1px solid var(--border); cursor:pointer; }
        .ev .reset:hover { color:var(--text); border-color:var(--border-strong); }

        .ev .controls { display:flex; flex-wrap:wrap; gap:10px; align-items:stretch; margin-bottom:14px; }
        .ev .seg { display:inline-flex; border:1px solid var(--border); }
        .ev .seg button { font:inherit; font-weight:600; font-size:13px; padding:10px 16px; border:0; background:var(--surface); color:var(--text-2); cursor:pointer; }
        .ev .seg button + button { border-left:1px solid var(--border); }
        .ev .seg button.on { background:var(--text); color:var(--bg); }
        .ev select { font:inherit; font-size:14px; padding:10px 12px; border:1px solid var(--border); background:var(--surface); color:var(--text); }

        .ev .banner { display:flex; gap:10px; align-items:flex-start; background:var(--surface); border:1px solid var(--border); border-left:3px solid var(--accent); padding:11px 14px; font-size:13.5px; color:var(--text-2); margin:6px 0 18px; }

        .ev .list { display:flex; flex-direction:column; border-top:1px solid var(--border); }
        .ev .card { border:1px solid var(--border); border-top:0; background:var(--surface); padding:16px 18px; }
        .ev .card:hover { border-color:var(--border-strong); }
        .ev .ctop { display:flex; justify-content:space-between; align-items:flex-start; gap:14px; }
        .ev .net { font-weight:700; font-size:16px; letter-spacing:-0.01em; }
        .ev .addr { color:var(--text-3); font-size:13.5px; margin-top:2px; }
        .ev .price { font-family:'JetBrains Mono',monospace; font-weight:700; font-size:14px; color:var(--accent); white-space:nowrap; text-align:right; }
        .ev .dist { color:var(--text-3); font-size:12px; font-weight:500; margin-top:3px; text-align:right; font-family:'JetBrains Mono',monospace; }
        .ev .chips { display:flex; flex-wrap:wrap; gap:6px; margin-top:12px; }
        .ev .chip { font-size:11px; font-weight:600; color:var(--text-2); background:var(--surface-2); border:1px solid var(--border); padding:4px 9px; font-family:'JetBrains Mono',monospace; letter-spacing:0.02em; text-transform:uppercase; }
        .ev .chip.dc { color:var(--accent); border-color:var(--accent); background:var(--accent-soft); }
        .ev .crow { display:flex; align-items:center; gap:14px; margin-top:13px; }
        .ev .dir { color:var(--text); text-decoration:none; font-weight:700; font-size:13.5px; border-bottom:2px solid var(--accent); padding-bottom:1px; }
        .ev .dir:hover { color:var(--accent); }
        .ev .off { font-size:11px; font-weight:700; color:var(--danger); font-family:'JetBrains Mono',monospace; letter-spacing:0.08em; text-transform:uppercase; }
        .ev .muted { color:var(--text-3); font-size:14px; padding:34px 0; text-align:center; border:1px solid var(--border); border-top:0; background:var(--surface); }
        .ev footer { border-top:1px solid var(--border); color:var(--text-3); font-size:12.5px; padding:24px 0; text-align:center; }
      `}</style>

      <header>
        <div className="wrap bar">
          <a className="logo" href="/"><MotavoMark size={28} /><MotavoWordmark size={18} /></a>
          <span className="spacer" />
          <a className="navlink" href="/">Fuel</a>
          <a className="navlink active" href="/ev">EV charging</a>
          <button className="icon-btn" onClick={toggleTheme} aria-label="Toggle theme">{dark ? '☀' : '☾'}</button>
        </div>
      </header>

      {/* HERO — until a location is chosen */}
      {!coords && (
        <section className="hero">
          <div className="wrap">
            <div className="hero-grid">
              <div>
                <h1 className="display">Stop guessing<br /><span className="a">where to charge.</span></h1>
                <p className="sub">Live charger locations from Open Charge Map, with indicative network pricing. Free, independent, no sponsored results.</p>

                <button type="button" className="cta" onClick={useMyLocation} disabled={locating}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
                  {locating ? 'Finding chargers near you…' : 'Find chargers near me'}
                </button>

                <div className="ev-search">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                  <input list="ev-suburbs" value={query} onChange={e => onSuburbPick(e.target.value)} placeholder="Or search a suburb or postcode…" />
                  <datalist id="ev-suburbs">{suburbOptions.map(o => <option key={o.key} value={o.label} />)}</datalist>
                </div>
                {locError && <p className="locerr">Couldn&rsquo;t get your location — try searching instead.</p>}

                <div className="trust">
                  Live charger locations across Australia from Open Charge Map.
                  No network pays for placement — and it&rsquo;s free, always.
                </div>
              </div>

              <div>
                <div className="browse-label track">Browse by city</div>
                <div className="cities">
                  {EV_CITIES.map(c => (
                    <button key={c.slug} type="button" className="city"
                            onClick={() => { setCoords({ lat: c.lat, lng: c.lng }); setLocLabel(`${c.name}, ${c.state}`); setLocError(false); setQuery(''); }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
                        <span className="st">{c.state}</span>
                        <span className="nm">{c.name}</span>
                      </span>
                      <span className="go">Chargers →</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* RESULTS */}
      {coords && (
        <main className="wrap results">
          <div className="rhead">
            <div>
              <div className="rkicker track">Now showing</div>
              <h2 className="display">Chargers near <span className="a">{locLabel}</span></h2>
              <p className="rsub">{loading ? 'Finding chargers…' : `${stations.length} chargers · within ${radius} km`}</p>
            </div>
            <button type="button" className="reset" onClick={reset}>Change location</button>
          </div>

          <div className="controls">
            <div className="seg" role="group" aria-label="Charger type">
              {['ALL', 'AC', 'DC'].map(l => (
                <button key={l} className={level === l ? 'on' : ''} onClick={() => setLevel(l)}>{l === 'ALL' ? 'All' : l}</button>
              ))}
            </div>
            <select value={radius} onChange={e => setRadius(Number(e.target.value))} aria-label="Radius">
              <option value={5}>5 km</option>
              <option value={10}>10 km</option>
              <option value={25}>25 km</option>
              <option value={50}>50 km</option>
            </select>
          </div>

          <div className="banner">
            <span aria-hidden="true">ⓘ</span>
            <span>{INDICATIVE_NOTE}</span>
          </div>

          <div className="list">
            {loading && <div className="muted">Finding chargers…</div>}
            {error && !loading && <div className="muted">Couldn’t load chargers: {error}</div>}
            {!loading && !error && stations.length === 0 && (
              <div className="muted">No chargers found here. Try a wider radius or a different area.</div>
            )}
            {!loading && stations.map(s => (
              <div className="card" key={s.id}>
                <div className="ctop">
                  <div>
                    <div className="net">{s.network}</div>
                    {s.address && <div className="addr">{s.address}</div>}
                  </div>
                  <div>
                    <div className="price">{priceLabel(s)}</div>
                    {s.distance != null && <div className="dist">{s.distance} km</div>}
                  </div>
                </div>
                <div className="chips">
                  {s.level && <span className={`chip ${s.level === 'DC' ? 'dc' : ''}`}>{s.level}</span>}
                  {s.maxPowerKw != null && <span className="chip">up to {s.maxPowerKw} kW</span>}
                  {s.connectors.map((c, i) => (
                    <span className="chip" key={i}>{c.type}{c.count > 1 ? ` ×${c.count}` : ''}</span>
                  ))}
                </div>
                <div className="crow">
                  <a className="dir" href={`https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}`} target="_blank" rel="noopener noreferrer">Directions →</a>
                  {s.operational === false && <span className="off">May be offline</span>}
                </div>
              </div>
            ))}
          </div>
        </main>
      )}

      <footer className="wrap">Charger data © Open Charge Map contributors. Pricing indicative — verify with the operator.</footer>
    </div>
  );
}
