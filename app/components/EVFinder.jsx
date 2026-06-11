// app/components/EVFinder.jsx — standalone EV page (Direction B / industrial)
'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { SUBURBS } from '@/lib/suburbs';

const MELBOURNE = { lat: -37.8136, lng: 144.9631, label: 'Melbourne CBD' };
const INDICATIVE_NOTE =
  'Prices are indicative network rates, not live per-charger prices. Check the operator’s app for the exact cost before charging.';

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
  const [coords, setCoords] = useState(null);
  const [locLabel, setLocLabel] = useState('');
  const [radius, setRadius] = useState(10);
  const [level, setLevel] = useState('ALL'); // ALL | AC | DC
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
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

  // initial location: try geolocation, fall back to Melbourne
  useEffect(() => {
    if (!navigator.geolocation) {
      setCoords(MELBOURNE); setLocLabel(MELBOURNE.label);
      setNote('Showing Melbourne — your browser doesn’t support location.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => { const c = { lat: pos.coords.latitude, lng: pos.coords.longitude }; setCoords(c); setLocLabel('Your location'); },
      () => { setCoords(MELBOURNE); setLocLabel(MELBOURNE.label); setNote('Showing Melbourne — allow location access to see chargers near you.'); },
      { timeout: 8000 }
    );
  }, []);

  // (re)load whenever coords/radius/level change
  useEffect(() => { if (coords) load(coords.lat, coords.lng, radius, level); }, [coords, radius, level, load]);

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    setNote('');
    navigator.geolocation.getCurrentPosition(
      pos => { setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocLabel('Your location'); setQuery(''); },
      () => setNote('Couldn’t get your location — check browser permissions.'),
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
    if (match) { setCoords({ lat: match.lat, lng: match.lng }); setLocLabel(match.label); setNote(''); }
  };

  return (
    <div className="ev" data-theme={dark ? 'dark' : 'light'}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Anton&family=Hanken+Grotesk:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
        .ev {
          --bg:#e7e4dd; --bg-2:#ddd9cf; --surface:#f2f0ea; --surface-2:#e7e4dd; --surface-3:#d9d5ca;
          --border:#cbc6b9; --border-strong:#15120e;
          --text:#15120e; --text-2:#4a453d; --text-3:#6a655c; --text-4:#938c81;
          --accent:#ff4a17; --accent-dark:#d6390e; --accent-soft:#fbe7df;
          --danger:#b91c1c;
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
        .ev .wrap { max-width:1024px; margin:0 auto; padding:0 20px; }
        .ev .display { font-family:'Anton','Hanken Grotesk',system-ui,sans-serif; text-transform:uppercase; letter-spacing:0.004em; font-weight:400; }
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

        .ev .kicker { font-size:11px; font-weight:600; color:var(--accent); margin:40px 0 10px; }
        .ev h1 { font-size:clamp(34px,6vw,52px); line-height:1.02; margin:0 0 12px; }
        .ev .sub { color:var(--text-2); font-size:15.5px; margin:0 0 8px; max-width:600px; }
        .ev .trust { color:var(--text-3); font-size:13.5px; margin:0 0 26px; max-width:600px; }

        .ev .controls { display:flex; flex-wrap:wrap; gap:10px; align-items:stretch; margin-bottom:14px; }
        .ev input[type=text], .ev select { font:inherit; font-size:14px; padding:10px 12px; border:1px solid var(--border); background:var(--surface); color:var(--text); }
        .ev input[type=text] { min-width:240px; }
        .ev input[type=text]:focus, .ev select:focus { outline:none; border-color:var(--border-strong); }
        .ev .btn { font:inherit; font-size:14px; font-weight:600; padding:10px 14px; border:1px solid var(--border-strong); background:var(--text); color:var(--bg); cursor:pointer; }
        .ev .btn:hover { background:var(--accent); border-color:var(--accent); color:#fff; }
        .ev .seg { display:inline-flex; border:1px solid var(--border); }
        .ev .seg button { font:inherit; font-weight:600; font-size:13px; padding:10px 16px; border:0; background:var(--surface); color:var(--text-2); cursor:pointer; }
        .ev .seg button + button { border-left:1px solid var(--border); }
        .ev .seg button.on { background:var(--text); color:var(--bg); }

        .ev .banner { display:flex; gap:10px; align-items:flex-start; background:var(--surface); border:1px solid var(--border); border-left:3px solid var(--accent); padding:11px 14px; font-size:13.5px; color:var(--text-2); margin:6px 0 18px; }
        .ev .loc { font-size:13px; color:var(--text-3); margin-bottom:16px; }
        .ev .loc strong { color:var(--text); }

        .ev .list { display:flex; flex-direction:column; gap:0; padding-bottom:64px; border-top:1px solid var(--border); }
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

      <main className="wrap">
        <div className="kicker track">EV · Australia-wide</div>
        <h1 className="display">EV charging near you</h1>
        <p className="sub">Public charging points with connector types, speeds and indicative network pricing.</p>
        <p className="trust">Live charger locations across Australia from Open Charge Map. No network pays for placement — and it&rsquo;s free, always.</p>

        <div className="controls">
          <input
            type="text" list="ev-suburbs" placeholder="Search a suburb…"
            value={query} onChange={e => onSuburbPick(e.target.value)}
          />
          <datalist id="ev-suburbs">
            {suburbOptions.map(o => <option key={o.key} value={o.label} />)}
          </datalist>
          <button className="btn" onClick={useMyLocation}>Use my location</button>
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

        {locLabel && <div className="loc">Showing chargers near <strong>{locLabel}</strong>{note ? ` — ${note}` : ''}</div>}

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

      <footer className="wrap">Charger data © Open Charge Map contributors. Pricing indicative — verify with the operator.</footer>
    </div>
  );
}
