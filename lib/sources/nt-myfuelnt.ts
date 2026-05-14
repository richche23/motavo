/**
 * NT MyFuel NT — Northern Territory fuel pricing scheme.
 *
 * NO official API. Scrapes myfuelnt.nt.gov.au.
 *
 * Flow per snapshot refresh:
 *   1. GET homepage → extract __RequestVerificationToken + session cookie
 *   2. GET /Home/Results (Darwin City, FuelCode=ALLU) → parse #serverJson
 *      hidden input from HTML → JSON.parse → n.FuelOutlet array
 *   3. Each station has real lat/lng and an AllFuels array with all prices
 *
 * One request returns all fuel types via each station's AllFuels array.
 * Lat/lng is available so proper radius filtering works.
 */

import { cacheGet, cacheSet } from '../cache';
import { distanceKm, normalizeBrand } from '../normalizers';
import { FetchOptions, FetchResult, FuelType, Station } from '../types';

const BASE_URL     = 'https://myfuelnt.nt.gov.au';
const SNAPSHOT_KEY = 'nt:snapshot';
const SNAPSHOT_TTL = 10 * 60 * 1000; // 10 minutes

const DARWIN_SUBURB    = 'DARWIN CITY (0800)';
const DARWIN_SUBURB_ID = '1';

// Confirmed fuel codes from the NT site dropdown.
// ALLU = "Equivalent Unleaded" — returns all stations + their AllFuels pricing.
const SEARCH_FUEL_CODE = 'ALLU';

// NT site fuel codes → canonical FuelType.
const NT_CODE_MAP: Record<string, FuelType> = {
  U91: 'U91',
  LAF: 'U91',   // Low Aromatic Fuel — NT-mandated U91 substitute
  P95: 'P95',
  P98: 'P98',
  E10: 'E10',
  DL:  'DSL',
  PD:  'PRDSL',
  LPG: 'LPG',
};

// ── Raw types from serverJson ─────────────────────────────────────────────────

interface NTFuelEntry {
  FuelCode:  string;
  Price:     string;  // decimal cents, e.g. "235.9"
  IsAvailable: boolean;
}

interface NTOutlet {
  OutletId:    number;
  Name:        string;
  FullAddress: string;
  Address:     string;
  Suburb:      string;
  Postcode:    string;
  Latitude:    number;
  Longitude:   number;
  BrandId:     string;
  FuelCode:    string;
  FuelPrice:   string;
  IsActive:    boolean;
  AllFuels:    NTFuelEntry[];
}

interface NTServerJson {
  FuelOutlet: NTOutlet[];
}

// ── Snapshot ──────────────────────────────────────────────────────────────────

interface Snapshot {
  stations:    Station[];
  refreshedAt: number;
}

