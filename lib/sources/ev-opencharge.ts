/**
 * Open Charge Map — EV charger locations for Australia.
 *
 * Auth: free API key. Env var: OPENCHARGEMAP_API_KEY
 *   Get one at https://openchargemap.org/site/loginprovider/beginlogin
 * Docs: https://openchargemap.org/site/develop/api
 *
 * Strategy: query POIs around a point, normalize to EVStation[], attach an
 * INDICATIVE network tariff by operator (see lib/ev-tariffs.ts). Locations are
 * live/community-maintained; pricing is indicative, never live per-charger.
 *
 * Cache: per rounded lat/lng/radius for 30 min (locations change slowly).
 */
import { cacheGet, cacheSet, cacheWrittenAt } from '../cache';
import { distanceKm } from '../normalizers';
import { getTariff } from '../ev-tariffs';
import type {
  ChargerLevel, ConnectorType, EVConnector, EVFetchOptions, EVFetchResult, EVStation, StateCode,
} from '../types';

const BASE = 'https://api.openchargemap.io/v3/poi/';
const SNAPSHOT_TTL = 30 * 60 * 1000; // 30 min

type OCMConnection = {
  ConnectionType?: { Title?: string } | null;
  Level?: { Title?: string; IsFastChargeCapable?: boolean } | null;
  CurrentType?: { Title?: string } | null;
  PowerKW?: number | null;
  Quantity?: number | null;
};
type OCMPoi = {
  ID: number;
  AddressInfo?: {
    Title?: string; AddressLine1?: string; Town?: string;
    StateOrProvince?: string; Postcode?: string;
    Latitude?: number; Longitude?: number; Distance?: number;
  } | null;
  Connections?: OCMConnection[] | null;
  OperatorInfo?: { Title?: string } | null;
  UsageCost?: string | null;
  StatusType?: { IsOperational?: boolean } | null;
};

function connectorType(title?: string): ConnectorType {
  const t = (title || '').toLowerCase();
  if (t.includes('ccs')) return 'CCS2';
  if (t.includes('chademo')) return 'CHAdeMO';
  if (t.includes('tesla')) return 'Tesla';
  if (t.includes('type 2') || t.includes('mennekes')) return 'Type2';
  if (t.includes('type 1') || t.includes('j1772')) return 'Type1';
  return 'Other';
}

function levelOf(c: OCMConnection): ChargerLevel | null {
  const ct = (c.CurrentType?.Title || '').toLowerCase();
  if (ct.includes('dc')) return 'DC';
  if (ct.includes('ac')) return 'AC';
  if (c.Level?.IsFastChargeCapable) return 'DC';
  if (typeof c.PowerKW === 'number') return c.PowerKW >= 25 ? 'DC' : 'AC';
  return null;
}

const STATE_MAP: Record<string, StateCode> = {
  'new south wales': 'NSW', nsw: 'NSW',
  victoria: 'VIC', vic: 'VIC',
  queensland: 'QLD', qld: 'QLD',
  'western australia': 'WA', wa: 'WA',
  'south australia': 'SA', sa: 'SA',
  tasmania: 'TAS', tas: 'TAS',
  'northern territory': 'NT', nt: 'NT',
  'australian capital territory': 'ACT', act: 'ACT',
};
function stateCode(raw?: string): StateCode | undefined {
  if (!raw) return undefined;
  return STATE_MAP[raw.trim().toLowerCase()];
}

function normalizePoi(poi: OCMPoi, qLat: number, qLng: number): EVStation | null {
  const a = poi.AddressInfo;
  if (!a || typeof a.Latitude !== 'number' || typeof a.Longitude !== 'number') return null;

  const conns = poi.Connections || [];
  const byType = new Map<ConnectorType, EVConnector>();
  let maxPowerKw: number | null = null;
  for (const c of conns) {
    const type = connectorType(c.ConnectionType?.Title || undefined);
    const power = typeof c.PowerKW === 'number' ? c.PowerKW : null;
    const level = levelOf(c);
    if (power != null) maxPowerKw = Math.max(maxPowerKw ?? 0, power);
    const existing = byType.get(type);
    const count = c.Quantity && c.Quantity > 0 ? c.Quantity : 1;
    if (existing) {
      existing.count += count;
      if (power != null) existing.powerKw = Math.max(existing.powerKw ?? 0, power);
      if (!existing.level && level) existing.level = level;
    } else {
      byType.set(type, { type, powerKw: power, level, count });
    }
  }
  const connectors = [...byType.values()];

  // dominant level: DC if any DC connector present
  const level: ChargerLevel | null =
    connectors.some(c => c.level === 'DC') ? 'DC'
    : connectors.some(c => c.level === 'AC') ? 'AC'
    : null;

  const operator = poi.OperatorInfo?.Title || 'Unknown network';
  const distance = typeof a.Distance === 'number'
    ? a.Distance
    : distanceKm(qLat, qLng, a.Latitude, a.Longitude);

  return {
    id: `ocm-${poi.ID}`,
    name: a.Title || operator,
    network: operator,
    address: [a.AddressLine1, a.Town].filter(Boolean).join(', '),
    suburb: a.Town || '',
    state: stateCode(a.StateOrProvince),
    postcode: a.Postcode || undefined,
    lat: a.Latitude,
    lng: a.Longitude,
    connectors,
    maxPowerKw,
    level,
    tariff: getTariff(operator),
    usageCostRaw: poi.UsageCost ?? null,
    operational: poi.StatusType?.IsOperational ?? null,
    distance: Math.round(distance * 10) / 10,
    source: 'opencharge',
  };
}

export async function fetchStations(opts: EVFetchOptions): Promise<EVFetchResult> {
  const { lat, lng } = opts;
  const radius = opts.radius ?? 10;
  const limit = opts.limit ?? 40;

  const key = process.env.OPENCHARGEMAP_API_KEY;
  if (!key) {
    throw new Error(
      'Open Charge Map API key missing — set OPENCHARGEMAP_API_KEY in the environment ' +
      '(free key from https://openchargemap.org/site/develop/api).'
    );
  }

  const cacheKey = `ev:${lat.toFixed(2)}:${lng.toFixed(2)}:${radius}`;
  const cached = cacheGet<EVStation[]>(cacheKey);
  let stations: EVStation[];
  let cacheHit = true;

  if (cached) {
    stations = cached;
  } else {
    cacheHit = false;
    const params = new URLSearchParams({
      output: 'json',
      countrycode: 'AU',
      latitude: String(lat),
      longitude: String(lng),
      distance: String(radius),
      distanceunit: 'KM',
      maxresults: '120',
      key,
    });
    const res = await fetch(`${BASE}?${params}`, { headers: { 'X-API-Key': key } });
    if (!res.ok) {
      throw new Error(`Open Charge Map fetch failed: ${res.status} ${await res.text()}`);
    }
    const raw = (await res.json()) as OCMPoi[];
    stations = raw
      .map(p => normalizePoi(p, lat, lng))
      .filter((s): s is EVStation => s !== null)
      .sort((a, b) => (a.distance ?? 1e9) - (b.distance ?? 1e9));

    // Verification logging (mirrors the fuel sources — confirm live shape on Vercel)
    const withTariff = stat
