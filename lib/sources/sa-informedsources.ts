/**
 * South Australia Fuel Pricing Information Scheme — Informed Sources.
 *
 * Apply via: https://www.cbs.sa.gov.au/sections/CBAdvice/fuel-pricing-apps-and-websites
 * Env var:   SA_FUEL_API_TOKEN
 *
 * This version discovers the correct SA region ID dynamically by calling the
 * geographic information endpoint first, so it doesn't rely on a hardcoded
 * region ID that may differ between subscriber accounts.
 */

import { cacheGet, cacheSet, cacheWrittenAt } from '../cache';
import { distanceKm, normalizeBrand } from '../normalizers';
import { FetchOptions, FetchResult, FuelType, Station } from '../types';

const BASE_URL = 'https://fppdirectapi-prod.safuelpricinginformation.com.au';
const COUNTRY_ID = 21; // Australia

const GEO_KEY      = 'sa:geo';
const SITES_KEY    = 'sa:sites';
const SNAPSHOT_KEY = 'sa:snapshot';
const SNAPSHOT_TTL = 10 * 60 * 1000; // 10 minutes

const FUEL_ID_MAP: Record<number, FuelType> = {
  1: 'U91', 2: 'P95', 3: 'P98', 4: 'LPG',
  5: 'DSL', 8: 'E10', 10: 'PRDSL', 12: 'E10', 14: 'DSL',
};

type SitePrice = { SiteId: number; FuelId: number; Price: number; TransactionDateUtc: string };
type PricesResponse = { SitePrices: SitePrice[] };
type SiteRaw = { S: number; A: string; N: string; B: string; Suburb: string; State: string; Postcode: string; Lat: number; Lng: number };

function authHeader(): HeadersInit {
  const token = process.env.SA_FUEL_API_TOKEN;
  if (!token) throw new Error('SA_FUEL_API_TOKEN not set');
  return { Authorization: `FPDAPI SubscriberToken=${token}`, 'Content-Type': 'application/json' };
}

/**
 * Discover the SA state-level geoRegionId dynamically.
 * Calls /Subscriber/GetCountryGeographicInformation and looks for the
 * region whose name contains "South Australia".
 * Falls back to geoRegionId=2 if the lookup fails.
 */
async function getSARegionId(): Promise<{ level: number; id: number }> {
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
      console.log('[SA] geo regions:', JSON.stringify(data.GeographicRegions?.map(r => ({ id: r.GeoRegionId, name: r.Name, level: r.GeoRegionLevel }))));
      const isSA = (name: string) => /south.?australia|^sa$/i.test(name);
      for (const r of (data.GeographicRegions ?? [])) {
        if (isSA(r.Name)) {
          const result = { level: r.GeoRegionLevel, id: r.GeoRegionId };
          cacheSet(GEO_KEY, result, 24 * 60 * 60 * 1000);
          return result;
        }
        for (const sub of (r.SubRegions ?? [])) {
          if (isSA(sub.Name)) {
            const result = { level: r.GeoRegionLevel + 1, id: sub.GeoRegionId };
            cacheSet(GEO_KEY, result, 24 * 60 * 60 * 1000);
            return result;
          }
        }
      }
      // No name match — use first available region
      const first = data.GeographicRegions?.[0];
      if (first) {
        const result = { level: first.GeoRegionLevel, id: first.GeoRegionId };
        cacheSet(GEO_KEY, result, 60 * 60 * 1000);
        return result;
      }
    }
  } catch (e) {
    console.warn('SA geo discovery error:', e);
  }

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
  if (!res.ok) throw new Error(`SA sites: ${res.status} ${await res.text()}`);
  const data = await res.json() as { S?: SiteRaw[] };
  const map = new Map<number, SiteRaw>();
  for (const s of (data.S ?? [])) map.set(s.S, s);
  cacheSet(key, map, 24 * 60 * 60 * 1000);
  return map;
}

async function fetchSnapshot(): Promise<Station[]> {
  const cached = cacheGet<Station[]>(SNAPSHOT_KEY);
  if (cached) return cached;

  const { level, id } = await getSARegionId();
  console.log('[SA] Using region level=%d id=%d', level, id);

  const [sitesRes, pricesRes] = await Promise.all([
    fetch(`${BASE_URL}/Subscriber/GetFullSiteDetails?countryId=${COUNTRY_ID}&geoRegionLevel=${level}&geoRegionId=${id}`, { headers: authHeader() }),
    fetch(`${BASE_URL}/Price/GetSitesPrices?countryId=${COUNTRY_ID}&geoRegionLevel=${level}&geoRegionId=${id}`,           { headers: authHeader() }),
  ]);

  console.log('[SA] sites status=%d prices status=%d', sitesRes.status, pricesRes.status);

  if (!sitesRes.ok)  { const t = await sitesRes.text();  console.error('[SA] sites error:', t);  throw new Error(`SA sites: ${sitesRes.status} ${t}`);  }
  if (!pricesRes.ok) { const t = await pricesRes.text(); console.error('[SA] prices error:', t); throw new Error(`SA prices: ${pricesRes.status} ${t}`); }

  const sitesData = await sitesRes.json() as { S?: SiteRaw[] };
  const priceData = await pricesRes.json() as PricesResponse;

  console.log('[SA] sites count=%d prices count=%d', sitesData.S?.length ?? 0, priceData.SitePrices?.length ?? 0);

  const now = Date.now();
  const map = new Map<number, Station>();

  for (const s of (sitesData.S ?? [])) {
    if (!s.Lat || !s.Lng) continue;
    map.set(s.S, {
      id: `sa-${s.S}`, brand: normalizeBrand(s.B || s.N),
      name: s.N, address: s.A, suburb: s.Suburb,
      state: 'SA', postcode: s.Postcode,
      lat: s.Lat, lng: s.Lng,
      prices: { U91: null, P95: null, P98: null, E10: null, DSL: null, PRDSL: null, LPG: null },
      updatedAt: 0, updatedMinutesAgo: 9999, source: 'sa-informedsources',
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
    .filter(s => s.distance! <= (opts.radius ?? 5))
    .filter(s => opts.fuelType ? s.prices[opts.fuelType] != null : true)
    .sort((a, b) => a.distance! - b.distance!)
    .slice(0, opts.limit ?? 30);
  return { stations, source: 'sa-informedsources', cached: wasCached, refreshedAt };
}
