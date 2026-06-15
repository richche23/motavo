'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { DirectionsMenu } from '@/lib/directions';
import {
  Menu, X, ArrowRight, ArrowUpRight, Navigation,
  ChevronRight, TrendingDown, TrendingUp, AlertCircle,
  Map as MapIcon, List, Shield, Info,
  Loader2, Zap, Target, Compass, MoveRight,
  Search, MapPin, Building2, Home, Command,
  ThumbsUp, CheckCircle2, Users, Edit3, Check,
  Sun, Moon, Gauge, Fuel
} from 'lucide-react';
import { AlertSignup } from './AlertSignup';
import EVPanel from './EVPanel';
import { SUBURBS } from '@/lib/suburbs';

/* =====================================================================
   Large, prominent Fuel / EV mode toggle (home view)
   ===================================================================== */
const ModeToggle = ({ mode, onMode }) => {
  const base = {
    display: 'inline-flex', alignItems: 'center', gap: 10,
    padding: '14px 30px', fontSize: 16, fontWeight: 700,
    borderRadius: 0, border: 'none', cursor: 'pointer',
    transition: 'all .15s ease', letterSpacing: '-0.01em',
  };
  const on = { ...base, background: 'var(--accent)', color: '#fff', boxShadow: '0 2px 10px var(--accent-glow)' };
  const off = { ...base, background: 'transparent', color: 'var(--text-2)' };
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '30px 16px 6px' }}>
      <div
        role="tablist"
        aria-label="Choose Fuel or EV"
        style={{ display: 'inline-flex', gap: 6, padding: 6, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 0 }}
      >
        <button type="button" role="tab" aria-selected={mode === 'fuel'} style={mode === 'fuel' ? on : off} onClick={() => onMode('fuel')}>
          <Fuel size={20} /> Fuel
        </button>
        <button type="button" role="tab" aria-selected={mode === 'ev'} style={mode === 'ev' ? on : off} onClick={() => onMode('ev')}>
          <Zap size={20} /> EV charging
        </button>
      </div>
    </div>
  );
};

/* =====================================================================
   Motavo — Australian fuel price comparison
   Sleek dark aesthetic — Linear / Arc / Vercel-influenced
   ===================================================================== */

const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Anton&family=Hanken+Grotesk:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap');

    /* Soft brand-coloured mesh behind the hero, fading to the page bg below.
       Pure CSS — no image, no load cost. Tuned for both light and dark mode
       via the --hero-* variables defined per theme. */
    .hero-mesh {
      position: relative;
      isolation: isolate;
      background:
        radial-gradient(60% 70% at 12% 8%,  var(--hero-a) 0%, transparent 60%),
        radial-gradient(55% 65% at 88% 0%,  var(--hero-b) 0%, transparent 58%),
        radial-gradient(70% 60% at 70% 35%, var(--hero-c) 0%, transparent 65%),
        var(--bg);
    }
    /* Fade the mesh out toward the bottom so it blends into the plain page */
    .hero-mesh::after {
      content: '';
      position: absolute;
      left: 0; right: 0; bottom: 0;
      height: 45%;
      background: linear-gradient(to bottom, transparent, var(--bg));
      pointer-events: none;
      z-index: -1;
    }
    .hero-mesh > * { position: relative; z-index: 0; }

    :root {
      --bg: #e7e4dd;
      --bg-2: #ddd9cf;
      --surface: #f2f0ea;
      --surface-2: #e7e4dd;
      --surface-3: #d9d5ca;
      --border: #cbc6b9;
      --border-strong: #15120e;
      --text: #15120e;
      --text-2: #4a453d;
      --text-3: #6a655c;
      --text-4: #938c81;

      /* Motavo brand — concrete + ink + a single signal-orange accent */
      --blue: #0f7a52;
      --blue-dark: #0b5e3f;
      --blue-light: #bfe0cf;
      --blue-soft: #e4f1ea;
      --hero-a: transparent;
      --hero-b: transparent;
      --hero-c: transparent;
      /* green kept ONLY as the functional "this price is cheap" signal */
      --green: #2e7d4f;
      --green-dark: #226039;
      --green-light: #cfe6d8;
      --green-soft: #e8f2ec;

      /* Functional aliases */
      --accent: var(--blue);
      --accent-dark: var(--blue-dark);
      --accent-glow: rgba(15, 122, 82, 0.20);
      --success: var(--green);
      --success-glow: rgba(46, 125, 79, 0.18);
      --warn: #b4530a;
      --danger: #b91c1c;
    }

    .fm-app[data-theme="dark"] {
      --bg: #14110d;
      --bg-2: #1b1813;
      --surface: #1b1813;
      --surface-2: #221e18;
      --surface-3: #2c2820;
      --border: #322d25;
      --border-strong: #4a4338;
      --text: #efe9df;
      --text-2: #cfc7ba;
      --text-3: #9a9183;
      --text-4: #6f675b;

      /* signal orange lifts cleanly on charcoal */
      --blue: #34c281;
      --blue-dark: #0b5e3f;
      --blue-light: rgba(52, 194, 129, 0.20);
      --blue-soft: rgba(52, 194, 129, 0.12);
      --hero-a: transparent;
      --hero-b: transparent;
      --hero-c: transparent;
      --green: #4caf7a;
      --green-light: rgba(76, 175, 122, 0.20);
      --green-soft: rgba(76, 175, 122, 0.10);
      --accent-glow: rgba(52, 194, 129, 0.28);
      --success-glow: rgba(76, 175, 122, 0.22);
    }

    .font-display { font-family: 'Anton', 'Hanken Grotesk', system-ui, sans-serif; text-transform: uppercase; letter-spacing: 0.004em; font-weight: 400 !important; }
    .font-body { font-family: 'Hanken Grotesk', system-ui, sans-serif; letter-spacing: -0.006em; }
    .font-mono { font-family: 'JetBrains Mono', ui-monospace, monospace; font-feature-settings: 'tnum' on, 'ss01' on; letter-spacing: -0.01em; }

    .fm-app, .fm-app * { box-sizing: border-box; }
    .fm-app {
      font-family: 'Hanken Grotesk', system-ui, sans-serif;
      color: var(--text);
      background: var(--bg);
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    .grid-bg {
      background-image:
        linear-gradient(rgba(15,23,42,0.035) 1px, transparent 1px),
        linear-gradient(90deg, rgba(15,23,42,0.035) 1px, transparent 1px);
      background-size: 64px 64px;
      background-position: -1px -1px;
    }

    .fm-app[data-theme="dark"] .grid-bg {
      background-image:
        linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px);
    }

    .spotlight {
      background:
        radial-gradient(ellipse 80% 50% at 50% -10%, rgba(15, 122, 82,0.06), transparent 70%);
    }

    .surface-card { background: var(--surface); border: 1px solid var(--border); border-radius:0; }

    @keyframes pulse-glow { 0%,100% { box-shadow: 0 0 0 0 var(--success-glow); } 50% { box-shadow: 0 0 0 6px transparent; } }
    .pulse-glow { animation: pulse-glow 2.2s ease-in-out infinite; }

    @keyframes pulse-pin { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.2); } }
    .pulse-pin { animation: pulse-pin 2.4s ease-in-out infinite; transform-origin: center; }

    @keyframes fadeUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
    .fade-up { animation: fadeUp 420ms cubic-bezier(0.16, 1, 0.3, 1) both; }

    @keyframes shimmer {
      0%   { background-position: -400px 0; }
      100% { background-position: 400px 0; }
    }
    .skeleton {
      background: linear-gradient(90deg, var(--surface) 25%, var(--surface-2, var(--border)) 50%, var(--surface) 75%);
      background-size: 800px 100%;
      animation: shimmer 1.4s linear infinite;
    }

    /* iOS Safari auto-zooms (and stays zoomed) when focusing any input with
       font-size < 16px. Enforce the floor on touch-sized screens so no
       current or future input can trigger it. Overrides inline styles. */
    @media (max-width: 767px) {
      input, select, textarea { font-size: 16px !important; }
    }

    /* Headline accent — flat signal orange (no gradient) */
    .brand-gradient {
      background: none;
      -webkit-background-clip: border-box;
      background-clip: border-box;
      color: var(--accent);
    }

    .hover-raise { transition: transform 200ms cubic-bezier(0.16, 1, 0.3, 1), border-color 200ms, background 200ms, box-shadow 200ms; }
    .hover-raise:hover { transform: translateY(-1px); border-color: var(--border-strong); box-shadow: 0 6px 20px -8px rgba(15,23,42,0.10); }

    .glass {
      background: rgba(231,228,221,0.82);
      backdrop-filter: saturate(140%) blur(12px);
      -webkit-backdrop-filter: saturate(140%) blur(12px);
    }

    .fm-app[data-theme="dark"] .glass {
      background: rgba(20, 17, 13, 0.86);
    }

    .fm-app input:focus, .fm-app button:focus-visible, .fm-app a:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
    .fm-app button { font-family: inherit; }

    .ulink { position: relative; }
    .ulink::after {
      content: ''; position: absolute; left: 0; right: 0; bottom: -2px;
      height: 1px; background: currentColor; transform-origin: left;
      transition: transform 200ms cubic-bezier(0.16, 1, 0.3, 1);
    }
    .ulink:hover::after { transform: scaleX(0); transform-origin: right; }

    .fm-app ::selection { background: var(--accent); color: #ffffff; }

    .scroller::-webkit-scrollbar { height: 4px; }
    .scroller::-webkit-scrollbar-track { background: transparent; }
    .scroller::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius:0; }

    .text-micro { font-size: 10.5px; line-height: 1.4; }
    .text-tiny  { font-size: 11.5px; line-height: 1.4; }
    .lead-tight { line-height: 0.94; }
    .track-wide { letter-spacing: 0.16em; font-family: 'JetBrains Mono', ui-monospace, monospace; }
    .track-wider { letter-spacing: 0.22em; }
  `}</style>
);

/* ===== DATA ===== */

const FUEL_TYPES = [
  { code: 'U91', label: 'Unleaded 91', short: '91', desc: 'Regular unleaded' },
  { code: 'E10', label: 'E10', short: 'E10', desc: '91 with 10% ethanol' },
  { code: 'P95', label: 'Premium 95', short: '95', desc: 'Premium unleaded' },
  { code: 'P98', label: 'Premium 98', short: '98', desc: 'High-octane premium' },
  { code: 'DSL', label: 'Diesel', short: 'Diesel', desc: 'Standard diesel' },
  { code: 'LPG', label: 'LPG', short: 'LPG', desc: 'Liquefied petroleum gas' },
];

const BRANDS = {
  // Major national chains
  '7-Eleven':          { color: '#008837', short: '7E', domain: '7eleven.com.au' },
  'Ampol':             { color: '#1d4ed8', short: 'AM', domain: 'ampol.com.au' },
  'BP':                { color: '#16a34a', short: 'BP', domain: 'bp.com' },
  'Caltex':            { color: '#dc2626', short: 'CX', domain: 'caltex.com.au' },
  'Caltex Woolworths': { color: '#dc2626', short: 'CW', domain: 'woolworthspetrol.com.au' },
  'Coles Express':     { color: '#ef4444', short: 'CE', domain: 'colesexpress.com.au' },
  'Costco':            { color: '#2563eb', short: 'CO', domain: 'costco.com.au' },
  'EG':                { color: '#0369a1', short: 'EG', domain: 'eg.group' },
  'EG Ampol':          { color: '#0369a1', short: 'EG', domain: 'eg.group' },
  'Liberty':           { color: '#e11d48', short: 'LI', domain: 'libertyoil.com.au' },
  'Metro Petroleum':   { color: '#0284c7', short: 'MP', domain: 'metropetroleum.com.au' },
  'Mobil':             { color: '#c2001e', short: 'MO', domain: 'mobil.com' },
  'Puma':              { color: '#d97706', short: 'PU', domain: 'pumaenergy.com.au' },
  'Shell':             { color: '#e8a800', short: 'SH', domain: 'shell.com.au' },
  'United':            { color: '#3b82f6', short: 'UN', domain: 'unitedpetroleum.com.au' },
  'Vibe':              { color: '#a855f7', short: 'VI', domain: 'vibepetroleum.com.au' },
  // Australian independents
  'Reddy Express':     { color: '#dc2626', short: 'RE', domain: 'reddyexpress.com.au' },
  'Astron':            { color: '#1e3a8a', short: 'AS', domain: 'astronpetroleum.com.au' },
  'Eagle':             { color: '#b45309', short: 'EA', domain: 'eagleboysgas.com.au' },
  'Eagle Group':       { color: '#b45309', short: 'EA', domain: 'eagleboysgas.com.au' },
  'On The Run':        { color: '#dc2626', short: 'OT', domain: 'ontherun.com.au' },
  'Lowes Petroleum':   { color: '#1d4ed8', short: 'LP', domain: 'lowespetroleum.com.au' },
  'Speedway':          { color: '#b91c1c', short: 'SW', domain: null },
  'Night Owl':         { color: '#4f46e5', short: 'NO', domain: 'nightowl.com.au' },
  'IGA':               { color: '#dc2626', short: 'IG', domain: 'iga.com.au' },
  // Fallback
  'Independent':       { color: '#52525b', short: '··', domain: null },
};
const BRAND_NAMES = Object.keys(BRANDS);

// Build a logo URL for a given brand domain.
// Note: Clearbit's free Logo API (logo.clearbit.com) was sunset on Dec 1, 2025.
// We use Google's S2 favicon service instead — free, no API key, works
// on any domain, and serves a usable brand mark (typically the favicon, which
// for most chains is a clean circular logo). Quality is "favicon-grade" rather
// than full wordmarks; the colored monogram fallback handles cases where the
// service returns nothing usable.
//
// Production note: for higher-fidelity logos, swap this for a paid service
// like logo.dev (requires API key and a backend proxy to keep the key server-side).
// Brandfetch Logo Link is the professional source for official, full-colour brand
// logos resolved by domain (favicon scraping returns generic globes, so it's gone).
// Set NEXT_PUBLIC_BRANDFETCH_CLIENT_ID (free key) to enable real logos. A self-hosted
// file at /public/brands/<slug>.svg overrides any brand and wins over everything.
// When nothing resolves, BrandMark shows a branded monogram — never a broken globe.
const BRANDFETCH_ID = (typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_BRANDFETCH_CLIENT_ID) || '';
function brandLogoUrls(domain, slug) {
  const urls = [];
  if (slug)   urls.push(`/brands/${slug}.svg`);
  if (domain && BRANDFETCH_ID) urls.push(`https://cdn.brandfetch.io/${domain}/w/128/h/128/fallback/404/type/icon?c=${BRANDFETCH_ID}`);
  if (domain) {
    urls.push(`https://icons.duckduckgo.com/ip3/${domain}.ico`);
    urls.push(`https://www.google.com/s2/favicons?domain=${domain}&sz=128`);
  }
  return urls;
}
function brandSlug(name) {
  return name ? name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') : null;
}

const CITIES = [
  { slug: 'sydney',    name: 'Sydney',    state: 'NSW', live: true, pop: '5.4M', cycle: '~6 weeks',          center: { lat: -33.8688, lng: 151.2093 } },
  { slug: 'melbourne', name: 'Melbourne', state: 'VIC', live: true, pop: '5.2M', cycle: '~5-6 weeks',        center: { lat: -37.8136, lng: 144.9631 } },
  { slug: 'brisbane',  name: 'Brisbane',  state: 'QLD', live: true, pop: '2.6M', cycle: '~3-4 weeks',        center: { lat: -27.4698, lng: 153.0251 } },
  { slug: 'perth',     name: 'Perth',     state: 'WA',  live: true, pop: '2.2M', cycle: 'Weekly (Tue cheap)',center: { lat: -31.9523, lng: 115.8613 } },
  { slug: 'adelaide',  name: 'Adelaide',  state: 'SA',  live: true, pop: '1.4M', cycle: '~3 weeks',          center: { lat: -34.9285, lng: 138.6007 } },
  { slug: 'canberra',  name: 'Canberra',  state: 'ACT', live: true, pop: '460K', cycle: 'Stable',            center: { lat: -35.2809, lng: 149.1300 } },
  { slug: 'hobart',    name: 'Hobart',    state: 'TAS', live: true, pop: '250K', cycle: 'Stable',            center: { lat: -42.8821, lng: 147.3272 } },
  { slug: 'darwin',    name: 'Darwin',    state: 'NT',  live: true, pop: '150K', cycle: 'Stable',            center: { lat: -12.4634, lng: 130.8456 } },
];

// Map a state code to its representative capital-city entry (for cycle labels)
const cityForState = (state) => CITIES.find(c => c.state === state) || null;

/* ── Live cycle signals (city-grid chips) ─────────────────────────────────
   One fetch pulls the server-logged cycle position for every state
   (/api/cycle/summary — single Redis MGET behind it) and renders a compact
   verdict chip on each city card. Chips only appear once the daily cron has
   logged enough history for that state (>= 4 days, >= 3c/L spread) — no
   false precision while it's still learning. */
const SIGNAL_TONES = {
  low:  { label: 'Fill up now',    sub: 'Near cycle bottom',  dot: '🟢', color: 'var(--success)', bg: 'var(--green-soft)',  border: 'var(--green-light)' },
  mid:  { label: 'Mid-cycle',      sub: 'Prices are average', dot: '🟡', color: 'var(--text-2)',  bg: 'var(--surface-2)',  border: 'var(--border)'      },
  high: { label: 'Hold off',       sub: 'Prices climbing',    dot: '🟠', color: 'var(--warn)',    bg: '#fdf0e6',           border: '#f0c090'             },
  peak: { label: 'Avoid if you can', sub: 'Near cycle peak',  dot: '🔴', color: 'var(--danger)',  bg: '#fdeaea',           border: '#f0b0b0'             },
};

