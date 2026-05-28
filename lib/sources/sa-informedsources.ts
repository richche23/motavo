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
 * NOTE: FuelId 1 (U91) does not appear in SA price data. SA sells E10/P95 as cheapest grades.
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

// Maps SA API FuelIds to canonical FuelType values.
// Confirmed present in live data (2026-05): 2,3,4,5,8,12,14,19
// FuelId 1 (U91) is absent — SA does not sell standard 91 unleaded.
// FuelId 19 maps to P98 (confirmed price range ~$2.30/L matches premium 98).
const FUEL_ID_MAP: Record<number, FuelType> = {
  2:  'P95',
  3:  'P98',
  4:  'LPG',
  5:  'DSL',
  8:  'E10',
  10: 'PRDSL',
  12: 'E10',
  14: 'DSL',
  19: 'P98',
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
    // s.N is sometimes a numeric site-registration code (e.g. "3421074").
    // Fall back to the street component of the address when that happens.
    const nameIsCode = /^\d+$/.test(String(s.N || '').trim());
    const displayName = nameIsCode
      ? (s.A?.split(',')[0]?.trim() || String(s.S))
      : (s.N || s.A?.split(',')[0]?.trim() || String(s.S));
    const brandStr = String(s.B || '').trim();
    map.set(s.S, {
      id:       `sa-${s.S}`,
      brand:    normalizeBrand(brandStr || displayName),
      name:     displayName,
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

    station.prices[fuelType] = p.Price / 10; // API returns tenths-of-a-cent; convert to c/L

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
  const { lat, lng, radius = 5, fuelType, limit = 30 } = opts;

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
    // Only filter by fuel type if one was explicitly requested.
    // SA has no U91 — an unfiltered call should still return stations.
    .filter(s => !fuelType || s.prices[fuelType] !== null)
    .sort((a, b) => {
      if (fuelType) {
        return (a.prices[fuelType] ?? 9999) - (b.prices[fuelType] ?? 9999);
      }
      // No fuel type specified — sort by distance
      return (a.distance ?? 0) - (b.distance ?? 0);
    })
    .slice(0, limit);

  return {
    stations:    nearby,
    source:      'sa-informedsources',
    cached:      fromCache,
    refreshedAt: snapshot.refreshedAt,
  };
}
