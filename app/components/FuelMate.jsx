'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Menu, X, ArrowRight, ArrowUpRight, Navigation,
  ChevronRight, TrendingDown, TrendingUp, AlertCircle,
  Map as MapIcon, List, Mail, Shield, Info,
  Loader2, Zap, Target, Compass, MoveRight,
  Search, MapPin, Building2, Home, Command,
  ThumbsUp, CheckCircle2, Users, Edit3, Check
} from 'lucide-react';

/* =====================================================================
   FuelMate — Australian fuel price comparison
   Sleek dark aesthetic — Linear / Arc / Vercel-influenced
   ===================================================================== */

const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=JetBrains+Mono:wght@400;500;600;700&display=swap');

    :root {
      --bg: #f7f9fc;
      --bg-2: #eef2f8;
      --surface: #ffffff;
      --surface-2: #f4f6fa;
      --surface-3: #e8edf5;
      --border: #e1e7f0;
      --border-strong: #c8d2e1;
      --text: #0f172a;
      --text-2: #334155;
      --text-3: #64748b;
      --text-4: #94a3b8;

      /* FuelMate brand */
      --blue: #1e5fe0;
      --blue-dark: #1648b0;
      --blue-light: #d6e4ff;
      --blue-soft: #ebf2ff;
      --green: #16a085;
      --green-dark: #0f7d68;
      --green-light: #c8efe5;
      --green-soft: #e6f7f3;

      /* Functional aliases */
      --accent: var(--blue);
      --accent-dark: var(--blue-dark);
      --accent-glow: rgba(30, 95, 224, 0.22);
      --success: var(--green);
      --success-glow: rgba(22, 160, 133, 0.20);
      --warn: #ea580c;
      --danger: #dc2626;
    }

    .font-display { font-family: 'Space Grotesk', system-ui, sans-serif; letter-spacing: -0.022em; }
    .font-body { font-family: 'DM Sans', system-ui, sans-serif; letter-spacing: -0.008em; }
    .font-mono { font-family: 'JetBrains Mono', ui-monospace, monospace; font-feature-settings: 'tnum' on, 'ss01' on; letter-spacing: -0.01em; }

    .fm-app, .fm-app * { box-sizing: border-box; }
    .fm-app {
      font-family: 'DM Sans', system-ui, sans-serif;
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

    .spotlight {
      background:
        radial-gradient(ellipse 80% 50% at 50% -10%, rgba(30,95,224,0.08), transparent 70%),
        radial-gradient(ellipse 60% 40% at 80% 100%, rgba(22,160,133,0.06), transparent 70%);
    }

    .surface-card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; }

    @keyframes pulse-glow { 0%,100% { box-shadow: 0 0 0 0 var(--success-glow); } 50% { box-shadow: 0 0 0 6px transparent; } }
    .pulse-glow { animation: pulse-glow 2.2s ease-in-out infinite; }

    @keyframes pulse-pin { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.2); } }
    .pulse-pin { animation: pulse-pin 2.4s ease-in-out infinite; transform-origin: center; }

    @keyframes fadeUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
    .fade-up { animation: fadeUp 420ms cubic-bezier(0.16, 1, 0.3, 1) both; }

    /* Brand gradient — blue → green, mirroring the wordmark */
    .brand-gradient {
      background: linear-gradient(95deg, var(--blue) 0%, var(--blue) 38%, var(--green) 70%, var(--green) 100%);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
    }

    .hover-raise { transition: transform 200ms cubic-bezier(0.16, 1, 0.3, 1), border-color 200ms, background 200ms, box-shadow 200ms; }
    .hover-raise:hover { transform: translateY(-1px); border-color: var(--border-strong); box-shadow: 0 6px 20px -8px rgba(15,23,42,0.10); }

    .glass {
      background: rgba(255,255,255,0.78);
      backdrop-filter: saturate(160%) blur(14px);
      -webkit-backdrop-filter: saturate(160%) blur(14px);
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

    .fm-app ::selection { background: var(--blue); color: #ffffff; }

    .scroller::-webkit-scrollbar { height: 4px; }
    .scroller::-webkit-scrollbar-track { background: transparent; }
    .scroller::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 4px; }

    .text-micro { font-size: 10.5px; line-height: 1.4; }
    .text-tiny  { font-size: 11.5px; line-height: 1.4; }
    .lead-tight { line-height: 0.94; }
    .track-wide { letter-spacing: 0.16em; }
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
  '7-Eleven':         { color: '#00833C', short: '7E', domain: '7eleven.com.au' },
  'Ampol':            { color: '#1d4ed8', short: 'AM', domain: 'ampol.com.au' },
  'BP':               { color: '#16a34a', short: 'BP', domain: 'bp.com' },
  'Caltex Woolworths':{ color: '#dc2626', short: 'CW', domain: 'caltex.com.au' },
  'Coles Express':    { color: '#ef4444', short: 'CE', domain: 'colesexpress.com.au' },
  'Costco':           { color: '#2563eb', short: 'CO', domain: 'costco.com.au' },
  'EG Ampol':         { color: '#0ea5e9', short: 'EA', domain: 'egaustralia.com' },
  'Liberty':          { color: '#e11d48', short: 'LI', domain: 'libertyoil.com.au' },
  'Metro Petroleum':  { color: '#0284c7', short: 'MP', domain: 'metropetroleum.com.au' },
  'Mobil':            { color: '#f43f5e', short: 'MO', domain: 'mobil.com.au' },
  'Puma':             { color: '#fbbf24', short: 'PU', domain: 'pumaenergy.com' },
  'Shell':            { color: '#facc15', short: 'SH', domain: 'shell.com.au' },
  'United':           { color: '#3b82f6', short: 'UN', domain: 'unitedpetroleum.com.au' },
  'Vibe':             { color: '#a855f7', short: 'VI', domain: 'vibepetroleum.com.au' },
  'Independent':      { color: '#52525b', short: 'IN', domain: null },
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
function brandLogoUrl(domain) {
  if (!domain) return null;
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
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

/**
 * Government fuel price data sources by state. All Australian states now
 * mandate real-time price reporting; each source provides a free API for
 * authorised "data publishers" (which FuelMate registers as on launch).
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

// Major Australian suburbs across all states. Not exhaustive (AU has ~15,000
// suburbs total) — focused on the most-searched ~170 across each capital and
// notable regional centres. For coverage beyond this list, we fall back to
// Nominatim (OpenStreetMap) geocoding at runtime.
const SUBURBS = [
  /* ===== NSW · Greater Sydney ===== */
  // CBD + Inner
  { slug: 'sydney-cbd',      name: 'Sydney CBD',      city: 'sydney', state: 'NSW', postcode: '2000', center: { lat: -33.8688, lng: 151.2093 } },
  { slug: 'pyrmont',         name: 'Pyrmont',         city: 'sydney', state: 'NSW', postcode: '2009', center: { lat: -33.8688, lng: 151.1947 } },
  { slug: 'ultimo',          name: 'Ultimo',          city: 'sydney', state: 'NSW', postcode: '2007', center: { lat: -33.8835, lng: 151.1972 } },
  { slug: 'surry-hills',     name: 'Surry Hills',     city: 'sydney', state: 'NSW', postcode: '2010', center: { lat: -33.8839, lng: 151.2103 } },
  { slug: 'darlinghurst',    name: 'Darlinghurst',    city: 'sydney', state: 'NSW', postcode: '2010', center: { lat: -33.8794, lng: 151.2189 } },
  { slug: 'paddington',      name: 'Paddington',      city: 'sydney', state: 'NSW', postcode: '2021', center: { lat: -33.8836, lng: 151.2299 } },
  { slug: 'woollahra',       name: 'Woollahra',       city: 'sydney', state: 'NSW', postcode: '2025', center: { lat: -33.8861, lng: 151.2422 } },
  { slug: 'double-bay',      name: 'Double Bay',      city: 'sydney', state: 'NSW', postcode: '2028', center: { lat: -33.8780, lng: 151.2444 } },
  { slug: 'bondi-junction',  name: 'Bondi Junction',  city: 'sydney', state: 'NSW', postcode: '2022', center: { lat: -33.8920, lng: 151.2484 } },
  { slug: 'bondi',           name: 'Bondi',           city: 'sydney', state: 'NSW', postcode: '2026', center: { lat: -33.8915, lng: 151.2767 } },
  { slug: 'coogee',          name: 'Coogee',          city: 'sydney', state: 'NSW', postcode: '2034', center: { lat: -33.9203, lng: 151.2589 } },
  { slug: 'maroubra',        name: 'Maroubra',        city: 'sydney', state: 'NSW', postcode: '2035', center: { lat: -33.9501, lng: 151.2421 } },
  { slug: 'randwick',        name: 'Randwick',        city: 'sydney', state: 'NSW', postcode: '2031', center: { lat: -33.9173, lng: 151.2412 } },
  { slug: 'kensington',      name: 'Kensington',      city: 'sydney', state: 'NSW', postcode: '2033', center: { lat: -33.9145, lng: 151.2240 } },
  { slug: 'redfern',         name: 'Redfern',         city: 'sydney', state: 'NSW', postcode: '2016', center: { lat: -33.8923, lng: 151.2046 } },
  { slug: 'alexandria',      name: 'Alexandria',      city: 'sydney', state: 'NSW', postcode: '2015', center: { lat: -33.9119, lng: 151.1939 } },
  { slug: 'mascot',          name: 'Mascot',          city: 'sydney', state: 'NSW', postcode: '2020', center: { lat: -33.9304, lng: 151.1936 } },
  // Inner West
  { slug: 'glebe',           name: 'Glebe',           city: 'sydney', state: 'NSW', postcode: '2037', center: { lat: -33.8800, lng: 151.1860 } },
  { slug: 'newtown',         name: 'Newtown',         city: 'sydney', state: 'NSW', postcode: '2042', center: { lat: -33.8983, lng: 151.1789 } },
  { slug: 'marrickville',    name: 'Marrickville',    city: 'sydney', state: 'NSW', postcode: '2204', center: { lat: -33.9106, lng: 151.1539 } },
  { slug: 'leichhardt',      name: 'Leichhardt',      city: 'sydney', state: 'NSW', postcode: '2040', center: { lat: -33.8838, lng: 151.1568 } },
  { slug: 'balmain',         name: 'Balmain',         city: 'sydney', state: 'NSW', postcode: '2041', center: { lat: -33.8580, lng: 151.1790 } },
  { slug: 'rozelle',         name: 'Rozelle',         city: 'sydney', state: 'NSW', postcode: '2039', center: { lat: -33.8617, lng: 151.1731 } },
  { slug: 'annandale',       name: 'Annandale',       city: 'sydney', state: 'NSW', postcode: '2038', center: { lat: -33.8786, lng: 151.1722 } },
  { slug: 'camperdown',      name: 'Camperdown',      city: 'sydney', state: 'NSW', postcode: '2050', center: { lat: -33.8889, lng: 151.1781 } },
  { slug: 'ashfield',        name: 'Ashfield',        city: 'sydney', state: 'NSW', postcode: '2131', center: { lat: -33.8895, lng: 151.1240 } },
  { slug: 'burwood',         name: 'Burwood',         city: 'sydney', state: 'NSW', postcode: '2134', center: { lat: -33.8775, lng: 151.1042 } },
  { slug: 'strathfield',     name: 'Strathfield',     city: 'sydney', state: 'NSW', postcode: '2135', center: { lat: -33.8786, lng: 151.0809 } },
  { slug: 'concord',         name: 'Concord',         city: 'sydney', state: 'NSW', postcode: '2137', center: { lat: -33.8589, lng: 151.0989 } },
  // North / Lower North Shore / Northern Beaches
  { slug: 'north-sydney',    name: 'North Sydney',    city: 'sydney', state: 'NSW', postcode: '2060', center: { lat: -33.8389, lng: 151.2070 } },
  { slug: 'crows-nest',      name: 'Crows Nest',      city: 'sydney', state: 'NSW', postcode: '2065', center: { lat: -33.8264, lng: 151.2014 } },
  { slug: 'st-leonards',     name: 'St Leonards',     city: 'sydney', state: 'NSW', postcode: '2065', center: { lat: -33.8233, lng: 151.1948 } },
  { slug: 'mosman',          name: 'Mosman',          city: 'sydney', state: 'NSW', postcode: '2088', center: { lat: -33.8281, lng: 151.2417 } },
  { slug: 'neutral-bay',     name: 'Neutral Bay',     city: 'sydney', state: 'NSW', postcode: '2089', center: { lat: -33.8307, lng: 151.2186 } },
  { slug: 'manly',           name: 'Manly',           city: 'sydney', state: 'NSW', postcode: '2095', center: { lat: -33.7969, lng: 151.2855 } },
  { slug: 'dee-why',         name: 'Dee Why',         city: 'sydney', state: 'NSW', postcode: '2099', center: { lat: -33.7547, lng: 151.2856 } },
  { slug: 'brookvale',       name: 'Brookvale',       city: 'sydney', state: 'NSW', postcode: '2100', center: { lat: -33.7637, lng: 151.2683 } },
  { slug: 'chatswood',       name: 'Chatswood',       city: 'sydney', state: 'NSW', postcode: '2067', center: { lat: -33.7975, lng: 151.1830 } },
  { slug: 'lane-cove',       name: 'Lane Cove',       city: 'sydney', state: 'NSW', postcode: '2066', center: { lat: -33.8141, lng: 151.1697 } },
  { slug: 'ryde',            name: 'Ryde',            city: 'sydney', state: 'NSW', postcode: '2112', center: { lat: -33.8161, lng: 151.1056 } },
  { slug: 'epping',          name: 'Epping',          city: 'sydney', state: 'NSW', postcode: '2121', center: { lat: -33.7728, lng: 151.0820 } },
  // Hills + North West
  { slug: 'castle-hill',     name: 'Castle Hill',     city: 'sydney', state: 'NSW', postcode: '2154', center: { lat: -33.7295, lng: 151.0001 } },
  { slug: 'baulkham-hills',  name: 'Baulkham Hills',  city: 'sydney', state: 'NSW', postcode: '2153', center: { lat: -33.7615, lng: 150.9928 } },
  { slug: 'hornsby',         name: 'Hornsby',         city: 'sydney', state: 'NSW', postcode: '2077', center: { lat: -33.7050, lng: 151.0992 } },
  // West / South West
  { slug: 'parramatta',      name: 'Parramatta',      city: 'sydney', state: 'NSW', postcode: '2150', center: { lat: -33.8150, lng: 151.0011 } },
  { slug: 'blacktown',       name: 'Blacktown',       city: 'sydney', state: 'NSW', postcode: '2148', center: { lat: -33.7689, lng: 150.9067 } },
  { slug: 'penrith',         name: 'Penrith',         city: 'sydney', state: 'NSW', postcode: '2750', center: { lat: -33.7510, lng: 150.6943 } },
  { slug: 'liverpool',       name: 'Liverpool',       city: 'sydney', state: 'NSW', postcode: '2170', center: { lat: -33.9200, lng: 150.9239 } },
  { slug: 'bankstown',       name: 'Bankstown',       city: 'sydney', state: 'NSW', postcode: '2200', center: { lat: -33.9166, lng: 151.0344 } },
  { slug: 'campbelltown',    name: 'Campbelltown',    city: 'sydney', state: 'NSW', postcode: '2560', center: { lat: -34.0667, lng: 150.8169 } },
  { slug: 'auburn',          name: 'Auburn',          city: 'sydney', state: 'NSW', postcode: '2144', center: { lat: -33.8497, lng: 151.0327 } },
  // Southern Sydney
  { slug: 'cronulla',        name: 'Cronulla',        city: 'sydney', state: 'NSW', postcode: '2230', center: { lat: -34.0556, lng: 151.1530 } },
  { slug: 'miranda',         name: 'Miranda',         city: 'sydney', state: 'NSW', postcode: '2228', center: { lat: -34.0337, lng: 151.1006 } },
  { slug: 'hurstville',      name: 'Hurstville',      city: 'sydney', state: 'NSW', postcode: '2220', center: { lat: -33.9670, lng: 151.1019 } },
  { slug: 'sutherland',      name: 'Sutherland',      city: 'sydney', state: 'NSW', postcode: '2232', center: { lat: -34.0317, lng: 151.0573 } },

  /* ===== NSW · Regional ===== */
  { slug: 'newcastle',       name: 'Newcastle',       city: null,     state: 'NSW', postcode: '2300', center: { lat: -32.9283, lng: 151.7817 } },
  { slug: 'wollongong',      name: 'Wollongong',      city: null,     state: 'NSW', postcode: '2500', center: { lat: -34.4278, lng: 150.8931 } },
  { slug: 'maitland',        name: 'Maitland',        city: null,     state: 'NSW', postcode: '2320', center: { lat: -32.7339, lng: 151.5586 } },
  { slug: 'central-coast',   name: 'Central Coast',   city: null,     state: 'NSW', postcode: '2250', center: { lat: -33.4279, lng: 151.3409 } },
  { slug: 'wagga-wagga',     name: 'Wagga Wagga',     city: null,     state: 'NSW', postcode: '2650', center: { lat: -35.1170, lng: 147.3560 } },
  { slug: 'tamworth',        name: 'Tamworth',        city: null,     state: 'NSW', postcode: '2340', center: { lat: -31.0900, lng: 150.9300 } },
  { slug: 'orange',          name: 'Orange',          city: null,     state: 'NSW', postcode: '2800', center: { lat: -33.2840, lng: 149.1014 } },
  { slug: 'dubbo',           name: 'Dubbo',           city: null,     state: 'NSW', postcode: '2830', center: { lat: -32.2569, lng: 148.6011 } },

  /* ===== QLD · Greater Brisbane ===== */
  { slug: 'south-brisbane',  name: 'South Brisbane',  city: 'brisbane', state: 'QLD', postcode: '4101', center: { lat: -27.4810, lng: 153.0211 } },
  { slug: 'fortitude-valley',name: 'Fortitude Valley',city: 'brisbane', state: 'QLD', postcode: '4006', center: { lat: -27.4571, lng: 153.0345 } },
  { slug: 'new-farm',        name: 'New Farm',        city: 'brisbane', state: 'QLD', postcode: '4005', center: { lat: -27.4669, lng: 153.0492 } },
  { slug: 'west-end',        name: 'West End',        city: 'brisbane', state: 'QLD', postcode: '4101', center: { lat: -27.4814, lng: 153.0067 } },
  { slug: 'toowong',         name: 'Toowong',         city: 'brisbane', state: 'QLD', postcode: '4066', center: { lat: -27.4842, lng: 152.9883 } },
  { slug: 'st-lucia',        name: 'St Lucia',        city: 'brisbane', state: 'QLD', postcode: '4067', center: { lat: -27.4983, lng: 153.0150 } },
  { slug: 'indooroopilly',   name: 'Indooroopilly',   city: 'brisbane', state: 'QLD', postcode: '4068', center: { lat: -27.4988, lng: 152.9737 } },
  { slug: 'chermside',       name: 'Chermside',       city: 'brisbane', state: 'QLD', postcode: '4032', center: { lat: -27.3848, lng: 153.0317 } },
  { slug: 'mount-gravatt',   name: 'Mount Gravatt',   city: 'brisbane', state: 'QLD', postcode: '4122', center: { lat: -27.5413, lng: 153.0700 } },
  { slug: 'carindale',       name: 'Carindale',       city: 'brisbane', state: 'QLD', postcode: '4152', center: { lat: -27.5108, lng: 153.1058 } },
  { slug: 'wynnum',          name: 'Wynnum',          city: 'brisbane', state: 'QLD', postcode: '4178', center: { lat: -27.4400, lng: 153.1717 } },
  { slug: 'aspley',          name: 'Aspley',          city: 'brisbane', state: 'QLD', postcode: '4034', center: { lat: -27.3700, lng: 153.0167 } },
  { slug: 'logan-central',   name: 'Logan Central',   city: 'brisbane', state: 'QLD', postcode: '4114', center: { lat: -27.6383, lng: 153.1100 } },
  { slug: 'caboolture',      name: 'Caboolture',      city: 'brisbane', state: 'QLD', postcode: '4510', center: { lat: -27.0850, lng: 152.9522 } },
  { slug: 'ipswich',         name: 'Ipswich',         city: 'brisbane', state: 'QLD', postcode: '4305', center: { lat: -27.6171, lng: 152.7619 } },

  /* ===== QLD · Coast + Regional ===== */
  { slug: 'gold-coast',      name: 'Gold Coast',      city: null,     state: 'QLD', postcode: '4217', center: { lat: -28.0167, lng: 153.4000 } },
  { slug: 'surfers-paradise',name: 'Surfers Paradise',city: null,     state: 'QLD', postcode: '4217', center: { lat: -28.0028, lng: 153.4308 } },
  { slug: 'broadbeach',      name: 'Broadbeach',      city: null,     state: 'QLD', postcode: '4218', center: { lat: -28.0294, lng: 153.4350 } },
  { slug: 'burleigh-heads',  name: 'Burleigh Heads',  city: null,     state: 'QLD', postcode: '4220', center: { lat: -28.0917, lng: 153.4498 } },
  { slug: 'southport',       name: 'Southport',       city: null,     state: 'QLD', postcode: '4215', center: { lat: -27.9650, lng: 153.4047 } },
  { slug: 'coolangatta',     name: 'Coolangatta',     city: null,     state: 'QLD', postcode: '4225', center: { lat: -28.1697, lng: 153.5350 } },
  { slug: 'maroochydore',    name: 'Maroochydore',    city: null,     state: 'QLD', postcode: '4558', center: { lat: -26.6594, lng: 153.0931 } },
  { slug: 'noosa-heads',     name: 'Noosa Heads',     city: null,     state: 'QLD', postcode: '4567', center: { lat: -26.3961, lng: 153.0939 } },
  { slug: 'cairns',          name: 'Cairns',          city: null,     state: 'QLD', postcode: '4870', center: { lat: -16.9203, lng: 145.7710 } },
  { slug: 'townsville',      name: 'Townsville',      city: null,     state: 'QLD', postcode: '4810', center: { lat: -19.2576, lng: 146.8178 } },
  { slug: 'toowoomba',       name: 'Toowoomba',       city: null,     state: 'QLD', postcode: '4350', center: { lat: -27.5598, lng: 151.9507 } },
  { slug: 'mackay',          name: 'Mackay',          city: null,     state: 'QLD', postcode: '4740', center: { lat: -21.1411, lng: 149.1862 } },
  { slug: 'bundaberg',       name: 'Bundaberg',       city: null,     state: 'QLD', postcode: '4670', center: { lat: -24.8661, lng: 152.3489 } },

  /* ===== WA · Greater Perth ===== */
  { slug: 'east-perth',      name: 'East Perth',      city: 'perth',  state: 'WA',  postcode: '6004', center: { lat: -31.9544, lng: 115.8742 } },
  { slug: 'west-perth',      name: 'West Perth',      city: 'perth',  state: 'WA',  postcode: '6005', center: { lat: -31.9469, lng: 115.8408 } },
  { slug: 'northbridge',     name: 'Northbridge',     city: 'perth',  state: 'WA',  postcode: '6003', center: { lat: -31.9469, lng: 115.8581 } },
  { slug: 'leederville',     name: 'Leederville',     city: 'perth',  state: 'WA',  postcode: '6007', center: { lat: -31.9311, lng: 115.8408 } },
  { slug: 'mount-lawley',    name: 'Mount Lawley',    city: 'perth',  state: 'WA',  postcode: '6050', center: { lat: -31.9355, lng: 115.8669 } },
  { slug: 'joondalup',       name: 'Joondalup',       city: 'perth',  state: 'WA',  postcode: '6027', center: { lat: -31.7448, lng: 115.7661 } },
  { slug: 'fremantle',       name: 'Fremantle',       city: 'perth',  state: 'WA',  postcode: '6160', center: { lat: -32.0569, lng: 115.7470 } },
  { slug: 'subiaco',         name: 'Subiaco',         city: 'perth',  state: 'WA',  postcode: '6008', center: { lat: -31.9479, lng: 115.8273 } },
  { slug: 'cottesloe',       name: 'Cottesloe',       city: 'perth',  state: 'WA',  postcode: '6011', center: { lat: -32.0019, lng: 115.7593 } },
  { slug: 'scarborough',     name: 'Scarborough',     city: 'perth',  state: 'WA',  postcode: '6019', center: { lat: -31.8939, lng: 115.7569 } },
  { slug: 'claremont',       name: 'Claremont',       city: 'perth',  state: 'WA',  postcode: '6010', center: { lat: -31.9831, lng: 115.7833 } },
  { slug: 'victoria-park',   name: 'Victoria Park',   city: 'perth',  state: 'WA',  postcode: '6100', center: { lat: -31.9744, lng: 115.9006 } },
  { slug: 'midland',         name: 'Midland',         city: 'perth',  state: 'WA',  postcode: '6056', center: { lat: -31.8881, lng: 116.0103 } },
  { slug: 'armadale-wa',     name: 'Armadale',        city: 'perth',  state: 'WA',  postcode: '6112', center: { lat: -32.1500, lng: 116.0142 } },
  { slug: 'rockingham',      name: 'Rockingham',      city: 'perth',  state: 'WA',  postcode: '6168', center: { lat: -32.2767, lng: 115.7297 } },

  /* ===== WA · Regional ===== */
  { slug: 'mandurah',        name: 'Mandurah',        city: null,     state: 'WA',  postcode: '6210', center: { lat: -32.5269, lng: 115.7217 } },
  { slug: 'bunbury',         name: 'Bunbury',         city: null,     state: 'WA',  postcode: '6230', center: { lat: -33.3267, lng: 115.6411 } },
  { slug: 'geraldton',       name: 'Geraldton',       city: null,     state: 'WA',  postcode: '6530', center: { lat: -28.7741, lng: 114.6093 } },
  { slug: 'kalgoorlie',      name: 'Kalgoorlie',      city: null,     state: 'WA',  postcode: '6430', center: { lat: -30.7489, lng: 121.4655 } },

  /* ===== VIC · Greater Melbourne ===== */
  { slug: 'melbourne-cbd',   name: 'Melbourne CBD',   city: 'melbourne', state: 'VIC', postcode: '3000', center: { lat: -37.8136, lng: 144.9631 } },
  { slug: 'south-melbourne', name: 'South Melbourne', city: 'melbourne', state: 'VIC', postcode: '3205', center: { lat: -37.8333, lng: 144.9583 } },
  { slug: 'southbank',       name: 'Southbank',       city: 'melbourne', state: 'VIC', postcode: '3006', center: { lat: -37.8232, lng: 144.9645 } },
  { slug: 'docklands',       name: 'Docklands',       city: 'melbourne', state: 'VIC', postcode: '3008', center: { lat: -37.8167, lng: 144.9457 } },
  { slug: 'north-melbourne', name: 'North Melbourne', city: 'melbourne', state: 'VIC', postcode: '3051', center: { lat: -37.8000, lng: 144.9500 } },
  { slug: 'carlton',         name: 'Carlton',         city: 'melbourne', state: 'VIC', postcode: '3053', center: { lat: -37.7986, lng: 144.9667 } },
  { slug: 'fitzroy',         name: 'Fitzroy',         city: 'melbourne', state: 'VIC', postcode: '3065', center: { lat: -37.7958, lng: 144.9789 } },
  { slug: 'collingwood',     name: 'Collingwood',     city: 'melbourne', state: 'VIC', postcode: '3066', center: { lat: -37.8029, lng: 144.9836 } },
  { slug: 'richmond-vic',    name: 'Richmond',        city: 'melbourne', state: 'VIC', postcode: '3121', center: { lat: -37.8233, lng: 144.9981 } },
  { slug: 'st-kilda',        name: 'St Kilda',        city: 'melbourne', state: 'VIC', postcode: '3182', center: { lat: -37.8676, lng: 144.9810 } },
  { slug: 'south-yarra',     name: 'South Yarra',     city: 'melbourne', state: 'VIC', postcode: '3141', center: { lat: -37.8389, lng: 144.9925 } },
  { slug: 'prahran',         name: 'Prahran',         city: 'melbourne', state: 'VIC', postcode: '3181', center: { lat: -37.8514, lng: 144.9919 } },
  { slug: 'toorak',          name: 'Toorak',          city: 'melbourne', state: 'VIC', postcode: '3142', center: { lat: -37.8417, lng: 145.0083 } },
  { slug: 'hawthorn',        name: 'Hawthorn',        city: 'melbourne', state: 'VIC', postcode: '3122', center: { lat: -37.8222, lng: 145.0353 } },
  { slug: 'camberwell',      name: 'Camberwell',      city: 'melbourne', state: 'VIC', postcode: '3124', center: { lat: -37.8333, lng: 145.0606 } },
  { slug: 'box-hill',        name: 'Box Hill',        city: 'melbourne', state: 'VIC', postcode: '3128', center: { lat: -37.8194, lng: 145.1264 } },
  { slug: 'footscray',       name: 'Footscray',       city: 'melbourne', state: 'VIC', postcode: '3011', center: { lat: -37.8000, lng: 144.8983 } },
  { slug: 'williamstown',    name: 'Williamstown',    city: 'melbourne', state: 'VIC', postcode: '3016', center: { lat: -37.8717, lng: 144.8950 } },
  { slug: 'brunswick',       name: 'Brunswick',       city: 'melbourne', state: 'VIC', postcode: '3056', center: { lat: -37.7667, lng: 144.9667 } },
  { slug: 'coburg',          name: 'Coburg',          city: 'melbourne', state: 'VIC', postcode: '3058', center: { lat: -37.7464, lng: 144.9647 } },
  { slug: 'northcote',       name: 'Northcote',       city: 'melbourne', state: 'VIC', postcode: '3070', center: { lat: -37.7686, lng: 144.9978 } },
  { slug: 'preston',         name: 'Preston',         city: 'melbourne', state: 'VIC', postcode: '3072', center: { lat: -37.7414, lng: 144.9939 } },
  { slug: 'essendon',        name: 'Essendon',        city: 'melbourne', state: 'VIC', postcode: '3040', center: { lat: -37.7517, lng: 144.9192 } },
  { slug: 'frankston',       name: 'Frankston',       city: 'melbourne', state: 'VIC', postcode: '3199', center: { lat: -38.1450, lng: 145.1244 } },
  { slug: 'dandenong',       name: 'Dandenong',       city: 'melbourne', state: 'VIC', postcode: '3175', center: { lat: -37.9889, lng: 145.2156 } },
  { slug: 'geelong',         name: 'Geelong',         city: 'melbourne', state: 'VIC', postcode: '3220', center: { lat: -38.1499, lng: 144.3617 } },
  { slug: 'ballarat',        name: 'Ballarat',        city: 'melbourne', state: 'VIC', postcode: '3350', center: { lat: -37.5622, lng: 143.8503 } },
  { slug: 'bendigo',         name: 'Bendigo',         city: 'melbourne', state: 'VIC', postcode: '3550', center: { lat: -36.7570, lng: 144.2784 } },

  /* ===== SA · Greater Adelaide ===== */
  { slug: 'adelaide-cbd',    name: 'Adelaide CBD',    city: 'adelaide', state: 'SA', postcode: '5000', center: { lat: -34.9285, lng: 138.6007 } },
  { slug: 'north-adelaide',  name: 'North Adelaide',  city: 'adelaide', state: 'SA', postcode: '5006', center: { lat: -34.9067, lng: 138.5944 } },
  { slug: 'glenelg',         name: 'Glenelg',         city: 'adelaide', state: 'SA', postcode: '5045', center: { lat: -34.9817, lng: 138.5111 } },
  { slug: 'norwood-sa',      name: 'Norwood',         city: 'adelaide', state: 'SA', postcode: '5067', center: { lat: -34.9217, lng: 138.6322 } },
  { slug: 'unley',           name: 'Unley',           city: 'adelaide', state: 'SA', postcode: '5061', center: { lat: -34.9528, lng: 138.5972 } },
  { slug: 'burnside',        name: 'Burnside',        city: 'adelaide', state: 'SA', postcode: '5066', center: { lat: -34.9300, lng: 138.6500 } },
  { slug: 'prospect',        name: 'Prospect',        city: 'adelaide', state: 'SA', postcode: '5082', center: { lat: -34.8867, lng: 138.5944 } },
  { slug: 'salisbury',       name: 'Salisbury',       city: 'adelaide', state: 'SA', postcode: '5108', center: { lat: -34.7589, lng: 138.6411 } },
  { slug: 'modbury',         name: 'Modbury',         city: 'adelaide', state: 'SA', postcode: '5092', center: { lat: -34.8400, lng: 138.6889 } },
  { slug: 'port-adelaide',   name: 'Port Adelaide',   city: 'adelaide', state: 'SA', postcode: '5015', center: { lat: -34.8472, lng: 138.5083 } },
  { slug: 'marion',          name: 'Marion',          city: 'adelaide', state: 'SA', postcode: '5043', center: { lat: -35.0028, lng: 138.5589 } },
  { slug: 'henley-beach',    name: 'Henley Beach',    city: 'adelaide', state: 'SA', postcode: '5022', center: { lat: -34.9189, lng: 138.4944 } },
  { slug: 'mount-barker',    name: 'Mount Barker',    city: 'adelaide', state: 'SA', postcode: '5251', center: { lat: -35.0667, lng: 138.8583 } },
  { slug: 'mount-gambier',   name: 'Mount Gambier',   city: null,       state: 'SA', postcode: '5290', center: { lat: -37.8243, lng: 140.7822 } },

  /* ===== TAS · Greater Hobart + Regional ===== */
  { slug: 'glenorchy',       name: 'Glenorchy',       city: 'hobart', state: 'TAS', postcode: '7010', center: { lat: -42.8333, lng: 147.2750 } },
  { slug: 'sandy-bay',       name: 'Sandy Bay',       city: 'hobart', state: 'TAS', postcode: '7005', center: { lat: -42.8956, lng: 147.3286 } },
  { slug: 'battery-point',   name: 'Battery Point',   city: 'hobart', state: 'TAS', postcode: '7004', center: { lat: -42.8867, lng: 147.3361 } },
  { slug: 'north-hobart',    name: 'North Hobart',    city: 'hobart', state: 'TAS', postcode: '7000', center: { lat: -42.8794, lng: 147.3164 } },
  { slug: 'bellerive',       name: 'Bellerive',       city: 'hobart', state: 'TAS', postcode: '7018', center: { lat: -42.8769, lng: 147.3725 } },
  { slug: 'kingston-tas',    name: 'Kingston',        city: 'hobart', state: 'TAS', postcode: '7050', center: { lat: -42.9744, lng: 147.3061 } },
  { slug: 'new-town',        name: 'New Town',        city: 'hobart', state: 'TAS', postcode: '7008', center: { lat: -42.8589, lng: 147.3000 } },
  { slug: 'launceston',      name: 'Launceston',      city: null,     state: 'TAS', postcode: '7250', center: { lat: -41.4391, lng: 147.1358 } },
  { slug: 'devonport',       name: 'Devonport',       city: null,     state: 'TAS', postcode: '7310', center: { lat: -41.1810, lng: 146.3500 } },
  { slug: 'burnie',          name: 'Burnie',          city: null,     state: 'TAS', postcode: '7320', center: { lat: -41.0500, lng: 145.9000 } },

  /* ===== NT · Greater Darwin + Regional ===== */
  { slug: 'palmerston',      name: 'Palmerston',      city: 'darwin', state: 'NT',  postcode: '0830', center: { lat: -12.4862, lng: 130.9831 } },
  { slug: 'casuarina',       name: 'Casuarina',       city: 'darwin', state: 'NT',  postcode: '0810', center: { lat: -12.3819, lng: 130.8825 } },
  { slug: 'nightcliff',      name: 'Nightcliff',      city: 'darwin', state: 'NT',  postcode: '0810', center: { lat: -12.3911, lng: 130.8542 } },
  { slug: 'stuart-park',     name: 'Stuart Park',     city: 'darwin', state: 'NT',  postcode: '0820', center: { lat: -12.4500, lng: 130.8358 } },
  { slug: 'fannie-bay',      name: 'Fannie Bay',      city: 'darwin', state: 'NT',  postcode: '0820', center: { lat: -12.4283, lng: 130.8350 } },
  { slug: 'alice-springs',   name: 'Alice Springs',   city: null,     state: 'NT',  postcode: '0870', center: { lat: -23.6980, lng: 133.8807 } },
  { slug: 'katherine',       name: 'Katherine',       city: null,     state: 'NT',  postcode: '0850', center: { lat: -14.4654, lng: 132.2635 } },

  /* ===== ACT · Canberra suburbs ===== */
  { slug: 'civic',           name: 'Civic',           city: 'canberra', state: 'ACT', postcode: '2601', center: { lat: -35.2820, lng: 149.1287 } },
  { slug: 'belconnen',       name: 'Belconnen',       city: 'canberra', state: 'ACT', postcode: '2617', center: { lat: -35.2380, lng: 149.0670 } },
  { slug: 'tuggeranong',     name: 'Tuggeranong',     city: 'canberra', state: 'ACT', postcode: '2900', center: { lat: -35.4180, lng: 149.0840 } },
  { slug: 'gungahlin',       name: 'Gungahlin',       city: 'canberra', state: 'ACT', postcode: '2912', center: { lat: -35.1880, lng: 149.1340 } },
  { slug: 'woden',           name: 'Woden',           city: 'canberra', state: 'ACT', postcode: '2606', center: { lat: -35.3450, lng: 149.0820 } },
  { slug: 'dickson',         name: 'Dickson',         city: 'canberra', state: 'ACT', postcode: '2602', center: { lat: -35.2510, lng: 149.1390 } },
  { slug: 'manuka',          name: 'Manuka',          city: 'canberra', state: 'ACT', postcode: '2603', center: { lat: -35.3170, lng: 149.1330 } },
  { slug: 'kingston-act',    name: 'Kingston',        city: 'canberra', state: 'ACT', postcode: '2604', center: { lat: -35.3160, lng: 149.1410 } },
  { slug: 'braddon',         name: 'Braddon',         city: 'canberra', state: 'ACT', postcode: '2612', center: { lat: -35.2740, lng: 149.1320 } },
];

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
   /fuelmate-backend/. See its README for setup. Until you wire up Vercel
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

async function fetchStationsForLocation({ lat, lng, state, fuelType, radius = 5, limit = 30, locationKey, count = 18 }) {
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
    const timeoutId = setTimeout(() => ctrl.abort(), 3000);
    const res = await fetch(`/api/fuel/${path}?${params}`, { signal: ctrl.signal });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error(`API ${res.status}`);
    const data = await res.json();

    if (!data?.stations?.length) {
      // No live data yet (e.g. stub source) → fall back to mock
      return generateStations(lat, lng, locationKey, state, count);
    }
    // Backend already filters by radius/limit and sorts by distance.
    return data.stations;
  } catch {
    // Network unreachable, artifact iframe, or backend not deployed yet.
    return generateStations(lat, lng, locationKey, state, count);
  }
}