function useCycleSignals(fuelType = 'U91') {
  const [signals, setSignals] = useState({});
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/cycle/summary?fuel=${fuelType}`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (!cancelled && d?.signals) setSignals(d.signals); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [fuelType]);
  return signals;
}

/* Full badge — used in the CitiesIndexView grid cards */
const SignalBadge = ({ signal }) => {
  const tone = signal && SIGNAL_TONES[signal.tone];
  if (!tone) return null;
  return (
    <span className="inline-flex items-center gap-2 px-2.5 py-1.5"
          style={{ background: tone.bg, border: `1px solid ${tone.border}`, whiteSpace: 'nowrap' }}>
      <span style={{ fontSize: 13, lineHeight: 1 }}>{tone.dot}</span>
      <span>
        <span className="block font-mono text-xs font-bold uppercase track-wide" style={{ color: tone.color, lineHeight: 1.2 }}>{tone.label}</span>
        <span className="block font-mono text-micro" style={{ color: 'var(--text-3)', lineHeight: 1.3 }}>{tone.sub}</span>
      </span>
    </span>
  );
};

/* Compact inline chip — used in the HomeView city list */
const SignalChip = ({ signal }) => {
  const tone = signal && SIGNAL_TONES[signal.tone];
  if (!tone) return null;
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-1"
          style={{ background: tone.bg, border: `1px solid ${tone.border}`, whiteSpace: 'nowrap' }}>
      <span style={{ fontSize: 10, lineHeight: 1 }}>{tone.dot}</span>
      <span className="font-mono text-micro font-bold uppercase track-wide" style={{ color: tone.color }}>{tone.label}</span>
    </span>
  );
};

/**
 * Government fuel price data sources by state. All Australian states now
 * mandate real-time price reporting; each source provides a free API for
 * authorised "data publishers" (which Motavo registers as on launch).
 *
 * Status values:
 *   'mock'     — currently using generateStations() with seeded RNG
 *   'pending'  — API application submitted, awaiting approval
 *   'live'     — production API integration active
 *
 * To swap from mock to live: register with the relevant agency, get an API
 * key, set status to 'live', and implement fetchFromSource() in api/fuel.ts.
 */
const DATA_SOURCES = {
  'nsw-fuelcheck':      { name: 'NSW FuelCheck',                  states: ['NSW', 'TAS', 'ACT'], status: 'mock', signup: 'https://api.nsw.gov.au/Product/Index/22' },
  'qld-fuelprices':     { name: 'Fuel Prices Queensland',         states: ['QLD'],               status: 'mock', signup: 'https://www.data.qld.gov.au/' },
  'wa-fuelwatch':       { name: 'FuelWatch',                      states: ['WA'],                status: 'mock', signup: 'https://www.fuelwatch.wa.gov.au/' },
  'vic-servosaver':     { name: 'Servo Saver Public API',         states: ['VIC'],               status: 'mock', signup: 'https://service.vic.gov.au/find-services/transport-and-driving/servo-saver/help-centre/servo-saver-public-api' },
  'sa-informedsources': { name: 'SA Fuel Pricing Info Scheme',    states: ['SA'],                status: 'mock', signup: 'https://www.cbs.sa.gov.au/sections/CBAdvice/fuel-pricing-apps-and-websites' },
  'nt-myfuelnt':        { name: 'MyFuel NT',                      states: ['NT'],                status: 'mock', signup: 'https://nt.gov.au/' },
};

// Reverse map: state code → data source key (for fetchStationsForLocation)
const STATE_TO_SOURCE = Object.entries(DATA_SOURCES).reduce((acc, [key, src]) => {
  src.states.forEach(s => { acc[s] = key; });
  return acc;
}, {});


function mulberry32(seed) {
  return function () {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

function generateStations(centerLat, centerLng, locationKey, stateCode, count = 14) {
  const rng = mulberry32(hashStr(locationKey));
  const baseU91 = 178.5 + (rng() - 0.5) * 8;
  const cycleOffset = (rng() - 0.5) * 14;
  const baseAdj = baseU91 + cycleOffset;

  const brandBias = {
    'Costco': -14, 'United': -7, 'Liberty': -6, 'Metro Petroleum': -5,
    '7-Eleven': +5, 'Coles Express': +3, 'Caltex Woolworths': +2,
    'BP': +4, 'Shell': +4, 'Mobil': +3, 'Ampol': +2, 'EG Ampol': +1,
    'Independent': -3, 'Vibe': -2, 'Puma': -1,
  };

  const streetNames = ['Main St','Princes Hwy','Pacific Hwy','Hume Hwy','Great Eastern Hwy','Stuart Hwy','Bruce Hwy','Forest Rd','Victoria Rd','Anzac Pde','High St','Church St','King St','Queen St','George St'];
  const stations = [];

  for (let i = 0; i < count; i++) {
    const brand = BRAND_NAMES[Math.floor(rng() * BRAND_NAMES.length)];
    const bias = brandBias[brand] ?? 0;
    const noise = (rng() - 0.5) * 6;
    const u91 = Math.max(149, baseAdj + bias + noise);

    const distKm = 0.3 + Math.pow(rng(), 1.5) * 8.2;
    const angle = rng() * Math.PI * 2;
    const dLat = (distKm * Math.cos(angle)) / 111;
    const dLng = (distKm * Math.sin(angle)) / (111 * Math.cos(centerLat * Math.PI / 180));

    const street = streetNames[Math.floor(rng() * streetNames.length)];
    const number = 10 + Math.floor(rng() * 980);
    const minutesAgo = Math.floor(rng() * 180);

    const fuelOffsets = {
      U91: 0,
      E10: -2.5 + (rng() - 0.5) * 1.5,
      P95: 14 + (rng() - 0.5) * 4,
      P98: 28 + (rng() - 0.5) * 5,
      DSL: 6 + (rng() - 0.5) * 8,
      LPG: -78 + (rng() - 0.5) * 12,
    };

    const prices = {};
    for (const ft of FUEL_TYPES) {
      const stocked = !(ft.code === 'LPG' && rng() < 0.55) &&
                      !(ft.code === 'P98' && rng() < 0.18) &&
                      !(ft.code === 'E10' && rng() < 0.20);
      prices[ft.code] = stocked ? +(u91 + fuelOffsets[ft.code]).toFixed(1) : null;
    }

    stations.push({
      id: `${locationKey}-${i}`,
      brand,
      address: `${number} ${street}`,
      lat: centerLat + dLat,
      lng: centerLng + dLng,
      distance: +distKm.toFixed(1),
      prices,
      updatedMinutesAgo: minutesAgo,
      state: stateCode,
    });
  }

  return stations;
}

/* =====================================================================
   API CLIENT — calls the backend in production, falls back to mock data
   when the backend is unreachable (artifact preview, offline, etc.)

   The backend lives at /api/fuel/[state] and is built from the files in
   /motavo-backend/. See its README for setup. Until you wire up Vercel
   + state APIs, this function will always fall back to generateStations()
   below — meaning the app keeps working with seeded mock data.

   To force live data only (no mock fallback), set FUELMATE_REQUIRE_LIVE=true
   in the env. To force mock everywhere (for testing), set FUELMATE_FORCE_MOCK.
   ===================================================================== */

// State -> API path segment. TAS and ACT share NSW's FuelCheck scheme.
const STATE_API_PATH = {
  NSW: 'nsw', VIC: 'vic', QLD: 'qld', WA: 'wa',
  SA:  'sa',  TAS: 'tas', NT:  'nt',  ACT: 'act',
};

// Approximate AU state from coordinates, for current-location lookups.
// Boxes are ordered so border overlaps resolve sensibly; falls back to the
// nearest capital so a result is always returned.
const CAPITAL_STATES = [
  { state: 'NSW', lat: -33.8688, lng: 151.2093 },
  { state: 'VIC', lat: -37.8136, lng: 144.9631 },
  { state: 'QLD', lat: -27.4698, lng: 153.0251 },
  { state: 'WA',  lat: -31.9523, lng: 115.8613 },
  { state: 'SA',  lat: -34.9285, lng: 138.6007 },
  { state: 'TAS', lat: -42.8821, lng: 147.3272 },
  { state: 'NT',  lat: -12.4634, lng: 130.8456 },
  { state: 'ACT', lat: -35.2809, lng: 149.1300 },
];
function stateFromCoords(lat, lng) {
  if (lat <= -35.1 && lat >= -35.95 && lng >= 148.75 && lng <= 149.45) return 'ACT';
  if (lat <= -39.2 && lng >= 143.5 && lng <= 149.2) return 'TAS';
  if (lat <= -33.9 && lat >= -39.3 && lng >= 140.8 && lng <= 150.2) return 'VIC';
  if (lat <= -28.0 && lat >= -37.6 && lng >= 140.9 && lng <= 153.7) return 'NSW';
  if (lat <= -9.5  && lat >= -29.2 && lng >= 137.9 && lng <= 153.6) return 'QLD';
  if (lat <= -25.9 && lat >= -38.2 && lng >= 128.9 && lng <= 141.1) return 'SA';
  if (lat <= -10.9 && lat >= -26.1 && lng >= 128.9 && lng <= 138.1) return 'NT';
  if (lng <= 129.1) return 'WA';
  let best = 'NSW', bestD = Infinity;
  for (const c of CAPITAL_STATES) {
    const d = (lat - c.lat) ** 2 + (lng - c.lng) ** 2;
    if (d < bestD) { bestD = d; best = c.state; }
  }
  return best;
}

async function fetchStationsForLocation({ lat, lng, state, fuelType, radius = 25, limit = 200, locationKey, count = 18 }) {
  const path = STATE_API_PATH[state];
  if (!path) {
    // Unknown state — only path is mock
    return generateStations(lat, lng, locationKey, state, count);
  }

  try {
    const params = new URLSearchParams({
      lat: String(lat), lng: String(lng), radius: String(radius), limit: String(limit),
    });
    if (fuelType) params.set('fuelType', fuelType);

    const ctrl = new AbortController();
    const timeoutId = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(`/api/fuel/${path}?${params}`, { signal: ctrl.signal });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error(`API ${res.status}`);
    const data = await res.json();

    // API responded successfully. If it returned no stations, that's a REAL
    // "no data for this area" result — show an honest empty state rather than
    // fabricated prices. Serving mock data on a live site erodes trust and
    // could send someone to a station with a made-up price.
    if (!data?.stations?.length) return [];
    // Backend already filters by radius/limit and sorts by distance.
    return data.stations;
  } catch {
    // Genuine fetch failure (offline, or the artifact-preview iframe where
    // /api isn't reachable). Mock data only here so the preview still demos.
    const PROD_DOMAINS = ['motavo.au', 'motavo.com.au', 'fuelmate.au'];
    const host = typeof window !== 'undefined' ? window.location.hostname : '';
    if (PROD_DOMAINS.some(d => host === d || host.endsWith('.' + d))) {
      return []; // production: never show fabricated data
    }
    return generateStations(lat, lng, locationKey, state, count);
  }
}

function formatPriceCents(c) {
  if (c == null) return '—';
  let whole = Math.floor(c);
  let dec   = Math.round((c - whole) * 10);
  if (dec >= 10) { whole += 1; dec = 0; } // handle rounding up at boundary
  return { whole: String(whole), dec: String(dec) };
}

function timeAgoLabel(min) {
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function timeAgoFromTimestamp(ts) {
  const min = Math.max(0, Math.floor((Date.now() - ts) / 60000));
  return timeAgoLabel(min);
}

/**
 * Classify a price-update age into a freshness bucket.
 * Drives the coloured dot next to each station's "X min ago" label.
 */
function freshness(updatedMinutesAgo) {
  if (updatedMinutesAgo < 30)  return { tone: 'fresh', color: '#2e7d4f', label: 'Fresh' };
  if (updatedMinutesAgo < 240) return { tone: 'stale', color: '#b4530a', label: 'Stale' };
  return { tone: 'old', color: '#b91c1c', label: 'Old' };
}

// Sources that publish a once-daily snapshot rather than near-real-time prices.
// For these, a relative "Xd ago" stamp is misleading — the data is meant to be
// ~24h old — so we show "Updates daily" and suppress the "may be outdated" flag.
const DAILY_FEEDS = new Set(['vic-servosaver']);
const isDailyFeed = (station) => DAILY_FEEDS.has(station?.source);

/**
 * Rough urban driving time from straight-line distance.
 * Australian urban average ~25 km/h once stops are factored in → 2.4 min/km.
 * Always rounds up to at least 1 minute.
 */
function estimateDriveMinutes(distanceKm) {
  return Math.max(1, Math.round(distanceKm * 2.4));
}

/* =====================================================================
   PERSISTENT STORAGE — survives across visits
   Wraps window.storage with try/catch so a storage failure never crashes
   the app. Fire-and-forget writes; reads return null on failure.
   ===================================================================== */

const STORAGE_KEYS = {
  location:         'fm:lastLocation',
  fuelType:         'fm:preferredFuelType',
  confirmedReports: 'fm:confirmedReports',
  geoConsent:       'fm:geoConsent',
};

const fmStorage = {
  // localStorage so state survives across visits — a returning user gets
  // their last location and fuel type back instantly instead of starting
  // from a blank homepage every time. (Was sessionStorage; changed
  // deliberately: the weekly price-check habit shouldn't require re-search.)
  async get(key) {
    try {
      if (typeof window === 'undefined') return null;
      const val = localStorage.getItem(key);
      return val ? JSON.parse(val) : null;
    } catch { return null; }
  },
  async set(key, value) {
    try {
      if (typeof window === 'undefined') return;
      localStorage.setItem(key, JSON.stringify(value));
    } catch { /* swallow */ }
  },
};

/* =====================================================================
   DRIVER REPORTS — crowdsourced live prices
   ===================================================================== */

const REPORT_FRESHNESS_MIN = 60 * 6;       // 6 hours: reports older than this drop off
const REPORT_TRUSTED_MIN_CONFIRMS = 2;     // Reports promoted to "verified" at this many confirms
const REPORT_UNUSUAL_THRESHOLD = 12;       // Cents difference vs official that triggers warning
const REPORT_REJECT_THRESHOLD = 25;        // Cents difference vs official that's outright rejected

const REPORTER_NAMES = ['Mike', 'Sarah', 'Jake', 'Ana', 'Tim', 'Em', 'Raj', 'Pat', 'Sam', 'Kel'];


/* =====================================================================
   MOTAVO LOGO — inline SVG mark + wordmark, theme-aware via currentColor.
   The mark is a single-weight monoline "M"; the wordmark is set in
   Hanken Grotesk SemiBold. Both inherit the surrounding text colour.
   ===================================================================== */

const MotavoMark = ({ size = 32 }) => (
  <svg viewBox="30 30 68 68" width={size} height={size} fill="none" aria-hidden="true">
    <path
      d="M37 86 L37 43 L64 72.5 L91 43 L91 86"
      fill="none"
      stroke="currentColor"
      strokeWidth="11.5"
      strokeLinejoin="round"
      strokeLinecap="round"
    />
  </svg>
);

const MotavoWordmark = ({ size = 22 }) => (
  // Locked vector outline of "motavo" (Space Grotesk SemiBold, baked to paths).
  // Font-independent: never reflows when the site fonts change. `size` = cap height in px.
  <svg viewBox="0 0 3499 667" height={size} width={size * 5.246} fill="currentColor"
       aria-hidden="true" style={{ display: 'block' }}>
    <g transform="translate(-73,653) scale(1,-1)"><path d="M73.0 0V494H186.0V439H203.0Q216.0 464 246.5 483.5Q277.0 503 328.0 503Q382.0 503 415.0 481.0Q448.0 459 465.0 425H481.0Q498.0 459 530.0 481.0Q562.0 503 621.0 503Q667.0 503 704.5 483.0Q742.0 463 764.5 424.0Q787.0 385 787.0 327V0H672.0V319Q672.0 362 649.0 384.5Q626.0 407 585.0 407Q540.0 407 513.5 377.5Q487.0 348 487.0 293V0H373.0V319Q373.0 362 350.0 384.5Q327.0 407 286.0 407Q240.0 407 214.0 377.5Q188.0 348 188.0 293V0Z M1154.0 -14Q1080.0 -14 1021.5 16.5Q963.0 47 929.5 103.5Q896.0 160 896.0 239V255Q896.0 334 929.5 391.0Q963.0 448 1021.5 478.0Q1080.0 508 1154.0 508Q1228.0 508 1286.0 478.0Q1344.0 448 1377.5 391.0Q1411.0 334 1411.0 255V239Q1411.0 160 1377.5 103.5Q1344.0 47 1286.0 16.5Q1228.0 -14 1154.0 -14ZM1154.0 88Q1217.0 88 1257.0 128.5Q1297.0 169 1297.0 242V252Q1297.0 325 1257.0 365.5Q1217.0 406 1154.0 406Q1091.0 406 1051.0 365.5Q1011.0 325 1011.0 252V242Q1011.0 169 1051.0 128.5Q1091.0 88 1154.0 88Z M1713.0 0Q1665.0 0 1636.5 28.5Q1608.0 57 1608.0 106V399H1479.0V494H1608.0V653H1723.0V494H1865.0V399H1723.0V125Q1723.0 95 1751.0 95H1850.0V0Z M2127.0 -14Q2075.0 -14 2033.0 4.5Q1991.0 23 1966.5 58.0Q1942.0 93 1942.0 144Q1942.0 194 1966.5 228.0Q1991.0 262 2034.0 279.5Q2077.0 297 2132.0 297H2275.0V327Q2275.0 366 2251.0 390.5Q2227.0 415 2176.0 415Q2126.0 415 2100.5 391.5Q2075.0 368 2067.0 331L1961.0 366Q1973.0 405 1999.5 437.0Q2026.0 469 2070.0 488.5Q2114.0 508 2178.0 508Q2275.0 508 2330.5 459.5Q2386.0 411 2386.0 319V125Q2386.0 95 2414.0 95H2456.0V0H2375.0Q2339.0 0 2316.0 18.0Q2293.0 36 2293.0 67V69H2276.0Q2270.0 55 2255.0 35.0Q2240.0 15 2209.5 0.5Q2179.0 -14 2127.0 -14ZM2146.0 80Q2203.0 80 2239.0 112.5Q2275.0 145 2275.0 200V210H2139.0Q2102.0 210 2079.0 194.0Q2056.0 178 2056.0 147Q2056.0 117 2080.0 98.5Q2104.0 80 2146.0 80Z M2652.0 0 2490.0 494H2612.0L2734.0 84H2751.0L2874.0 494H2996.0L2834.0 0Z M3315.0 -14Q3241.0 -14 3182.5 16.5Q3124.0 47 3090.5 103.5Q3057.0 160 3057.0 239V255Q3057.0 334 3090.5 391.0Q3124.0 448 3182.5 478.0Q3241.0 508 3315.0 508Q3389.0 508 3447.0 478.0Q3505.0 448 3538.5 391.0Q3572.0 334 3572.0 255V239Q3572.0 160 3538.5 103.5Q3505.0 47 3447.0 16.5Q3389.0 -14 3315.0 -14ZM3315.0 88Q3378.0 88 3418.0 128.5Q3458.0 169 3458.0 242V252Q3458.0 325 3418.0 365.5Q3378.0 406 3315.0 406Q3252.0 406 3212.0 365.5Q3172.0 325 3172.0 252V242Q3172.0 169 3212.0 128.5Q3252.0 88 3315.0 88Z"/></g>
  </svg>
);

const MotavoLogo = ({ markSize = 27, wordSize = 21 }) => (
  <span className="inline-flex items-center gap-2.5" style={{ color: 'var(--text)' }}>
    <MotavoMark size={markSize} />
    <MotavoWordmark size={wordSize} />
  </span>
);

/* ===== ATOMS ===== */

/**
 * BrandMark — renders a station's brand logo with a graceful fallback.
 *
 * Behavior:
 *   1. If the brand has a domain mapping, attempt to load the logo from
 *      Clearbit's Logo API (free, no key needed).
 *   2. While the image is loading, show the colored monogram tile.
 *   3. If the image fails (network error, brand has no domain, Clearbit 404),
 *      stay on the monogram permanently.
 *   4. Once the image loads, fade it in over a white-rounded plate so logos
 *      with transparent backgrounds (most of them) sit cleanly on dark and
 *      light surfaces alike.
 */
const BrandMark = ({ brand, size = 36 }) => {
  const b     = BRANDS[brand] || null;
  const color = b?.color || '#64748b';
  // Derive readable 2-char initials when brand isn't in our list
  const short = b?.short || (() => {
    if (!brand) return '··';
    const words = brand.replace(/[^a-zA-Z0-9 ]/g, ' ').trim().split(/ +/);
    if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
    return brand.substring(0, 2).toUpperCase();
  })();
  const logos = brandLogoUrls(b?.domain || null, b?.slug || brandSlug(brand));
  const [srcIdx, setSrcIdx] = useState(0);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { setSrcIdx(0); setLoaded(false); }, [brand]);
  const logoUrl  = logos[srcIdx] ?? null;
  const showLogo = !!logoUrl;

  return (
    <div
      className="relative shrink-0 overflow-hidden"
      style={{
        width: size,
        height: size,
        borderRadius: 0,
        background: showLogo && loaded ? '#ffffff' : color,
        border: showLogo && loaded ? '1px solid var(--border)' : 'none',
        boxShadow: showLogo && loaded ? '0 1px 2px rgba(15,23,42,0.05)' : 'inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -1px 0 rgba(0,0,0,0.18)',
        transition: 'background 200ms ease, border-color 200ms ease, box-shadow 200ms ease',
      }}
      aria-hidden="true"
      title={brand}
    >
      {/* Monogram fallback */}
      <div
        className="absolute inset-0 flex items-center justify-center font-display text-white"
        style={{
          fontSize: size * 0.4,
          letterSpacing: '0.02em',
          opacity: showLogo && loaded ? 0 : 1,
          transition: 'opacity 200ms ease',
        }}
      >
        {short}
      </div>

      {/* Real logo, fades in when loaded */}
      {showLogo && (
        <img
          key={srcIdx}
          src={logoUrl}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={() => setLoaded(true)}
          onError={() => setSrcIdx(i => Math.min(i + 1, logos.length))}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            padding: Math.round(size * 0.12),
            opacity: loaded ? 1 : 0,
            transition: 'opacity 240ms ease',
          }}
        />
      )}
    </div>
  );
};

const Pill = ({ children, tone = 'neutral', className = '' }) => {
  const tones = {
    neutral: { bg: 'transparent', border: 'var(--border-strong)', color: 'var(--text-3)' },
    accent:  { bg: 'rgba(46,125,79,0.10)', border: 'rgba(46,125,79,0.30)', color: 'var(--success)' },
    brand:   { bg: 'rgba(15, 122, 82,0.10)', border: 'rgba(15, 122, 82,0.30)', color: 'var(--blue)' },
    warn:    { bg: 'rgba(180,83,10,0.12)', border: 'rgba(180,83,10,0.32)', color: 'var(--warn)' },
    soft:    { bg: 'var(--surface-2)', border: 'var(--border)', color: 'var(--text-2)' },
  }[tone];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-tiny font-medium uppercase track-wide ${className}`}
      style={{ background: tones.bg, border: `1px solid ${tones.border}`, color: tones.color }}
    >{children}</span>
  );
};

