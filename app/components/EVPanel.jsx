'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Search, Navigation, Loader2, ArrowRight, AlertCircle } from 'lucide-react';
import { SUBURBS } from '@/lib/suburbs';

const INDICATIVE_NOTE =
  'Prices are indicative network rates, not live per-charger prices. Check the operator’s app for the exact cost before charging.';

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

/* ─── Network brand badge (Brandfetch + self-host override, mirrors fuel BrandMark) ─── */
const EV_BRANDFETCH_ID = (typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_BRANDFETCH_CLIENT_ID) || '';
const evLogoUrls = (domain, short) => {
  const urls = [];
  if (short)  urls.push(`/brands/ev-${short.toLowerCase()}.svg`);
  if (domain && EV_BRANDFETCH_ID) urls.push(`https://cdn.brandfetch.io/${domain}/w/128/h/128/logo?c=${EV_BRANDFETCH_ID}`);
  return urls;
};
// Matched against the operator name Open Charge Map returns.
const EV_BRANDS = [
  { test: s => s.includes('tesla'),                         color: '#e31937', short: 'TE', domain: 'tesla.com' },
  { test: s => s.includes('chargefox'),                     color: '#17b3a3', short: 'CF', domain: 'chargefox.com' },
  { test: s => s.includes('evie'),                          color: '#1e9e8a', short: 'EV', domain: 'evie.com.au' },
  { test: s => s.includes('nrma'),                          color: '#003da5', short: 'NR', domain: 'mynrma.com.au' },
  { test: s => s.includes('ampol') || s.includes('ampcharge'), color: '#0046be', short: 'AM', domain: 'ampol.com.au' },
  { test: s => s.includes('bp'),                            color: '#0a8a3a', short: 'BP', domain: 'bp.com' },
  { test: s => s.includes('raa'),                           color: '#e2231a', short: 'RA', domain: 'raa.com.au' },
  { test: s => s.includes('jolt'),                          color: '#00c2a8', short: 'JO', domain: 'jolt.com.au' },
  { test: s => s.includes('exploren'),                      color: '#5b3df5', short: 'EX', domain: 'exploren.com.au' },
  { test: s => s.includes('agl'),                           color: '#0098db', short: 'AG', domain: 'agl.com.au' },
  { test: s => s.includes('evup'),                          color: '#16a34a', short: 'EU', domain: 'evup.com.au' },
  { test: s => s.includes('everty'),                        color: '#7c3aed', short: 'ET', domain: 'everty.com.au' },
  { test: s => s.includes('jetcharge') || s.includes('jet charge'), color: '#111827', short: 'JC', domain: 'jetcharge.com.au' },
  { test: s => s.includes('origin'),                        color: '#ec0000', short: 'OR', domain: 'originenergy.com.au' },
  { test: s => s.includes('engie'),                         color: '#0aa0dc', short: 'EN', domain: 'engie.com.au' },
];
function evBrandMeta(network) {
  const s = (network || '').toLowerCase();
  return EV_BRANDS.find(b => b.test(s)) || null;
}
function isUnknownNetwork(network) {
  const n = (network || '').trim();
  return !n || /unknown|^\(.*\)$|^n\/?a$/i.test(n);
}
// Clean public label so the list never reads "Unknown network" / "(Unknown Operator)".
function networkLabel(network) {
  return isUnknownNetwork(network) ? 'Public charging point' : network;
}
function EVBrandMark({ network, size = 34 }) {
  const unknown = isUnknownNetwork(network);
  const b = evBrandMeta(network);
  const color = b?.color || (unknown ? '#3f4651' : '#5b6473');
  const short = b?.short || (() => {
    const w = (network || '').replace(/[^a-zA-Z0-9 ]/g, ' ').trim().split(/ +/).filter(Boolean);
    if (w.length >= 2) return (w[0][0] + w[1][0]).toUpperCase();
    return (network || '').substring(0, 2).toUpperCase();
  })();
  const logos = unknown ? [] : evLogoUrls(b?.domain || null, b?.short || null);
  const [srcIdx, setSrcIdx] = useState(0);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { setSrcIdx(0); setLoaded(false); }, [network]);
  const logoUrl = logos[srcIdx] ?? null;
  return (
    <div className="evmark" title={networkLabel(network)} style={{ width: size, height: size, background: logoUrl && loaded ? '#fff' : color, border: logoUrl && loaded ? '1px solid var(--border)' : 'none' }}>
      {unknown ? (
        <svg viewBox="0 0 24 24" width={size * 0.5} height={size * 0.5} fill="#fff" aria-hidden="true">
          <path d="M13 2L4.5 13.5H11l-1 8.5 8.5-11.5H12l1-8.5z" />
        </svg>
      ) : (
        <span className="evmark-mono" style={{ opacity: logoUrl && loaded ? 0 : 1, fontSize: size * 0.4 }}>{short}</span>
      )}
      {logoUrl && (
        <img src={logoUrl} alt="" width={size} height={size}
             key={srcIdx}
             loading="lazy"
             decoding="async"
             referrerPolicy="no-referrer"
             style={{ position: 'absolute', inset: 0, objectFit: 'contain', padding: size * 0.18, opacity: loaded ? 1 : 0, transition: 'opacity .2s ease' }}
             onLoad={() => setLoaded(true)}
             onError={() => { if (srcIdx < logos.length - 1) setSrcIdx(srcIdx + 1); else setLoaded(false); }} />
      )}
    </div>
  );
}

