/**
 * VIC Fair Fuel Open Data API — Service Victoria
 *
 * Official API. Register at:
 * https://service.vic.gov.au/find-services/transport-and-driving/servo-saver/help-centre/servo-saver-public-api
 * Env var: VIC_SERVOSAVER_API_KEY  (issued as x-consumer-id on approval)
 *
 * Base URL:  https://api.fuel.service.vic.gov.au/open-data/v1
 * Endpoint:  GET /fuel/prices  — all Victorian stations + 24hr-delayed prices
 *
 * Prices are in cents per litre (decimal, e.g. 188.8 = 188.8 c/L).
 * Stored as integer tenths-of-a-cent to match SA/NT format (e.g. 1888).
 *
 * Rate limit: 10 requests per 60 seconds — our 10-minute cache makes this
 * trivially easy to stay within.
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

interface VICPricesResponse {
  fuelPriceDetails: VICPriceDetail[];
}

// ── Auth headers ──────────────────────────────────────────────────────────────

function authHeaders(): HeadersInit {
  const key = process.env.VIC_SERVOSAVER_API_KEY;
  if (!key) throw new Error('VIC_SERVOSAVER_API_KEY not set');
  return {
    'User-Agent':      'FuelMate/1.0 (+https://fuelmate.au)',
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

  const res = await fetch(`${BASE_URL}/fuel/prices`, {
    headers: authHeaders(),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`VIC prices ${res.status}: ${body.substring(0, 200)}`);
  }

  const data        = await res.json() as VICPricesResponse;
  const refreshedAt = Date.now();
  const details     = data.fuelPriceDetails ?? [];

  const stations: Station[] = details
    .filter(d => d.fuelStation.location.latitude && d.fuelStation.location.longitude)
    .map(d => {
      const s      = d.fuelStation;
      const prices: Record<FuelType, number | null> = {
        U91: null, P95: null, P98: null,
        E10: null, DSL: null, PRDSL: null, LPG: null,
      };

      for (const p of (d.fuelPrices ?? [])) {
        const ft = VIC_FUEL_MAP[p.fuelType];
        if (!ft || !p.isAvailable || p.price === null) continue;
        // Convert decimal cents → integer tenths-of-a-cent (e.g. 188.8 → 1888)
        prices[ft] = Math.round(p.price * 10);
      }

      // Parse suburb from address: last suburb component before state + postcode
      const suburbMatch = s.address.match(/,\s*([^,]+)\s+VIC\s+\d{4}/i);
      const suburb      = suburbMatch ? suburbMatch[1].trim() : '';
      const postcodeMatch = s.address.match(/VIC\s+(\d{4})/i);
      const postcode    = postcodeMatch ? postcodeMatch[1] : undefined;

      const updatedAt = new Date(d.updatedAt).getTime() || refreshedAt;

      return {
        id:               `vic-${s.id}`,
        brand:            normalizeBrand(s.brandId || s.name),
        name:             s.name,
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
    .sort((a, b) =>
      fuelType
        ? (a.prices[fuelType] ?? 9999) - (b.prices[fuelType] ?? 9999)
        : (a.distance ?? 0)           - (b.distance ?? 0)
    )
    .slice(0, limit);

  return {
    stations:    nearby,
    source:      'vic-servosaver',
    cached:      fromCache,
    refreshedAt: snapshot.refreshedAt,
  };
}
