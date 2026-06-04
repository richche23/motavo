'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { SUBURBS } from '@/lib/suburbs';

const MELBOURNE = { lat: -37.8136, lng: 144.9631, label: 'Melbourne CBD' };
const INDICATIVE_NOTE =
  'Prices are indicative network rates, not live per-charger prices. Check the operator’s app for the exact cost before charging.';

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

/**
 * Embeddable EV charger finder. Renders inside the main app shell (.fm-app),
 * so it inherits the app's theme tokens and fonts — no own header/theme.
 */
export default function EVPanel() {
  const [coords, setCoords] = useState(null);
  const [locLabel, setLocLabel] = useState('');
  const [radius, setRadius] = useState(10);
  const [level, setLevel] = useState('ALL'); // ALL | AC | DC
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [query, setQuery] = useState('');

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
      pos => { setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocLabel('Your location'); },
      () => { setCoords(MELBOURNE); setLocLabel(MELBOURNE.label); setNote('Showing Melbourne — allow location access to see chargers near you.'); },
      { timeout: 8000 }
    );
  }, []);

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
    <div className="ev-panel">
      <style>{`
        .ev-panel { max-width:860px; margin:0 auto; padding:8px 20px 60px; }
        .ev-panel * { box-sizing:border-box; }
        .ev-panel .lead { color:var(--text-2); font-size:15.5px; margin:4px 0 20px; text-align:center; }
        .ev-panel .controls { display:flex; flex-wrap:wrap; gap:10px; align-items:center; justify-content:center; margin-bottom:14px; }
        .ev-panel input[type=text], .ev-panel select { font:inherit; padding:10px 12px; border:1px solid var(--border); border-radius:10px; background:var(--surface); color:var(--text); }
        .ev-panel input[type=text] { min-width:220px; }
        .ev-panel .btn { font:inherit; font-weight:600; padding:10px 14px; border-radius:10px; border:1px solid var(--border); background:var(--surface); color:var(--text); cursor:pointer; }
        .ev-panel .seg { display:inline-flex; border:1px solid var(--border); border-radius:10px; overflow:hidden; }
        .ev-panel .seg button { font:inherit; font-weight:600; font-size:14px; padding:9px 14px; border:0; background:var(--surface); color:var(--text-2); cursor:pointer; }
        .ev-panel .seg button.on { background:var(--accent); color:#fff; }
        .ev-panel .banner { display:flex; gap:10px; align-items:flex-start; background:var(--accent-glow); border:1px solid var(--border); border-radius:11px; padding:11px 14px; font-size:13.5px; color:var(--text-2); margin:6px auto 18px; max-width:620px; }
        .ev-panel .loc { font-size:13.5px; color:var(--text-3); margin-bottom:14px; text-align:center; }
        .ev-panel .list { display:flex; flex-direction:column; gap:12px; }
        .ev-panel .card { border:1px solid var(--border); border-radius:14px; background:var(--surface); padding:16px 18px; }
        .ev-panel .ctop { display:flex; justify-content:space-between; align-items:flex-start; gap:14px; }
        .ev-panel .net { font-weight:600; font-size:16px; }
        .ev-panel .addr { color:var(--text-3); font-size:13.5px; margin-top:2px; }
        .ev-panel .price { font-family:'JetBrains Mono',monospace; font-weight:600; font-size:14px; color:var(--accent); white-space:nowrap; text-align:right; }
        .ev-panel .dist { color:var(--text-3); font-size:12.5px; font-weight:500; margin-top:2px; text-align:right; }
        .ev-panel .chips { display:flex; flex-wrap:wrap; gap:7px; margin-top:12px; }
        .ev-panel .chip { font-size:12px; font-weight:500; color:var(--text-2); background:var(--surface-2); border:1px solid var(--border); border-radius:7px; padding:4px 9px; }
        .ev-panel .chip.dc { color:var(--accent); }
        .ev-panel .crow { display:flex; align-items:center; gap:12px; margin-top:13px; }
        .ev-panel .dir { color:var(--accent); text-decoration:none; font-weight:600; font-size:13.5px; }
        .ev-panel .off { font-size:12px; font-weight:600; color:#c0392b; }
        .ev-panel .muted { color:var(--text-3); font-size:14px; padding:30px 0; text-align:center; }
      `}</style>

      <p className="lead">Find public charging points across Australia, with indicative network pricing. Live locations from Open Charge Map.</p>

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
    </div>
  );
}