const PriceTag = ({ cents, large = false, tone = 'default' }) => {
  if (cents == null) return <span className="font-mono font-medium" style={{ color: 'var(--text-4)' }}>n/a</span>;
  const { whole, dec } = formatPriceCents(cents);
  const colors = { default: 'var(--text)', cheap: 'var(--success)', high: 'var(--warn)' };
  return (
    <span className="font-mono font-medium tabular-nums leading-none whitespace-nowrap" style={{ color: colors[tone] }}>
      <span style={{ fontSize: large ? '3rem' : '1.35rem', fontWeight: 600 }}>{whole}</span>
      <span style={{ fontSize: large ? '1.4rem' : '0.85rem', opacity: 0.7 }}>.{dec}</span>
      <span className="font-body font-normal ml-1" style={{ fontSize: large ? '0.85rem' : '0.7rem', color: 'var(--text-4)' }}>¢/L</span>
    </span>
  );
};

// ─── AdSense slot IDs ─────────────────────────────────────────────────────
// Set these in Vercel → your project → Settings → Environment Variables.
// Variable names: NEXT_PUBLIC_ADSENSE_LEADERBOARD_SLOT and
//                 NEXT_PUBLIC_ADSENSE_RECTANGLE_SLOT
// Paste the data-ad-slot number from each AdSense unit as the value.
// No code changes needed — just add the env vars and redeploy.
const AD_SLOTS = {
  leaderboard: process.env.NEXT_PUBLIC_ADSENSE_LEADERBOARD_SLOT || '',
  rectangle:   process.env.NEXT_PUBLIC_ADSENSE_RECTANGLE_SLOT   || '',
};

const ADSENSE_CLIENT = 'ca-pub-8867825238666070';
// ──────────────────────────────────────────────────────────────────────────

const AdSlot = ({ size = 'leaderboard' }) => {
  const [mounted, setMounted] = useState(false);
  const insRef = useRef(null);
  const slotId = AD_SLOTS[size] || AD_SLOTS.leaderboard;

  // Only render on client — avoids SSR/hydration mismatch with AdSense
  useEffect(() => setMounted(true), []);

  // Push the ad once the <ins> element is in the DOM
  useEffect(() => {
    if (!mounted || !slotId || !insRef.current) return;
    // Guard against double-push in React StrictMode or re-renders
    if (insRef.current.getAttribute('data-adsbygoogle-status')) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      // AdSense script not loaded yet — happens in dev or before approval
    }
  }, [mounted, slotId]);

  const dims = {
    leaderboard: { maxW: 728, minH: 90 },
    rectangle:   { maxW: 300, minH: 250 },
    inline:      { maxW: 600, minH: 100 },
    sidebar:     { maxW: 300, minH: 600 },
  }[size] || { maxW: 728, minH: 90 };

  // Show nothing when slot ID not configured or not yet mounted.
  // Showing a visible placeholder box causes AdSense policy violations
  // ("ads on screens without publisher-content").
  if (!mounted || !slotId) return null;

  // Real AdSense ad unit
  return (
    <div
      className="mx-auto w-full overflow-hidden"
      style={{ maxWidth: dims.maxW, minHeight: dims.minH }}
      role="complementary"
      aria-label="Advertisement"
    >
      <ins
        ref={insRef}
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={slotId}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
};

