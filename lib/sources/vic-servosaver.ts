/**
 * VIC Fair Fuel Open Data API — Service Victoria
 *
 * Official API. Register at:
 * https://service.vic.gov.au/find-services/transport-and-driving/servo-saver/help-centre/servo-saver-public-api
 * Env var: VIC_SERVOSAVER_API_KEY  (issued as x-consumer-id on approval)
 *
 * Base URL:  https://api.fuel.service.vic.gov.au/open-data/v1
 *
 * Two endpoints used per snapshot:
 *   GET /fuel/reference-data/brands  — resolve brandId → human name
 *   GET /fuel/prices                 — all Victorian stations + 24hr-delayed prices
 *
 * NOTE: brandId in the prices response is a Salesforce record ID, not a brand
 * code. The brands endpoint maps it to a human name (e.g. "BP", "Shell").
 *
 * NOTE: Live API returns prices in tenths-of-a-cent (same as SA/QLD),
 * despite docs claiming "cents per litre". Do NOT multiply by 10.
 *
 * Rate limit: 10 requests per 60 seconds.
 */

import { randomUUID } from 'crypto';
import { cacheGet, cacheSet } from '../cache';
import { distanceKm, normalizeBrand } from '../normalizers';
import { FetchOptions, FetchResult, FuelType, Station } from '../types';

const BASE_URL     = 'https://api.fuel.service.vic.gov.au/open-data/v1';
const SNAPSHOT_KEY = 'vic:snapshot';
const SNAPSHOT_TTL = 10 * 60 * 1000; // 10 minutes

// VIC API fuel type codes → canonical FuelType.
// Note: VIC uses PDSL (not PRDSL) for Premium Diesel.
const VIC_FUEL_MAP: Partial<Record<string, FuelType>> = {
  U91:  'U91',
  P95:  'P95',
  P98:  'P98',
  DSL:  'DSL',
  PDSL: 'PRDSL',
  E10:  'E10',
  LPG:  'LPG',
  // E85, B20, LNG, CNG have no canonical FuelType — skipped
};

// ── Raw API types ─────────────────────────────────────────────────────────────

interface VICBrand {
  id:   string;
  name: string;
  type: string;
}

interface VICLocation {
  latitude:  number | null;
  longitude: number | null;
}

interface VICStation {
  id:           string;
  name:         string;
  brandId:      string;
  address:      string;
  contactPhone: string | null;
  location:     VICLocation;
}

interface VICPriceItem {
  fuelType:    string;
  price:       number | null;
  isAvailable: boolean;
  updatedAt:   string;
}

interface VICPriceDetail {
  fuelStation: VICStation;
  fuelPrices:  VICPriceItem[];
  updatedAt:   string;
}

interface VICBrandsResponse   { brands: VICBrand[] }
interface VICPricesResponse   { fuelPriceDetails: VICPriceDetail[] }

// ── Auth headers ──────────────────────────────────────────────────────────────

function authHeaders(): HeadersInit {
  const key = process.env.VIC_SERVOSAVER_API_KEY;
  if (!key) throw new Error('VIC_SERVOSAVER_API_KEY not set');
  return {
    'User-Agent':      'Motavo/1.0 (+https://motavo.au)',
    'x-consumer-id':   key,
    'x-transactionid': randomUUID(),
    'Content-Type':    'application/json',
  };
}

// ── Snapshot ──────────────────────────────────────────────────────────────────

interface Snapshot {
  stations:    Station[];
  refreshedAt: number;
}

async function fetchSnapshot(): Promise<Snapshot> {
  const cached = cacheGet<Snapshot>(SNAPSHOT_KEY);
  if (cached) return cached;

  // Fetch brands and prices in parallel (each needs its own transaction ID).
  const [brandsRes, pricesRes] = await Promise.all([
    fetch(`${BASE_URL}/fuel/reference-data/brands`, { headers: authHeaders() }),
    fetch(`${BASE_URL}/fuel/prices`,                { headers: authHeaders() }),
  ]);

  if (!brandsRes.ok) {
    const body = await brandsRes.text().catch(() => '');
    throw new Error(`VIC brands ${brandsRes.status}: ${body.substring(0, 200)}`);
  }
  if (!pricesRes.ok) {
    const body = await pricesRes.text().catch(() => '');
    throw new Error(`VIC prices ${pricesRes.status}: ${body.substring(0, 200)}`);
  }

  const [brandsData, pricesData] = await Promise.all([
    brandsRes.json() as Promise<VICBrandsResponse>,
    pricesRes.json() as Promise<VICPricesResponse>,
  ]);

  // Build brandId → human-readable name lookup.
  const brandMap = new Map<string, string>();
  for (const b of (brandsData.brands ?? [])) {
    if (b.id && b.name) brandMap.set(b.id, b.name);
  }

  const refreshedAt = Date.now();
  const details     = pricesData.fuelPriceDetails ?? [];

  const stations: Station[] = details
    .filter(d => d.fuelStation.location.latitude && d.fuelStation.location.longitude)
    .map(d => {
      const s = d.fuelStation;

      const prices: Record<FuelType, number | null> = {
        U91: null, P95: null, P98: null,
        E10: null, DSL: null, PRDSL: null, LPG: null,
      };

      for (const p of (d.fuelPrices ?? [])) {
        const ft = VIC_FUEL_MAP[p.fuelType];
        if (!ft || !p.isAvailable || p.price === null) continue;
        // Live data is already in tenths-of-a-cent (same as SA/QLD).
        prices[ft] = Math.round(p.price);
      }

      // Resolve brand name from the brands lookup.
      // brandId in the prices response is a Salesforce record ID —
      // the brands endpoint maps it to a human-readable name.
      const brandName = brandMap.get(s.brandId) || s.brandId || 'Independent';

      const suburbMatch   = s.address.match(/,\s*([^,]+)\s+VIC\s+\d{4}/i);
      const suburb        = suburbMatch ? suburbMatch[1].trim() : '';
      const postcodeMatch = s.address.match(/VIC\s+(\d{4})/i);
      const postcode      = postcodeMatch ? postcodeMatch[1] : undefined;
      const updatedAt     = new Date(d.updatedAt).getTime() || refreshedAt;

      return {
        id:               `vic-${s.id}`,
        brand:            normalizeBrand(brandName),
        name:             s.name && s.name !== s.id ? s.name : `${brandName} ${suburb || s.address.split(',')[0]?.trim() || ''}`.trim(),
        address:          s.address,
        suburb,
        state:            'VIC' as const,
        postcode,
        lat:              s.location.latitude!,
        lng:              s.location.longitude!,
        prices,
        updatedAt,
        updatedMinutesAgo: Math.round((refreshedAt - updatedAt) / 60_000),
        source:           'vic-servosaver',
      } satisfies Station;
    });

  const snapshot: Snapshot = { stations, refreshedAt };
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
    console.error('[VIC] fetchSnapshot error:', err);
    return {
      stations:    [],
      source:      'vic-servosaver',
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
    .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0)) // always sort by distance — frontend handles price/distance toggle
    .slice(0, limit);

  return {
    stations:    nearby,
    source:      'vic-servosaver',
    cached:      fromCache,
    refreshedAt: snapshot.refreshedAt,
  };
}