function formatPriceCents(c) {
  if (c == null) return '—';
  const whole = Math.floor(c);
  const dec = String(Math.round((c - whole) * 10));
  return { whole: String(whole), dec };
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
  if (updatedMinutesAgo < 30)  return { tone: 'fresh', color: '#16a085', label: 'Fresh' };
  if (updatedMinutesAgo < 240) return { tone: 'stale', color: '#ea580c', label: 'Stale' };
  return { tone: 'old', color: '#dc2626', label: 'Old' };
}

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
  async get(key) {
    try {
      if (typeof window === 'undefined' || !window.storage) return null;
      // Race the storage call against a 1.5s timeout — if the underlying
      // API hangs (which we've seen happen in restricted iframes), we'd
      // rather give up than block the whole app from hydrating.
      const result = await Promise.race([
        window.storage.get(key),
        new Promise((_, rej) => setTimeout(() => rej(new Error('storage-timeout')), 1500)),
      ]);
      if (!result) return null;
      return JSON.parse(result.value);
    } catch { return null; }
  },
  async set(key, value) {
    try {
      if (typeof window === 'undefined' || !window.storage) return;
      await window.storage.set(key, JSON.stringify(value));
    } catch { /* swallow — storage is best-effort */ }
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

// Generate deterministic "seed" reports for a station so the demo feels alive
function getSeedReports(station) {
  const rng = mulberry32(hashStr(station.id + ':reports'));
  if (rng() > 0.42) return [];

  const numReports = rng() < 0.6 ? 1 : (rng() < 0.9 ? 2 : 3);
  const fuelChoices = ['U91', 'U91', 'P95', 'DSL', 'E10']; // weight U91
  const out = [];

  for (let i = 0; i < numReports; i++) {
    const ft = fuelChoices[Math.floor(rng() * fuelChoices.length)];
    const officialPrice = station.prices[ft];
    if (officialPrice == null) continue;

    const minutesAgo = Math.floor(rng() * REPORT_FRESHNESS_MIN);
    const offset = (rng() - 0.55) * 5;                       // skewed slightly cheaper
    const price = +(officialPrice + offset).toFixed(1);
    const confirms = rng() < 0.35 ? Math.floor(rng() * 4) : 0;

    out.push({
      id: `seed-${station.id}-${i}`,
      stationId: station.id,
      fuelType: ft,
      price,
      timestamp: Date.now() - minutesAgo * 60_000,
      reporter: REPORTER_NAMES[Math.floor(rng() * REPORTER_NAMES.length)],
      seedConfirms: confirms,
      note: null,
      isSeed: true,
    });
  }
  return out;
}

function isReportTrusted(report, userConfirmedSet) {
  const totalConfirms = (report.seedConfirms || 0) + (userConfirmedSet.has(report.id) ? 1 : 0);
  return totalConfirms >= REPORT_TRUSTED_MIN_CONFIRMS;
}

function reportConfirmCount(report, userConfirmedSet) {
  return (report.seedConfirms || 0) + (userConfirmedSet.has(report.id) ? 1 : 0);
}

/* =====================================================================
   FUELMATE LOGO — inline SVG, scales to any size
   The "mark" is two overlapping fuel-pump silhouettes inside a heart.
   Left pump = blue (more expensive), right pump = green (cheaper)
   with a "<" comparison glyph nestled between them.
   ===================================================================== */

const FuelMateMark = ({ size = 32 }) => (
  <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
    <defs>
      {/* Soft drop shadow used on the pumps */}
      <filter id="fmm-shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="0.6" />
      </filter>
    </defs>

    {/* Heart-shaped halos behind the pumps */}
    <g opacity="0.32">
      <circle cx="36" cy="38" r="26" fill="#1e5fe0" />
      <circle cx="64" cy="38" r="26" fill="#16a085" />
      <path d="M 50 88 L 22 56 Q 14 44, 26 36 Q 38 30, 50 44 Q 62 30, 74 36 Q 86 44, 78 56 Z"
            fill="url(#fmm-heart)" opacity="0.0" />
    </g>

    {/* LEFT pump (blue) */}
    <g>
      <rect x="22" y="30" width="22" height="38" rx="3" fill="#1e5fe0" />
      {/* nozzle handle */}
      <path d="M 44 34 L 49 34 L 49 50 Q 49 54, 45 54 L 44 54 Z" fill="#1648b0" />
      {/* readout */}
      <rect x="25" y="34" width="16" height="9" rx="1.5" fill="#ffffff" />
      <text x="33" y="41" fontSize="6.2" fontFamily="JetBrains Mono, ui-monospace, monospace"
            fontWeight="700" fill="#1e5fe0" textAnchor="middle">1.59</text>
      {/* drop */}
      <path d="M 33 56 Q 30 62, 33 64 Q 36 62, 33 56 Z" fill="#ffffff" />
    </g>

    {/* RIGHT pump (green) */}
    <g>
      <rect x="56" y="30" width="22" height="38" rx="3" fill="#16a085" />
      <path d="M 78 34 L 83 34 L 83 50 Q 83 54, 79 54 L 78 54 Z" fill="#0f7d68" />
      <rect x="59" y="34" width="16" height="9" rx="1.5" fill="#ffffff" />
      <text x="67" y="41" fontSize="6.2" fontFamily="JetBrains Mono, ui-monospace, monospace"
            fontWeight="700" fill="#16a085" textAnchor="middle">1.29</text>
      <path d="M 67 56 Q 64 62, 67 64 Q 70 62, 67 56 Z" fill="#ffffff" />
    </g>

    {/* Comparison badge in the middle */}
    <circle cx="50" cy="48" r="6" fill="#ffffff" stroke="#e1e7f0" strokeWidth="0.6" />
    <path d="M 52.5 44.5 L 48.5 48 L 52.5 51.5" stroke="#16a085" strokeWidth="1.6"
          fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const FuelMateWordmark = ({ size = 28 }) => (
  <span
    className="font-display font-bold tracking-tight"
    style={{ fontSize: size, lineHeight: 1, letterSpacing: '-0.04em' }}
  >
    <span style={{ color: '#1e5fe0' }}>Fuel</span>
    <span style={{ color: '#16a085' }}>Mate</span>
  </span>
);

const FuelMateLogo = ({ markSize = 32, wordSize = 22 }) => (
  <span className="inline-flex items-center gap-2">
    <FuelMateMark size={markSize} />
    <FuelMateWordmark size={wordSize} />
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
  const b = BRANDS[brand] || BRANDS['Independent'];
  const logoUrl = brandLogoUrl(b.domain);
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  // Reset state when the brand changes (e.g. station card re-used in a list)
  useEffect(() => {
    setLoaded(false);
    setErrored(false);
  }, [brand]);

  const showLogo = logoUrl && !errored;

  return (
    <div
      className="relative shrink-0 overflow-hidden"
      style={{
        width: size,
        height: size,
        borderRadius: 8,
        background: showLogo && loaded ? '#ffffff' : b.color,
        border: showLogo && loaded ? '1px solid var(--border)' : 'none',
        boxShadow: showLogo && loaded
          ? '0 1px 2px rgba(15,23,42,0.05)'
          : 'inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -1px 0 rgba(0,0,0,0.18)',
        transition: 'background 200ms ease, border-color 200ms ease, box-shadow 200ms ease',
      }}
      aria-hidden="true"
      title={brand}
    >
      {/* Monogram — always rendered as the immediate fallback */}
      <div
        className="absolute inset-0 flex items-center justify-center font-mono font-bold text-white"
        style={{
          fontSize: size * 0.34,
          opacity: showLogo && loaded ? 0 : 1,
          transition: 'opacity 200ms ease',
        }}
      >
        {b.short}
      </div>

      {/* Real logo, fades in when loaded */}
      {showLogo && (
        <img
          src={logoUrl}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
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
    accent:  { bg: 'rgba(22,160,133,0.10)', border: 'rgba(22,160,133,0.30)', color: 'var(--success)' },
    brand:   { bg: 'rgba(30,95,224,0.10)', border: 'rgba(30,95,224,0.30)', color: 'var(--blue)' },
    warn:    { bg: 'rgba(234,88,12,0.10)', border: 'rgba(234,88,12,0.30)', color: 'var(--warn)' },
    soft:    { bg: 'var(--surface-2)', border: 'var(--border)', color: 'var(--text-2)' },
  }[tone];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-tiny font-medium uppercase track-wide ${className}`}
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
                borderRadius: 999,
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
        borderRadius: 14,
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
                fontFamily: 'Space Grotesk, system-ui',
                border: '1.5px solid',
                borderColor: active ? 'var(--accent)' : 'var(--border)',
                background: active
                  ? 'var(--blue-soft)'
                  : 'var(--surface-2)',
                color: active ? 'var(--accent)' : 'var(--text-2)',
                borderRadius: 10,
                letterSpacing: '-0.01em',
                boxShadow: active
                  ? '0 0 0 3px rgba(30,95,224,0.12)'
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
                    width: 6, height: 6, borderRadius: 999,
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
  <div className="inline-flex items-center p-1" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 999 }}>
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
            borderRadius: 999,
          }}
        ><Icon size={13} /> {label}</button>
      );
    })}
  </div>
);

const StationCard = ({ station, fuelType, rank, cheapestPrice, onSelect, reports = [], confirmedSet, onConfirmReport, onOpenReportModal }) => {
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

  const isCheapest = rank === 0;
  const diff = displayPrice != null && cheapestPrice != null ? +(displayPrice - cheapestPrice).toFixed(1) : null;

  return (
    <div
      className="hover-raise w-full p-4 md:p-5 transition-all relative"
      style={{
        background: isCheapest ? 'linear-gradient(180deg, rgba(22,160,133,0.04), transparent)' : 'var(--surface)',
        border: `1px solid ${isCheapest ? 'rgba(22,160,133,0.40)' : 'var(--border)'}`,
        borderRadius: 12,
      }}
    >
      {isCheapest && (
        <div aria-hidden="true" className="absolute -top-px left-4 right-4"
             style={{ height: 1, background: 'linear-gradient(90deg, transparent, var(--accent), transparent)' }} />
      )}
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
                  {isCheapest && <Pill tone="accent"><Zap size={10} /> Cheapest</Pill>}
                  {isUserSourced && (
                    <span
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 text-tiny font-medium"
                      style={{ background: 'rgba(22,160,133,0.10)', border: '1px solid rgba(22,160,133,0.25)', borderRadius: 4, color: 'var(--success)' }}
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
              <span className="inline-flex items-center gap-1.5"><Navigation size={11} /> {station.distance} km</span>
              <span className="inline-flex items-center gap-1.5" style={{ color: 'var(--text-3)' }}>
                {estimateDriveMinutes(station.distance)} min drive
              </span>
              <span
                className="inline-flex items-center gap-1.5"
                title={`${freshness(station.updatedMinutesAgo).label} · updated ${timeAgoLabel(station.updatedMinutesAgo)}`}
              >
                <span
                  style={{
                    display: 'inline-block',
                    width: 7, height: 7, borderRadius: 999,
                    background: freshness(station.updatedMinutesAgo).color,
                    boxShadow: `0 0 0 2px ${freshness(station.updatedMinutesAgo).color}22`,
                  }}
                />
                {timeAgoLabel(station.updatedMinutesAgo)}
              </span>
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

      {/* Primary actions: Directions (filled blue) + Report price (outline) */}
      <div className="mt-4 flex items-stretch gap-2 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-semibold transition-all hover-raise"
          style={{
            background: 'var(--accent)',
            color: '#ffffff',
            borderRadius: 9,
            textDecoration: 'none',
            border: '1px solid var(--accent-dark)',
            boxShadow: '0 1px 0 rgba(15,23,42,0.04)',
          }}
          aria-label={`Get directions to ${station.brand} on ${station.address}`}
        >
          <Navigation size={14} strokeWidth={2.4} />
          Directions
        </a>
        {onOpenReportModal && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onOpenReportModal(station); }}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-sm font-medium transition-colors"
            style={{
              background: 'var(--surface-2)',
              color: 'var(--text-2)',
              border: '1px solid var(--border)',
              borderRadius: 9,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-3)'; e.currentTarget.style.color = 'var(--text)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.color = 'var(--text-2)'; }}
            aria-label="Report a different price for this station"
          >
            <Edit3 size={13} />
            <span className="hidden sm:inline">Report price</span>
            <span className="sm:hidden">Report</span>
          </button>
        )}
      </div>
    </div>
  );
};

const StationMap = ({ stations, fuelType, cheapestPrice, onSelect, effectivePriceFor }) => {
  const [activeId, setActiveId] = useState(null);
  const priceFor = effectivePriceFor || ((s) => s.prices[fuelType]);
  const visible = stations.filter(s => priceFor(s) != null);
  if (visible.length === 0) {
    return <div className="surface-card text-center py-16" style={{ color: 'var(--text-3)' }}>No mappable stations.</div>;
  }
  const meanLat = visible.reduce((s, st) => s + st.lat, 0) / visible.length;
  const meanLng = visible.reduce((s, st) => s + st.lng, 0) / visible.length;
  const VW = 800, VH = 520, PAD = 60;

  const maxDist = Math.max(
    ...visible.map(s => Math.hypot((s.lat - meanLat) * 111, (s.lng - meanLng) * 111 * Math.cos(meanLat * Math.PI / 180)))
  );
  const scale = Math.min((VW / 2 - PAD) / maxDist, (VH / 2 - PAD) / maxDist);
  const project = (lat, lng) => {
    const dy = -(lat - meanLat) * 111 * scale;
    const dx = (lng - meanLng) * 111 * Math.cos(meanLat * Math.PI / 180) * scale;
    return { x: VW / 2 + dx, y: VH / 2 + dy };
  };
  const userPos = project(meanLat, meanLng);

  return (
    <div className="overflow-hidden" style={{ background: '#f4f7fc', border: '1px solid var(--border)', borderRadius: 12 }}>
      <svg viewBox={`0 0 ${VW} ${VH}`} className="w-full h-auto block" style={{ aspectRatio: `${VW}/${VH}` }}>
        <defs>
          <pattern id="grid-fine-d" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#dde4ee" strokeWidth="0.5" />
          </pattern>
          <pattern id="grid-coarse-d" width="100" height="100" patternUnits="userSpaceOnUse">
            <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#c8d2e1" strokeWidth="0.7" />
          </pattern>
          <radialGradient id="user-glow-d">
            <stop offset="0%" stopColor="#1e5fe0" stopOpacity="0.28" />
            <stop offset="60%" stopColor="#1e5fe0" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#1e5fe0" stopOpacity="0" />
          </radialGradient>
          <filter id="pin-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        <rect width={VW} height={VH} fill="url(#grid-fine-d)" />
        <rect width={VW} height={VH} fill="url(#grid-coarse-d)" opacity="0.6" />

        <g stroke="#ffffff" strokeWidth="6" strokeLinecap="round" opacity="0.95">
          <line x1="0" y1={VH * 0.62} x2={VW} y2={VH * 0.42} />
          <line x1={VW * 0.18} y1="0" x2={VW * 0.32} y2={VH} />
          <line x1={VW * 0.78} y1="0" x2={VW * 0.62} y2={VH} />
          <line x1="0" y1={VH * 0.78} x2={VW * 0.85} y2={VH * 0.92} />
        </g>

        <circle cx={userPos.x} cy={userPos.y} r="80" fill="url(#user-glow-d)" />
        <circle cx={userPos.x} cy={userPos.y} r="11" fill="#1e5fe0" filter="url(#pin-glow)" />
        <circle cx={userPos.x} cy={userPos.y} r="5" fill="#ffffff" />

        {[1, 3, 5].map(km => (
          <g key={km}>
            <circle cx={userPos.x} cy={userPos.y} r={km * scale} fill="none" stroke="#94a3b8" strokeDasharray="2 5" strokeWidth="1" opacity="0.55" />
            <text x={userPos.x + km * scale - 4} y={userPos.y - 4} fontSize="10" fill="#64748b" textAnchor="end" fontFamily="JetBrains Mono, monospace" fontWeight="500">{km}km</text>
          </g>
        ))}

        {visible.map((s) => {
          const { x, y } = project(s.lat, s.lng);
          const sPrice = priceFor(s);
          const isCheap = sPrice === cheapestPrice;
          const isActive = activeId === s.id;
          const fill = isCheap ? '#16a085' : '#ffffff';
          const stroke = isCheap ? '#0f7d68' : '#64748b';
          return (
            <g key={s.id} style={{ cursor: 'pointer' }}
               onClick={() => { setActiveId(s.id); onSelect && onSelect(s); }}>
              <line x1={userPos.x} y1={userPos.y} x2={x} y2={y}
                    stroke={isCheap ? '#16a085' : '#64748b'} strokeOpacity={isActive ? 0.35 : 0.12} strokeWidth="1" strokeDasharray="2 3" />
              <circle cx={x} cy={y} r={isActive ? 11 : 8} fill={fill} stroke={stroke} strokeWidth="2.5"
                      className={isCheap && !isActive ? 'pulse-pin' : ''}
                      style={{ transformBox: 'fill-box', transformOrigin: 'center' }} />
              {(isActive || isCheap) && (
                <g>
                  <rect x={x + 12} y={y - 18} rx="5" ry="5" width="58" height="24" fill={isCheap ? '#16a085' : '#0f172a'} />
                  <text x={x + 41} y={y - 1} fontSize="12" fontWeight="600" fontFamily="JetBrains Mono, monospace"
                        fill="#ffffff" textAnchor="middle">{sPrice.toFixed(1)}</text>
                </g>
              )}
            </g>
          );
        })}

        <g fontFamily="JetBrains Mono, monospace" fill="#94a3b8" opacity="0.85">
          <text x="20" y="32" fontSize="10" fontWeight="500" letterSpacing="0.1em">N ↑</text>
          <text x={VW - 20} y={VH - 16} fontSize="10" fontWeight="500" textAnchor="end" letterSpacing="0.1em">FUELMATE · LIVE</text>
        </g>
      </svg>
    </div>
  );
};

const StationList = ({ stations, fuelType, onSelectStation, viewMode, onViewMode, sort, onSort, reportsByStation, confirmedSet, onConfirmReport, onOpenReportModal }) => {
  // Helper: effective price = trusted user report (if any) > official
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

  const cheapestPrice = effectivePriceFor(sorted[0] || {});

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <Toggle value={sort} onChange={onSort} options={[
          { key: 'price', label: 'Cheapest', icon: TrendingDown },
          { key: 'distance', label: 'Closest', icon: Navigation },
        ]} />
        <Toggle value={viewMode} onChange={onViewMode} options={[
          { key: 'list', label: 'List', icon: List },
          { key: 'map',  label: 'Map',  icon: MapIcon },
        ]} />
      </div>

      {viewMode === 'list' ? (
        <div className="space-y-2.5">
          {sorted.map((s, i) => (
            <div key={s.id} className="fade-up" style={{ animationDelay: `${Math.min(i * 24, 360)}ms` }}>
              <StationCard
                station={s}
                fuelType={fuelType}
                rank={i}
                cheapestPrice={cheapestPrice}
                onSelect={onSelectStation}
                reports={reportsByStation[s.id] || []}
                confirmedSet={confirmedSet}
                onConfirmReport={onConfirmReport}
                onOpenReportModal={onOpenReportModal}
              />
            </div>
          ))}
          {sorted.length === 0 && (
            <div className="text-center py-12" style={{ color: 'var(--text-4)' }}>No stations carrying this fuel type within range.</div>
          )}
        </div>
      ) : (
        <StationMap
          stations={sorted}
          fuelType={fuelType}
          cheapestPrice={cheapestPrice}
          onSelect={onSelectStation}
          effectivePriceFor={effectivePriceFor}
        />
      )}
    </div>
  );
};

const PriceStats = ({ stations, fuelType }) => {
  const prices = stations.map(s => s.prices[fuelType]).filter(p => p != null);
  if (prices.length === 0) return null;
  const cheapest = Math.min(...prices);
  const highest = Math.max(...prices);
  const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
  const range = highest - cheapest;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-px overflow-hidden" style={{ background: 'var(--border)', borderRadius: 12, border: '1px solid var(--border)' }}>
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
 * Hidden if the savings are under $1 (not worth driving for) or there's
 * no meaningful spread.
 */
const SavingsBanner = ({ stations, fuelType, tankSize = 50 }) => {
  const prices = stations.map(s => s.prices[fuelType]).filter(p => p != null);
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
        borderRadius: 12,
      }}
    >
      <div
        className="shrink-0 inline-flex items-center justify-center"
        style={{ width: 36, height: 36, background: 'var(--success)', borderRadius: 10 }}
      >
        <TrendingDown size={17} color="#ffffff" strokeWidth={2.4} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm md:text-base leading-snug">
          <span className="font-semibold" style={{ color: 'var(--green-dark)' }}>
            Save ~${dollarsSaved.toFixed(0)} per tank
          </span>
          <span style={{ color: 'var(--text-2)' }}> at the cheapest vs. nearby average</span>
        </div>
        <div className="text-tiny mt-0.5" style={{ color: 'var(--text-3)' }}>
          That's ~${yearly.toFixed(0)} a year if you fill weekly · based on a {tankSize}L tank
        </div>
      </div>
    </div>
  );
};

const LocationPrompt = ({ onLocate, onSample, onSearchSelect, isLocating, hasError }) => (
  <div className="relative overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16 }}>
    <div className="absolute inset-0 pointer-events-none" aria-hidden="true"
         style={{ background: 'radial-gradient(circle at 80% 0%, rgba(22,160,133,0.10), transparent 50%)' }} />
    <div className="p-6 md:p-7 relative">
      <div className="flex items-center gap-2 mb-5">
        <div className="rounded-full p-2" style={{ background: 'rgba(22,160,133,0.10)', border: '1px solid rgba(22,160,133,0.25)' }}>
          <Target size={16} style={{ color: 'var(--success)' }} />
        </div>
        <Pill tone="accent">
          <span className="w-1.5 h-1.5 rounded-full pulse-glow" style={{ background: 'var(--success)' }} /> Live data
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
          border: '1px solid var(--border-strong)', borderRadius: 10,
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
            borderRadius: 8,
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
            style={{ background: 'var(--surface-2)', color: 'var(--text-2)', border: '1px solid var(--border)', borderRadius: 999 }}
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

  const suburbMatches = SUBURBS
    .filter(s =>
      s.name.toLowerCase().includes(lower) ||
      s.postcode.startsWith(lower)
    )
    .map(s => ({
      type: 'suburb',
      id: `sub-${s.slug}`,
      label: s.name,
      sublabel: `${s.state} ${s.postcode}`,
      slug: s.slug,
      lat: s.center.lat,
      lng: s.center.lng,
      state: s.state,
    }));

  // Score by relevance: prefix match > contains; cities first
  const score = (item) => {
    const labelLower = item.label.toLowerCase();
    if (labelLower.startsWith(lower)) return 0;
    if (labelLower.includes(lower)) return 1;
    return 2;
  };

  return [...cityMatches, ...suburbMatches]
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
    default: { padX: 16, padY: 13, radius: 12, fontSize: 15, iconSize: 16, iconLeft: 16 },
    large:   { padX: 20, padY: 18, radius: 14, fontSize: 17, iconSize: 18, iconLeft: 20 },
    compact: { padX: 12, padY: 9,  radius: 10, fontSize: 14, iconSize: 14, iconLeft: 12 },
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
    const suburbs = results.filter(r => r.type === 'suburb');
    const addresses = results.filter(r => r.type === 'address');
    if (cities.length) groups.push({ title: 'Cities', items: cities });
    if (suburbs.length) groups.push({ title: 'Suburbs', items: suburbs });
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
            boxShadow: focused ? '0 0 0 3px rgba(30,95,224,0.12)' : 'none',
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
              borderRadius: 6,
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
            borderRadius: 12,
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
                          borderRadius: 8,
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
                <kbd className="font-mono px-1.5 py-0.5" style={{ background: 'var(--surface-3)', borderRadius: 4 }}>↑↓</kbd>
                navigate
              </span>
              <span className="inline-flex items-center gap-1.5">
                <kbd className="font-mono px-1.5 py-0.5" style={{ background: 'var(--surface-3)', borderRadius: 4 }}>↵</kbd>
                select
              </span>
              <span className="inline-flex items-center gap-1.5">
                <kbd className="font-mono px-1.5 py-0.5" style={{ background: 'var(--surface-3)', borderRadius: 4 }}>esc</kbd>
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
          borderRadius: window.innerWidth < 768 ? '16px 16px 0 0' : '16px',
          boxShadow: '0 24px 64px -16px rgba(15,23,42,0.22), 0 8px 24px -8px rgba(15,23,42,0.10)',
          maxHeight: '92vh',
          overflowY: 'auto',
        }}
      >
        {submitted ? (
          <div className="p-8 text-center">
            <div className="inline-flex items-center justify-center mb-4"
                 style={{ width: 56, height: 56, background: 'rgba(22,160,133,0.10)', border: '1px solid rgba(22,160,133,0.30)', borderRadius: 999 }}>
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
                    style={{ width: 44, height: 56, background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text-2)' }}
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
                        borderRadius: 10,
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
                    style={{ width: 44, height: 56, background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text-2)' }}
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
                       style={{ background: 'rgba(255,69,105,0.08)', border: '1px solid rgba(255,69,105,0.25)', borderRadius: 8, color: 'var(--text-2)' }}>
                    <AlertCircle size={13} style={{ color: 'var(--danger)' }} className="mt-0.5 shrink-0" />
                    <span>That's more than {REPORT_REJECT_THRESHOLD}¢ from the official price. Double-check the bowser before submitting.</span>
                  </div>
                )}

                {isUnusual && !isRejected && (
                  <div className="mt-3 flex items-start gap-2 p-3 text-xs"
                       style={{ background: 'rgba(255,107,61,0.08)', border: '1px solid rgba(255,107,61,0.20)', borderRadius: 8, color: 'var(--text-2)' }}>
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
                    borderRadius: 10,
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
                  borderRadius: 10,
                  boxShadow: canSubmit ? '0 0 0 1px rgba(22,160,133,0.30), 0 8px 24px -8px rgba(22,160,133,0.40)' : 'none',
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
        background: trusted ? 'rgba(22,160,133,0.04)' : 'var(--bg-2)',
        border: `1px solid ${trusted ? 'rgba(22,160,133,0.20)' : 'var(--border)'}`,
        borderRadius: 8,
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
          background: hasConfirmed ? 'rgba(22,160,133,0.10)' : 'var(--surface-3)',
          color: hasConfirmed ? 'var(--success)' : 'var(--text-2)',
          border: `1px solid ${hasConfirmed ? 'rgba(22,160,133,0.30)' : 'var(--border-strong)'}`,
          borderRadius: 6,
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
        borderRadius: 10,
        boxShadow: '0 16px 40px -12px rgba(15,23,42,0.18), 0 0 0 3px rgba(22,160,133,0.10)',
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

const Header = ({ onNav, fuelType, onFuelType, onOpenSearch }) => {
  const [open, setOpen] = useState(false);
  const goto = (v) => { setOpen(false); onNav(v); };

  return (
    <header className="sticky top-0 z-30 glass" style={{ borderBottom: '1px solid var(--border)' }}>
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-3 flex items-center gap-4">
        <button type="button" onClick={() => goto({ name: 'home' })} className="flex items-center shrink-0" aria-label="FuelMate home">
          <FuelMateLogo markSize={30} wordSize={20} />
        </button>

        <nav className="hidden md:flex items-center gap-0.5 ml-4 flex-1">
          {[
            { label: 'Near me', view: { name: 'home' } },
            { label: 'Cities', view: { name: 'cities' } },
            { label: 'How cycles work', view: { name: 'editorial', slug: 'cycles' } },
          ].map(item => (
            <button
              key={item.label} type="button" onClick={() => goto(item.view)}
              className="px-3 py-1.5 text-sm font-medium transition-colors"
              style={{ color: 'var(--text-2)', borderRadius: 8 }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.color = 'var(--text)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-2)'; }}
            >{item.label}</button>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          <button
            type="button"
            onClick={() => goto({ name: 'home' })}
            className="p-2 transition-colors hover-raise"
            style={{
              background: 'var(--surface)',
              color: 'var(--text-2)',
              border: '1px solid var(--border)',
              borderRadius: 9,
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
              borderRadius: 9,
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
                borderRadius: 4,
                border: '1px solid var(--border)',
              }}
            >
              <Command size={9} strokeWidth={2.5} />K
            </kbd>
          </button>
        </div>

        <div className="md:hidden ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => goto({ name: 'home' })}
            className="p-2"
            style={{ color: 'var(--text)', borderRadius: 8 }}
            aria-label="Home"
          >
            <Home size={19} />
          </button>
          <button
            type="button"
            onClick={onOpenSearch}
            className="p-2"
            style={{ color: 'var(--text)', borderRadius: 8 }}
            aria-label="Search"
          >
            <Search size={19} />
          </button>
          <button
            type="button"
            onClick={() => setOpen(o => !o)}
            className="p-2"
            style={{ color: 'var(--text)', borderRadius: 8 }}
            aria-label="Open menu"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden fade-up" style={{ borderTop: '1px solid var(--border)', background: 'var(--bg)' }}>
          <div className="max-w-6xl mx-auto px-4 py-4">
            {[
              { label: 'Near me', view: { name: 'home' } },
              { label: 'Cities', view: { name: 'cities' } },
              { label: 'How cycles work', view: { name: 'editorial', slug: 'cycles' } },
              { label: 'About', view: { name: 'about' } },
              { label: 'Contact', view: { name: 'contact' } },
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

const Footer = ({ onNav }) => (
  <footer className="mt-20 pt-14 pb-10" style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-2)' }}>
    <div className="max-w-6xl mx-auto px-4 md:px-6">
      <div className="grid md:grid-cols-4 gap-10 md:gap-8 mb-12">
        <div className="md:col-span-2">
          <div className="mb-4">
            <FuelMateLogo markSize={28} wordSize={20} />
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
            {[
              { label: 'About FuelMate', view: { name: 'about' } },
              { label: 'How fuel cycles work', view: { name: 'editorial', slug: 'cycles' } },
              { label: 'Contact', view: { name: 'contact' } },
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
      <div className="pt-6 text-xs flex flex-col md:flex-row gap-3 md:items-center md:justify-between"
           style={{ borderTop: '1px solid var(--border)', color: 'var(--text-4)' }}>
        <div>© {new Date().getFullYear()} FuelMate · Independent fuel price comparison.</div>
        <div className="font-mono text-tiny track-wide uppercase">FuelCheck NSW · FuelWatch WA · QLD · NT · TAS</div>
      </div>
    </div>
  </footer>
);

/* ===== VIEWS ===== */

const HomeView = ({ location, locating, locError, fuelType, onLocate, onSample, onSearchSelect, onNav, onFuelType, reportsByStationFor, confirmedSet, onConfirmReport, onOpenReportModal }) => {
  const [stations, setStations] = useState([]);
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
  const [sort, setSort] = useState('price');

  return (
    <div>
      <section className="relative grid-bg spotlight">
        <div className="max-w-6xl mx-auto px-4 md:px-6 pt-12 md:pt-20 pb-10 md:pb-16 relative">
          <div className="max-w-4xl">
            <Pill tone="accent" className="mb-6">
              <span className="w-1.5 h-1.5 rounded-full pulse-glow" style={{ background: 'var(--success)' }} />
              Live · all 8 states and territories
            </Pill>
            <h1 className="font-display font-semibold lead-tight tracking-tight" style={{ fontSize: 'clamp(2.75rem, 8vw, 6rem)' }}>
              The cheapest fuel <br className="hidden sm:inline" /><span className="brand-gradient">near you</span>, in five seconds.
            </h1>
            <div className="mt-8 flex items-center gap-3 flex-wrap">
              <button type="button" onClick={onLocate}
                className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold transition-colors"
                style={{ background: 'var(--accent)', color: '#ffffff', borderRadius: 10,
                  boxShadow: '0 0 0 1px rgba(30,95,224,0.30), 0 8px 24px -8px rgba(30,95,224,0.45)' }}>
                <Navigation size={15} /> Find prices near me
              </button>
              <button type="button" onClick={() => onNav({ name: 'cities' })}
                className="inline-flex items-center gap-1.5 px-5 py-3 text-sm font-medium transition-colors"
                style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border-strong)', borderRadius: 10 }}>
                Browse cities <MoveRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 md:px-6 pb-16">
        {!location ? (
          <div className="grid md:grid-cols-3 gap-4 md:gap-5">
            <div className="md:col-span-2">
              <LocationPrompt onLocate={onLocate} onSample={onSample} onSearchSelect={onSearchSelect} isLocating={locating} hasError={locError} />
            </div>
            <div className="surface-card p-6">
              <Compass size={18} style={{ color: 'var(--accent)' }} className="mb-3" />
              <h3 className="font-display font-semibold text-lg mb-3">How it works</h3>
              <ol className="text-sm space-y-3" style={{ color: 'var(--text-3)' }}>
                {['Share your location or pick a suburb.', 'See live prices ranked by cheapest or closest.', 'Tap a station to get directions.'].map((step, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="font-mono font-semibold tabular-nums shrink-0" style={{ color: 'var(--accent)' }}>0{i + 1}</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex items-end justify-between flex-wrap gap-3 pt-2">
              <div>
                <div className="text-micro font-medium uppercase track-wide mb-2" style={{ color: 'var(--text-4)' }}>Now showing</div>
                <h2 className="font-display font-semibold text-3xl md:text-4xl lead-tight">
                  Around <span style={{ color: 'var(--accent)' }}>{location.label}</span>
                </h2>
                <p className="text-sm mt-1.5" style={{ color: 'var(--text-3)' }}>
                  {stations.length} stations · {FUEL_TYPES.find(f => f.code === fuelType)?.label}
                </p>
              </div>
              <button type="button" onClick={() => onSample(null)}
                      className="text-sm font-medium ulink inline-flex items-center gap-1" style={{ color: 'var(--accent)' }}>
                Change location <ArrowRight size={14} />
              </button>
            </div>

            <AddressSearch onSelect={onSearchSelect} variant="compact" placeholder="Search a different address, suburb, or postcode…" />

            <SavingsBanner stations={stations} fuelType={fuelType} />

            <FuelTypePicker value={fuelType} onChange={onFuelType} />

            <PriceStats stations={stations} fuelType={fuelType} />

            <StationList stations={stations} fuelType={fuelType} viewMode={viewMode}
                         onViewMode={setViewMode} sort={sort} onSort={setSort}
                         reportsByStation={reportsByStationFor(stations)}
                         confirmedSet={confirmedSet}
                         onConfirmReport={onConfirmReport}
                         onOpenReportModal={onOpenReportModal} />
          </div>
        )}

        <div className="my-10">
          <AdSlot size="leaderboard" label="leaderboard 728×90 — AdSense slot" />
        </div>

        <section>
          <div className="flex items-baseline justify-between mb-5 flex-wrap gap-2">
            <div>
              <div className="text-micro font-medium uppercase track-wide mb-1.5" style={{ color: 'var(--text-4)' }}>Capital cities</div>
              <h2 className="font-display font-semibold text-2xl md:text-3xl">Browse by city</h2>
            </div>
            <button type="button" onClick={() => onNav({ name: 'cities' })}
                    className="text-sm font-medium ulink inline-flex items-center gap-1" style={{ color: 'var(--accent)' }}>
              All cities <ArrowRight size={14} />
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {CITIES.map(c => (
              <button key={c.slug} type="button"
                      onClick={() => onNav({ name: 'city', slug: c.slug })}
                      className="hover-raise p-4 text-left transition-colors"
                      style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10 }}>
                <div className="flex items-start justify-between mb-3">
                  <div className="font-mono text-tiny font-medium track-wide" style={{ color: 'var(--text-4)' }}>{c.state}</div>
                  <ArrowUpRight size={14} style={{ color: 'var(--text-4)' }} />
                </div>
                <div className="font-display font-semibold text-xl md:text-2xl leading-tight mb-1">{c.name}</div>
                <div className="text-tiny" style={{ color: 'var(--text-4)' }}>Cycle: {c.cycle}</div>
              </button>
            ))}
          </div>
        </section>

        <section className="mt-14">
          <div className="text-micro font-medium uppercase track-wide mb-1.5" style={{ color: 'var(--text-4)' }}>Suburbs</div>
          <h2 className="font-display font-semibold text-2xl md:text-3xl mb-5">Find prices in your suburb</h2>
          <div className="surface-card overflow-hidden">
            <div className="grid md:grid-cols-3">
              {SUBURBS.map((s, i) => (
                <button key={s.slug} type="button" onClick={() => onNav({ name: 'suburb', slug: s.slug })}
                        className="text-left px-4 py-3 transition-colors flex items-baseline justify-between gap-2"
                        style={{ color: 'var(--text-2)', borderBottom: '1px solid var(--border)',
                                 borderRight: ((i + 1) % 3 !== 0) ? '1px solid var(--border)' : 'none' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.color = 'var(--text)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-2)'; }}>
                  <span className="font-medium text-sm">{s.name}</span>
                  <span className="font-mono text-tiny" style={{ color: 'var(--text-4)' }}>{s.state} {s.postcode}</span>
                </button>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

const CitiesIndexView = ({ onNav }) => (
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
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12 }}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="font-mono text-tiny font-medium track-wide mb-1.5" style={{ color: 'var(--accent)' }}>{c.state}</div>
              <h2 className="font-display font-semibold text-3xl">{c.name}</h2>
            </div>
            <ArrowUpRight size={20} style={{ color: 'var(--text-3)' }} />
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm pt-3" style={{ borderTop: '1px solid var(--border)' }}>
            <div>
              <div className="text-micro uppercase track-wide font-medium mb-1" style={{ color: 'var(--text-4)' }}>Population</div>
              <div className="font-medium font-mono">{c.pop}</div>
            </div>
            <div>
              <div className="text-micro uppercase track-wide font-medium mb-1" style={{ color: 'var(--text-4)' }}>Cycle</div>
              <div className="font-medium">{c.cycle}</div>
            </div>
          </div>
        </button>
      ))}
    </div>
  </div>
);

const citySource = (state) => ({
  NSW: 'FuelCheck NSW', VIC: 'Servo Saver', QLD: 'QLD Fuel Price Reporting',
  WA: 'FuelWatch WA',  SA:  'SA Fuel Pricing Information Scheme',
  NT: 'MyFuel NT',     TAS: 'FuelCheck (via NSW)', ACT: 'FuelCheck (via NSW)',
}[state] || 'state government feeds');

const CityView = ({ city, fuelType, onFuelType, onSearchSelect, onNav, reportsByStationFor, confirmedSet, onConfirmReport, onOpenReportModal }) => {
  const stations = useMemo(
    () => generateStations(city.center.lat, city.center.lng, `city-${city.slug}`, city.state, 18),
    [city.slug]
  );
  const [viewMode, setViewMode] = useState('list');
  const [sort, setSort] = useState('price');
  const citySuburbs = SUBURBS.filter(s => s.city === city.slug);

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
      <div className="mb-6"><PriceStats stations={stations} fuelType={fuelType} /></div>
      <div className="my-6"><AdSlot size="leaderboard" /></div>

      <StationList stations={stations} fuelType={fuelType} viewMode={viewMode}
                   onViewMode={setViewMode} sort={sort} onSort={setSort}
                   reportsByStation={reportsByStationFor(stations)}
                   confirmedSet={confirmedSet}
                   onConfirmReport={onConfirmReport}
                   onOpenReportModal={onOpenReportModal} />

      {citySuburbs.length > 0 && (
        <section className="mt-14">
          <div className="text-micro font-medium uppercase track-wide mb-1.5" style={{ color: 'var(--text-4)' }}>In this city</div>
          <h2 className="font-display font-semibold text-2xl md:text-3xl mb-5">Suburbs in {city.name}</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
            {citySuburbs.map(s => (
              <button key={s.slug} type="button" onClick={() => onNav({ name: 'suburb', slug: s.slug })}
                      className="hover-raise text-left p-3.5"
                      style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10 }}>
                <div className="font-medium text-sm">{s.name}</div>
                <div className="font-mono text-tiny mt-0.5" style={{ color: 'var(--text-4)' }}>{s.postcode}</div>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

const SuburbView = ({ suburb, fuelType, onFuelType, onSearchSelect, onNav, reportsByStationFor, confirmedSet, onConfirmReport, onOpenReportModal }) => {
  const stations = useMemo(
    () => generateStations(suburb.center.lat, suburb.center.lng, `sub-${suburb.slug}`, suburb.state, 12),
    [suburb.slug]
  );
  const [viewMode, setViewMode] = useState('list');
  const [sort, setSort] = useState('price');
  const parentCity = CITIES.find(c => c.slug === suburb.city);

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-8 md:py-12">
      <div className="text-sm mb-5 inline-flex items-center gap-1.5 flex-wrap" style={{ color: 'var(--text-4)' }}>
        <button type="button" onClick={() => onNav({ name: 'home' })} className="ulink">Home</button>
        <ChevronRight size={12} />
        {parentCity ? (
          <>
            <button type="button" onClick={() => onNav({ name: 'city', slug: parentCity.slug })} className="ulink">{parentCity.name}</button>
            <ChevronRight size={12} />
          </>
        ) : null}
        <span style={{ color: 'var(--text)' }} className="font-medium">{suburb.name}</span>
      </div>

      <div className="mb-8">
        <div className="font-mono text-tiny font-medium track-wide mb-2" style={{ color: 'var(--accent)' }}>{suburb.state} · {suburb.postcode}</div>
        <h1 className="font-display font-semibold text-4xl md:text-5xl lead-tight mb-3">
          Cheapest fuel in <span className="brand-gradient">{suburb.name}</span>
        </h1>
        <p className="text-base md:text-lg max-w-2xl" style={{ color: 'var(--text-3)' }}>
          {stations.length} stations within a ~10km radius, ranked by today's price.
        </p>
      </div>

      <div className="mb-5">
        <AddressSearch onSelect={onSearchSelect} variant="compact" placeholder="Change location — search address, suburb, or postcode…" />
      </div>

      <div className="mb-5"><FuelTypePicker value={fuelType} onChange={onFuelType} /></div>
      <div className="mb-5"><SavingsBanner stations={stations} fuelType={fuelType} /></div>
      <div className="mb-6"><PriceStats stations={stations} fuelType={fuelType} /></div>
      <div className="my-6"><AdSlot size="leaderboard" /></div>

      <StationList stations={stations} fuelType={fuelType} viewMode={viewMode}
                   onViewMode={setViewMode} sort={sort} onSort={setSort}
                   reportsByStation={reportsByStationFor(stations)}
                   confirmedSet={confirmedSet}
                   onConfirmReport={onConfirmReport}
                   onOpenReportModal={onOpenReportModal} />

      <section className="mt-14 p-7 md:p-9 relative overflow-hidden"
               style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14 }}>
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none"
             style={{ background: 'radial-gradient(circle at 0% 100%, rgba(22,160,133,0.10), transparent 60%)' }} />
        <div className="relative">
          <h2 className="font-display font-semibold text-2xl md:text-3xl mb-3 lead-tight">Save more in {suburb.name}</h2>
          <p className="text-sm md:text-base mb-1" style={{ color: 'var(--text-2)' }}>
            A few habits compound: fill up early in the cycle, avoid weekend peaks, and check before — not at — the pump.
          </p>
          <p className="text-sm" style={{ color: 'var(--text-3)' }}>
            The {suburb.state} cycle pattern affects every station in this list, even between brands.
          </p>
        </div>
      </section>
    </div>
  );
};

const EditorialView = ({ slug, onNav }) => {
  if (slug !== 'cycles') return null;
  return (
    <article className="max-w-3xl mx-auto px-4 md:px-6 py-12 md:py-16">
      <Pill tone="accent" className="mb-4">Explainer · 6 min read</Pill>
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

        <h2 className="font-display font-semibold text-2xl md:text-3xl mt-10 mb-2" style={{ color: 'var(--text)' }}>What FuelMate does</h2>
        <p>We pull live prices straight from the state schemes (NSW, QLD, WA, NT, TAS, ACT) and surface the cheapest stations near you in real time. Pattern recognition is automatic — if a price is unusually low in your area, you'll see it.</p>
        <p className="pt-2">
          <button type="button" onClick={() => onNav({ name: 'home' })}
                  className="font-medium ulink inline-flex items-center gap-1" style={{ color: 'var(--accent)' }}>
            Try it now <ArrowRight size={16} />
          </button>
        </p>
      </div>
      <div className="my-12"><AdSlot size="rectangle" /></div>
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
  <StaticPage icon={Info} title="About FuelMate"
    intro="FuelMate is an independent fuel price comparison site for Australian drivers. We don't sell fuel, run stations, or take payments from retailers in exchange for placement."
    body={<>
      <h2 className="font-display font-semibold text-2xl mt-2" style={{ color: 'var(--text)' }}>What we do</h2>
      <p>We pull live retail fuel prices from the state government schemes that publish them: FuelCheck NSW, FuelWatch WA, the QLD Fuel Price Reporting scheme, MyFuel NT and FuelCheck TAS. We rank those prices by location, fuel type and distance, and present them in a way that's actually fast on a phone.</p>
      <h2 className="font-display font-semibold text-2xl mt-8" style={{ color: 'var(--text)' }}>What we don't do</h2>
      <p>We don't have a native app. We don't make you create an account. We don't bury the cheapest result behind a paywall. We don't prioritise paid retailers — you see prices ranked by price, full stop.</p>
      <h2 className="font-display font-semibold text-2xl mt-8" style={{ color: 'var(--text)' }}>Coverage</h2>
      <p>NSW, QLD, WA, NT, TAS and the ACT are live now. Victoria and South Australia don't have a comparable government scheme; we'll add them once we can do it properly rather than poorly.</p>
      <h2 className="font-display font-semibold text-2xl mt-8" style={{ color: 'var(--text)' }}>How we make money</h2>
      <p>We run display ads on the site (the boxed slots you see above and below the price lists) and earn a modest commission if you sign up to a fuel card or motoring membership through one of our partner links. Ads don't influence which stations appear, or in what order — that's locked to price.</p>
    </>} />
);

const ContactView = () => (
  <StaticPage icon={Mail} title="Contact"
    intro="Spot a price that looks wrong, want to suggest a feature, or covering us in a story? Get in touch."
    body={<>
      <div className="surface-card p-6 md:p-7 space-y-5" style={{ borderRadius: 14 }}>
        {[
          { label: 'General enquiries', email: 'hello@fuelmate.com.au' },
          { label: 'Press & partnerships', email: 'press@fuelmate.com.au' },
          { label: 'Data corrections', email: 'data@fuelmate.com.au', note: 'We aggregate from official feeds. If a price is wrong on our site, it\'s almost always already wrong upstream. We\'ll still pass it on.' },
        ].map(({ label, email, note }) => (
          <div key={email}>
            <div className="text-micro font-medium uppercase track-wide mb-1.5" style={{ color: 'var(--text-4)' }}>{label}</div>
            <a className="text-lg font-mono font-medium ulink" style={{ color: 'var(--text)' }} href={`mailto:${email}`}>{email}</a>
            {note && <p className="text-sm mt-1.5" style={{ color: 'var(--text-3)' }}>{note}</p>}
          </div>
        ))}
      </div>
      <p className="text-sm" style={{ color: 'var(--text-4)' }}>
        We aim to reply within 2 business days. FuelMate is operated by an independent Australian sole trader.
      </p>
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
      <p>Under the Australian Privacy Principles, you can request a copy of any personal information we hold about you, ask for it to be corrected, or ask for it to be deleted. Email <a className="font-medium ulink" style={{ color: 'var(--accent)' }} href="mailto:privacy@fuelmate.com.au">privacy@fuelmate.com.au</a>.</p>
      <p className="text-sm" style={{ color: 'var(--text-4)' }}>Last updated: {new Date().toLocaleDateString('en-AU', { year: 'numeric', month: 'long', day: 'numeric' })}.</p>
    </>} />
);

const TermsView = () => (
  <StaticPage icon={Shield} title="Terms of service"
    intro="The short version: this site is provided as-is, prices come from third-party sources, and you should always confirm the price at the bowser before filling up."
    body={<>
      <h2 className="font-display font-semibold text-2xl" style={{ color: 'var(--text)' }}>Use of the site</h2>
      <p>FuelMate is a free comparison service. You're welcome to use it for personal, non-commercial purposes. Don't scrape it, automate it, or republish data from it without written permission.</p>
      <h2 className="font-display font-semibold text-2xl mt-8" style={{ color: 'var(--text)' }}>Accuracy of pricing</h2>
      <p>We display prices supplied by state government feeds. Prices change frequently and may not reflect what's on the bowser when you arrive. We make no warranties about accuracy and accept no liability for decisions made based on our data. Always confirm at the pump.</p>
      <h2 className="font-display font-semibold text-2xl mt-8" style={{ color: 'var(--text)' }}>Affiliate links</h2>
      <p>Some links on this site are affiliate links. If you sign up to a product through one, we may receive a commission. This never affects the ranking of fuel prices.</p>
      <h2 className="font-display font-semibold text-2xl mt-8" style={{ color: 'var(--text)' }}>Governing law</h2>
      <p>These terms are governed by the laws of New South Wales, Australia.</p>
    </>} />
);

const NotFound = ({ onNav }) => (
  <div className="max-w-xl mx-auto px-4 py-24 text-center">
    <Pill tone="neutral" className="mb-3">404</Pill>
    <h1 className="font-display font-semibold text-5xl mb-4 lead-tight">Empty tank.</h1>
    <p className="mb-8" style={{ color: 'var(--text-3)' }}>That page doesn't exist — or hasn't been built yet.</p>
    <button type="button" onClick={() => onNav({ name: 'home' })}
            className="px-5 py-3 font-semibold inline-flex items-center gap-1.5"
            style={{ background: 'var(--accent)', color: '#ffffff', borderRadius: 10 }}>
      Back to home <ArrowRight size={16} />
    </button>
  </div>
);

/* ===== APP ===== */

export default function App() {
  const [view, setView] = useState({ name: 'home' });
  const [fuelType, setFuelType] = useState('U91');
  const [location, setLocation] = useState(null);
  const [locating, setLocating] = useState(false);
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

      if (savedLocation) setLocation(savedLocation);
      if (savedFuel) setFuelType(savedFuel);
      if (Array.isArray(savedConfirms)) setConfirmedReportIds(new Set(savedConfirms));

      hydratedRef.current = true;

      // Background-only refresh: only if we already had a saved geolocation
      // (so the user sees something immediately), AND consent is granted,
      // AND it's not been refreshed recently. Failure here is silent.
      if (savedConsent === 'granted'
          && savedLocation?.key === 'geo'
          && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            if (cancelled) return;
            setLocation((prev) => ({
              ...(prev || {}),
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              key: 'geo',
              label: prev?.label || 'your current location',
              state: prev?.state || 'NSW',
            }));
          },
          () => { /* silent — saved location stays */ },
          { enableHighAccuracy: false, timeout: 4000, maximumAge: 5 * 60_000 }
        );
      }
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
    const seed = getSeedReports(station);
    const user = userReports[station.id] || [];
    return [...seed, ...user].filter(r => r.timestamp >= cutoff);
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
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude, key: 'geo', label: 'your current location', state: 'NSW' });
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
    } else if (result.type === 'suburb') {
      setView({ name: 'suburb', slug: result.slug });
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
        return <HomeView location={location} locating={locating} locError={locError}
                         fuelType={fuelType} onFuelType={setFuelType}
                         onLocate={handleLocate} onSample={handleSample}
                         onSearchSelect={handleSearchSelect} onNav={setView}
                         {...reportsCommonProps} />;
      case 'cities':
        return <CitiesIndexView onNav={setView} />;
      case 'city': {
        const c = CITIES.find(x => x.slug === view.slug) || CITIES[0];
        return <CityView city={c} fuelType={fuelType} onFuelType={setFuelType}
                         onSearchSelect={handleSearchSelect} onNav={setView}
                         {...reportsCommonProps} />;
      }
      case 'suburb': {
        const s = SUBURBS.find(x => x.slug === view.slug);
        if (!s) return <NotFound onNav={setView} />;
        return <SuburbView suburb={s} fuelType={fuelType} onFuelType={setFuelType}
                           onSearchSelect={handleSearchSelect} onNav={setView}
                           {...reportsCommonProps} />;
      }
      case 'editorial': return <EditorialView slug={view.slug} onNav={setView} />;
      case 'about':   return <AboutView />;
      case 'contact': return <ContactView />;
      case 'privacy': return <PrivacyView />;
      case 'terms':   return <TermsView />;
      default:        return <NotFound onNav={setView} />;
    }
  };

  return (
    <div className="fm-app min-h-screen flex flex-col" ref={scrollRef}>
      <GlobalStyles />
      <Header
        onNav={setView}
        fuelType={fuelType}
        onFuelType={setFuelType}
        onOpenSearch={() => setSearchOpen(true)}
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