const FuelTypePicker = ({ value, onChange, compact = false }) => {
  // Group fuel types for visual clarity
  const groups = [
    { label: 'Unleaded',  types: ['U91', 'U95', 'U98', 'E10'] },
    { label: 'Diesel',    types: ['DSL', 'PRDSL'] },
    { label: 'Gas',       types: ['LPG'] },
  ];
  const allTypes = groups.flatMap(g => g.types);

  if (compact) {
    // Compact: scrollable pills for mobile header etc.
    return (
      <div className="flex gap-1.5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {FUEL_TYPES.map(ft => {
          const active = value === ft.code;
          return (
            <button
              key={ft.code}
              type="button"
              onClick={() => onChange(ft.code)}
              className="font-medium whitespace-nowrap transition-colors shrink-0"
              style={{
                padding: '5px 11px', fontSize: 13,
                border: '1px solid',
                borderColor: active ? 'var(--accent)' : 'var(--border)',
                background: active ? 'var(--accent)' : 'var(--surface)',
                color: active ? '#ffffff' : 'var(--text-2)',
                borderRadius: 0,
              }}
              aria-pressed={active}
            >{ft.short}</button>
          );
        })}
      </div>
    );
  }

  // Full: prominent grouped selector shown above the station list
  return (
    <div
      className="p-3 md:p-4"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 0,
        boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="font-display font-semibold text-sm md:text-base" style={{ color: 'var(--text)' }}>
          What fuel do you use?
        </div>
        <div className="text-tiny font-medium" style={{ color: 'var(--text-4)' }}>
          {FUEL_TYPES.find(f => f.code === value)?.desc}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {FUEL_TYPES.map(ft => {
          const active = value === ft.code;
          return (
            <button
              key={ft.code}
              type="button"
              onClick={() => onChange(ft.code)}
              className="relative transition-all hover-raise"
              style={{
                padding: '9px 16px',
                fontSize: 14,
                fontWeight: active ? 600 : 500,
                border: '1.5px solid',
                borderColor: active ? 'var(--accent)' : 'var(--border)',
                background: active
                  ? 'var(--blue-soft)'
                  : 'var(--surface-2)',
                color: active ? 'var(--accent)' : 'var(--text-2)',
                borderRadius: 0,
                letterSpacing: '-0.01em',
                boxShadow: active
                  ? '0 0 0 3px rgba(15, 122, 82,0.12)'
                  : 'none',
                transition: 'all 150ms ease',
              }}
              aria-pressed={active}
              title={ft.desc}
            >
              {ft.short}
              {active && (
                <span
                  style={{
                    position: 'absolute', top: 4, right: 4,
                    width: 6, height: 6, borderRadius: 0,
                    background: 'var(--accent)',
                  }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const Toggle = ({ value, onChange, options }) => (
  <div className="inline-flex items-center p-1" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 0 }}>
    {options.map(({ key, label, icon: Icon }) => {
      const active = value === key;
      return (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors"
          style={{
            background: active ? 'var(--surface-3)' : 'transparent',
            color: active ? 'var(--text)' : 'var(--text-3)',
            borderRadius: 0,
          }}
        ><Icon size={13} /> {label}</button>
      );
    })}
  </div>
);

const StationCard = ({ station, fuelType, rank, cheapestPrice, isClosest, onSelect, reports = [], confirmedSet, onConfirmReport, onOpenReportModal }) => {
  const officialPrice = station.prices[fuelType];

  // Find most-trusted recent report for this fuel type
  const fuelReports = reports.filter(r => r.fuelType === fuelType).sort((a, b) => {
    const aT = isReportTrusted(a, confirmedSet);
    const bT = isReportTrusted(b, confirmedSet);
    if (aT !== bT) return aT ? -1 : 1;
    return b.timestamp - a.timestamp;
  });
  const topReport = fuelReports[0];
  const topReportTrusted = topReport ? isReportTrusted(topReport, confirmedSet) : false;

  // Effective price = trusted user report (if any) > official
  const displayPrice = topReportTrusted ? topReport.price : officialPrice;
  const isUserSourced = topReportTrusted && topReport.price !== officialPrice;

  // Tag the genuinely lowest-priced station, regardless of how the list is sorted.
  const isCheapest = displayPrice != null && cheapestPrice != null && displayPrice <= cheapestPrice + 0.001;
  const diff = displayPrice != null && cheapestPrice != null ? +(displayPrice - cheapestPrice).toFixed(1) : null;

  return (
    <div
      className="hover-raise w-full p-4 md:p-5 transition-all relative"
      style={{
        background: 'var(--surface)',
        border: isCheapest ? '2px solid var(--text)' : '1px solid var(--border)',
        borderRadius: 0,
      }}
    >
      <button
        type="button"
        onClick={() => onSelect && onSelect(station)}
        className="text-left w-full"
        style={{ background: 'transparent' }}
      >
        <div className="flex items-start gap-4">
          <BrandMark brand={station.brand} size={42} />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-display font-semibold text-base leading-tight truncate" style={{ color: 'var(--text)' }}>{station.brand}</h3>
                  {isCheapest && (
                    <span className="font-mono" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'var(--accent)', color: '#fff', fontSize: 10.5, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', padding: '3px 8px' }}>
                      <Zap size={10} /> Cheapest
                    </span>
                  )}
                  {isClosest && !isCheapest && (
                    <span className="font-mono" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, border: '1.5px solid var(--text)', color: 'var(--text)', fontSize: 10.5, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', padding: '2px 7px' }}>
                      <Navigation size={10} /> Closest
                    </span>
                  )}
                  {isUserSourced && (
                    <span
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 text-tiny font-medium"
                      style={{ background: 'rgba(46,125,79,0.10)', border: '1px solid rgba(46,125,79,0.25)', borderRadius: 0, color: 'var(--success)' }}
                      title="Price verified by drivers"
                    >
                      <Users size={9} /> Driver-verified
                    </span>
                  )}
                </div>
                <p className="text-sm mt-0.5 truncate" style={{ color: 'var(--text-3)' }}>{station.address}{station.suburb && station.suburb !== station.address ? `, ${station.suburb}` : ''}{station.state ? ` ${station.state}` : ''}{station.postcode ? ` ${station.postcode}` : ''}</p>
              </div>
              <div className="text-right shrink-0">
                <PriceTag cents={displayPrice} tone={isCheapest ? 'cheap' : 'default'} />
                {isUserSourced && officialPrice != null && (
                  <div className="font-mono text-tiny mt-0.5" style={{ color: 'var(--text-4)' }}>
                    Official: <span style={{ textDecoration: 'line-through' }}>{officialPrice.toFixed(1)}¢</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 mt-3 text-xs flex-wrap" style={{ color: 'var(--text-3)' }}>
              <span className="inline-flex items-center gap-1.5"><Navigation size={11} /> {station.distance?.toFixed(1)} km</span>
              <span className="inline-flex items-center gap-1.5" style={{ color: 'var(--text-3)' }}>
                {estimateDriveMinutes(station.distance)} min drive
              </span>
              {isDailyFeed(station) ? (
                <span
                  className="inline-flex items-center gap-1.5"
                  title="Victorian prices are published once daily by Service Victoria, so they can be up to 24 hours old."
                >
                  <span
                    style={{
                      display: 'inline-block', width: 7, height: 7, borderRadius: 0,
                      background: 'var(--accent)', boxShadow: '0 0 0 2px var(--accent-glow)',
                    }}
                  />
                  Updates daily
                </span>
              ) : (
                <>
                  <span
                    className="inline-flex items-center gap-1.5"
                    title={`${freshness(station.updatedMinutesAgo).label} · updated ${timeAgoLabel(station.updatedMinutesAgo)}`}
                  >
                    <span
                      style={{
                        display: 'inline-block',
                        width: 7, height: 7, borderRadius: 0,
                        background: freshness(station.updatedMinutesAgo).color,
                        boxShadow: `0 0 0 2px ${freshness(station.updatedMinutesAgo).color}22`,
                      }}
                    />
                    {timeAgoLabel(station.updatedMinutesAgo)}
                  </span>
                  {station.updatedMinutesAgo >= 1440 && (
                    <span
                      className="inline-flex items-center gap-1 text-tiny font-medium"
                      style={{ color: 'var(--warn)' }}
                      title="This price hasn't updated in over a day and may be out of date."
                    >
                      <AlertCircle size={11} /> may be outdated
                    </span>
                  )}
                </>
              )}
              {diff != null && diff > 0 && (
                <span className="inline-flex items-center gap-1 font-mono" style={{ color: 'var(--warn)' }}>+{diff.toFixed(1)}¢</span>
              )}
              {diff != null && diff === 0 && rank > 0 && (
                <span className="inline-flex items-center gap-1" style={{ color: 'var(--success)' }}>Tied for cheapest</span>
              )}
            </div>
          </div>
        </div>
      </button>

      {/* Driver reports row */}
      {fuelReports.length > 0 && (
        <div className="mt-3">
          {fuelReports.slice(0, 2).map(r => (
            <DriverReportRow
              key={r.id}
              report={r}
              fuelType={fuelType}
              hasConfirmed={confirmedSet.has(r.id)}
              onConfirm={onConfirmReport}
            />
          ))}
        </div>
      )}

      {/* Actions — slim, editorial; the whole card is clickable for detail */}
      <div className="mt-4 flex items-center gap-5 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
        <DirectionsMenu lat={station.lat} lng={station.lng} label={station.brand} />
        {onOpenReportModal && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onOpenReportModal(station); }}
            className="inline-flex items-center gap-1.5 text-sm font-medium"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)' }}
            aria-label="Report a different price for this station"
          >
            <Edit3 size={13} /> Report price
          </button>
        )}
      </div>
    </div>
  );
};

const StationMap = ({ stations, fuelType, cheapestPrice, onSelect, effectivePriceFor, userLat, userLng, mapHeight }) => {
  const mapRef       = useRef(null);
  const mapObjRef    = useRef(null);
  const markersRef   = useRef([]);
  const popupRef     = useRef(null);
  const priceFor     = effectivePriceFor || ((s) => s.prices[fuelType]);
  const visible      = stations.filter(s => priceFor(s) != null && s.lat && s.lng);

  // Price-tier colour: cheapest=green, top-third=red, else orange
  const pinColor = (price) => {
    if (!price || visible.length === 0) return '#64748b';
    const prices = visible.map(s => priceFor(s)).filter(Boolean).sort((a,b) => a-b);
    const lo = prices[0], hi = prices[prices.length-1], spread = hi - lo;
    if (spread < 1) return '#2e7d4f';
    const pct = (price - lo) / spread;
    if (pct < 0.33) return '#2e7d4f';
    if (pct < 0.66) return '#b4530a';
    return '#b91c1c';
  };

  const initMap = () => {
    const L = window.L;
    if (!mapRef.current || mapObjRef.current) return;
    const lat = userLat || -33.8688;
    const lng = userLng || 151.2093;
    const map = L.map(mapRef.current, { zoomControl: true, attributionControl: true })
                 .setView([lat, lng], 13);
    // Force a size recalculation in case CSS finished loading after init
    setTimeout(() => map.invalidateSize(), 100);
    // CARTO Positron — clean, muted basemap that suits the Motavo palette far
    // better than default OSM, and crucially serves @2x retina tiles. The {r}
    // placeholder + detectRetina swap in high-DPI tiles on phones/retina
    // screens, which fixes the blur from stretching 1x tiles across 2-3 device
    // pixels. {s} cycles a/b/c/d subdomains.
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '© <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20,
      detectRetina: true,
    }).addTo(map);
    mapObjRef.current = map;

    // User location pin
    if (userLat && userLng) {
      const userIcon = L.divIcon({
        className: '',
        html: `<div style="width:16px;height:16px;background:#0f7a52;border:3px solid #fff;border-radius:50%;box-shadow:0 0 0 4px rgba(15, 122, 82,0.25)"></div>`,
        iconSize: [16,16], iconAnchor: [8,8],
      });
      L.marker([userLat, userLng], { icon: userIcon, zIndexOffset: 1000 })
       .addTo(map)
       .bindPopup('<strong style="font-family:sans-serif">Your location</strong>');
    }

    addMarkers(map);
  };

  const addMarkers = (map) => {
    const L = window.L;
    if (!map) return;
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    visible.forEach((s) => {
      const price = priceFor(s);
      const color = pinColor(price);
      const isCheap = price === cheapestPrice;
      const label = price != null ? price.toFixed(1) : '—';

      const icon = L.divIcon({
        className: '',
        html: `<div style="
          background:${color};
          color:#fff;
          font-family:'JetBrains Mono',monospace;
          font-size:11px;
          font-weight:700;
          padding:3px 7px;
          border-radius:0;
          white-space:nowrap;
          box-shadow:0 2px 6px rgba(0,0,0,0.25);
          border:2px solid rgba(255,255,255,0.7);
          ${isCheap ? 'outline:2px solid '+color+';outline-offset:2px;' : ''}
        ">${label}¢</div>`,
        iconSize: [60,24], iconAnchor: [30,12],
      });

      const popup = L.popup({ maxWidth: 280, className: 'fm-popup' }).setContent(`
        <div style="font-family:'Hanken Grotesk',sans-serif;padding:2px 0">
          <div style="font-weight:700;font-size:15px;margin-bottom:2px">${s.brand}</div>
          <div style="color:#64748b;font-size:12px;margin-bottom:6px">${s.address}${s.suburb ? ', '+s.suburb : ''}${s.state ? ' '+s.state : ''}</div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:22px;font-weight:700;color:${color};margin-bottom:8px">${label}<span style="font-size:13px;color:#94a3b8">¢/L</span></div>
          <div style="font-size:11px;color:#94a3b8;margin-bottom:10px">${s.distance?.toFixed(1)} km · ${isDailyFeed(s) ? 'updates daily' : (s.updatedMinutesAgo < 60 ? s.updatedMinutesAgo+'m ago' : Math.floor(s.updatedMinutesAgo/60)+'h ago')}</div>
          <a href="https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}"
             target="_blank" rel="noopener noreferrer"
             style="display:block;text-align:center;padding:7px 12px;background:#0f7a52;color:#fff;border-radius:0;font-weight:600;font-size:13px;text-decoration:none">
            ↗ Directions
          </a>
        </div>
      `);

      const marker = L.marker([s.lat, s.lng], { icon })
        .addTo(map)
        .bindPopup(popup)
        .on('click', () => { onSelect && onSelect(s); });
      markersRef.current.push(marker);
    });
  };

  // Load Leaflet CSS + JS, then init map.
  // Must wait for CSS to finish loading before calling L.map() —
  // without it, Leaflet tile containers have 0px height and render blank.
  useEffect(() => {
    let cancelled = false;

    const doInit = () => {
      if (cancelled) return;
      // Small rAF so the container has been painted at its final size
      requestAnimationFrame(() => {
        if (!cancelled) initMap();
      });
    };

    const loadJS = () => {
      if (window.L) { doInit(); return; }
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = doInit;
      document.head.appendChild(script);
    };

    // Inject CSS if not already present, wait for it to load before JS
    let link = document.getElementById('leaflet-css');
    if (!link) {
      link = document.createElement('link');
      link.id = 'leaflet-css';
      link.setAttribute('rel', 'stylesheet');
      link.setAttribute('href', 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css');
      link.onload = loadJS;
      document.head.appendChild(link);
    } else if (document.styleSheets && Array.from(document.styleSheets).some(s => { try { return s.href && s.href.includes('leaflet'); } catch { return false; } })) {
      // CSS already applied
      loadJS();
    } else {
      link.addEventListener('load', loadJS, { once: true });
    }

    return () => {
      cancelled = true;
      if (mapObjRef.current) { mapObjRef.current.remove(); mapObjRef.current = null; }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-centre when the user navigates to a new city
  useEffect(() => {
    if (!mapObjRef.current || !userLat || !userLng) return;
    mapObjRef.current.setView([userLat, userLng], 13);
  }, [userLat, userLng]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-render markers when stations or fuelType changes
  useEffect(() => {
    if (mapObjRef.current) addMarkers(mapObjRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stations, fuelType, cheapestPrice]);

  return (
    <div style={{ position: 'relative', borderRadius: 0, overflow: 'hidden', border: '1px solid var(--border)' }}>
      {/* Map div is ALWAYS rendered so mapRef.current is non-null when useEffect fires.
          The empty-state overlay appears on top when there are no stations to show. */}
      <div ref={mapRef} style={{ height: mapHeight || '520px', width: '100%' }} />
      {visible.length === 0 && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          background: 'var(--surface)', color: 'var(--text-3)',
          fontSize: 14,
        }}>
          No stations with price data to map.
        </div>
      )}
      {/* Legend */}
      <div style={{
        position: 'absolute', bottom: 24, left: 16, zIndex: 1000,
        background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)',
        borderRadius: 0, padding: '8px 12px',
        border: '1px solid rgba(0,0,0,0.08)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
        display: 'flex', gap: 12, alignItems: 'center',
        fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 11,
      }}>
        {[['#2e7d4f','Cheapest'],['#b4530a','Mid'],['#b91c1c','Expensive']].map(([c,l]) => (
          <span key={l} style={{ display:'flex', alignItems:'center', gap:5 }}>
            <span style={{ display:'inline-block', width:10, height:10, borderRadius:'50%', background:c }} />
            {l}
          </span>
        ))}
      </div>
    </div>
  );
};


const StationList = ({ stations, fuelType, onSelectStation, viewMode, onViewMode, sort, onSort, reportsByStation, confirmedSet, onConfirmReport, onOpenReportModal, userLat, userLng }) => {
  const [mobileView, setMobileView] = useState('map');
  const [selectedId, setSelectedId] = useState(null);
  const cardRefs = useRef({});

  const handleMapSelect = useCallback((station) => {
    setSelectedId(station.id);
    onSelectStation && onSelectStation(station);
    setTimeout(() => {
      const el = cardRefs.current[station.id];
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 50);
  }, [onSelectStation]);

  const effectivePriceFor = (station) => {
    const reports = reportsByStation[station.id] || [];
    const fuelReports = reports
      .filter(r => r.fuelType === fuelType)
      .sort((a, b) => {
        const aT = isReportTrusted(a, confirmedSet);
        const bT = isReportTrusted(b, confirmedSet);
        if (aT !== bT) return aT ? -1 : 1;
        return b.timestamp - a.timestamp;
      });
    const top = fuelReports[0];
    if (top && isReportTrusted(top, confirmedSet)) return top.price;
    return station.prices[fuelType];
  };

  const sorted = useMemo(() => {
    const withPrice = stations.filter(s => effectivePriceFor(s) != null);
    const withoutPrice = stations.filter(s => effectivePriceFor(s) == null);
    if (sort === 'price') withPrice.sort((a, b) => effectivePriceFor(a) - effectivePriceFor(b));
    else withPrice.sort((a, b) => a.distance - b.distance);
    return [...withPrice, ...withoutPrice];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stations, fuelType, sort, reportsByStation, confirmedSet]);

  // True minimum across all stations — independent of sort order, so "Closest"
  // sort can never mislabel the nearest station as the cheapest.
  const cheapestPrice = (() => {
    const ps = stations.map(effectivePriceFor).filter((p) => p != null);
    return ps.length ? Math.min(...ps) : null;
  })();

  const cardList = (
    <div className="space-y-2.5">
      {sorted.some(isDailyFeed) && (
        <div className="flex items-start gap-2 px-3 py-2.5 text-tiny" style={{ background: 'var(--accent-glow)', border: '1px solid var(--border)', color: 'var(--text-2)' }}>
          <Info size={13} style={{ marginTop: 1, flexShrink: 0 }} />
          <span>Victorian prices are published once daily by Service Victoria, so they can be up to 24 hours old.</span>
        </div>
      )}
      {sorted.map((s, i) => (
        <div key={s.id} ref={el => { cardRefs.current[s.id] = el; }}
             className="fade-up" style={{ animationDelay: `${Math.min(i * 24, 360)}ms` }}>
          <StationCard
            station={s}
            fuelType={fuelType}
            rank={i}
            cheapestPrice={cheapestPrice}
            isClosest={sort === 'distance' && i === 0}
            onSelect={(st) => { setSelectedId(st.id); onSelectStation && onSelectStation(st); }}
            reports={reportsByStation[s.id] || []}
            confirmedSet={confirmedSet}
            onConfirmReport={onConfirmReport}
            onOpenReportModal={onOpenReportModal}
            isSelected={selectedId === s.id}
          />
        </div>
      ))}
      {sorted.length === 0 && (
        <div className="text-center py-12" style={{ color: 'var(--text-4)' }}>No stations carrying this fuel type within range.</div>
      )}
    </div>
  );

  const mapEl = (h) => (
    <StationMap
      stations={sorted}
      fuelType={fuelType}
      cheapestPrice={cheapestPrice}
      onSelect={handleMapSelect}
      effectivePriceFor={effectivePriceFor}
      userLat={userLat}
      userLng={userLng}
      mapHeight={h}
    />
  );

  // Sort controls used in both layouts
  const sortControls = (
    <div className="flex items-center gap-2">
      <Toggle value={sort} onChange={onSort} options={[
        { key: 'price', label: 'Cheapest', icon: TrendingDown },
        { key: 'distance', label: 'Closest', icon: Navigation },
      ]} />
    </div>
  );

  return (
    <>
      {/* ── Desktop: map left (sticky) + scrollable list right ───────────── */}
      <div className="hidden md:flex gap-4" style={{ alignItems: 'flex-start' }}>
        {/* Sticky map column */}
        <div style={{ flex: '1 1 60%', position: 'sticky', top: 72, zIndex: 1 }}>
          {mapEl('calc(100vh - 96px)')}
        </div>
        {/* Scrollable list column */}
        <div style={{ flex: '0 0 38%', minWidth: 0 }}>
          <div className="flex items-center justify-between mb-3">
            {sortControls}
          </div>
          {cardList}
        </div>
      </div>

      {/* ── Mobile: map on top, list below ────────────────────────────────── */}
      <div className="md:hidden space-y-4">
        <div className="flex items-center justify-between gap-3">
          {sortControls}
          <Toggle value={mobileView} onChange={setMobileView} options={[
            { key: 'map',  label: 'Map',  icon: MapIcon },
            { key: 'list', label: 'List', icon: List },
          ]} />
        </div>
        {mobileView === 'map' ? (
          <>
            {mapEl('360px')}
            <div className="space-y-2.5 mt-3">
              {sorted.slice(0,5).map((s, i) => (
                <div key={s.id} ref={el => { cardRefs.current[s.id] = el; }}>
                  <StationCard
                    station={s}
                    fuelType={fuelType}
                    rank={i}
                    cheapestPrice={cheapestPrice}
                    isClosest={sort === 'distance' && i === 0}
                    onSelect={(st) => { setSelectedId(st.id); onSelectStation && onSelectStation(st); }}
                    reports={reportsByStation[s.id] || []}
                    confirmedSet={confirmedSet}
                    onConfirmReport={onConfirmReport}
                    onOpenReportModal={onOpenReportModal}
                    isSelected={selectedId === s.id}
                  />
                </div>
              ))}
            </div>
          </>
        ) : cardList}
      </div>
    </>
  );
};

// ── Price-cycle history (localStorage — persists across sessions) ────────────
// We log the daily cheapest price per state+fuel. Over repeat visits this lets
// Motavo show where today's price sits within its recent range — i.e. whether
// you're near the bottom of the cycle (fill up) or just after a hike (wait).
// The signal sharpens the more the app is used, which is the whole point.
const CYCLE_HISTORY_DAYS = 45;

function cycleHistoryKey(state, fuelType) {
  return `fm:cycle:${state || 'NA'}:${fuelType}`;
}
function readCycleHistory(state, fuelType) {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(cycleHistoryKey(state, fuelType));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function recordCyclePoint(state, fuelType, cheapest) {
  if (typeof window === 'undefined' || cheapest == null) {
    return readCycleHistory(state, fuelType);
  }
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  let hist = readCycleHistory(state, fuelType);
  const existing = hist.find(h => h.d === today);
  if (existing) existing.p = Math.min(existing.p, cheapest); // keep day's lowest
  else hist.push({ d: today, p: cheapest });
  hist = hist.slice(-CYCLE_HISTORY_DAYS);
  try { localStorage.setItem(cycleHistoryKey(state, fuelType), JSON.stringify(hist)); } catch {}
  return hist;
}

/**
 * CycleSignal — "is now a good time to fill up?" verdict.
 * Day one: uses the live price spread as a soft signal.
 * After a few days of repeat visits: compares today's cheapest against the
 * recent low/high to place you in the local price cycle.
 */
const CycleSignal = ({ stations, fuelType, state, cycleLabel }) => {
  const prices = stations.map(s => s.prices[fuelType]).filter(p => p != null && p < 400);
  const cheapest = prices.length ? Math.min(...prices) : null;
  const avg = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : null;

  // Per-device fallback history (localStorage)
  const [localHistory, setLocalHistory] = useState(() => readCycleHistory(state, fuelType));
  useEffect(() => {
    if (cheapest == null) return;
    setLocalHistory(recordCyclePoint(state, fuelType, cheapest));
  }, [state, fuelType, cheapest]);

  // Authoritative server history (logged daily by the cron, regardless of visits)
  const [serverHistory, setServerHistory] = useState(null);
  useEffect(() => {
    if (!state) return;
    let cancelled = false;
    fetch(`/api/cycle/${String(state).toLowerCase()}?fuel=${fuelType}`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (!cancelled && Array.isArray(d?.history)) setServerHistory(d.history); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [state, fuelType]);

  if (cheapest == null) return null;

  // Prefer the server's daily log once it has a few days; else use local.
  const history = (serverHistory && serverHistory.length >= 4) ? serverHistory : localHistory;
  const points = history.map(h => h.p).filter(p => p != null && p < 400);
  const daysTracked = history.length;
  const low = points.length ? Math.min(...points) : cheapest;
  const high = points.length ? Math.max(...points) : cheapest;
  const span = high - low;
  const hasSignal = daysTracked >= 4 && span >= 3;
  const position = hasSignal ? Math.max(0, Math.min(1, (cheapest - low) / span)) : null;

  // Short-term outlook from the recent trend — heuristic, honestly framed.
  let outlook = null;
  if (hasSignal && points.length >= 3) {
    const recent = points.slice(-Math.min(7, points.length));
    const slope = (recent[recent.length - 1] - recent[0]) / (recent.length - 1); // c/L per day
    if (position <= 0.25) outlook = 'Outlook: near the bottom of the cycle — prices usually climb within a few days, so filling up now is the smart move.';
    else if (position >= 0.78) outlook = 'Outlook: around the peak — prices typically ease over the coming week.';
    else if (slope > 0.8) outlook = 'Outlook: trending up day-on-day — fill up sooner rather than later.';
    else if (slope < -0.8) outlook = 'Outlook: still easing — you may save by waiting a day or two if your tank allows.';
    else outlook = 'Outlook: holding fairly steady over recent days.';
  }

  let verdict;
  if (hasSignal) {
    if (position <= 0.20) {
      verdict = { Icon: TrendingDown, color: 'var(--success)', bg: 'var(--green-soft)',
        title: 'Great time to fill up',
        detail: `At ${cheapest.toFixed(1)}¢, the cheapest nearby is near the bottom of its recent ${daysTracked}-day range (${low.toFixed(1)}–${high.toFixed(1)}¢).` };
    } else if (position <= 0.55) {
      verdict = { Icon: TrendingDown, color: 'var(--success)', bg: 'var(--green-soft)',
        title: 'Decent time to fill up',
        detail: `At ${cheapest.toFixed(1)}¢, the cheapest nearby sits in the lower half of its recent ${daysTracked}-day range (${low.toFixed(1)}–${high.toFixed(1)}¢).` };
    } else if (position <= 0.80) {
      verdict = { Icon: AlertCircle, color: 'var(--warn)', bg: 'rgba(234,88,12,0.08)',
        title: 'Prices still on the high side',
        detail: `At ${cheapest.toFixed(1)}¢, the cheapest nearby is above the middle of its recent ${daysTracked}-day range (${low.toFixed(1)}–${high.toFixed(1)}¢) — wait a few days if your tank allows.` };
    } else {
      verdict = { Icon: TrendingUp, color: 'var(--danger)', bg: 'rgba(220,38,38,0.08)',
        title: 'Prices recently spiked',
        detail: `At ${cheapest.toFixed(1)}¢, the cheapest nearby is near its ${daysTracked}-day high (${low.toFixed(1)}–${high.toFixed(1)}¢) — hold off filling up if you can.` };
    }
  } else {
    // Honest first-visit fallback — no false precision without history.
    const saving = avg != null ? avg - cheapest : 0;
    verdict = { Icon: Gauge, color: 'var(--accent)', bg: 'var(--blue-soft)',
      title: 'Learning your local cycle',
      detail: saving > 2
        ? `Cheapest right now is ${cheapest.toFixed(1)}¢ — about ${saving.toFixed(0)}¢/L under the local average. Check back over a few days and Motavo will flag when you're near the bottom of the ${cycleLabel || 'local'} cycle.`
        : `Cheapest right now is ${cheapest.toFixed(1)}¢. Prices look tightly clustered. Check back over a few days and Motavo will flag the bottom of the ${cycleLabel || 'local'} cycle.` };
  }

  const { Icon } = verdict;
  return (
    <div className="surface-card" style={{ padding: '14px 16px', borderRadius: 0, borderLeft: `3px solid ${verdict.color}` }}>
      <div className="flex items-start gap-3">
        <div className="shrink-0 flex items-center justify-center" style={{ width: 38, height: 38, borderRadius: 0, background: verdict.bg, color: verdict.color }}>
          <Icon size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-display font-semibold" style={{ color: verdict.color, fontSize: '0.98rem' }}>{verdict.title}</div>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-3)', lineHeight: 1.5 }}>{verdict.detail}</p>
          {outlook && (
            <p className="text-sm mt-1.5" style={{ color: verdict.color, fontWeight: 600, lineHeight: 1.45 }}>{outlook}</p>
          )}
          {hasSignal && (
            <div className="mt-2.5">
              <div style={{ position: 'relative', height: 6, borderRadius: 0, background: 'linear-gradient(90deg, var(--success) 0%, var(--warn) 65%, var(--danger) 100%)', opacity: 0.85 }}>
                <div style={{ position: 'absolute', top: '50%', left: `${position * 100}%`, transform: 'translate(-50%,-50%)', width: 12, height: 12, borderRadius: 0, background: '#fff', border: `2px solid ${verdict.color}`, boxShadow: '0 1px 3px rgba(15,23,42,0.25)' }} />
              </div>
              <div className="flex justify-between mt-1 text-tiny" style={{ color: 'var(--text-4)' }}>
                <span>Cycle low</span><span>Cycle high</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const PriceStats = ({ stations, fuelType }) => {
  const prices = stations.map(s => s.prices[fuelType]).filter(p => p != null && p < 400);
  if (prices.length === 0) return null;
  const cheapest = Math.min(...prices);
  const highest = Math.max(...prices);
  const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
  const range = highest - cheapest;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-px overflow-hidden" style={{ background: 'var(--border)', borderRadius: 0, border: '1px solid var(--border)' }}>
      {[
        { label: 'Cheapest', value: cheapest, tone: 'cheap', icon: TrendingDown },
        { label: 'Average',  value: avg,      tone: 'default', icon: null },
        { label: 'Highest',  value: highest,  tone: 'high', icon: TrendingUp },
        { label: 'Spread',   value: range,    tone: 'default', icon: null, isDelta: true },
      ].map(({ label, value, tone, icon: Icon, isDelta }) => (
        <div key={label} className="px-4 py-4 md:py-5" style={{ background: 'var(--surface)' }}>
          <div className="text-micro font-medium uppercase track-wide mb-2 inline-flex items-center gap-1.5" style={{ color: 'var(--text-4)' }}>
            {Icon && <Icon size={11} />} {label}
          </div>
          {isDelta ? (
            <div className="font-mono font-semibold text-xl tabular-nums" style={{ color: 'var(--text)' }}>
              {value.toFixed(1)}<span className="text-xs font-normal ml-0.5" style={{ color: 'var(--text-4)' }}>¢</span>
            </div>
          ) : <PriceTag cents={value} tone={tone} />}
        </div>
      ))}
    </div>
  );
};

/**
 * SavingsBanner — converts cents-per-litre price differences into dollars
 * saved per tank, which is how drivers actually think about decisions.
 * Interactive: tap your tank size once and it's remembered (localStorage)
 * so every future visit speaks in your car's numbers. Hidden if the savings
 * are under $1 (not worth driving for) or there's no meaningful spread.
 */
const TANK_SIZES = [40, 50, 60, 80];
const TANK_KEY = 'fm:tankSize';

const SavingsBanner = ({ stations, fuelType }) => {
  const [tankSize, setTankSize] = useState(50);
  useEffect(() => {
    try {
      const saved = parseInt(localStorage.getItem(TANK_KEY) || '', 10);
      if (TANK_SIZES.includes(saved)) setTankSize(saved);
    } catch {}
  }, []);
  const pickTank = (size) => {
    setTankSize(size);
    try { localStorage.setItem(TANK_KEY, String(size)); } catch {}
  };

  const prices = stations.map(s => s.prices[fuelType]).filter(p => p != null && p < 400);
  if (prices.length < 3) return null;

  const cheapest = Math.min(...prices);
  const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
  const centsSaved = avg - cheapest;
  const dollarsSaved = (centsSaved * tankSize) / 100;
  if (dollarsSaved < 1) return null;

  // Yearly = 52 weeks × 1 fill/week
  const yearly = dollarsSaved * 52;

  return (
    <div
      className="flex items-center gap-3 md:gap-4 p-3.5 md:p-4 fade-up"
      style={{
        background: 'var(--green-soft)',
        border: '1px solid var(--green-light)',
        borderRadius: 0,
      }}
    >
      <div
        className="shrink-0 inline-flex items-center justify-center"
        style={{ width: 36, height: 36, background: 'var(--success)', borderRadius: 0 }}
      >
        <TrendingDown size={17} color="#ffffff" strokeWidth={2.4} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm md:text-base leading-snug">
          <span className="font-semibold" style={{ color: 'var(--green-dark)' }}>
            Save ~${dollarsSaved.toFixed(2)} per tank
          </span>
          <span style={{ color: 'var(--text-2)' }}> at the cheapest vs. nearby average</span>
        </div>
        <div className="text-tiny mt-0.5" style={{ color: 'var(--text-3)' }}>
          That's ~${yearly.toFixed(0)} a year if you fill weekly
        </div>
        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          <span className="font-mono text-micro uppercase track-wide" style={{ color: 'var(--text-4)' }}>My tank:</span>
          {TANK_SIZES.map(size => (
            <button key={size} type="button" onClick={() => pickTank(size)}
                    className="font-mono text-tiny font-semibold px-2 py-0.5 transition-colors"
                    style={{
                      background: size === tankSize ? 'var(--success)' : 'transparent',
                      color: size === tankSize ? '#ffffff' : 'var(--text-3)',
                      border: `1px solid ${size === tankSize ? 'var(--success)' : 'var(--border)'}`,
                      borderRadius: 0, cursor: 'pointer',
                    }}>
            {size}L
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * RoutePromo — slim banner surfacing the route planner from the results view,
 * where people are already in fuel-buying mode. Kept quiet relative to the
 * data components around it: one line, tap target the full row.
 */
/**
 * StationSkeleton — shimmer placeholder rows shown while live prices load.
 * The gap between picking a location and data arriving (seconds on a cold
 * state fetch) previously rendered nothing at all, which reads as broken.
 */
const StationSkeleton = ({ rows = 4 }) => (
  <div className="space-y-2" aria-hidden="true">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex items-center gap-3 px-3.5 py-4"
           style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="skeleton shrink-0" style={{ width: 36, height: 36 }} />
        <div className="flex-1 min-w-0">
          <div className="skeleton" style={{ height: 13, width: `${55 - i * 7}%`, marginBottom: 8 }} />
          <div className="skeleton" style={{ height: 10, width: `${35 - i * 4}%` }} />
        </div>
        <div className="skeleton shrink-0" style={{ height: 26, width: 64 }} />
      </div>
    ))}
  </div>
);

const RoutePromo = ({ onNav }) => (
  <button type="button" onClick={() => onNav({ name: 'route' })}
          className="hover-raise w-full flex items-center gap-3 px-3.5 py-3 text-left transition-colors"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: '3px solid var(--accent)', borderRadius: 0, cursor: 'pointer' }}>
    <Navigation size={15} className="shrink-0" style={{ color: 'var(--accent)' }} />
    <span className="flex-1 min-w-0 text-sm" style={{ color: 'var(--text-2)' }}>
      <span className="font-semibold" style={{ color: 'var(--text)' }}>Heading somewhere?</span> Rank every station along your route, not just nearby.
    </span>
    <ChevronRight size={15} className="shrink-0" style={{ color: 'var(--text-4)' }} />
  </button>
);

const LocationPrompt = ({ onLocate, onSample, onSearchSelect, isLocating, hasError }) => (
  <div className="relative overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 0 }}>
    <div className="absolute inset-0 pointer-events-none" aria-hidden="true"
         style={{ background: 'radial-gradient(circle at 80% 0%, rgba(15, 122, 82,0.08), transparent 50%)' }} />
    <div className="p-6 md:p-7 relative">
      <div className="flex items-center gap-2 mb-5">
        <div className="p-2" style={{ background: 'rgba(15, 122, 82,0.10)', border: '1px solid rgba(15, 122, 82,0.25)' }}>
          <Target size={16} style={{ color: 'var(--accent)' }} />
        </div>
        <Pill tone="brand">
          <span style={{ width: 6, height: 6, background: 'var(--accent)', display: 'inline-block', flexShrink: 0 }} /> Live data
        </Pill>
      </div>

      <h2 className="font-display font-semibold text-2xl md:text-3xl leading-tight mb-2">Where are you topping up?</h2>
      <p className="text-sm md:text-base mb-5" style={{ color: 'var(--text-3)' }}>
        Search any Australian address, suburb, or postcode — or use your current location.
      </p>

      <div className="mb-3">
        <AddressSearch onSelect={onSearchSelect} placeholder="e.g. Parramatta, 2000, or 10 George St…" />
      </div>

      <div className="flex items-center gap-3 my-4" aria-hidden="true">
        <div className="flex-1" style={{ height: 1, background: 'var(--border)' }} />
        <span className="text-tiny uppercase track-wide" style={{ color: 'var(--text-4)' }}>or</span>
        <div className="flex-1" style={{ height: 1, background: 'var(--border)' }} />
      </div>

      <button
        type="button" onClick={onLocate} disabled={isLocating}
        className="w-full px-5 py-3 font-semibold inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
        style={{
          background: 'transparent', color: 'var(--text)', fontSize: 14,
          border: '1px solid var(--border-strong)', borderRadius: 0,
        }}
      >
        {isLocating ? <Loader2 size={16} className="animate-spin" /> : <Navigation size={15} />}
        {isLocating ? 'Finding you…' : 'Use my current location'}
      </button>

      {hasError && (
        <div
          className="mt-3 flex items-start gap-2 p-3 text-sm"
          style={{
            background: 'rgba(234,88,12,0.08)',
            border: '1px solid rgba(234,88,12,0.25)',
            borderRadius: 0,
            color: 'var(--text-2)',
          }}
          role="alert"
        >
          <AlertCircle size={14} style={{ color: 'var(--warn)' }} className="mt-0.5 shrink-0" />
          <div>
            <div className="font-medium" style={{ color: 'var(--text)' }}>
              Couldn't get your location.
            </div>
            <div className="text-tiny mt-0.5">
              Use the search above instead, or pick a popular suburb below.
            </div>
          </div>
        </div>
      )}

      <div className="text-micro uppercase track-wide mb-2.5 mt-6" style={{ color: 'var(--text-4)' }}>Popular</div>
      <div className="flex flex-wrap gap-2">
        {[
          { name: 'Parramatta', key: 'parramatta', state: 'NSW' },
          { name: 'Brisbane CBD', key: 'brisbane-cbd', state: 'QLD' },
          { name: 'Joondalup', key: 'joondalup', state: 'WA' },
          { name: 'Hobart', key: 'hobart', state: 'TAS' },
        ].map(s => (
          <button
            key={s.key} type="button" onClick={() => onSample(s.key, s.name)}
            className="hover-raise inline-flex items-center gap-2 px-3 py-1.5 text-sm transition-colors"
            style={{ background: 'var(--surface-2)', color: 'var(--text-2)', border: '1px solid var(--border)', borderRadius: 0 }}
          >
            {s.name}
            <span className="font-mono text-tiny" style={{ color: 'var(--text-4)' }}>{s.state}</span>
          </button>
        ))}
      </div>
    </div>
  </div>
);

/* =====================================================================
   ADDRESS SEARCH — local + Nominatim (OpenStreetMap) geocoding
   ===================================================================== */

const STATE_NAMES = {
  'New South Wales': 'NSW',
  'Queensland': 'QLD',
  'Western Australia': 'WA',
  'Northern Territory': 'NT',
  'Tasmania': 'TAS',
  'Australian Capital Territory': 'ACT',
  'Victoria': 'VIC',
  'South Australia': 'SA',
};

function searchLocal(q) {
  const lower = q.toLowerCase().trim();
  if (!lower) return [];

  // Search every capital city. With VIC/SA now on government APIs, all
  // 8 capitals are live.
  const cityMatches = CITIES
    .filter(c => (
      c.name.toLowerCase().includes(lower) ||
      c.state.toLowerCase() === lower
    ))
    .map(c => ({
      type: 'city',
      id: `city-${c.slug}`,
      label: c.name,
      sublabel: `${c.state} · Capital city`,
      slug: c.slug,
      lat: c.center.lat,
      lng: c.center.lng,
      state: c.state,
    }));

  // Score by relevance: prefix match > contains
  const score = (item) => {
    const labelLower = item.label.toLowerCase();
    if (labelLower.startsWith(lower)) return 0;
    if (labelLower.includes(lower)) return 1;
    return 2;
  };

  return cityMatches
    .sort((a, b) => score(a) - score(b))
    .slice(0, 6);
}

function shortenAddress(displayName) {
  const parts = (displayName || '').split(',').map(s => s.trim()).filter(Boolean);
  if (parts.length === 0) return '';
  const noCountry = parts[parts.length - 1].toLowerCase() === 'australia' ? parts.slice(0, -1) : parts;
  return noCountry.slice(0, 3).join(', ');
}

const AddressSearch = ({
  onSelect,
  autoFocus = false,
  placeholder = 'Search address, suburb, or postcode…',
  variant = 'default',
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [focused, setFocused] = useState(false);
  // Tracks whether the most recent Nominatim call failed (network blocked,
  // CORS, etc). When true and local results are sparse, we show a small
  // hint so the user knows extended results aren't available right now.
  const [remoteFailed, setRemoteFailed] = useState(false);
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const blurTimer = useRef(null);

  useEffect(() => {
    if (autoFocus) {
      const t = setTimeout(() => inputRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [autoFocus]);

  // Search effect with debounced Nominatim call
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    const local = searchLocal(q);
    setResults(local);
    setHighlight(0);

    // If we already have plenty of strong local matches, skip the network call
    const strongLocal = local.filter(r => r.label.toLowerCase().startsWith(q.toLowerCase())).length;
    if (strongLocal >= 4) {
      setLoading(false);
      return;
    }

    const ctrl = new AbortController();
    setLoading(true);
    setRemoteFailed(false);
    const t = setTimeout(async () => {
      try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&countrycodes=au&limit=5&addressdetails=1`;
        const res = await fetch(url, { signal: ctrl.signal });
        if (!res.ok) throw new Error('Geocode failed');
        const data = await res.json();
        const remote = data
          .filter(r => r.lat && r.lon)
          .map(r => {
            const stateAbbrev = STATE_NAMES[r.address?.state] || (r.address?.state || '');
            const postcode = r.address?.postcode || '';
            return {
              type: 'address',
              id: `addr-${r.place_id}`,
              label: shortenAddress(r.display_name),
              sublabel: [stateAbbrev, postcode].filter(Boolean).join(' '),
              lat: parseFloat(r.lat),
              lng: parseFloat(r.lon),
              state: stateAbbrev,
            };
          });
        // Dedupe against local
        const localLabels = new Set(local.map(l => l.label.toLowerCase()));
        const uniqueRemote = remote.filter(r => !localLabels.has(r.label.toLowerCase()));
        setResults([...local, ...uniqueRemote]);
        setRemoteFailed(false);
      } catch (e) {
        // Network call blocked (CORS, sandbox, offline). Local results still
        // show — the dropdown will append a small "offline" hint so the user
        // knows we tried and that broader address search isn't available.
        if (e?.name !== 'AbortError') setRemoteFailed(true);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => { clearTimeout(t); ctrl.abort(); };
  }, [query]);

  // Suggestions to show when the input is focused but empty — keeps the
  // search feeling alive instead of presenting a blank dropdown.
  const popularSuggestions = useMemo(() => {
    // Hand-picked: the 4 largest live capitals (no VIC/SA — those are coming-soon)
    const popularCitySlugs = ['sydney', 'brisbane', 'perth', 'canberra'];
    return CITIES
      .filter(c => c.live && popularCitySlugs.includes(c.slug))
      .map(c => ({
        type: 'city',
        id: `city-${c.slug}`,
        label: c.name,
        sublabel: `${c.state} · Capital city`,
        slug: c.slug,
        lat: c.center.lat,
        lng: c.center.lng,
        state: c.state,
      }));
  }, []);

  const showDropdown = focused;

  const handleKey = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight(h => Math.min(h + 1, Math.max(0, results.length - 1)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight(h => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const r = results[highlight];
      if (r) handleSelect(r);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setQuery('');
      inputRef.current?.blur();
    }
  };

  const handleSelect = (r) => {
    setQuery('');
    setFocused(false);
    inputRef.current?.blur();
    onSelect(r);
  };

  const sizes = {
    default: { padX: 16, padY: 13, radius: 0, fontSize: 15, iconSize: 16, iconLeft: 16 },
    large:   { padX: 20, padY: 18, radius: 0, fontSize: 17, iconSize: 18, iconLeft: 20 },
    compact: { padX: 12, padY: 9,  radius: 0, fontSize: 14, iconSize: 14, iconLeft: 12 },
  }[variant] || { padX: 16, padY: 13, radius: 12, fontSize: 15, iconSize: 16, iconLeft: 16 };

  // Group sorted results
  const grouped = useMemo(() => {
    // Empty-query state: show "Popular" suggestions so the dropdown is alive
    if (query.trim().length < 2) {
      return popularSuggestions.length
        ? [{ title: 'Popular', items: popularSuggestions }]
        : [];
    }
    const groups = [];
    const cities = results.filter(r => r.type === 'city');
    const addresses = results.filter(r => r.type === 'address');
    if (cities.length) groups.push({ title: 'Cities', items: cities });
    if (addresses.length) groups.push({ title: 'Addresses', items: addresses });
    return groups;
  }, [results, query, popularSuggestions]);

  // Compute flat indices for keyboard navigation that match the rendering order
  const flatItems = useMemo(() => grouped.flatMap(g => g.items), [grouped]);

  return (
    <div className="relative w-full" ref={containerRef}>
      <div className="relative">
        <Search
          size={sizes.iconSize}
          style={{
            position: 'absolute',
            left: sizes.iconLeft,
            top: '50%',
            transform: 'translateY(-50%)',
            color: focused ? 'var(--text-2)' : 'var(--text-3)',
            pointerEvents: 'none',
            zIndex: 1,
            transition: 'color 200ms',
          }}
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { if (blurTimer.current) clearTimeout(blurTimer.current); setFocused(true); }}
          onBlur={() => { blurTimer.current = setTimeout(() => setFocused(false), 180); }}
          onKeyDown={handleKey}
          placeholder={placeholder}
          className="w-full font-body"
          style={{
            paddingTop: sizes.padY,
            paddingBottom: sizes.padY,
            paddingLeft: sizes.iconLeft + sizes.iconSize + 12,
            paddingRight: sizes.padX + 24,
            fontSize: sizes.fontSize,
            background: 'var(--surface)',
            color: 'var(--text)',
            border: `1px solid ${focused ? 'var(--border-strong)' : 'var(--border)'}`,
            borderRadius: sizes.radius,
            outline: 'none',
            transition: 'border-color 200ms, box-shadow 200ms',
            boxShadow: focused ? '0 0 0 3px rgba(15, 122, 82,0.12)' : 'none',
          }}
          aria-label="Search location"
          aria-expanded={showDropdown}
          autoComplete="off"
          spellCheck="false"
        />
        {loading && (
          <Loader2
            size={14}
            className="animate-spin"
            style={{
              position: 'absolute',
              right: sizes.padX,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-3)',
            }}
          />
        )}
        {!loading && query && (
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); setQuery(''); inputRef.current?.focus(); }}
            style={{
              position: 'absolute',
              right: sizes.padX - 2,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-3)',
              padding: 4,
              borderRadius: 0,
            }}
            aria-label="Clear"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {showDropdown && (
        <div
          role="listbox"
          className="absolute left-0 right-0 mt-2 z-50 overflow-hidden fade-up"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border-strong)',
            borderRadius: 0,
            boxShadow: '0 12px 32px -8px rgba(15,23,42,0.18), 0 4px 12px -4px rgba(15,23,42,0.10)',
            maxHeight: '60vh',
            overflowY: 'auto',
          }}
        >
          {flatItems.length === 0 && !loading && query.trim().length >= 2 && (
            <div className="p-6 text-center">
              <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                No matches for "<span style={{ color: 'var(--text)' }}>{query}</span>"
              </div>
              <div className="text-tiny mt-1" style={{ color: 'var(--text-4)' }}>
                {remoteFailed
                  ? 'Address lookup unavailable right now — try a major suburb or postcode.'
                  : 'Try a suburb name, postcode, or full address.'}
              </div>
            </div>
          )}

          {flatItems.length === 0 && loading && (
            <div className="p-6 text-center">
              <Loader2 size={16} className="animate-spin inline-block" style={{ color: 'var(--text-3)' }} />
              <div className="text-tiny mt-2" style={{ color: 'var(--text-4)' }}>Searching…</div>
            </div>
          )}

          {grouped.map((group, gIdx) => {
            const startIdx = grouped.slice(0, gIdx).reduce((acc, g) => acc + g.items.length, 0);
            return (
              <div key={group.title}>
                <div
                  className="text-tiny uppercase track-wide font-medium px-4 pt-3 pb-1.5"
                  style={{ color: 'var(--text-4)' }}
                >
                  {group.title}
                </div>
                {group.items.map((item, i) => {
                  const idx = startIdx + i;
                  const isHighlight = highlight === idx;
                  const Icon = item.type === 'city' ? Building2 : item.type === 'suburb' ? MapPin : Home;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="option"
                      aria-selected={isHighlight}
                      onMouseDown={(e) => { e.preventDefault(); handleSelect(item); }}
                      onMouseEnter={() => setHighlight(idx)}
                      className="w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors"
                      style={{
                        background: isHighlight ? 'var(--surface-3)' : 'transparent',
                        color: 'var(--text)',
                        borderLeft: `2px solid ${isHighlight ? 'var(--accent)' : 'transparent'}`,
                      }}
                    >
                      <div
                        className="shrink-0 flex items-center justify-center"
                        style={{
                          width: 32,
                          height: 32,
                          background: isHighlight ? 'var(--bg-2)' : 'var(--surface-2)',
                          borderRadius: 0,
                          color: isHighlight ? 'var(--accent)' : 'var(--text-3)',
                          transition: 'all 150ms',
                        }}
                      >
                        <Icon size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{item.label}</div>
                        <div className="text-tiny truncate" style={{ color: 'var(--text-4)' }}>{item.sublabel}</div>
                      </div>
                      <ArrowRight
                        size={14}
                        style={{
                          color: isHighlight ? 'var(--accent)' : 'var(--text-4)',
                          opacity: isHighlight ? 1 : 0,
                          transition: 'opacity 150ms',
                        }}
                      />
                    </button>
                  );
                })}
              </div>
            );
          })}

          {flatItems.length > 0 && remoteFailed && query.trim().length >= 2 && (
            <div
              className="px-4 py-2 text-tiny inline-flex items-center gap-1.5"
              style={{ borderTop: '1px solid var(--border)', background: 'rgba(234,88,12,0.06)', color: 'var(--text-3)' }}
            >
              <AlertCircle size={11} style={{ color: 'var(--warn)' }} />
              Showing local matches only — broader address search unavailable.
            </div>
          )}

          {flatItems.length > 0 && (
            <div
              className="hidden md:flex px-4 py-2 items-center justify-between text-tiny"
              style={{ borderTop: '1px solid var(--border)', color: 'var(--text-4)', background: 'var(--bg-2)' }}
            >
              <span className="inline-flex items-center gap-1.5">
                <kbd className="font-mono px-1.5 py-0.5" style={{ background: 'var(--surface-3)', borderRadius: 0 }}>↑↓</kbd>
                navigate
              </span>
              <span className="inline-flex items-center gap-1.5">
                <kbd className="font-mono px-1.5 py-0.5" style={{ background: 'var(--surface-3)', borderRadius: 0 }}>↵</kbd>
                select
              </span>
              <span className="inline-flex items-center gap-1.5">
                <kbd className="font-mono px-1.5 py-0.5" style={{ background: 'var(--surface-3)', borderRadius: 0 }}>esc</kbd>
                close
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* Modal wrapper for command-palette experience */
const SearchModal = ({ open, onClose, onSelect }) => {
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center px-4 fade-up"
      style={{
        background: 'rgba(15,23,42,0.55)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        paddingTop: 'min(15vh, 120px)',
      }}
      onMouseDown={onClose}
    >
      <div
        className="w-full max-w-xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <AddressSearch
          onSelect={(r) => { onSelect(r); onClose(); }}
          autoFocus
          variant="large"
          placeholder="Search address, suburb, or postcode…"
        />
        <div className="mt-3 text-center text-tiny" style={{ color: '#cbd5e1' }}>
          Powered by OpenStreetMap · works for any Australian address
        </div>
      </div>
    </div>
  );
};

/* =====================================================================
   PRICE REPORT MODAL — crowdsourced submission
   ===================================================================== */

const PriceReportModal = ({ station, defaultFuel, isOpen, onClose, onSubmit }) => {
  const [fuel, setFuel] = useState(defaultFuel || 'U91');
  const [priceStr, setPriceStr] = useState('');
  const [note, setNote] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen && station) {
      const f = defaultFuel || 'U91';
      setFuel(f);
      const cur = station.prices[f];
      setPriceStr(cur != null ? cur.toFixed(1) : '');
      setNote('');
      setSubmitted(false);
      const t = setTimeout(() => inputRef.current?.select(), 80);
      return () => clearTimeout(t);
    }
  }, [isOpen, station, defaultFuel]);

  // When user changes fuel type, default the price to the official for that fuel
  useEffect(() => {
    if (isOpen && station) {
      const cur = station.prices[fuel];
      if (cur != null) setPriceStr(cur.toFixed(1));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fuel]);

  useEffect(() => {
    if (!isOpen) return;
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', h);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !station) return null;

  const price = parseFloat(priceStr);
  const isNumValid = !isNaN(price) && price >= 100 && price <= 350;
  const officialPrice = station.prices[fuel];
  const diff = isNumValid && officialPrice != null ? +(price - officialPrice).toFixed(1) : null;
  const isUnusual = diff != null && Math.abs(diff) >= REPORT_UNUSUAL_THRESHOLD && Math.abs(diff) < REPORT_REJECT_THRESHOLD;
  const isRejected = diff != null && Math.abs(diff) >= REPORT_REJECT_THRESHOLD;
  const canSubmit = isNumValid && !isRejected;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({
      id: `usr-${station.id}-${Date.now()}`,
      stationId: station.id,
      fuelType: fuel,
      price,
      timestamp: Date.now(),
      reporter: 'You',
      seedConfirms: 0,
      note: note.trim() || null,
      isSeed: false,
    });
    setSubmitted(true);
    setTimeout(() => onClose(), 900);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center fade-up px-0 md:px-4"
      style={{ background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
      onMouseDown={onClose}
    >
      <div
        className="w-full max-w-md"
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border-strong)',
          borderRadius: 0,
          boxShadow: '0 24px 64px -16px rgba(15,23,42,0.22), 0 8px 24px -8px rgba(15,23,42,0.10)',
          maxHeight: '92vh',
          overflowY: 'auto',
        }}
      >
        {submitted ? (
          <div className="p-8 text-center">
            <div className="inline-flex items-center justify-center mb-4"
                 style={{ width: 56, height: 56, background: 'rgba(46,125,79,0.10)', border: '1px solid rgba(46,125,79,0.30)', borderRadius: 0 }}>
              <CheckCircle2 size={26} style={{ color: 'var(--success)' }} />
            </div>
            <h3 className="font-display font-semibold text-2xl mb-2">Thanks for the update.</h3>
            <p className="text-sm" style={{ color: 'var(--text-3)' }}>
              Your price report is live for other drivers.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 p-4 md:p-5"
                 style={{ borderBottom: '1px solid var(--border)' }}>
              <BrandMark brand={station.brand} size={36} />
              <div className="flex-1 min-w-0">
                <div className="font-display font-semibold text-base truncate">{station.brand}</div>
                <div className="text-tiny truncate" style={{ color: 'var(--text-3)' }}>{station.address}{station.suburb && station.suburb !== station.address ? `, ${station.suburb}` : ''}{station.state ? ` ${station.state}` : ''}{station.postcode ? ` ${station.postcode}` : ''}</div>
              </div>
              <button onClick={onClose} className="p-1.5 -mr-1.5" style={{ color: 'var(--text-3)' }} aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <div className="p-4 md:p-5 space-y-5">
              <div>
                <div className="text-micro uppercase track-wide font-medium mb-2" style={{ color: 'var(--text-4)' }}>
                  Fuel type
                </div>
                <FuelTypePicker value={fuel} onChange={setFuel} />
              </div>

              <div>
                <div className="text-micro uppercase track-wide font-medium mb-2" style={{ color: 'var(--text-4)' }}>
                  Price you saw at the bowser
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPriceStr(p => Math.max(0, (parseFloat(p || '0') - 0.1)).toFixed(1))}
                    className="shrink-0 flex items-center justify-center"
                    style={{ width: 44, height: 56, background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 0, color: 'var(--text-2)' }}
                    aria-label="Decrease"
                  >
                    <span style={{ fontSize: 20, fontWeight: 600 }}>−</span>
                  </button>
                  <div className="relative flex-1">
                    <input
                      ref={inputRef}
                      type="number"
                      step="0.1"
                      inputMode="decimal"
                      value={priceStr}
                      onChange={(e) => setPriceStr(e.target.value)}
                      className="w-full font-mono text-center"
                      style={{
                        height: 56,
                        padding: '0 56px 0 16px',
                        fontSize: 28,
                        fontWeight: 600,
                        background: 'var(--bg-2)',
                        color: 'var(--text)',
                        border: `1px solid ${isUnusual ? 'var(--warn)' : 'var(--border)'}`,
                        borderRadius: 0,
                        outline: 'none',
                        transition: 'border-color 200ms',
                        letterSpacing: '-0.02em',
                      }}
                      placeholder="178.9"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 font-mono text-sm"
                          style={{ color: 'var(--text-4)' }}>
                      ¢/L
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPriceStr(p => ((parseFloat(p || '0') + 0.1)).toFixed(1))}
                    className="shrink-0 flex items-center justify-center"
                    style={{ width: 44, height: 56, background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 0, color: 'var(--text-2)' }}
                    aria-label="Increase"
                  >
                    <span style={{ fontSize: 20, fontWeight: 600 }}>+</span>
                  </button>
                </div>

                {officialPrice != null && diff != null && (
                  <div className="mt-2 flex items-center justify-between text-tiny">
                    <span style={{ color: 'var(--text-4)' }}>
                      Official: <span className="font-mono">{officialPrice.toFixed(1)}¢</span>
                    </span>
                    <span className="font-mono" style={{ color: diff < 0 ? 'var(--accent)' : diff > 0 ? 'var(--warn)' : 'var(--text-3)' }}>
                      {diff > 0 ? '+' : ''}{diff.toFixed(1)}¢ vs official
                    </span>
                  </div>
                )}

                {isRejected && (
                  <div className="mt-3 flex items-start gap-2 p-3 text-xs"
                       style={{ background: 'rgba(255,69,105,0.08)', border: '1px solid rgba(255,69,105,0.25)', borderRadius: 0, color: 'var(--text-2)' }}>
                    <AlertCircle size={13} style={{ color: 'var(--danger)' }} className="mt-0.5 shrink-0" />
                    <span>That's more than {REPORT_REJECT_THRESHOLD}¢ from the official price. Double-check the bowser before submitting.</span>
                  </div>
                )}

                {isUnusual && !isRejected && (
                  <div className="mt-3 flex items-start gap-2 p-3 text-xs"
                       style={{ background: 'rgba(255,107,61,0.08)', border: '1px solid rgba(255,107,61,0.20)', borderRadius: 0, color: 'var(--text-2)' }}>
                    <AlertCircle size={13} style={{ color: 'var(--warn)' }} className="mt-0.5 shrink-0" />
                    <span>That's a fair bit off the official price — sure you read the bowser correctly?</span>
                  </div>
                )}
              </div>

              <div>
                <div className="text-micro uppercase track-wide font-medium mb-2" style={{ color: 'var(--text-4)' }}>
                  Note <span className="lowercase" style={{ letterSpacing: 0 }}>(optional)</span>
                </div>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value.slice(0, 80))}
                  placeholder="e.g. Card-only price, time of day…"
                  className="w-full"
                  style={{
                    padding: '11px 14px',
                    fontSize: 14,
                    background: 'var(--bg-2)',
                    color: 'var(--text)',
                    border: '1px solid var(--border)',
                    borderRadius: 0,
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            <div className="p-4 md:p-5" style={{ borderTop: '1px solid var(--border)' }}>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="w-full px-5 py-3.5 font-semibold inline-flex items-center justify-center gap-2 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: 'var(--success)',
                  color: '#ffffff',
                  fontSize: 15,
                  borderRadius: 0,
                  boxShadow: canSubmit ? '0 0 0 1px rgba(46,125,79,0.30), 0 8px 24px -8px rgba(46,125,79,0.40)' : 'none',
                }}
              >
                <CheckCircle2 size={16} /> Submit price update
              </button>
              <p className="text-tiny mt-3 text-center" style={{ color: 'var(--text-4)' }}>
                Anonymous · no account needed · helps other drivers
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

/* Inline driver-report row shown beneath each station */
const DriverReportRow = ({ report, fuelType, hasConfirmed, onConfirm }) => {
  if (report.fuelType !== fuelType) return null;
  const totalConfirms = reportConfirmCount(report, hasConfirmed ? new Set([report.id]) : new Set());
  const trusted = isReportTrusted(report, hasConfirmed ? new Set([report.id]) : new Set());
  return (
    <div
      className="mt-2 flex items-center gap-2 px-2.5 py-2 fade-up"
      style={{
        background: trusted ? 'rgba(46,125,79,0.04)' : 'var(--bg-2)',
        border: `1px solid ${trusted ? 'rgba(46,125,79,0.20)' : 'var(--border)'}`,
        borderRadius: 0,
      }}
    >
      <Users size={11} style={{ color: trusted ? 'var(--success)' : 'var(--text-3)' }} className="shrink-0" />
      <span className="font-mono text-tiny font-semibold tabular-nums" style={{ color: 'var(--text)' }}>
        {report.price.toFixed(1)}¢
      </span>
      <span className="text-tiny" style={{ color: 'var(--text-3)' }}>·</span>
      <span className="text-tiny" style={{ color: 'var(--text-3)' }}>
        {report.reporter} · {timeAgoFromTimestamp(report.timestamp)}
      </span>
      {totalConfirms > 0 && (
        <span className="text-tiny inline-flex items-center gap-0.5"
              style={{ color: trusted ? 'var(--success)' : 'var(--text-4)' }}>
          · <CheckCircle2 size={10} /> {totalConfirms}
        </span>
      )}
      <span className="flex-1 min-w-0" />
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onConfirm(report.id); }}
        disabled={hasConfirmed}
        className="shrink-0 inline-flex items-center gap-1 px-2 py-1 text-tiny font-medium transition-colors"
        style={{
          background: hasConfirmed ? 'rgba(46,125,79,0.10)' : 'var(--surface-3)',
          color: hasConfirmed ? 'var(--success)' : 'var(--text-2)',
          border: `1px solid ${hasConfirmed ? 'rgba(46,125,79,0.30)' : 'var(--border-strong)'}`,
          borderRadius: 0,
          cursor: hasConfirmed ? 'default' : 'pointer',
        }}
      >
        {hasConfirmed
          ? <><Check size={10} /> Confirmed</>
          : <><ThumbsUp size={10} /> Still accurate?</>}
      </button>
    </div>
  );
};

/* Floating success toast */
const Toast = ({ message, visible }) => {
  if (!visible) return null;
  return (
    <div
      className="fixed bottom-6 right-6 z-50 fade-up flex items-center gap-2.5 px-4 py-3"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--success)',
        borderRadius: 0,
        boxShadow: '0 16px 40px -12px rgba(15,23,42,0.18), 0 0 0 3px rgba(46,125,79,0.10)',
        maxWidth: 'calc(100vw - 48px)',
        color: 'var(--text)',
      }}
      role="status"
    >
      <CheckCircle2 size={16} style={{ color: 'var(--success)' }} />
      <span className="text-sm font-medium">{message}</span>
    </div>
  );
};

const Header = ({ onNav, onHome, fuelType, onFuelType, onOpenSearch, darkMode, onToggleDark }) => {
  const [open, setOpen] = useState(false);
  const goto = (v) => { setOpen(false); onNav(v); };
  const goHome = () => {
    setOpen(false);
    // On sub-routes (e.g. /fuel/[suburb], /status) a client view-switch leaves
    // the URL unchanged, so navigate to the real homepage. On "/" just reset.
    if (typeof window !== 'undefined' && window.location.pathname !== '/') {
      window.location.href = '/';
      return;
    }
    onHome ? onHome() : onNav({ name: 'home' });
  };

  return (
    <header className="sticky top-0 z-30 glass" style={{ borderBottom: '1px solid var(--border)' }}>
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-3 flex items-center gap-4">
        <button type="button" onClick={goHome} className="flex items-center shrink-0" aria-label="Motavo home" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
          <MotavoLogo markSize={30} wordSize={20} />
        </button>

        <nav className="hidden md:flex items-center gap-0.5 ml-4 flex-1">
          <a
            href="/ev"
            className="px-3 py-1.5 text-sm font-medium transition-colors"
            style={{ color: 'var(--text-2)', borderRadius: 0, textDecoration: 'none' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.color = 'var(--text)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-2)'; }}
          >EV charging</a>
        </nav>

        <div className="hidden md:flex items-center gap-2">
          <button
            type="button"
            onClick={goHome}
            className="p-2 transition-colors hover-raise"
            style={{
              background: 'var(--surface)',
              color: 'var(--text-2)',
              border: '1px solid var(--border)',
              borderRadius: 0,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-2)'; }}
            aria-label="Home"
            title="Home"
          >
            <Home size={15} />
          </button>
          <button
            type="button"
            onClick={onOpenSearch}
            className="inline-flex items-center gap-2.5 px-3 py-1.5 text-sm transition-colors hover-raise"
            style={{
              background: 'var(--surface)',
              color: 'var(--text-3)',
              border: '1px solid var(--border)',
              borderRadius: 0,
              minWidth: 240,
            }}
          >
            <Search size={14} />
            <span className="flex-1 text-left">Search address…</span>
            <kbd
              className="font-mono inline-flex items-center gap-0.5 px-1.5 py-0.5 text-tiny"
              style={{
                background: 'var(--surface-2)',
                color: 'var(--text-4)',
                borderRadius: 0,
                border: '1px solid var(--border)',
              }}
            >
              <Command size={9} strokeWidth={2.5} />K
            </kbd>
          </button>
          <button
            type="button"
            onClick={onToggleDark}
            className="p-2 transition-colors hover-raise"
            style={{
              background: 'var(--surface)',
              color: 'var(--text-2)',
              border: '1px solid var(--border)',
              borderRadius: 0,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-2)'; }}
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            title={darkMode ? 'Light mode' : 'Dark mode'}
          >
            {darkMode ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>

        <div className="md:hidden ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={goHome}
            className="p-2"
            style={{ color: 'var(--text)', borderRadius: 0 }}
            aria-label="Home"
          >
            <Home size={19} />
          </button>
          <button
            type="button"
            onClick={onOpenSearch}
            className="p-2"
            style={{ color: 'var(--text)', borderRadius: 0 }}
            aria-label="Search"
          >
            <Search size={19} />
          </button>
          <button
            type="button"
            onClick={onToggleDark}
            className="p-2"
            style={{ color: 'var(--text)', borderRadius: 0 }}
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {darkMode ? <Sun size={19} /> : <Moon size={19} />}
          </button>
          <button
            type="button"
            onClick={() => setOpen(o => !o)}
            className="p-2"
            style={{ color: 'var(--text)', borderRadius: 0 }}
            aria-label="Open menu"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden fade-up" style={{ borderTop: '1px solid var(--border)', background: 'var(--bg)' }}>
          <div className="max-w-6xl mx-auto px-4 py-4">
            <a href="/ev"
               className="w-full text-left py-3 font-medium inline-flex items-center justify-between"
               style={{ borderBottom: '1px solid var(--border)', color: 'var(--text)', textDecoration: 'none' }}>
              EV charging <ChevronRight size={15} style={{ color: 'var(--text-4)' }} />
            </a>
            {[
              { label: 'About', view: { name: 'about' } },
            ].map(item => (
              <button key={item.label} type="button" onClick={() => goto(item.view)}
                      className="w-full text-left py-3 font-medium inline-flex items-center justify-between"
                      style={{ borderBottom: '1px solid var(--border)' }}>
                {item.label} <ChevronRight size={15} style={{ color: 'var(--text-4)' }} />
              </button>
            ))}
          </div>
        </div>
      )}
    </header>
  );
};

const STATE_ORDER = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'ACT', 'TAS', 'NT'];

/** Crawlable directory of every suburb page — the internal-linking backbone
 *  for the /fuel/[suburb] SEO pages. Plain anchors, rendered in the
 *  pre-rendered HTML, grouped by state. */
const SuburbDirectory = () => (
  <div className="pt-10 mt-2 mb-12" style={{ borderTop: '1px solid var(--border)' }}>
    <div className="text-micro font-medium uppercase track-wide mb-5" style={{ color: 'var(--text-4)' }}>
      Fuel prices by suburb
    </div>
    {STATE_ORDER.map(st => {
      const subs = SUBURBS.filter(s => s.state === st);
      if (!subs.length) return null;
      return (
        <div key={st} className="mb-4 text-sm" style={{ lineHeight: 2 }}>
          <span className="track-wide" style={{ color: 'var(--accent)', fontSize: 11, fontWeight: 600, marginRight: 10 }}>{st}</span>
          {subs.map((s, i) => (
            <span key={s.slug}>
              <a href={`/fuel/${s.slug}`} className="ulink" style={{ color: 'var(--text-3)', textDecoration: 'none' }}>{s.name}</a>
              {i < subs.length - 1 ? <span style={{ color: 'var(--text-4)' }}> · </span> : null}
            </span>
          ))}
        </div>
      );
    })}
  </div>
);

const Footer = ({ onNav }) => (
  <footer className="mt-20 pt-14 pb-10" style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-2)' }}>
    <div className="max-w-6xl mx-auto px-4 md:px-6">
      <div className="grid md:grid-cols-4 gap-10 md:gap-8 mb-12">
        <div className="md:col-span-2">
          <div className="mb-4">
            <MotavoLogo markSize={28} wordSize={20} />
          </div>
          <p className="text-sm leading-relaxed max-w-md" style={{ color: 'var(--text-3)' }}>
            Real-time fuel prices for Australian drivers. Pulled live from state government data feeds — independent, unbiased, free.
          </p>
          <p className="text-xs mt-4" style={{ color: 'var(--text-4)' }}>
            Live across all eight states and territories. Pulled from official government feeds — NSW FuelCheck, Servo Saver, FuelWatch, and more.
          </p>
        </div>
        <div>
          <div className="text-micro font-medium uppercase track-wide mb-3" style={{ color: 'var(--text-4)' }}>Capital cities</div>
          <ul className="space-y-2 text-sm">
            {CITIES.slice(0, 6).map(c => (
              <li key={c.slug}>
                <button type="button" onClick={() => onNav({ name: 'city', slug: c.slug })} className="ulink" style={{ color: 'var(--text-2)' }}>{c.name}</button>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="text-micro font-medium uppercase track-wide mb-3" style={{ color: 'var(--text-4)' }}>About</div>
          <ul className="space-y-2 text-sm">
            <li>
              <a href="/ev" className="ulink" style={{ color: 'var(--text-2)', textDecoration: 'none' }}>EV charging</a>
            </li>
            {[
              { label: 'About Motavo', view: { name: 'about' } },
              { label: 'Our data & methodology', view: { name: 'methodology' } },
              { label: 'How fuel cycles work', view: { name: 'editorial', slug: 'cycles' } },
              { label: 'Privacy policy', view: { name: 'privacy' } },
              { label: 'Terms of service', view: { name: 'terms' } },
            ].map(item => (
              <li key={item.label}>
                <button type="button" onClick={() => onNav(item.view)} className="ulink" style={{ color: 'var(--text-2)' }}>{item.label}</button>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <SuburbDirectory />
      <div className="pt-6 text-xs flex flex-col md:flex-row gap-3 md:items-center md:justify-between"
           style={{ borderTop: '1px solid var(--border)', color: 'var(--text-4)' }}>
        <div>© {new Date().getFullYear()} Motavo · <button type="button" onClick={() => onNav({ name: 'methodology' })} className="ulink" style={{ color: 'inherit', background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: 'inherit' }}>Independent fuel price comparison</button>.</div>
        <div className="font-mono text-tiny track-wide uppercase">FuelCheck NSW · FuelWatch WA · QLD · NT · TAS</div>
      </div>
    </div>
  </footer>
);

/* ===== VIEWS ===== */

const HomeView = ({ location, locating, locError, fuelType, onLocate, onSample, onSearchSelect, onNav, onFuelType, reportsByStationFor, confirmedSet, onConfirmReport, onOpenReportModal }) => {
  const [stations, setStations] = useState([]);
  const signals = useCycleSignals(fuelType);
  const [loadingStations, setLoadingStations] = useState(false);

  useEffect(() => {
    if (!location) { setStations([]); return; }
    let cancelled = false;
    setLoadingStations(true);
    fetchStationsForLocation({
      lat: location.lat,
      lng: location.lng,
      state: location.state || 'NSW',
      fuelType,
      locationKey: location.key,
    }).then(s => {
      if (!cancelled) { setStations(s); setLoadingStations(false); }
    });
    return () => { cancelled = true; };
  }, [location?.key, location?.lat, location?.lng, fuelType]);
  const [viewMode, setViewMode] = useState('list');
  const [sort, setSort] = useState('distance');

  return (
    <div>
      {!location && (
        <section className="hero-mesh">
          <div className="max-w-6xl mx-auto px-4 md:px-6"
               style={{ paddingTop: 'clamp(2rem, 8vw, 5.5rem)', paddingBottom: 'clamp(2.5rem, 6vw, 5rem)' }}>
            <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-start">

              {/* Left: headline + search */}
              <div>
                <h1 className="font-display"
                    style={{ fontSize: 'clamp(2.4rem, 7vw, 5.2rem)', lineHeight: 0.84, letterSpacing: '0.005em', marginBottom: '1.1rem' }}>
                  Stop overpaying<br/><span style={{ color: 'var(--accent)' }}>for fuel.</span>
                </h1>
                <p style={{ color: 'var(--text-3)', fontSize: '1.05rem', lineHeight: 1.6, maxWidth: 440, marginBottom: '2rem' }}>
                  Real government data, ranked by price or distance. Free, independent, no sponsored results.
                </p>

                <button type="button" onClick={onLocate} disabled={locating}
                        className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 font-semibold text-sm transition-opacity disabled:opacity-60"
                        style={{ background: 'var(--accent)', color: '#ffffff', border: 'none', borderRadius: 0, cursor: locating ? 'default' : 'pointer', marginBottom: '0.75rem' }}>
                  {locating ? <Loader2 size={15} className="animate-spin" /> : <Navigation size={15} />}
                  {locating ? 'Finding prices near you…' : 'Find cheapest fuel near me'}
                </button>

                <div style={{ marginBottom: '0.5rem' }}>
                  <AddressSearch onSelect={onSearchSelect} variant="large" placeholder="Or search a suburb, postcode or address…" />
                </div>
                {locError && (
                  <p className="text-tiny mt-1" style={{ color: 'var(--warn)' }}>
                    <AlertCircle size={11} style={{ display: 'inline', marginRight: 4 }} />
                    Couldn't get your location — try searching instead.
                  </p>
                )}

                <button type="button" onClick={() => onNav({ name: 'route' })}
                        className="hover-raise w-full flex items-center gap-4 px-4 py-4 mt-4 text-left transition-colors"
                        style={{ background: 'rgba(15, 122, 82,0.06)', border: '1px solid var(--accent)', borderRadius: 0, cursor: 'pointer' }}>
                  <span className="shrink-0 inline-flex items-center justify-center"
                        style={{ width: 42, height: 42, background: 'var(--accent)' }}>
                    <Navigation size={19} color="#ffffff" strokeWidth={2.2} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center gap-2">
                      <span className="font-display font-semibold text-base" style={{ color: 'var(--text)' }}>Route planner</span>
                      <span className="font-mono text-micro font-bold uppercase track-wide px-1.5 py-0.5"
                            style={{ background: 'var(--accent)', color: '#ffffff' }}>New</span>
                    </span>
                    <span className="block text-sm mt-0.5" style={{ color: 'var(--text-3)' }}>
                      Cheapest fuel along your whole trip — not just near you.
                    </span>
                  </span>
                  <ChevronRight size={17} className="shrink-0" style={{ color: 'var(--accent)' }} />
                </button>

                <AlertSignup />

                <div className="hidden sm:block mt-8 pt-5" style={{ borderTop: '1px solid var(--border)' }}>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-3)' }}>
                    Every state and territory, straight from government price feeds.
                    No station can pay to rank higher — and it's free, always.{' '}
                    <button type="button" onClick={() => onNav({ name: 'methodology' })}
                            className="ulink font-medium"
                            style={{ color: 'var(--text-2)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: 'inherit' }}>
                      How our data works →
                    </button>
                  </p>
                </div>

                <button type="button" onClick={() => onNav({ name: 'editorial', slug: 'cycles' })}
                        className="hover-raise inline-flex items-center gap-3 px-4 py-3 mt-3 transition-colors"
                        style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 0, cursor: 'pointer' }}>
                  <TrendingDown size={16} style={{ color: 'var(--accent)' }} />
                  <span className="font-medium text-sm" style={{ color: 'var(--text)' }}>How fuel price cycles work</span>
                  <ChevronRight size={15} style={{ color: 'var(--text-4)' }} />
                </button>
              </div>

              {/* Right: quick city list */}
              <div>
                <div className="text-tiny font-medium uppercase track-wide mb-3" style={{ color: 'var(--text-4)' }}>Browse by city</div>
                <div className="space-y-1.5">
                  {CITIES.map(c => (
                    <button key={c.slug} type="button" onClick={() => onNav({ name: 'city', slug: c.slug })}
                            className="hover-raise w-full flex items-center justify-between px-4 py-3 transition-colors"
                            style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 0, cursor: 'pointer' }}>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-tiny font-semibold" style={{ color: 'var(--accent)', minWidth: 28 }}>{c.state}</span>
                        <span className="font-medium text-sm" style={{ color: 'var(--text)' }}>{c.name}</span>
                        {signals[c.state]?.latest != null && (
                          <span className="font-mono text-tiny tabular-nums" style={{ color: 'var(--text-2)' }}>
                            from ~{signals[c.state].latest.toFixed(1)}¢
                          </span>
                        )}
                      </div>
                      <span className="inline-flex flex-col items-end gap-1">
                        <SignalChip signal={signals[c.state]} />
                        <span className="text-micro font-mono" style={{ color: 'var(--text-4)' }}>{c.cycle}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      <div className="max-w-6xl mx-auto px-4 md:px-6 pb-16">
        {location ? (
          <div className="space-y-5">
            <div className="flex items-end justify-between flex-wrap gap-3 pt-2">
              <div>
                <div className="text-micro font-medium uppercase track-wide mb-2" style={{ color: 'var(--text-4)' }}>Now showing</div>
                <h2 className="font-display font-semibold text-3xl md:text-4xl lead-tight">
                  Around <span style={{ color: 'var(--accent)' }}>{location.label}</span>
                </h2>
                <p className="text-sm mt-1.5" style={{ color: 'var(--text-3)' }}>
                  {loadingStations
                    ? 'Checking live prices…'
                    : `${stations.length} stations · ${FUEL_TYPES.find(f => f.code === fuelType)?.label}`}
                </p>
              </div>
              <button type="button" onClick={() => onSample(null)}
                      className="text-sm font-medium ulink inline-flex items-center gap-1" style={{ color: 'var(--accent)' }}>
                Change location <ArrowRight size={14} />
              </button>
            </div>

            <AddressSearch onSelect={onSearchSelect} variant="compact" placeholder="Search a different address, suburb, or postcode…" />

            <SavingsBanner stations={stations} fuelType={fuelType} />

            <CycleSignal stations={stations} fuelType={fuelType} state={location?.state} cycleLabel={cityForState(location?.state)?.cycle} />

            <FuelTypePicker value={fuelType} onChange={onFuelType} />

            <PriceStats stations={stations} fuelType={fuelType} />

            <RoutePromo onNav={onNav} />

            {loadingStations ? (
              <StationSkeleton rows={4} />
            ) : (
            <StationList stations={stations} fuelType={fuelType} viewMode={viewMode}
                         onViewMode={setViewMode} sort={sort} onSort={setSort}
                         reportsByStation={reportsByStationFor(stations)}
                         confirmedSet={confirmedSet}
                         onConfirmReport={onConfirmReport}
                         onOpenReportModal={onOpenReportModal}
                         userLat={location?.lat}
                         userLng={location?.lng} />
            )}
          </div>
        ) : null}

        {/* Ad slot removed until there's meaningful traffic — re-enable by
            restoring <AdSlot size="leaderboard" /> here and the AdSense
            script in app/layout.tsx. */}

      </div>
    </div>
  );
};

/* ===== ROUTE PLANNER VIEW =====
   "Cheapest fuel along my route." Origin + destination via the existing
   AddressSearch, then /api/route does the heavy lifting server-side
   (OSRM geometry → sampled station fetches → detour ranking). */

const RouteEndpointPicker = ({ label, value, onPick, onClear }) => (
  <div>
    <div className="text-micro font-medium uppercase track-wide mb-1.5" style={{ color: 'var(--text-4)' }}>{label}</div>
    {value ? (
      <div className="flex items-center justify-between gap-2 px-3 py-2.5"
           style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <span className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
          <MapPin size={13} style={{ display: 'inline', marginRight: 6, color: 'var(--accent)' }} />
          {value.label}
        </span>
        <button type="button" onClick={onClear} aria-label={`Clear ${label}`}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-4)', padding: 2 }}>
          <X size={14} />
        </button>
      </div>
    ) : (
      <AddressSearch onSelect={onPick} variant="compact" placeholder="Search suburb, postcode or address…" />
    )}
  </div>
);

const RouteStationRow = ({ station, fuelType, rank, cheapestPrice }) => {
  const price = station.prices?.[fuelType];
  const isCheapest = rank === 1;
  return (
    <div className="flex items-center gap-3 px-3.5 py-3"
         style={{
           background: 'var(--surface)',
           border: `1px solid ${isCheapest ? 'var(--success)' : 'var(--border)'}`,
           borderLeft: `3px solid ${isCheapest ? 'var(--success)' : 'var(--border)'}`,
         }}>
      <span className="font-mono text-tiny font-bold shrink-0" style={{ color: isCheapest ? 'var(--success)' : 'var(--text-4)', minWidth: 22 }}>
        #{rank}
      </span>
      <BrandMark brand={station.brand} size={32} />
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate" style={{ color: 'var(--text)' }}>
          {station.brand}{station.suburb ? ` · ${station.suburb}` : ''}
        </div>
        <div className="text-tiny mt-0.5" style={{ color: 'var(--text-3)' }}>
          {station.alongKm} km along · {station.detourKm <= 0.3 ? 'on route' : `${station.detourKm} km off route`}
          {isCheapest && cheapestPrice != null && <span className="font-semibold" style={{ color: 'var(--success)' }}> · Best stop</span>}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <PriceTag cents={price} tone={isCheapest ? 'cheap' : 'default'} />
      </div>
      <div className="shrink-0">
        <DirectionsMenu lat={station.lat} lng={station.lng} label={station.name || station.brand} />
      </div>
    </div>
  );
};

const RouteView = ({ fuelType, onFuelType }) => {
  const [from, setFrom] = useState(null);
  const [to, setTo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [sort, setSort] = useState('price'); // 'price' | 'along'

  const search = async (f = from, t = to, fuel = fuelType) => {
    if (!f || !t) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const params = new URLSearchParams({
        fromLat: String(f.lat), fromLng: String(f.lng),
        toLat: String(t.lat), toLng: String(t.lng), fuel,
      });
      const ctrl = new AbortController();
      const timeoutId = setTimeout(() => ctrl.abort(), 25000);
      const res = await fetch(`/api/route?${params}`, { signal: ctrl.signal });
      clearTimeout(timeoutId);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `Route search failed (${res.status})`);
      setResult(data);
    } catch (e) {
      setError(e?.message === 'The user aborted a request.' ? 'Route search timed out — try again.' : (e?.message || 'Route search failed.'));
    } finally {
      setLoading(false);
    }
  };

  const swap = () => { const f = from; setFrom(to); setTo(f); setResult(null); };

  const handleFuelChange = (fuel) => {
    onFuelType(fuel);
    if (from && to) search(from, to, fuel);
  };

  const stations = result?.stations
    ? [...result.stations].sort((a, b) =>
        sort === 'along' ? a.alongKm - b.alongKm : (a.prices[result.fuel] ?? 999) - (b.prices[result.fuel] ?? 999))
    : [];
  const cheapestPrice = result?.stations?.[0]?.prices?.[result?.fuel] ?? null;
  const priceRank = new Map((result?.stations || []).map((s, i) => [s.id, i + 1]));

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-10 md:py-14">
      <div className="text-micro font-medium uppercase track-wide mb-3" style={{ color: 'var(--text-4)' }}>Route planner</div>
      <h1 className="font-display font-semibold text-4xl md:text-5xl lead-tight mb-3">
        Cheapest fuel <span style={{ color: 'var(--accent)' }}>along your route</span>
      </h1>
      <p className="text-base mb-8 max-w-xl" style={{ color: 'var(--text-3)' }}>
        Heading somewhere? Don't pay city-exit prices. Enter your trip and we'll rank every station within 5 km of the way there.
      </p>

      <div className="space-y-3 mb-4">
        <RouteEndpointPicker label="From" value={from} onPick={(r) => { setFrom(r); setResult(null); }} onClear={() => { setFrom(null); setResult(null); }} />
        <div className="flex justify-center">
          <button type="button" onClick={swap} aria-label="Swap origin and destination"
                  className="p-1.5 transition-colors"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text-3)' }}>
            <ArrowRight size={13} style={{ transform: 'rotate(90deg)' }} />
          </button>
        </div>
        <RouteEndpointPicker label="To" value={to} onPick={(r) => { setTo(r); setResult(null); }} onClear={() => { setTo(null); setResult(null); }} />
      </div>

      <FuelTypePicker value={fuelType} onChange={handleFuelChange} compact />

      <button type="button" disabled={!from || !to || loading} onClick={() => search()}
              className="w-full mt-4 inline-flex items-center justify-center gap-2 px-5 py-3.5 font-semibold text-sm transition-opacity disabled:opacity-40"
              style={{ background: 'var(--accent)', color: '#ffffff', border: 'none', borderRadius: 0, cursor: (!from || !to || loading) ? 'default' : 'pointer' }}>
        {loading ? <Loader2 size={15} className="animate-spin" /> : <Navigation size={15} />}
        {loading ? 'Checking prices along the way…' : 'Find fuel along this route'}
      </button>

      {error && (
        <p className="text-sm mt-4" style={{ color: 'var(--warn)' }}>
          <AlertCircle size={13} style={{ display: 'inline', marginRight: 5 }} />{error}
        </p>
      )}

      {result && (
        <div className="mt-8 fade-up">
          <div className="flex items-end justify-between flex-wrap gap-3 mb-4">
            <div>
              <div className="font-display font-semibold text-2xl">
                {result.route.distanceKm} km
                {result.route.durationMin > 0 && <span style={{ color: 'var(--text-3)' }}> · ~{Math.floor(result.route.durationMin / 60) > 0 ? `${Math.floor(result.route.durationMin / 60)}h ` : ''}{result.route.durationMin % 60}m</span>}
              </div>
              <div className="text-tiny mt-1" style={{ color: 'var(--text-4)' }}>
                {stations.length} station{stations.length === 1 ? '' : 's'} within 5 km of your route
                {result.route.source === 'straight-line' && ' · approximate path (routing unavailable)'}
              </div>
            </div>
            {stations.length > 1 && (
              <Toggle value={sort} onChange={setSort} options={[
                { key: 'price', label: 'Cheapest first', icon: TrendingDown },
                { key: 'along', label: 'In trip order', icon: MoveRight },
              ]} />
            )}
          </div>

          {stations.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm" style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-3)' }}>
              No stations with {result.fuel} prices found within 5 km of this route. Try a different fuel type.
            </div>
          ) : (
            <div className="space-y-2">
              {stations.map((st) => (
                <RouteStationRow key={st.id} station={st} fuelType={result.fuel}
                                 rank={priceRank.get(st.id)} cheapestPrice={cheapestPrice} />
              ))}
            </div>
          )}

          <p className="text-tiny mt-5" style={{ color: 'var(--text-4)' }}>
            Routing © <a className="ulink" href="http://project-osrm.org" target="_blank" rel="noopener noreferrer">OSRM</a> contributors · Prices from official government feeds · Always confirm at the bowser.
          </p>
        </div>
      )}
    </div>
  );
};

const CitiesIndexView = ({ onNav }) => {
  const signals = useCycleSignals('U91');
  return (
  <div className="max-w-6xl mx-auto px-4 md:px-6 py-12 md:py-16">
    <div className="text-micro font-medium uppercase track-wide mb-3" style={{ color: 'var(--text-4)' }}>Capital cities</div>
    <h1 className="font-display font-semibold text-4xl md:text-6xl lead-tight mb-4">
      Cheapest fuel by <span className="brand-gradient">capital city</span>
    </h1>
    <p className="text-base md:text-lg max-w-2xl mb-12" style={{ color: 'var(--text-3)' }}>
      Live prices from every covered capital, ranked by cheapest. Each city has its own price cycle — knowing yours is the easiest way to save.
    </p>

    <div className="grid md:grid-cols-2 gap-3 md:gap-4">
      {CITIES.map(c => (
        <button key={c.slug} type="button"
                onClick={() => onNav({ name: 'city', slug: c.slug })}
                className="hover-raise p-6 text-left transition"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 0 }}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="font-mono text-tiny font-medium track-wide mb-1.5" style={{ color: 'var(--accent)' }}>{c.state}</div>
              <h2 className="font-display font-semibold text-3xl">{c.name}</h2>
              {signals[c.state]?.latest != null && (
                <div className="font-mono text-sm tabular-nums mt-1" style={{ color: 'var(--text-2)' }}>
                  from ~{signals[c.state].latest.toFixed(1)}¢/L
                </div>
              )}
            </div>
            <ArrowUpRight size={20} style={{ color: 'var(--text-3)' }} />
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm pt-3" style={{ borderTop: '1px solid var(--border)' }}>
            <div>
              <div className="text-micro uppercase track-wide font-medium mb-1" style={{ color: 'var(--text-4)' }}>Population</div>
              <div className="font-medium font-mono">{c.pop}</div>
            </div>
            <div>
              <div className="text-micro uppercase track-wide font-medium mb-1" style={{ color: 'var(--text-4)' }}>Right now</div>
              <SignalBadge signal={signals[c.state]} />
              {!signals[c.state] && (
                <div className="font-medium text-sm" style={{ color: 'var(--text-3)' }}>{c.cycle}</div>
              )}
            </div>
          </div>
        </button>
      ))}
    </div>
  </div>
  );
};

const citySource = (state) => ({
  NSW: 'FuelCheck NSW', VIC: 'Servo Saver', QLD: 'QLD Fuel Price Reporting',
  WA: 'FuelWatch WA',  SA:  'SA Fuel Pricing Information Scheme',
  NT: 'MyFuel NT',     TAS: 'FuelCheck (via NSW)', ACT: 'FuelCheck (via NSW)',
}[state] || 'state government feeds');

const CityView = ({ city, fuelType, onFuelType, onSearchSelect, onNav, reportsByStationFor, confirmedSet, onConfirmReport, onOpenReportModal }) => {
  const [stations, setStations] = useState([]);
  const [loadingStations, setLoadingStations] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoadingStations(true);
    fetchStationsForLocation({
      lat: city.center.lat,
      lng: city.center.lng,
      state: city.state,
      fuelType,
      locationKey: `city-${city.slug}`,
      count: 18,
    }).then(s => {
      if (!cancelled) { setStations(s); setLoadingStations(false); }
    });
    return () => { cancelled = true; };
  }, [city.slug, fuelType]);
  const [viewMode, setViewMode] = useState('list');
  const [sort, setSort] = useState('distance');

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-8 md:py-12">
      <button type="button" onClick={() => onNav({ name: 'cities' })}
              className="text-sm font-medium mb-5 inline-flex items-center gap-1" style={{ color: 'var(--text-3)' }}>
        <ChevronRight size={14} className="rotate-180" /> Capital cities
      </button>

      <div className="mb-8">
        <div className="font-mono text-tiny font-medium track-wide mb-2" style={{ color: 'var(--accent)' }}>
          {city.state} · {city.pop} POPULATION
        </div>
        <h1 className="font-display font-semibold text-4xl md:text-6xl lead-tight mb-3">
          Cheapest fuel in <span className="brand-gradient">{city.name}</span>
        </h1>
        <p className="text-base md:text-lg max-w-2xl" style={{ color: 'var(--text-3)' }}>
          Live across <strong style={{ color: 'var(--text)' }}>{stations.length} stations</strong>, updated continuously from {citySource(city.state)}. Local cycle: <strong style={{ color: 'var(--text)' }}>{city.cycle}</strong>.
        </p>
      </div>

      <div className="mb-5">
        <AddressSearch onSelect={onSearchSelect} variant="compact" placeholder={`Change location — search address, suburb, or postcode…`} />
      </div>

      <div className="mb-5"><FuelTypePicker value={fuelType} onChange={onFuelType} /></div>
      <div className="mb-5"><SavingsBanner stations={stations} fuelType={fuelType} /></div>
      <div className="mb-5"><CycleSignal stations={stations} fuelType={fuelType} state={city.state} cycleLabel={city.cycle} /></div>
      <div className="mb-6"><PriceStats stations={stations} fuelType={fuelType} /></div>

      {loadingStations ? (
        <StationSkeleton rows={4} />
      ) : (
      <StationList stations={stations} fuelType={fuelType} viewMode={viewMode}
                   onViewMode={setViewMode} sort={sort} onSort={setSort}
                   reportsByStation={reportsByStationFor(stations)}
                   confirmedSet={confirmedSet}
                   onConfirmReport={onConfirmReport}
                   onOpenReportModal={onOpenReportModal}
                   userLat={city.center.lat}
                   userLng={city.center.lng} />
      )}

    </div>
  );
};


const EditorialView = ({ slug, onNav }) => {
  if (slug !== 'cycles') return null;
  return (
    <article className="max-w-3xl mx-auto px-4 md:px-6 py-12 md:py-16">
      <Pill tone="brand" className="mb-4">Explainer · 6 min read</Pill>
      <h1 className="font-display font-semibold text-4xl md:text-6xl lead-tight mb-5">
        How Australian fuel <span className="brand-gradient">price cycles</span> actually work
      </h1>
      <p className="text-lg md:text-xl mb-10 leading-relaxed" style={{ color: 'var(--text-2)' }}>
        Petrol prices in Australia don't move randomly. In most capital cities they move in waves — sharp jumps, slow drops — and the wave repeats. Understanding the cycle is the difference between paying for the wave and surfing it.
      </p>

      <div className="space-y-5 text-base md:text-lg leading-relaxed" style={{ color: 'var(--text-2)' }}>
        <h2 className="font-display font-semibold text-2xl md:text-3xl mt-10 mb-1" style={{ color: 'var(--text)' }}>What is a price cycle?</h2>
        <p>A fuel price cycle is a repeating pattern in retail petrol prices, typically driven by retailers collectively raising and lowering margins. The wholesale price barely moves day-to-day; the cycle is mostly margin gymnastics by retailers competing — then resetting — together.</p>

        <h2 className="font-display font-semibold text-2xl md:text-3xl mt-10 mb-2" style={{ color: 'var(--text)' }}>By city, briefly</h2>
        <ul className="space-y-2.5">
          {CITIES.filter(c => c.live).map(c => (
            <li key={c.slug} className="flex gap-3 items-baseline pb-2" style={{ borderBottom: '1px solid var(--border)' }}>
              <span className="font-mono text-tiny font-medium track-wide shrink-0" style={{ color: 'var(--accent)', minWidth: 36 }}>{c.state}</span>
              <span><strong style={{ color: 'var(--text)' }}>{c.name}:</strong> {c.cycle}.</span>
            </li>
          ))}
        </ul>

        <h2 className="font-display font-semibold text-2xl md:text-3xl mt-10 mb-2" style={{ color: 'var(--text)' }}>Three rules that beat 90% of Australians</h2>
        <ol className="space-y-3 list-decimal pl-5">
          <li>Don't fill up on a cycle peak. Sounds obvious. Most people do it anyway because they don't know they're at a peak.</li>
          <li>Fill the day after the bottom — not the day before. Retailers can jump prices overnight; the bottom is unpredictable but the day after is reliably cheap.</li>
          <li>If you're wrong about the cycle, you're paying ~$10 extra per tank. Per fortnight that's $250 a year. Every year.</li>
        </ol>

        <h2 className="font-display font-semibold text-2xl md:text-3xl mt-10 mb-2" style={{ color: 'var(--text)' }}>What Motavo does</h2>
        <p>We pull live prices straight from the state schemes (NSW, QLD, WA, NT, TAS, ACT) and surface the cheapest stations near you in real time. Pattern recognition is automatic — if a price is unusually low in your area, you'll see it.</p>
        <p className="pt-2">
          <button type="button" onClick={() => onNav({ name: 'home' })}
                  className="font-medium ulink inline-flex items-center gap-1" style={{ color: 'var(--accent)' }}>
            Try it now <ArrowRight size={16} />
          </button>
        </p>
      </div>
    </article>
  );
};

const StaticPage = ({ icon: Icon, title, intro, body }) => (
  <article className="max-w-3xl mx-auto px-4 md:px-6 py-12 md:py-16">
    {Icon && (
      <div className="rounded-full p-2.5 inline-flex mb-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <Icon size={18} style={{ color: 'var(--accent)' }} />
      </div>
    )}
    <h1 className="font-display font-semibold text-4xl md:text-5xl lead-tight mb-4">{title}</h1>
    {intro && <p className="text-lg md:text-xl mb-10 leading-relaxed" style={{ color: 'var(--text-2)' }}>{intro}</p>}
    <div className="space-y-5 text-base md:text-lg leading-relaxed" style={{ color: 'var(--text-2)' }}>{body}</div>
  </article>
);

const AboutView = () => (
  <StaticPage icon={Info} title="About Motavo"
    intro="Motavo is an independent comparison tool for Australian drivers. Compare live fuel prices and find EV charging in one place. We don't sell fuel or electricity, run stations, or take payments from providers in exchange for placement."
    body={<>
      <h2 className="font-display font-semibold text-2xl mt-2" style={{ color: 'var(--text)' }}>What we do</h2>
      <p>For fuel, we pull live retail prices from the state government schemes that publish them — FuelCheck NSW, FuelWatch WA, the QLD Fuel Price Reporting scheme, MyFuel NT, FuelCheck TAS and the rest — and rank them by location, fuel type and distance. For EV, we show live public charger locations from Open Charge Map, with connector types, charging speed and indicative network pricing. Everything's built to be fast on a phone.</p>
      <h2 className="font-display font-semibold text-2xl mt-8" style={{ color: 'var(--text)' }}>What we don't do</h2>
      <p>We don't make you create an account. We don't bury the cheapest result behind a paywall. We don't prioritise paid retailers or networks — fuel is ranked by price, full stop, and chargers are shown by distance.</p>
      <h2 className="font-display font-semibold text-2xl mt-8" style={{ color: 'var(--text)' }}>Coverage</h2>
      <p>Fuel prices are live across the states and territories that run a government price scheme. EV charging is available Australia-wide through Open Charge Map. A note on EV pricing: there's no live, per-charger price feed in Australia, so we show indicative network rates — always confirm the exact cost in the operator's app before you charge.</p>
      <h2 className="font-display font-semibold text-2xl mt-8" style={{ color: 'var(--text)' }}>Where we're headed</h2>
      <p>Motavo is growing from a fuel tool into a broader app for the cost of driving. Fuel and EV charging are live today; we're looking at parking and other driving costs next.</p>
      <h2 className="font-display font-semibold text-2xl mt-8" style={{ color: 'var(--text)' }}>How we make money</h2>
      <p>We run display ads on the site and earn a modest commission if you sign up to a fuel card, EV charging plan or motoring membership through one of our partner links. Ads and partners never influence which results appear, or in what order — that's locked to price and distance.</p>
    </>} />
);

const PrivacyView = () => (
  <StaticPage icon={Shield} title="Privacy policy"
    intro="A short, plain-English summary. No dark patterns, no upsells."
    body={<>
      <h2 className="font-display font-semibold text-2xl" style={{ color: 'var(--text)' }}>What we collect</h2>
      <p>When you use the "use my current location" button, your browser sends your approximate latitude and longitude to your own browser only — we use it to find nearby stations. We don't store it on our servers.</p>
      <p>We use Google Analytics and Google AdSense, which set cookies and may collect anonymised usage data per their standard terms. You can opt out of personalised ads via Google's settings.</p>
      <h2 className="font-display font-semibold text-2xl mt-8" style={{ color: 'var(--text)' }}>What we don't collect</h2>
      <p>We don't ask for your name, email, payment details or any other personal information to use the site. We don't sell or rent any data to third parties.</p>
      <h2 className="font-display font-semibold text-2xl mt-8" style={{ color: 'var(--text)' }}>Your rights</h2>
      <p>Under the Australian Privacy Principles, you can request a copy of any personal information we hold about you, ask for it to be corrected, or ask for it to be deleted. Email <a className="font-medium ulink" style={{ color: 'var(--accent)' }} href="mailto:privacy@motavo.au">privacy@motavo.au</a>.</p>
      <p className="text-sm" style={{ color: 'var(--text-4)' }}>Last updated: {new Date().toLocaleDateString('en-AU', { year: 'numeric', month: 'long', day: 'numeric' })}.</p>
    </>} />
);

const TermsView = () => (
  <StaticPage icon={Shield} title="Terms of service"
    intro="The short version: this site is provided as-is, prices come from third-party sources, and you should always confirm the price at the bowser before filling up."
    body={<>
      <h2 className="font-display font-semibold text-2xl" style={{ color: 'var(--text)' }}>Use of the site</h2>
      <p>Motavo is a free comparison service. You're welcome to use it for personal, non-commercial purposes. Don't scrape it, automate it, or republish data from it without written permission.</p>
      <h2 className="font-display font-semibold text-2xl mt-8" style={{ color: 'var(--text)' }}>Accuracy of pricing</h2>
      <p>We display prices supplied by state government feeds. Prices change frequently and may not reflect what's on the bowser when you arrive. We make no warranties about accuracy and accept no liability for decisions made based on our data. Always confirm at the pump.</p>
      <h2 className="font-display font-semibold text-2xl mt-8" style={{ color: 'var(--text)' }}>Affiliate links</h2>
      <p>Some links on this site are affiliate links. If you sign up to a product through one, we may receive a commission. This never affects the ranking of fuel prices.</p>
      <h2 className="font-display font-semibold text-2xl mt-8" style={{ color: 'var(--text)' }}>Governing law</h2>
      <p>These terms are governed by the laws of New South Wales, Australia.</p>
    </>} />
);

const MethodologyView = () => (
  <StaticPage icon={Gauge} title="Our data & methodology"
    intro="Every price on Motavo comes from an official government feed or an open dataset — never from retailers paying for placement. Here's exactly where the data comes from, how often it updates, and how we rank results."
    body={<>
      <h2 className="font-display font-semibold text-2xl mt-2" style={{ color: 'var(--text)' }}>Fuel price sources</h2>
      <p>Each state and territory runs its own mandatory price reporting scheme. We pull directly from each one:</p>
      <ul className="space-y-2.5 text-base" style={{ listStyle: 'none', padding: 0 }}>
        {[
          ['NSW', 'FuelCheck NSW', 'Stations must report price changes as they happen — typically live within minutes.'],
          ['VIC', 'Servo Saver Victoria', 'Published daily by the Victorian government.'],
          ['QLD', 'QLD Fuel Price Reporting', 'Stations must report changes within 30 minutes.'],
          ['WA', 'FuelWatch WA', "Prices are locked for 24 hours — tomorrow's prices publish at 2:30pm today, which is why Perth's cycle is so predictable."],
          ['SA', 'SA Fuel Pricing Scheme', 'Stations must report changes within 30 minutes.'],
          ['NT', 'MyFuel NT', 'Stations must report price changes within 30 minutes.'],
          ['TAS & ACT', 'FuelCheck', 'Covered under the same scheme as NSW.'],
        ].map(([state, scheme, note]) => (
          <li key={state} className="flex gap-3 items-baseline">
            <span className="font-mono text-tiny font-semibold shrink-0 uppercase track-wide" style={{ color: 'var(--accent)', minWidth: 70 }}>{state}</span>
            <span><span className="font-semibold" style={{ color: 'var(--text)' }}>{scheme}</span> — {note}</span>
          </li>
        ))}
      </ul>
      <p>Every result shows how long ago its price was last updated. If a feed is having issues, we say so rather than showing stale numbers as fresh.</p>
      <h2 className="font-display font-semibold text-2xl mt-8" style={{ color: 'var(--text)' }}>EV charging data</h2>
      <p>Charger locations, connector types and speeds come from <a className="font-medium ulink" style={{ color: 'var(--accent)' }} href="https://openchargemap.org" target="_blank" rel="noopener noreferrer">Open Charge Map</a>, an open global registry. Australia has no live per-charger price feed, so charging costs shown are indicative network rates we verify manually and date-stamp — always confirm in the operator's app before charging.</p>
      <h2 className="font-display font-semibold text-2xl mt-8" style={{ color: 'var(--text)' }}>The cycle signal</h2>
      <p>Our "fill up now / hold off" verdicts compare today's cheapest price against the recent low–high range we log daily for your city. We deliberately show nothing until we have at least four days of history and a meaningful price spread — no fake confidence.</p>
      <h2 className="font-display font-semibold text-2xl mt-8" style={{ color: 'var(--text)' }}>How results are ranked</h2>
      <p>Fuel is ranked by price or distance — your choice, nothing else. No station, brand or network can pay to appear higher. Display ads and affiliate links on the site are clearly separate from results and never influence rankings.</p>
      <h2 className="font-display font-semibold text-2xl mt-8" style={{ color: 'var(--text)' }}>Limitations, honestly</h2>
      <p>Prices can change between a station reporting and you arriving — always confirm at the bowser. Community price reports are flagged as unverified until confirmed by others. WA prices are technically "today's locked prices" rather than live. We'd rather you know the edges of the data than trust it blindly.</p>
    </>} />
);

const NotFound = ({ onNav }) => (
  <div className="max-w-xl mx-auto px-4 py-24 text-center">
    <Pill tone="neutral" className="mb-3">404</Pill>
    <h1 className="font-display font-semibold text-5xl mb-4 lead-tight">Empty tank.</h1>
    <p className="mb-8" style={{ color: 'var(--text-3)' }}>That page doesn't exist — or hasn't been built yet.</p>
    <button type="button" onClick={() => onNav({ name: 'home' })}
            className="px-5 py-3 font-semibold inline-flex items-center gap-1.5"
            style={{ background: 'var(--accent)', color: '#ffffff', borderRadius: 0 }}>
      Back to home <ArrowRight size={16} />
    </button>
  </div>
);

/* ===== APP ===== */

export default function App({ initialView, initialLocation } = {}) {
  const [view, setView] = useState(initialView || { name: 'home' });
  const [mode, setMode] = useState('fuel'); // 'fuel' | 'ev' — home view toggle
  const [fuelType, setFuelType] = useState('U91');
  const [location, setLocation] = useState(initialLocation || null);
  const [locating, setLocating] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('fm:color-scheme') === 'dark';
    }
    return false;
  });
  const [locError, setLocError] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // === Driver reports state ===
  const [userReports, setUserReports] = useState({});
  const [confirmedReportIds, setConfirmedReportIds] = useState(() => new Set());
  const [reportingStation, setReportingStation] = useState(null);
  const [toast, setToast] = useState({ visible: false, message: '' });
  const toastTimer = useRef(null);

  // Tracks whether the initial storage hydration is complete. We hold off
  // on auto-persist writes until then so we don't write null over real data.
  const hydratedRef = useRef(false);

  const scrollRef = useRef(null);

  // === Hydrate from persistent storage on mount.
  // We deliberately do NOT trigger a foreground geolocation request here
  // even when consent was previously granted — restricted iframes can
  // silently hang the request, leaving the UI stuck in a "Finding you…"
  // state. Instead we just rehydrate the saved location for instant
  // results, and quietly refresh the coordinates in the background if
  // there's existing state to update. The user can always click the
  // explicit "Use my current location" button to get a fresh fix. ===
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [savedLocation, savedFuel, savedConfirms, savedConsent] = await Promise.all([
        fmStorage.get(STORAGE_KEYS.location),
        fmStorage.get(STORAGE_KEYS.fuelType),
        fmStorage.get(STORAGE_KEYS.confirmedReports),
        fmStorage.get(STORAGE_KEYS.geoConsent),
      ]);
      if (cancelled) return;

      // Restore the last location so a returning visitor lands straight on
      // their prices (GasBuddy-style) instead of a blank homepage. Only on
      // the bare homepage — never override a suburb page's initialLocation.
      if (savedLocation?.lat && savedLocation?.lng && !initialLocation) {
        setLocation(savedLocation);
      }
      if (savedFuel) setFuelType(savedFuel);
      if (Array.isArray(savedConfirms)) setConfirmedReportIds(new Set(savedConfirms));

      hydratedRef.current = true;
    })();
    return () => { cancelled = true; };
  }, []);

  // === Persist on changes (gated by hydration so we don't overwrite saved
  // state on the very first render) ===
  useEffect(() => {
    if (!hydratedRef.current) return;
    if (location) fmStorage.set(STORAGE_KEYS.location, location);
  }, [location]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    fmStorage.set(STORAGE_KEYS.fuelType, fuelType);
  }, [fuelType]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    fmStorage.set(STORAGE_KEYS.confirmedReports, Array.from(confirmedReportIds));
  }, [confirmedReportIds]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'instant' });
  }, [view.name, view.slug]);


  // Global ⌘K / Ctrl+K to open search
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // === Reports: provide a getReports function that always returns up-to-date
  // reports for a given station (seed + user, with stale ones filtered out) ===
  const getReportsForStation = useCallback((station) => {
    if (!station) return [];
    const cutoff = Date.now() - REPORT_FRESHNESS_MIN * 60_000;
    const user = userReports[station.id] || [];
    return user.filter(r => r.timestamp >= cutoff);
  }, [userReports]);

  const reportsByStationFor = useCallback((stations) => {
    const map = {};
    stations.forEach(s => { map[s.id] = getReportsForStation(s); });
    return map;
  }, [getReportsForStation]);

  const showToast = useCallback((message) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ visible: true, message });
    toastTimer.current = setTimeout(() => setToast({ visible: false, message: '' }), 2800);
  }, []);

  const handleSubmitReport = useCallback((report) => {
    setUserReports(prev => ({
      ...prev,
      [report.stationId]: [...(prev[report.stationId] || []), report],
    }));
    showToast('Price update submitted — thanks for helping!');
  }, [showToast]);

  const handleConfirmReport = useCallback((reportId) => {
    setConfirmedReportIds(prev => {
      if (prev.has(reportId)) return prev;
      const next = new Set(prev);
      next.add(reportId);
      return next;
    });
    showToast('Confirmed — thanks!');
  }, [showToast]);

  // If the user landed on /near-me, trigger geolocation once on mount.
  const didAutoLocate = useRef(false);
  useEffect(() => {
    if (initialView?.locate && !didAutoLocate.current) {
      didAutoLocate.current = true;
      // Defer slightly so the UI paints first
      const t = setTimeout(() => handleLocateRef.current?.(), 300);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLocateRef = useRef(null);

  const handleLocate = useCallback(() => {
    setLocError(false);
    setLocating(true);
    if (!navigator.geolocation) {
      setLocating(false); setLocError(true); return;
    }
    // Hard ceiling — if the browser/iframe hangs without firing either
    // callback, recover the UI after 5s rather than leaving the button stuck.
    const recoveryTimer = setTimeout(() => {
      setLocating(false);
      setLocError(true);
    }, 5000);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(recoveryTimer);
        const gLat = pos.coords.latitude, gLng = pos.coords.longitude;
        setLocation({ lat: gLat, lng: gLng, key: 'geo', label: 'your current location', state: stateFromCoords(gLat, gLng) });
        setLocating(false);
        setView({ name: 'home' });
        fmStorage.set(STORAGE_KEYS.geoConsent, 'granted');
      },
      () => {
        clearTimeout(recoveryTimer);
        setLocating(false);
        setLocError(true);
        fmStorage.set(STORAGE_KEYS.geoConsent, 'denied');
      },
      { enableHighAccuracy: false, timeout: 4000, maximumAge: 60000 }
    );
  }, []);

  // Keep the ref pointing at the latest handleLocate (used by /near-me auto-locate)
  handleLocateRef.current = handleLocate;

  const handleSample = useCallback((sampleKey) => {
    if (!sampleKey) { setLocation(null); setLocError(false); return; }
    const samples = {
      'parramatta':   { lat: -33.8150, lng: 151.0011, label: 'Parramatta, NSW', state: 'NSW' },
      'brisbane-cbd': { lat: -27.4698, lng: 153.0251, label: 'Brisbane CBD',    state: 'QLD' },
      'joondalup':    { lat: -31.7448, lng: 115.7661, label: 'Joondalup, WA',   state: 'WA'  },
      'hobart':       { lat: -42.8821, lng: 147.3272, label: 'Hobart, TAS',     state: 'TAS' },
    };
    const s = samples[sampleKey];
    if (s) setLocation({ ...s, key: `sample-${sampleKey}` });
  }, []);

  const handleSearchSelect = useCallback((result) => {
    if (result.type === 'city') {
      setView({ name: 'city', slug: result.slug });
    } else {
      setLocation({
        lat: result.lat,
        lng: result.lng,
        label: result.label,
        state: result.state || 'NSW',
        key: result.id,
      });
      setView({ name: 'home' });
    }
  }, []);

  const reportsCommonProps = {
    reportsByStationFor,
    confirmedSet: confirmedReportIds,
    onConfirmReport: handleConfirmReport,
    onOpenReportModal: setReportingStation,
  };

  const renderView = () => {
    switch (view.name) {
      case 'home':
        return (
          <>
            <ModeToggle mode={mode} onMode={setMode} />
            {mode === 'ev'
              ? <EVPanel />
              : <HomeView location={location} locating={locating} locError={locError}
                          fuelType={fuelType} onFuelType={setFuelType}
                          onLocate={handleLocate} onSample={handleSample}
                          onSearchSelect={handleSearchSelect} onNav={setView}
                          {...reportsCommonProps} />}
          </>
        );
      case 'cities':
        return <CitiesIndexView onNav={setView} />;
      case 'route':
        return <RouteView fuelType={fuelType} onFuelType={setFuelType} />;
      case 'city': {
        const c = CITIES.find(x => x.slug === view.slug) || CITIES[0];
        return <CityView key={view.slug} city={c} fuelType={fuelType} onFuelType={setFuelType}
                         onSearchSelect={handleSearchSelect} onNav={setView}
                         {...reportsCommonProps} />;
      }
      case 'editorial': return <EditorialView slug={view.slug} onNav={setView} />;
      case 'about':   return <AboutView />;
      case 'methodology': return <MethodologyView />;
      case 'privacy': return <PrivacyView />;
      case 'terms':   return <TermsView />;
      default:        return <NotFound onNav={setView} />;
    }
  };

  return (
    <div className="fm-app min-h-screen flex flex-col" ref={scrollRef} data-theme={darkMode ? 'dark' : 'light'}>
      <GlobalStyles />
      <Header
        onNav={setView}
        onHome={() => { setLocation(null); setMode('fuel'); setView({ name: 'home' }); }}
        fuelType={fuelType}
        onFuelType={setFuelType}
        onOpenSearch={() => setSearchOpen(true)}
        darkMode={darkMode}
        onToggleDark={() => {
          const next = !darkMode;
          setDarkMode(next);
          localStorage.setItem('fm:color-scheme', next ? 'dark' : 'light');
        }}
      />
      <main className="flex-1">{renderView()}</main>
      <Footer onNav={setView} />
      <SearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelect={handleSearchSelect}
      />
      <PriceReportModal
        station={reportingStation}
        defaultFuel={fuelType}
        isOpen={!!reportingStation}
        onClose={() => setReportingStation(null)}
        onSubmit={handleSubmitReport}
      />
      <Toast visible={toast.visible} message={toast.message} />
    </div>
  );
}
