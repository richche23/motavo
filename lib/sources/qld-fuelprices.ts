/**
 * Queensland Fuel Price Reporting — Informed Sources aggregator.
 *
 * Sign up FREE at: https://www.fuelpricesqld.com.au
 * You receive a SubscriberToken via email after accepting terms.
 * Env var: QLD_FUEL_API_TOKEN
 *
 * Uses dynamic region ID discovery so the correct QLD region is found
 * automatically for your token rather than relying on a hardcoded value.
 */

import { cacheGet, cacheSet, cacheWrittenAt } from '../cache';
import { distanceKm, normalizeBrand } from '../normalizers';
import { FetchOptions, FetchResult, FuelType, Station } from '../types';

const BASE_URL   = 'https://fppdirectapi-prod.fuelpricesqld.com.au';
const COUNTRY_ID = 21;

const GEO_KEY      = 'qld:geo';
const SITES_KEY    = 'qld:sites';
const SNAPSHOT_KEY = 'qld:snapshot';
const SNAPSHOT_TTL = 10 * 60 * 1000;

const FUEL_ID_MAP: Record<number, FuelType> = {
  1: 'U91', 2: 'U95', 3: 'U98', 4: 'LPG',
  5: 'DSL', 8: 'E10', 10: 'PRDSL', 12: 'E10', 14: 'DSL',
};

type SitePrice = { SiteId: number; FuelId: number; Price: number; TransactionDateUtc: string };
type PricesResponse = { SitePrices: SitePrice[] };
type SiteRaw = { S: number; A: string; N: string; B: string; Suburb: string; State: string; Postcode: string; Lat: number; Lng: number };

function authHeader(): HeadersInit {
  const token = process.env.QLD_FUEL_API_TOKEN;
  if (!token) throw new Error('QLD_FUEL_API_TOKEN not set. Sign up at https://www.fuelpricesqld.com.au');
  return { Authorization: `FPDAPI SubscriberToken=${token}`, 'Content-Type': 'application/json' };
}

async function getQLDRegionId(): Promise<{ level: number; id: number }> {
  const cached = cacheGet<{ level: number; id: number }>(GEO_KEY);
  if (cached) return cached;

  try {
    const res = await fetch(
      `${BASE_URL}/Subscriber/GetCountryGeographicInformation?countryId=${COUNTRY_ID}`,
      { headers: authHeader() }
    );
    if (res.ok) {
      const data = await res.json() as {
        GeographicRegions?: Array<{
          GeoRegionLevel: number; GeoRegionId: number; Name: string;
          SubRegions?: Array<{ GeoRegionId: number; Name: string }>;
        }>;
      };
      const isQLD = (name: string) => /queensland|^qld$/i.test(name);
      for (const r of (data.GeographicRegions ?? [])) {
        if (isQLD(r.Name)) {
          const result = { level: r.GeoRegionLevel, id: r.GeoRegionId };
          cacheSet(GEO_KEY, result, 24 * 60 * 60 * 1000);
          return result;
        }
        for (const sub of (r.SubRegions ?? [])) {
          if (isQLD(sub.Name)) {
            const result = { level: r.GeoRegionLevel + 1, id: sub.GeoRegionId };
            cacheSet(GEO_KEY, result, 24 * 60 * 60 * 1000);
            return result;
          }
        }
      }
      // No name match — try the first available region as fallback
      const first = data.GeographicRegions?.[0];
      if (first) {
        const result = { level: first.GeoRegionLevel, id: first.GeoRegionId };
        cacheSet(GEO_KEY, result, 60 * 60 * 1000);
        return result;
      }
    }
  } catch (e) {
    console.warn('QLD geo discovery error:', e);
  }

  // Hard fallbacks — try level 3 id 1 first (common for Informed Sources QLD)
  const fallback = { level: 3, id: 1 };
  cacheSet(GEO_KEY, fallback, 60 * 60 * 1000);
  return fallback;
}

async function fetchSites(geoLevel: number, geoId: number): Promise<Map<number, SiteRaw>> {
  const key = `${SITES_KEY}:${geoId}`;
  const cached = cacheGet<Map<number, SiteRaw>>(key);
  if (cached) return cached;
  const res = await fetch(
    `${BASE_URL}/Subscriber/GetFullSiteDetails?countryId=${COUNTRY_ID}&geoRegionLevel=${geoLevel}&geoRegionId=${geoId}`,
    { headers: authHeader() }
  );
  if (!res.ok) throw new Error(`QLD sites: ${res.status} ${await res.text()}`);
  const data = await res.json() as { S?: SiteRaw[] };
  const map = new Map<number, SiteRaw>();
  for (const s of (data.S ?? [])) map.set(s.S, s);
  cacheSet(key, map, 24 * 60 * 60 * 1000);
  return map;
}

async function fetchSnapshot(): Promise<Station[]> {
  const cached = cacheGet<Station[]>(SNAPSHOT_KEY);
  if (cached) return cached;

  const { level, id } = await getQLDRegionId();

  const [sites, pricesRes] = await Promise.all([
    fetchSites(level, id),
    fetch(
      `${BASE_URL}/Price/GetSitesPrices?countryId=${COUNTRY_ID}&geoRegionLevel=${level}&geoRegionId=${id}`,
      { headers: authHeader() }
    ),
  ]);
  if (!pricesRes.ok) throw new Error(`QLD prices: ${pricesRes.status} ${await pricesRes.text()}`);
  const priceData = await pricesRes.json() as PricesResponse;

  const now = Date.now();
  const map = new Map<number, Station>();

  for (const [siteId, s] of sites) {
    if (!s.Lat || !s.Lng) continue;
    map.set(siteId, {
      id: `qld-${siteId}`, brand: normalizeBrand(s.B || s.N),
      name: s.N, address: s.A, suburb: s.Suburb,
      state: 'QLD', postcode: s.Postcode,
      lat: s.Lat, lng: s.Lng,
      prices: { U91: null, U95: null, U98: null, E10: null, DSL: null, PRDSL: null, LPG: null },
      updatedAt: 0, updatedMinutesAgo: 9999, source: 'qld-fuelprices',
    });
  }

  for (const p of (priceData.SitePrices ?? [])) {
    const station = map.get(p.SiteId);
    const fuel = FUEL_ID_MAP[p.FuelId];
    if (!station || !fuel) continue;
    station.prices[fuel] = p.Price / 10;
    const ts = p.TransactionDateUtc ? new Date(p.TransactionDateUtc).getTime() : 0;
    if (ts > station.updatedAt) {
      station.updatedAt = ts;
      station.updatedMinutesAgo = Math.max(0, Math.floor((now - ts) / 60000));
    }
  }

  // Don't cache empty results — let the next request retry region discovery
  const stations = Array.from(map.values());
  if (stations.length > 0) cacheSet(SNAPSHOT_KEY, stations, SNAPSHOT_TTL);
  return stations;
}

export async function fetchStations(opts: FetchOptions): Promise<FetchResult> {
  const wasCached = cacheGet<Station[]>(SNAPSHOT_KEY) !== null;
  const snapshot = await fetchSnapshot();
  const refreshedAt = cacheWrittenAt(SNAPSHOT_KEY, SNAPSHOT_TTL);
  const stations = snapshot
    .map(s => ({ ...s, distance: distanceKm(opts.lat, opts.lng, s.lat, s.lng) }))
    .filter(s => s.distance! <= (opts.radius ?? 25))
    .sort((a, b) => a.distance! - b.distance!)
    .slice(0, opts.limit ?? 200);
  return { stations, source: 'qld-fuelprices', cached: wasCached, refreshedAt };
}
