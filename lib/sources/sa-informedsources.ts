/**
 * South Australia Fuel Pricing Information Scheme — Informed Sources.
 *
 * Apply via: https://www.cbs.sa.gov.au/sections/CBAdvice/fuel-pricing-apps-and-websites
 * Base URL:  https://fppdirectapi-prod.safuelpricinginformation.com.au
 * Env var:   SA_FUEL_API_TOKEN
 *
 * Geographic region:
 *   GeoRegionLevel = 3  (state level)
 *   GeoRegionId    = 4  (SOUTH AUSTRALIA)
 *
 * Confirmed by /Subscriber/GetCountryGeographicRegions?countryId=21 which
 * returns the full region tree. GetCountryGeographicInformation returns 404
 * for this subscriber — do not call it.
 */

import { cacheGet, cacheSet } from '../cache';
import { distanceKm, normalizeBrand } from '../normalizers';
import { FetchOptions, FetchResult, Station } from '../types';

const BASE_URL    = 'https://fppdirectapi-prod.safuelpricinginformation.com.au';
const COUNTRY_ID  = 21;
const GEO_LEVEL   = 3;   // state-level region
const GEO_ID      = 4;   // SOUTH AUSTRALIA

const SITES_KEY    = 'sa:sites';
const SNAPSHOT_KEY = 'sa:snapshot';
const SNAPSHOT_TTL = 10 * 60 * 1000; // 10 minutes

const FUEL_ID_MAP: Record<number, string> = {
  1:  'U91',
  2:  'U95',
  3:  'U98',
  4:  'LPG',
  5:  'DSL',
  8:  'E10',
  10: 'PRDSL',
  12: 'E10',
  14: 'DSL',
};

// ── Raw API shapes ────────────────────────────────────────────────────────────

interface SiteRaw {
  S:  number;  // site ID
  A:  string;  // address
  N:  string;  // name
  B:  string;  // brand (number as string in some responses)
  P:  string;  // postcode
  G1: number;  // suburb geo region ID
  G2: number;  // city/district geo region ID
  G3: number;  // state geo region ID
  Lat: number;
  Lng: number;
}

interface SitePrice {
  SiteId:              number;
  FuelId:              number;
  Price:               number;
  TransactionDateUtc:  string;
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

// ── Snapshot (sites + prices) ─────────────────────────────────────────────────

async function fetchSnapshot(): Promise<Station[]> {
  const cached = cacheGet<Station[]>(SNAPSHOT_KEY);
  if (cached) return cached;

  const headers = authHeader();

  const [sitesRes, pricesRes] = await Promise.all([
    fetch(
      `${BASE_URL}/Subscriber/GetFullSiteDetails` +
      `?countryId=${COUNTRY_ID}&geoRegionLevel=${GEO_LEVEL}&geoRegionId=${GEO_ID}`,
      { headers }
    ),
    fetch(
      `${BASE_URL}/Price/GetSitesPrices` +
      `?countryId=${COUNTRY_ID}&geoRegionLevel=${GEO_LEVEL}&geoRegionId=${GEO_ID}`,
      { headers }
    ),
  ]);

  if (!sitesRes.ok)  throw new Error(`SA sites ${sitesRes.status}: ${await sitesRes.text()}`);
  if (!pricesRes.ok) throw new Error(`SA prices ${pricesRes.status}: ${await pricesRes.text()}`);

  const sitesData  = await sitesRes.json()  as SitesResponse;
  const priceData  = await pricesRes.json() as PricesResponse;

  const now = Date.now();
  const map = new Map<number, Station>();

  for (const s of (sitesData.S ?? [])) {
    if (!s.Lat || !s.Lng) continue;
    map.set(s.S, {
      id:       `sa-${s.S}`,
      brand:    normalizeBrand(String(s.B || s.N)),
      name:     s.N,
      address:  s.A,
      suburb:   '',   // SA full-site response doesn't include a separate suburb field
      state:    'SA',
      postcode: s.P,
      lat:      s.Lat,
      lng:      s.Lng,
      prices: {
        U91: null, U95: null, U98: null,
        E10: null, DSL: null, PRDSL: null, LPG: null,
      },
      updatedAt:          0,
      updatedMinutesAgo:  9999,
      source:             'sa-informedsources',
    });
  }

  for (const p of (priceData.SitePrices ?? [])) {
    const station = map.get(p.SiteId);
    if (!station) continue;
    const fuelType = FUEL_ID_MAP[p.FuelId];
    if (!fuelType) continue;

    const priceCents = p.Price;  // API returns cents (e.g. 198.9)
    const ts         = new Date(p.TransactionDateUtc).getTime();

    if (priceCents > 0) {
      station.prices[fuelType] = priceCents;
      if (ts > station.updatedAt) {
        station.updatedAt         = ts;
        station.updatedMinutesAgo = Math.round((now - ts) / 60_000);
      }
    }
  }

  const stations = Array.from(map.values());
  cacheSet(SNAPSHOT_KEY, stations, SNAPSHOT_TTL);
  return stations;
}

// ── Public fetch ──────────────────────────────────────────────────────────────

export async function fetchStations(opts: FetchOptions): Promise<FetchResult> {
  const { lat, lng, radius = 5, fuelType = 'U91' } = opts;

  let stations: Station[];
  try {
    stations = await fetchSnapshot();
  } catch (err) {
    console.error('[SA] fetchSnapshot error:', err);
    return { stations: [], source: 'sa-informedsources', error: String(err) };
  }

  const nearby = stations
    .filter(s => {
      const dist = distanceKm(lat, lng, s.lat, s.lng);
      if (dist > radius) return false;
      s.distanceKm = dist;
      return true;
    })
    .filter(s => s.prices[fuelType] !== null)
    .sort((a, b) => (a.prices[fuelType] ?? 9999) - (b.prices[fuelType] ?? 9999));

  return { stations: nearby, source: 'sa-informedsources' };
}
