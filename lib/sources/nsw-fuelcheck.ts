/**
 * NSW FuelCheck — covers NSW, TAS, ACT.
 *
 * Auth: OAuth client credentials (Basic -> Bearer token).
 * Env vars: NSW_FUELCHECK_API_KEY, NSW_FUELCHECK_API_SECRET
 * Rate limit: 2,500 calls/month free tier. Request higher tier via api.nsw.gov.au.
 *
 * Strategy: one /prices call fetches ALL NSW/ACT/TAS stations + prices.
 * Cache that snapshot for 15 minutes; serve all user queries from the cache.
 */

import { cacheGet, cacheSet, cacheWrittenAt } from '../cache';
import { distanceKm, normalizeBrand, normalizeFuelType, parseAddress } from '../normalizers';
import { FetchOptions, FetchResult, FuelType, Station, StateCode } from '../types';

const BASE = 'https://api.onegov.nsw.gov.au/FuelCheckApp/v1';
const TOKEN_URL = 'https://api.onegov.nsw.gov.au/oauth/client_credential/accesstoken?grant_type=client_credentials';
const TOKEN_KEY = 'nsw:token';
const SNAPSHOT_KEY = 'nsw:snapshot';
const SNAPSHOT_TTL = 15 * 60 * 1000; // 15 min — adjust based on your quota

type NSWStationRaw = {
  code: string;
  brand: string;
  name: string;
  address: string;
  location: { latitude: number; longitude: number };
  state: string;
};

type NSWPriceRaw = {
  stationcode: string;
  fueltype: string;
  price: number;
  lastupdated: string;  // "DD/MM/YYYY hh:mm:ss"
};

async function getAccessToken(): Promise<string> {
  const cached = cacheGet<string>(TOKEN_KEY);
  if (cached) return cached;

  const key = process.env.NSW_FUELCHECK_API_KEY;
  const secret = process.env.NSW_FUELCHECK_API_SECRET;
  if (!key || !secret) {
    throw new Error(
      `NSW FuelCheck credentials missing — ` +
      `KEY: ${key ? `set (${key.length} chars)` : 'NOT SET'}, ` +
      `SECRET: ${secret ? `set (${secret.length} chars)` : 'NOT SET'}`
    );
  }

  const basic = Buffer.from(`${key}:${secret}`).toString('base64');
  const res = await fetch(TOKEN_URL, {
    method: 'GET',
    headers: { Authorization: `Basic ${basic}` },
  });
  if (!res.ok) {
    throw new Error(`NSW token exchange failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { access_token: string; expires_in: string };
  const expiresMs = (parseInt(data.expires_in, 10) - 60) * 1000;
  cacheSet(TOKEN_KEY, data.access_token, expiresMs);
  return data.access_token;
}

function formatTimestamp(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const day = pad(d.getDate());
  const month = pad(d.getMonth() + 1);
  const year = d.getFullYear();
  const hours = pad(d.getHours());
  const min = pad(d.getMinutes());
  const sec = pad(d.getSeconds());
  return `${day}/${month}/${year} ${hours}:${min}:${sec}`;
}

function parseTimestamp(s: string): number {
  const [datePart, timePart] = s.split(' ');
  if (!datePart || !timePart) return 0;
  const [d, m, y] = datePart.split('/').map(Number);
  const [hh, mm, ss] = timePart.split(':').map(Number);
  return new Date(y, m - 1, d, hh, mm, ss).getTime();
}

async function fetchSnapshot(): Promise<Station[]> {
  const cached = cacheGet<Station[]>(SNAPSHOT_KEY);
  if (cached) return cached;

  const token = await getAccessToken();
  const key = process.env.NSW_FUELCHECK_API_KEY!;
  const txnId = (globalThis.crypto?.randomUUID?.() ?? `txn-${Date.now()}-${Math.random()}`);

  const res = await fetch(`${BASE}/fuel/prices`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: key,
      transactionid: txnId,
      requesttimestamp: formatTimestamp(new Date()),
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
  if (!res.ok) {
    throw new Error(`NSW /prices failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { stations: NSWStationRaw[]; prices: NSWPriceRaw[] };

  // Build canonical Station map keyed by station code
  const now = Date.now();
  const map = new Map<string, Station>();
  for (const s of data.stations) {
    const addr = parseAddress(s.address);
    map.set(s.code, {
      id: `nsw-${s.code}`,
      brand: normalizeBrand(s.brand),
      name: s.name,
      address: s.address,
      suburb: addr.suburb,
      state: (s.state as StateCode) || 'NSW',
      postcode: addr.postcode,
      lat: s.location.latitude,
      lng: s.location.longitude,
      prices: { U91: null, U95: null, U98: null, E10: null, DSL: null, PRDSL: null, LPG: null },
      updatedAt: 0,
      updatedMinutesAgo: 9999,
      source: 'nsw-fuelcheck',
    });
  }

  // Attach prices
  for (const p of data.prices) {
    const station = map.get(p.stationcode);
    if (!station) continue;
    const fuel = normalizeFuelType(p.fueltype);
    if (!fuel) continue;
    station.prices[fuel] = p.price;
    const ts = parseTimestamp(p.lastupdated);
    if (ts > station.updatedAt) {
      station.updatedAt = ts;
      station.updatedMinutesAgo = Math.max(0, Math.floor((now - ts) / 60000));
    }
  }

  const stations = Array.from(map.values());
  cacheSet(SNAPSHOT_KEY, stations, SNAPSHOT_TTL);
  return stations;
}

export async function fetchStations(opts: FetchOptions): Promise<FetchResult> {
  const radius = opts.radius ?? 5;
  const limit = opts.limit ?? 30;
  const allowedStates: StateCode[] = opts.state ? [opts.state] : ['NSW', 'TAS', 'ACT'];

  const wasCached = cacheGet<Station[]>(SNAPSHOT_KEY) !== null;
  const snapshot = await fetchSnapshot();
  const refreshedAt = cacheWrittenAt(SNAPSHOT_KEY, SNAPSHOT_TTL);

  const stations = snapshot
    .filter(s => allowedStates.includes(s.state))
    .map(s => ({ ...s, distance: distanceKm(opts.lat, opts.lng, s.lat, s.lng) }))
    .filter(s => s.distance! <= radius)
    .filter(s => (opts.fuelType ? s.prices[opts.fuelType] != null : true))
    .sort((a, b) => a.distance! - b.distance!)
    .slice(0, limit);

  return { stations, source: 'nsw-fuelcheck', cached: wasCached, refreshedAt };
}