/* ─── Charger map (Leaflet via unpkg, mirrors the fuel StationMap) ─── */
const EVMap = ({ stations, userLat, userLng, mapHeight }) => {
  const mapRef = useRef(null);
  const mapObjRef = useRef(null);
  const markersRef = useRef([]);
  const visible = stations.filter(s => s.lat && s.lng);

  const colorFor = (s) => (s.level === 'DC' ? '#ff4a17' : s.level === 'AC' ? '#64748b' : '#94a3b8');

  const initMap = () => {
    const L = window.L;
    if (!mapRef.current || mapObjRef.current) return;
    const lat = userLat || -37.8136;
    const lng = userLng || 144.9631;
    const map = L.map(mapRef.current, { zoomControl: true, attributionControl: true }).setView([lat, lng], 12);
    setTimeout(() => map.invalidateSize(), 100);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>', maxZoom: 19,
    }).addTo(map);
    mapObjRef.current = map;

    if (userLat && userLng) {
      const userIcon = L.divIcon({
        className: '',
        html: `<div style="width:16px;height:16px;background:#ff4a17;border:3px solid #fff;border-radius:50%;box-shadow:0 0 0 4px rgba(255,74,23,0.25)"></div>`,
        iconSize: [16, 16], iconAnchor: [8, 8],
      });
      L.marker([userLat, userLng], { icon: userIcon, zIndexOffset: 1000 }).addTo(map).bindPopup('<strong style="font-family:sans-serif">Your location</strong>');
    }
    addMarkers(map);
  };

  const addMarkers = (map) => {
    const L = window.L;
    if (!map) return;
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    visible.forEach((s) => {
      const color = colorFor(s);
      const label = s.maxPowerKw != null ? `${s.maxPowerKw}kW` : (s.level || '⚡');
      const icon = L.divIcon({
        className: '',
        html: `<div style="background:${color};color:#fff;font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;padding:3px 7px;border-radius:0;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.25);border:2px solid rgba(255,255,255,0.7)">${label}</div>`,
        iconSize: [56, 24], iconAnchor: [28, 12],
      });
      const conns = s.connectors.map(c => c.type + (c.count > 1 ? ` ×${c.count}` : '')).join(' · ');
      const popup = L.popup({ maxWidth: 280, className: 'fm-popup' }).setContent(`
        <div style="font-family:'Hanken Grotesk',sans-serif;padding:2px 0">
          <div style="font-weight:700;font-size:15px;margin-bottom:2px">${networkLabel(s.network)}</div>
          <div style="color:#64748b;font-size:12px;margin-bottom:6px">${s.address || ''}</div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:15px;font-weight:700;color:${color};margin-bottom:6px">${priceLabel(s)}</div>
          <div style="font-size:11px;color:#94a3b8;margin-bottom:10px">${s.distance != null ? s.distance + ' km · ' : ''}${conns}</div>
          <a href="https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}" target="_blank" rel="noopener noreferrer"
             style="display:block;text-align:center;padding:7px 12px;background:#ff4a17;color:#fff;border-radius:0;font-weight:600;font-size:13px;text-decoration:none">↗ Directions</a>
        </div>`);
      const marker = L.marker([s.lat, s.lng], { icon }).addTo(map).bindPopup(popup);
      markersRef.current.push(marker);
    });
  };

  // Load Leaflet CSS + JS (idempotent — shared with the fuel map), then init.
  useEffect(() => {
    let cancelled = false;
    const doInit = () => { if (!cancelled) requestAnimationFrame(() => { if (!cancelled) initMap(); }); };
    const loadJS = () => {
      if (window.L) { doInit(); return; }
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = doInit;
      document.head.appendChild(script);
    };
    let link = document.getElementById('leaflet-css');
    if (!link) {
      link = document.createElement('link');
      link.id = 'leaflet-css';
      link.setAttribute('rel', 'stylesheet');
      link.setAttribute('href', 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css');
      link.onload = loadJS;
      document.head.appendChild(link);
    } else if (window.L) { loadJS(); }
    else { link.addEventListener('load', loadJS, { once: true }); }
    return () => { cancelled = true; if (mapObjRef.current) { mapObjRef.current.remove(); mapObjRef.current = null; } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { if (mapObjRef.current && userLat && userLng) mapObjRef.current.setView([userLat, userLng], 12); }, [userLat, userLng]);
  useEffect(() => { if (mapObjRef.current) addMarkers(mapObjRef.current); /* eslint-disable-next-line */ }, [stations]);

  return (
    <div style={{ position: 'relative', borderRadius: 0, overflow: 'hidden', border: '1px solid var(--border)' }}>
      <div ref={mapRef} style={{ height: mapHeight || '520px', width: '100%' }} />
    </div>
  );
};

/**
 * Embeddable EV charger finder. Mirrors the fuel home: a hero with search +
 * "use my location" until a location is chosen, then list/map of chargers.
 */
export default function EVPanel() {
  const [coords, setCoords] = useState(null);
  const [locLabel, setLocLabel] = useState('');
  const [radius, setRadius] = useState(10);
  const [level, setLevel] = useState('ALL'); // ALL | AC | DC
  const [viewMode, setViewMode] = useState('list'); // list | map
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState(false);
  const [query, setQuery] = useState('');

  const load = useCallback(async (lat, lng, r = radius, lvl = level) => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams({ lat: String(lat), lng: String(lng), radius: String(r), limit: '60' });
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
        .ev-panel .seg { display:inline-flex; border:1px solid var(--border); border-radius:0; overflow:hidden; }
        .ev-panel .seg button { font:inherit; font-weight:600; font-size:14px; padding:9px 14px; border:0; background:var(--surface); color:var(--text-2); cursor:pointer; }
        .ev-panel .seg button.on { background:var(--accent); color:#fff; }
        .ev-panel select { font:inherit; padding:9px 12px; border:1px solid var(--border); border-radius:0; background:var(--surface); color:var(--text); }
        .ev-panel .banner { display:flex; gap:10px; align-items:flex-start; background:var(--accent-glow); border:1px solid var(--border); border-radius:0; padding:11px 14px; font-size:13.5px; color:var(--text-2); }
        .ev-panel .card { border:1px solid var(--border); border-radius:0; background:var(--surface); padding:16px 18px; }
        .ev-panel .ctop { display:flex; justify-content:space-between; align-items:flex-start; gap:14px; }
        .ev-panel .net { font-weight:600; font-size:16px; }
        .ev-panel .evmark { position:relative; overflow:hidden; flex-shrink:0; border-radius:0; display:flex; align-items:center; justify-content:center; box-shadow:0 1px 2px rgba(15,23,42,0.05); }
        .ev-panel .evmark-mono { font-family:'JetBrains Mono',monospace; font-weight:700; color:#fff; line-height:1; }
        .ev-panel .who { display:flex; gap:12px; align-items:flex-start; }
        .ev-panel .addr { color:var(--text-3); font-size:13.5px; margin-top:2px; }
        .ev-panel .price { font-family:'JetBrains Mono',monospace; font-weight:600; font-size:14px; color:var(--accent); white-space:nowrap; text-align:right; }
        .ev-panel .dist { color:var(--text-3); font-size:12.5px; font-weight:500; margin-top:2px; text-align:right; }
        .ev-panel .chips { display:flex; flex-wrap:wrap; gap:7px; margin-top:12px; }
        .ev-panel .chip { font-size:12px; font-weight:500; color:var(--text-2); background:var(--surface-2); border:1px solid var(--border); border-radius:0; padding:4px 9px; }
        .ev-panel .chip.dc { color:var(--accent); }
        .ev-panel .crow { display:flex; align-items:center; gap:12px; margin-top:13px; }
        .ev-panel .dir { color:var(--accent); text-decoration:none; font-weight:600; font-size:13.5px; }
        .ev-panel .off { font-size:12px; font-weight:600; color:#c0392b; }
        .ev-panel .muted { color:var(--text-3); font-size:14px; padding:30px 0; text-align:center; }
        .ev-panel .ev-search input { width:100%; padding:18px 18px 18px 48px; font-size:1.05rem; border:1px solid var(--border); border-radius:0; background:var(--surface); color:var(--text); }
        .ev-panel .ev-search input::placeholder { color:var(--text-4); }
      `}</style>

      {/* HERO — until a location is chosen */}
      {!coords && (
        <section className="hero-mesh">
          <div className="max-w-6xl mx-auto px-4 md:px-6"
               style={{ paddingTop: 'clamp(3rem, 8vw, 5.5rem)', paddingBottom: 'clamp(3rem, 6vw, 5rem)' }}>
            <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-start">
              <div>
              <h1 className="font-display"
                  style={{ fontSize: 'clamp(3rem, 7vw, 5.2rem)', lineHeight: 0.84, letterSpacing: '0.005em', marginBottom: '1.1rem' }}>
                Stop guessing<br/><span style={{ color: 'var(--accent)' }}>where to charge.</span>
              </h1>
              <p style={{ color: 'var(--text-3)', fontSize: '1.05rem', lineHeight: 1.6, maxWidth: 440, marginBottom: '2rem' }}>
                Live charger locations from Open Charge Map, with indicative network pricing. Free, independent, no sponsored results.
              </p>
              <div className="ev-search" style={{ marginBottom: '0.75rem', position: 'relative', maxWidth: 440 }}>
                <Search size={18} style={{ position: 'absolute', left: 18, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-4)' }} />
                <input list="ev-suburbs" value={query} onChange={e => onSuburbPick(e.target.value)} placeholder="Search suburb or postcode…" />
                <datalist id="ev-suburbs">{suburbOptions.map(o => <option key={o.key} value={o.label} />)}</datalist>
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

              {/* Right: browse chargers by city */}
              <div>
                <div className="text-tiny font-medium uppercase track-wide mb-3" style={{ color: 'var(--text-4)' }}>Browse by city</div>
                <div className="space-y-1.5">
                  {EV_CITIES.map(c => (
                    <button key={c.slug} type="button"
                            onClick={() => { setCoords({ lat: c.lat, lng: c.lng }); setLocLabel(`${c.name}, ${c.state}`); setLocError(false); setQuery(''); }}
                            className="hover-raise w-full flex items-center justify-between px-4 py-3 transition-colors"
                            style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 0, cursor: 'pointer' }}>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-tiny font-semibold" style={{ color: 'var(--accent)', minWidth: 28 }}>{c.state}</span>
                        <span className="font-medium text-sm" style={{ color: 'var(--text)' }}>{c.name}</span>
                      </div>
                      <span className="text-tiny" style={{ color: 'var(--text-4)' }}>Chargers →</span>
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
              <div className="seg" role="group" aria-label="List or map">
                <button className={viewMode === 'list' ? 'on' : ''} onClick={() => setViewMode('list')}>List</button>
                <button className={viewMode === 'map' ? 'on' : ''} onClick={() => setViewMode('map')}>Map</button>
              </div>
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

            {viewMode === 'map' ? (
              <EVMap stations={stations} userLat={coords.lat} userLng={coords.lng} />
            ) : (
              <div className="space-y-3">
                {loading && <div className="muted">Finding chargers…</div>}
                {error && !loading && <div className="muted">Couldn’t load chargers: {error}</div>}
                {!loading && !error && stations.length === 0 && (
                  <div className="muted">No chargers found here. Try a wider radius or a different area.</div>
                )}
                {!loading && stations.map(s => (
                  <div className="card" key={s.id}>
                    <div className="ctop">
                      <div className="who">
                        <EVBrandMark network={s.network} size={36} />
                        <div>
                          <div className="net">{networkLabel(s.network)}</div>
                          {s.address && <div className="addr">{s.address}</div>}
                        </div>
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
            )}
          </div>
        </div>
      )}
    </div>
  );
}
