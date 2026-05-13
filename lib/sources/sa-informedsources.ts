/**
 * South Australia Fuel Pricing Information Scheme — Informed Sources.
 *
 * Apply via: https://www.cbs.sa.gov.au/sections/CBAdvice/fuel-pricing-apps-and-websites
 * Base URL:  https://fppdirectapi-prod.safuelpricinginformation.com.au
 * Env var:   SA_FUEL_API_TOKEN
 *
 * Geographic region confirmed via /Subscriber/GetCountryGeographicRegions?countryId=21:
 *   GeoRegionLevel = 3  (state level)
 *   GeoRegionId    = 4  (SOUTH AUSTRALIA)
 *
 * NOTE: GetCountryGeographicInformation returns 404 for this subscriber — never call it.
 */

import { cacheGet, cacheSet } from '../cache';
import { distanceKm, normalizeBrand } from '../normalizers';
import { FetchOptions, FetchResult, FuelType, Station } from '../types';

const BASE_URL   = 'https://fppdirectapi-prod.safuelpricinginformation.com.au';
const COUNTRY_ID = 21;
const GEO_LEVEL  = 3;  // state-level region
const GEO_ID     = 4;  // SOUTH AUSTRALIA

const SNAPSHOT_KEY = 'sa:snapshot';
const SNAPSHOT_TTL = 10 * 60 * 1000; // 10 minutes

// Maps SA API fuel IDs to canonical FuelType values.
const FUEL_ID_MAP: Record<number, FuelType> = {
  1:  'U91',
  2:  'P95',
  3:  'P98',
  4:  'LPG',
  5:  'DSL',
  8:  'E10',
  10: 'PRDSL',
  12: 'E10',
  14: 'DSL',
};

// ── Raw API shapes ────────────────────────────────────────────────────────────

interface SiteRaw {
  S:   number; // site ID
  A:   string; // address
  N:   string; // name
  B:   string; // brand
  P:   string; // postcode
  Lat: number;
  Lng: number;
}

interface SitePrice {
  SiteId:             number;
  FuelId:             number;
  Price:              number;
  TransactionDateUtc: string;
}

interface SitesResponse  { S?: SiteRaw[] }
interface PricesResponse { SitePrices?: SitePrice[] }

// ── Auth ──────────────────────────────────────────────────────────────────────

function authHeader(): HeadersInit {
  const token = process.env.SA_FUEL_API_TOKEN;
  if (!token) throw new Error('SA_FUEL_API_TOKEN not set');
  return {
    Authorization:  `FPDAPI SubscriberToken=${token}`,
    'Content-Type': 'application/json',
  };
}

// ── Snapshot (all SA stations + current prices) ───────────────────────────────

interface Snapshot {
  stations:    Station[];
  refreshedAt: number;
}

async function fetchSnapshot(): Promise<Snapshot> {
  const cached = cacheGet<Snapshot>(SNAPSHOT_KEY);
  if (cached) return cached;

  const headers = authHeader();
  const params  = `countryId=${COUNTRY_ID}&geoRegionLevel=${GEO_LEVEL}&geoRegionId=${GEO_ID}`;

  const [sitesRes, pricesRes] = await Promise.all([
    fetch(`${BASE_URL}/Subscriber/GetFullSiteDetails?${params}`, { headers }),
    fetch(`${BASE_URL}/Price/GetSitesPrices?${params}`,          { headers }),
  ]);

  if (!sitesRes.ok)  throw new Error(`SA sites ${sitesRes.status}: ${await sitesRes.text()}`);
  if (!pricesRes.ok) throw new Error(`SA prices ${pricesRes.status}: ${await pricesRes.text()}`);

  const sitesData  = await sitesRes.json()  as SitesResponse;
  const pricesData = await pricesRes.json() as PricesResponse;

  const refreshedAt = Date.now();
  const map         = new Map<number, Station>();

  for (const s of (sitesData.S ?? [])) {
    if (!s.Lat || !s.Lng) continue;
    map.set(s.S, {
      id:       `sa-${s.S}`,
      brand:    normalizeBrand(String(s.B || s.N)),
      name:     s.N,
      address:  s.A,
      suburb:   '',
      state:    'SA',
      postcode: s.P,
      lat:      s.Lat,
      lng:      s.Lng,
      prices: {
        U91: null, P95: null, P98: null,
        E10: null, DSL: null, PRDSL: null, LPG: null,
      },
      updatedAt:         0,
      updatedMinutesAgo: 9999,
      source:            'sa-informedsources',
    });
  }

  for (const p of (pricesData.SitePrices ?? [])) {
    const station  = map.get(p.SiteId);
    if (!station) continue;
    const fuelType = FUEL_ID_MAP[p.FuelId];
    if (!fuelType) continue;
    if (p.Price <= 0) continue;

    station.prices[fuelType] = p.Price;

    const ts = new Date(p.TransactionDateUtc).getTime();
    if (ts > station.updatedAt) {
      station.updatedAt         = ts;
      station.updatedMinutesAgo = Math.round((refreshedAt - ts) / 60_000);
    }
  }

  const snapshot: Snapshot = { stations: Array.from(map.values()), refreshedAt };
  cacheSet(SNAPSHOT_KEY, snapshot, SNAPSHOT_TTL);
  return snapshot;
}

// ── Public fetch ──────────────────────────────────────────────────────────────

export async function fetchStations(opts: FetchOptions): Promise<FetchResult> {
  const { lat, lng, radius = 5, fuelType = 'U91', limit = 30 } = opts;

  let snapshot: Snapshot;
  let fromCache = false;

  try {
    const preFetch = cacheGet<Snapshot>(SNAPSHOT_KEY);
    fromCache = preFetch !== null;
    snapshot  = preFetch ?? await fetchSnapshot();
  } catch (err) {
    console.error('[SA] fetchSnapshot error:', err);
    return {
      stations:    [],
      source:      'sa-informedsources',
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
    .filter(s => s.prices[fuelType] !== null)
    .sort((a, b) => (a.prices[fuelType] ?? 9999) - (b.prices[fuelType] ?? 9999))
    .slice(0, limit);

  return {
    stations:    nearby,
    source:      'sa-informedsources',
    cached:      fromCache,
    refreshedAt: snapshot.refreshedAt,
  };
}
