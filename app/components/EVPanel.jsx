'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { Search, Navigation, Loader2, ArrowRight, AlertCircle } from 'lucide-react';
import { SUBURBS } from '@/lib/suburbs';

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
 * Embeddable EV charger finder. Mirrors the fuel home: a hero with search +
 * "use my location" until a location is chosen, then the charger results.
 * Renders inside the app shell (.fm-app), so it inherits theme + fonts.
 */
export default function EVPanel() {
  const [coords, setCoords] = useState(null);
  const [locLabel, setLocLabel] = useState('');
  const [radius, setRadius] = useState(10);
  const [level, setLevel] = useState('ALL'); // ALL | AC | DC
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState(false);
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

  // Load whenever a location is set or filters change (no auto-geolocate —
  // the hero shows first, mirroring the fuel home).
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

  const reset = () => { setCoords(null); setStations([]); setQuery(''); setLocLabel(''); };

  const STATS = [['Live', 'Locations'], ['0', 'Paid listings'], ['Free', 'Always']];

  return (
    <div className="ev-panel">
      <style>{`
        .ev-panel .seg { display:inline-flex; border:1px solid var(--border); border-radius:10px; overflow:hidden; }
        .ev-panel .seg button { font:inherit; font-weight:600; font-size:14px; padding:9px 14px; border:0; background:var(--surface); color:var(--text-2); cursor:pointer; }
        .ev-panel .seg button.on { background:var(--accent); color:#fff; }
        .ev-panel select { font:inherit; padding:9px 12px; border:1px solid var(--border); border-radius:10px; background:var(--surface); color:var(--text); }
        .ev-panel .banner { display:flex; gap:10px; align-items:flex-start; background:var(--accent-glow); border:1px solid var(--border); border-radius:11px; padding:11px 14px; font-size:13.5px; color:var(--text-2); }
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
        .ev-panel .ev-search input { width:100%; padding:18px 18px 18px 48px; font-size:1.05rem; border:1px solid var(--border); border-radius:16px; background:var(--surface); color:var(--text); }
        .ev-panel .ev-search input::placeholder { color:var(--text-4); }
      `}</style>

      {/* HERO — shown until a location is chosen (mirrors the fuel home) */}
      {!coords && (
        <section className="hero-mesh">
          <div className="max-w-6xl mx-auto px-4 md:px-6"
               style={{ paddingTop: 'clamp(3rem, 8vw, 5.5rem)', paddingBottom: 'clamp(3rem, 6vw, 5rem)' }}>
            <div style={{ maxWidth: 560 }}>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium mb-5"
                   style={{ background: 'var(--green-soft)', color: 'var(--green-dark)', border: '1px solid var(--green-light)' }}>
                <span className="pulse-glow" style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--success)', display: 'inline-block', flexShrink: 0 }} />
                Live locations · Australia-wide · indicative pricing
              </div>

              <h1 className="font-display font-semibold"
                  style={{ fontSize: 'clamp(2.4rem, 5vw, 3.8rem)', lineHeight: 1.06, letterSpacing: '-0.03em', marginBottom: '1rem' }}>
                Stop guessing<br/>where to charge.
              </h1>
              <p style={{ color: 'var(--text-3)', fontSize: '1.05rem', lineHeight: 1.6, maxWidth: 440, marginBottom: '2rem' }}>
                Live charger locations from Open Charge Map, with indicative network pricing. Free, independent, no sponsored results.
              </p>

              <div className="ev-search" style={{ marginBottom: '0.75rem', position: 'relative', maxWidth: 440 }}>
                <Search size={18} style={{ position: 'absolute', left: 18, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-4)' }} />
                <input list="ev-suburbs" value={query} onChange={e => onSuburbPick(e.target.value)} placeholder="Search suburb or postcode…" />
                <datalist id="ev-suburbs">
                  {suburbOptions.map(o => <option key={o.key} value={o.label} />)}
                </datalist>
              </div>

              <button type="button" onClick={useMyLocation} disabled={locating}
                      className="inline-flex items-center gap-1.5 text-sm font-medium transition-colors disabled:opacity-60"
                      style={{ color: 'var(--text-3)', background: 'none', border: 'none', padding: '6px 0', cursor: 'pointer' }}>
                {locating ? <Loader2 size={13} className="animate-spin" /> : <Navigation size={13} />}
                {locating ? 'Locating…' : 'Use my current location'}
              </button>
              {locError && (
                <p className="text-tiny mt-2" style={{ color: 'var(--warn)' }}>
                  <AlertCircle size={11} style={{ display: 'inline', marginRight: 4 }} />
                  Couldn't get your location — try searching instead.
                </p>
              )}

              <div className="flex items-center gap-6 mt-8 pt-6" style={{ borderTop: '1px solid var(--border)' }}>
                {STATS.map(([val, label]) => (
                  <div key={label}>
                    <div className="font-display font-bold" style={{ fontSize: '1.4rem', lineHeight: 1, letterSpacing: '-0.02em' }}>{val}</div>
                    <div className="text-tiny mt-0.5" style={{ color: 'var(--text-4)' }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* RESULTS — once a location is chosen */}
      {coords && (
        <div className="max-w-6xl mx-auto px-4 md:px-6 pb-16">
          <div className="space-y-5">
            <div className="flex items-end justify-between flex-wrap gap-3 pt-2">
              <div>
                <div className="text-micro font-medium uppercase track-wide mb-2" style={{ color: 'var(--text-4)' }}>Now showing</div>
                <h2 className="font-display font-semibold text-3xl md:text-4xl lead-tight">
                  Chargers near <span style={{ color: 'var(--accent)' }}>{locLabel}</span>
                </h2>
                <p className="text-sm mt-1.5" style={{ color: 'var(--text-3)' }}>
                  {loading ? 'Finding chargers…' : `${stations.length} chargers · within ${radius} km`}
                </p>
              </div>
              <button type="button" onClick={reset}
                      className="text-sm font-medium ulink inline-flex items-center gap-1" style={{ color: 'var(--accent)' }}>
                Change location <ArrowRight size={14} />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="seg" role="group" aria-label="Charger type">
                {['ALL', 'AC', 'DC'].map(l => (
                  <button key={l} className={level === l ? 'on' : ''} onClick={() => setLevel(l)}>{l === 'ALL' ? 'All' : l}</button>
                ))}
              </div>
              <select value={radius} onChange={e => setRadius(Number(e.target.value))} aria-label="Radius">
                <option value={5}>Within 5 km</option>
                <option value={10}>Within 10 km</option>
                <option value={25}>Within 25 km</option>
                <option value={50}>Within 50 km</option>
              </select>
            </div>

            <div className="banner">
              <span aria-hidden="true">ⓘ</span>
              <span>{INDICATIVE_NOTE}</span>
            </div>

            <div className="space-y-3">
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
        </div>
      )}
    </div>
  );
}
