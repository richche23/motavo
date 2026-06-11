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
  U91:  'U91',
  LAF:  'U91',   // Low Aromatic Fuel — NT-mandated U91 substitute
  ALLU: 'U91',   // "Equivalent Unleaded" — appears as a top-level code in search results
  P95:  'P95',
  P98:  'P98',
  E10:  'E10',
  DL:   'DSL',
  DSL:  'DSL',
  PD:   'PRDSL',
  PRDSL:'PRDSL',
  LPG:  'LPG',
};

/**
 * Parse one NT price entry into the prices record. Deliberately tolerant:
 * the NT site has no versioned API (we scrape), so field drift must degrade
 * gracefully, not silently null every price.
 *  - IsAvailable: only an explicit `false` excludes — a missing/renamed
 *    field must not zero out the whole territory.
 *  - FuelCode: trimmed + uppercased before mapping.
 *  - Price: accepts number or string.
 */
function applyNtPrice(
  prices: Record<FuelType, number | null>,
  rawCode: unknown,
  rawPrice: unknown,
  isAvailable: unknown
) {
  if (isAvailable === false) return;
  const code = String(rawCode ?? '').trim().toUpperCase();
  const ft = NT_CODE_MAP[code];
  if (!ft) return;
  const p = parseFloat(String(rawPrice));
  if (isNaN(p) || p <= 0) return;
  // NT site prices are decimal cents per litre (e.g. "235.9"), which is
  // already the app's canonical format — QLD/SA receive tenths from their
  // APIs and divide by 10 to reach this same format. (A stale comment here
  // previously claimed the canonical format was tenths, and NT multiplied
  // by 10 — making it the only source storing 2359 for 235.9¢/L.)
  const val = Math.round(p * 10) / 10;
  const existing = prices[ft];
  // Keep the lower price if multiple NT codes map to the same FuelType (e.g. U91 + LAF).
  if (existing === null || val < existing) prices[ft] = val;
}

// ── Raw types from serverJson ─────────────────────────────────────────────────
// MyFuel NT restructured this payload (observed June 2026): the prices array
// is now `AvailableFuels` (was `AllFuels`), entry availability is lowercase
// `isAvailable`, outlet id is `FuelOutletId`, name is `OutletName`, brand is
// `OutletBrandIdentifier`. We read new names first and fall back to old ones.

interface NTFuelEntry {
  FuelCode:     string;
  Price:        number | string;   // decimal cents, e.g. 198 or "235.9"
  isAvailable?: boolean;           // current shape (lowercase i)
  IsAvailable?: boolean;           // legacy shape
}

interface NTOutlet {
  FuelOutletId?: number;           // current
  OutletId?:     number;           // legacy
  OutletName?:   string;           // current
  Name?:         string;           // legacy
  FullAddress?:  string;
  Address?:      string;
  Suburb:        string;
  Postcode:      string;
  Latitude:      number;
  Longitude:     number;
  OutletBrandIdentifier?: string;  // current
  FuelBrandIdentifier?:   string;  // current (per-fuel brand)
  BrandId?:      string;           // legacy
  FuelCode?:     string | null;
  FuelPrice?:    number | string;            // legacy top-level price
  FuelPriceForSelectedCode?: number | string;// current top-level price
  IsActive?:     boolean;
  AvailableFuels?: NTFuelEntry[];  // current
  AllFuels?:       NTFuelEntry[];  // legacy
}

interface NTServerJson {
  FuelOutlet: NTOutlet[];
}

/**
 * Map raw NT outlets → canonical Stations. Exported for unit testing against
 * captured payloads.
 */
export function parseNtOutlets(outlets: NTOutlet[], refreshedAt: number): Station[] {
  return outlets
    .filter(o => o.IsActive !== false && o.Latitude && o.Longitude)
    .map(o => {
      const prices: Record<FuelType, number | null> = {
        U91: null, P95: null, P98: null,
        E10: null, DSL: null, PRDSL: null, LPG: null,
      };

      const fuelEntries = o.AvailableFuels ?? o.AllFuels ?? [];
      for (const f of fuelEntries) {
        applyNtPrice(prices, f.FuelCode, f.Price, f.isAvailable ?? f.IsAvailable);
      }

      // Fallback: the searched fuel's price also appears top-level.
      if (Object.values(prices).every(p => p === null)) {
        applyNtPrice(prices, o.FuelCode, o.FuelPriceForSelectedCode ?? o.FuelPrice, undefined);
      }

      const id    = o.FuelOutletId ?? o.OutletId;
      const name  = o.OutletName ?? o.Name ?? 'Unknown';
      const brand = o.OutletBrandIdentifier || o.FuelBrandIdentifier || o.BrandId || name;

      return {
        id:               `nt-${id}`,
        brand:            normalizeBrand(brand),
        name,
        address:          o.FullAddress || [o.Address, o.Suburb, 'NT', o.Postcode].filter(Boolean).join(', '),
        suburb:           (o.Suburb || '').trim(),
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
}

// ── Snapshot ──────────────────────────────────────────────────────────────────

interface Snapshot {
  stations:    Station[];
  refreshedAt: number;
}

async function fetchSnapshot(): Promise<Snapshot> {
  const cached = cacheGet<Snapshot>(SNAPSHOT_KEY);
  if (cached) return cached;

  const ua = 'Mozilla/5.0 (compatible; Motavo/1.0; +https://motavo.com.au)';

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
  const stations    = parseNtOutlets(outlets, refreshedAt);

  // Self-diagnosing log: stations without prices is exactly the failure mode
  // that hides behind a green status page. If it happens, say so loudly and
  // include a payload sample so the fix is obvious from Vercel logs alone.
  const priced = stations.filter(s => Object.values(s.prices).some(p => p !== null)).length;
  if (stations.length > 0 && priced === 0) {
    const sample = outlets[0] ?? {};
    console.error(
      `[NT] DEGRADED: ${stations.length} stations parsed but 0 have prices — ` +
      `payload shape likely changed. Outlet keys: [${Object.keys(sample).join(', ')}]. ` +
      `AllFuels sample: ${JSON.stringify((sample as any).AllFuels?.slice?.(0, 2) ?? null)}`
    );
  }

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
