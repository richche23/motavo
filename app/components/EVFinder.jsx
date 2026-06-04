'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { SUBURBS } from '@/lib/suburbs';

const MELBOURNE = { lat: -37.8136, lng: 144.9631, label: 'Melbourne CBD' };
const INDICATIVE_NOTE =
  'Prices are indicative network rates, not live per-charger prices. Check the operator’s app for the exact cost before charging.';

const Mark = ({ size = 30 }) => (
  <svg viewBox="30 30 68 68" width={size} height={size} fill="none" aria-hidden="true">
    <path d="M37 86 L37 43 L64 72.5 L91 43 L91 86" fill="none" stroke="currentColor"
      strokeWidth="10.5" strokeLinejoin="round" strokeLinecap="round" />
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
    <div className="fm-app ev" data-theme={dark ? 'dark' : 'light'}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500&family=Hanken+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap');
        .fm-app.ev {
          --bg:#f6f5f1; --surface:#ffffff; --surface-2:#f6f5f1; --border:#e0ddd3;
          --text:#0e1116; --text-2:#3a3f47; --text-3:#6b7280; --accent:#0e7c6b; --accent-soft:#e7f4f1;
          min-height:100vh; background:var(--bg); color:var(--text);
          font-family:'Hanken Grotesk',system-ui,sans-serif; letter-spacing:-0.006em;
        }
        .fm-app.ev[data-theme="dark"] {
          --bg:#0e1116; --surface:#15191f; --surface-2:#1b2027; --border:#262b33;
          --text:#f6f5f1; --text-2:#c8d0da; --text-3:#9aa0a8; --accent:#2bb39b; --accent-soft:rgba(43,179,155,0.12);
        }
        .ev * { box-sizing:border-box; }
        .ev .wrap { max-width:860px; margin:0 auto; padding:0 20px; }
        .ev header { border-bottom:1px solid var(--border); position:sticky; top:0; background:var(--bg); z-index:5; }
        .ev .bar { display:flex; align-items:center; gap:14px; height:64px; }
        .ev .logo { display:inline-flex; align-items:center; gap:8px; color:var(--text); text-decoration:none; }
        .ev .logo .wm { font-weight:600; font-size:20px; letter-spacing:-0.012em; }
        .ev .spacer { flex:1; }
        .ev .navlink { color:var(--text-2); text-decoration:none; font-weight:500; font-size:14px; padding:7px 12px; border-radius:9px; }
        .ev .navlink:hover { background:var(--surface-2); color:var(--text); }
        .ev .navlink.active { color:var(--text); background:var(--surface-2); }
        .ev .icon-btn { border:1px solid var(--border); background:var(--surface); color:var(--text-2); width:36px; height:36px; border-radius:9px; cursor:pointer; font-size:15px; }
        .ev h1 { font-family:'Fraunces',Georgia,serif; font-weight:500; letter-spacing:-0.01em; font-size:34px; margin:34px 0 6px; }
        .ev .sub { color:var(--text-2); font-size:15.5px; margin-bottom:22px; max-width:560px; }
        .ev .controls { display:flex; flex-wrap:wrap; gap:10px; align-items:center; margin-bottom:14px; }
        .ev input[type=text], .ev select { font:inherit; padding:10px 12px; border:1px solid var(--border); border-radius:10px; background:var(--surface); color:var(--text); }
        .ev input[type=text] { min-width:220px; }
        .ev .btn { font:inherit; font-weight:600; padding:10px 14px; border-radius:10px; border:1px solid var(--border); background:var(--surface); color:var(--text); cursor:pointer; }
        .ev .btn.primary { background:var(--accent); border-color:var(--accent); color:#fff; }
        .ev .seg { display:inline-flex; border:1px solid var(--border); border-radius:10px; overflow:hidden; }
        .ev .seg button { font:inherit; font-weight:600; font-size:14px; padding:9px 14px; border:0; background:var(--surface); color:var(--text-2); cursor:pointer; }
        .ev .seg button.on { background:var(--accent); color:#fff; }
        .ev .banner { display:flex; gap:10px; align-items:flex-start; background:var(--accent-soft); border:1px solid var(--border); border-radius:11px; padding:11px 14px; font-size:13.5px; color:var(--text-2); margin:6px 0 20px; }
        .ev .loc { font-size:13.5px; color:var(--text-3); margin-bottom:14px; }
        .ev .list { display:flex; flex-direction:column; gap:12px; padding-bottom:60px; }
        .ev .card { border:1px solid var(--border); border-radius:14px; background:var(--surface); padding:16px 18px; }
        .ev .ctop { display:flex; justify-content:space-between; align-items:flex-start; gap:14px; }
        .ev .net { font-weight:600; font-size:16px; }
        .ev .addr { color:var(--text-3); font-size:13.5px; margin-top:2px; }
        .ev .price { font-family:'JetBrains Mono',monospace; font-weight:600; font-size:14px; color:var(--accent); white-space:nowrap; text-align:right; }
        .ev .dist { color:var(--text-3); font-size:12.5px; font-weight:500; margin-top:2px; text-align:right; }
        .ev .chips { display:flex; flex-wrap:wrap; gap:7px; margin-top:12px; }
        .ev .chip { font-size:12px; font-weight:500; color:var(--text-2); background:var(--surface-2); border:1px solid var(--border); border-radius:7px; padding:4px 9px; }
        .ev .chip.dc { color:var(--accent); }
        .ev .crow { display:flex; align-items:center; gap:12px; margin-top:13px; }
        .ev .dir { color:var(--accent); text-decoration:none; font-weight:600; font-size:13.5px; }
        .ev .off { font-size:12px; font-weight:600; color:#c0392b; }
        .ev .muted { color:var(--text-3); font-size:14px; padding:30px 0; text-align:center; }
        .ev footer { border-top:1px solid var(--border); color:var(--text-3); font-size:12.5px; padding:22px 0; text-align:center; }
      `}</style>

      <header>
        <div className="wrap bar">
          <a className="logo" href="/"><Mark size={28} /><span className="wm">motavo</span></a>
          <span className="spacer" />
          <a className="navlink" href="/">Fuel</a>
          <a className="navlink active" href="/ev">EV charging</a>
          <button className="icon-btn" onClick={toggleTheme} aria-label="Toggle theme">{dark ? '☀' : '☾'}</button>
        </div>
      </header>

      <main className="wrap">
        <h1>EV charging near you</h1>
        <p className="sub">Find public charging points across Australia, with indicative network pricing. Live locations from Open Charge Map.</p>

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
                {s.level && <span className={`chip ${s.level === 'DC' ? 'dc' : ''}`}>{s.level} charging</span>}
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

      <footer>Charger data © Open Charge Map contributors. Pricing indicative — verify with the operator.</footer>
    </div>
  );
}