async function fetchSnapshot(): Promise<Snapshot> {
  const cached = cacheGet<Snapshot>(SNAPSHOT_KEY);
  if (cached) return cached;

  const ua = 'Mozilla/5.0 (compatible; FuelMate/1.0; +https://fuelmate.app)';

  // Step 1: GET homepage for CSRF token + session cookie.
  const homeRes = await fetch(`${BASE_URL}/`, {
    headers: { 'User-Agent': ua, Accept: 'text/html' },
    redirect: 'follow',
  });
  if (!homeRes.ok) throw new Error(`NT homepage ${homeRes.status}`);

  const homeHtml = await homeRes.text();

  const tokenMatch =
    homeHtml.match(/<input[^>]+name="__RequestVerificationToken"[^>]+value="([^"]+)"/) ??
    homeHtml.match(/<input[^>]+value="([^"]+)"[^>]+name="__RequestVerificationToken"/);
  if (!tokenMatch) throw new Error('NT: CSRF token not found');
  const token = tokenMatch[1];

  const cookies = (homeRes.headers.get('set-cookie') ?? '')
    .split(/,(?=\s*\w+=)/)
    .map(c => c.split(';')[0].trim())
    .filter(Boolean)
    .join('; ');

  // Step 2: GET results for Darwin City, all unleaded (includes AllFuels per station).
  const params = new URLSearchParams({
    __RequestVerificationToken: token,
    searchOptions:              'suburbPostcode',
    Suburb:                     DARWIN_SUBURB,
    SuburbId:                   DARWIN_SUBURB_ID,
    RegionId:                   '',
    FuelCode:                   SEARCH_FUEL_CODE,
    BrandIdentifier:            '',
  });

  const resultsRes = await fetch(`${BASE_URL}/Home/Results?${params}`, {
    headers: {
      Cookie:       cookies,
      Referer:      `${BASE_URL}/`,
      'User-Agent': ua,
      Accept:       'text/html',
    },
    redirect: 'follow',
  });
  if (!resultsRes.ok) throw new Error(`NT results ${resultsRes.status}`);

  const html = await resultsRes.text();

  // Step 3: Extract #serverJson hidden input value.
  // The value is HTML-entity-encoded JSON.
  const jsonMatch =
    html.match(/<input[^>]+id="serverJson"[^>]+value="([^"]*)"/) ??
    html.match(/<input[^>]+value="([^"]*)"[^>]+id="serverJson"/);
  if (!jsonMatch) throw new Error('NT: #serverJson not found in Results HTML');

  const decoded  = decodeEntities(jsonMatch[1]);
  const server   = JSON.parse(decoded) as NTServerJson;
  const outlets  = server.FuelOutlet ?? [];

  const refreshedAt = Date.now();
  const stations    = outlets
    .filter(o => o.IsActive && o.Latitude && o.Longitude)
    .map(o => {
      const prices: Record<FuelType, number | null> = {
        U91: null, P95: null, P98: null,
        E10: null, DSL: null, PRDSL: null, LPG: null,
      };

      for (const f of (o.AllFuels ?? [])) {
        const ft = NT_CODE_MAP[f.FuelCode];
        if (!ft || !f.IsAvailable) continue;
        const p = parseFloat(f.Price);
        if (isNaN(p) || p <= 0) continue;
        // NT prices are decimal cents (e.g. 235.9 c/L).
        // Store as integer tenths-of-a-cent to match SA/QLD format (e.g. 2359).
        const existing = prices[ft];
        const val      = Math.round(p * 10);
        // Keep the lower price if multiple NT codes map to the same FuelType (e.g. U91 + LAF).
        if (existing === null || val < existing) {
          prices[ft] = val;
        }
      }

      return {
        id:               `nt-${o.OutletId}`,
        brand:            normalizeBrand(o.BrandId || o.Name),
        name:             o.Name,
        address:          o.FullAddress || `${o.Address}, ${o.Suburb}, NT ${o.Postcode}`,
        suburb:           o.Suburb,
        state:            'NT' as const,
        postcode:         o.Postcode,
        lat:              o.Latitude,
        lng:              o.Longitude,
        prices,
        updatedAt:        refreshedAt,
        updatedMinutesAgo: 0,
        source:           'nt-myfuelnt',
      } satisfies Station;
    });

  const snapshot: Snapshot = { stations, refreshedAt };
  cacheSet(SNAPSHOT_KEY, snapshot, SNAPSHOT_TTL);
  return snapshot;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g,  '&')
    .replace(/&lt;/g,   '<')
    .replace(/&gt;/g,   '>')
    .replace(/&#39;/g,  "'")
    .replace(/&nbsp;/g, ' ');
}

// ── Public fetch ──────────────────────────────────────────────────────────────

export async function fetchStations(opts: FetchOptions): Promise<FetchResult> {
  const { lat, lng, radius = 5, fuelType, limit = 30 } = opts;

  let snapshot: Snapshot;
  let fromCache = false;

  try {
    const preFetch = cacheGet<Snapshot>(SNAPSHOT_KEY);
    fromCache = preFetch !== null;
    snapshot  = preFetch ?? await fetchSnapshot();
  } catch (err) {
    console.error('[NT] fetchSnapshot error:', err);
    return {
      stations:    [],
      source:      'nt-myfuelnt',
      cached:      false,
      refreshedAt: 0,
    };
  }

  const nearby = snapshot.stations
    .reduce<Station[]>((acc, s) => {
      const dist = distanceKm(lat, lng, s.lat, s.lng);
      if (dist > radius) return acc;
      acc.push({ ...s, distance: dist });
      return acc;
    }, [])
    .filter(s => !fuelType || s.prices[fuelType] !== null)
    .sort((a, b) =>
      fuelType
        ? (a.prices[fuelType] ?? 9999) - (b.prices[fuelType] ?? 9999)
        : (a.distance ?? 0)           - (b.distance ?? 0)
    )
    .slice(0, limit);

  return {
    stations:    nearby,
    source:      'nt-myfuelnt',
    cached:      fromCache,
    refreshedAt: snapshot.refreshedAt,
  };
}
