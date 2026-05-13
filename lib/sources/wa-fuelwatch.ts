/**
 * WA FuelWatch — free public RSS feed, no API key required.
 *
 * Endpoint: https://www.fuelwatch.wa.gov.au/fuelwatch/fuelWatchRSS
 * Quirk: WA prices lock 24 hours in advance. Today's prices are published
 * at ~2:30 PM the day before. Cache aggressively — TTL of 1 hour is fine.
 *
 * Query params accepted upstream:
 *   Product   — 1=ULP, 2=PULP, 5=Diesel, 6=LPG, 10=98RON, 11=BioDiesel20, 12=E85
 *   Suburb    — suburb name (partial match)
 *   Region    — region code
 *   Brand     — brand code
 *   Day       — "today" | "tomorrow" | "yesterday"
 *
 * We fetch all products in a single batch by NOT specifying Product, then
 * filter in memory.
 */

import { cacheGet, cacheSet, cacheWrittenAt } from '../cache';
import { distanceKm, normalizeBrand, normalizeFuelType } from '../normalizers';
import { FetchOptions, FetchResult, FuelType, Station } from '../types';

const FEED_URL = 'https://www.fuelwatch.wa.gov.au/fuelwatch/fuelWatchRSS';
const SNAPSHOT_KEY = 'wa:snapshot';
const SNAPSHOT_TTL = 60 * 60 * 1000; // 1 hour — WA prices only change daily

// WA Product code -> our canonical fuel type
const PRODUCT_TO_FUEL: Record<string, FuelType> = {
  '1':  'U91',
  '2':  'U95',
  '5':  'DSL',
  '6':  'LPG',
  '10': 'U98',
  '11': 'DSL',     // BioDiesel 20 — coarse mapping
  '12': 'E10',
};

const PRODUCT_CODES = Object.keys(PRODUCT_TO_FUEL);

type WAItem = {
  title: string;        // e.g. "189.9 - BP Wembley"
  brand: string;
  product: string;      // numeric string
  price: string;        // "189.9"
  trading_name: string;
  address: string;
  location: string;     // suburb
  postcode: string;
  date: string;         // "YYYY-MM-DD"
  latitude: string;
  longitude: string;
};

function extractTag(xml: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
  const m = xml.match(re);
  if (!m) return '';
  return m[1].replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1').trim();
}

function parseRSS(xml: string): WAItem[] {
  const items: WAItem[] = [];
  const itemMatches = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
  for (const block of itemMatches) {
    items.push({
      title:        extractTag(block, 'title'),
      brand:        extractTag(block, 'brand'),
      product:      extractTag(block, 'product'),
      price:        extractTag(block, 'price'),
      trading_name: extractTag(block, 'trading-name'),
      address:      extractTag(block, 'address'),
      location:     extractTag(block, 'location'),
      postcode:     extractTag(block, 'postcode'),
      date:         extractTag(block, 'date'),
      latitude:     extractTag(block, 'latitude'),
      longitude:    extractTag(block, 'longitude'),
    });
  }
  return items;
}

async function fetchOneProduct(productCode: string): Promise<WAItem[]> {
  const res = await fetch(`${FEED_URL}?Product=${productCode}`, {
    headers: { Accept: 'application/rss+xml, application/xml, text/xml' },
  });
  if (!res.ok) throw new Error(`FuelWatch fetch failed for product ${productCode}: ${res.status}`);
  const xml = await res.text();
  return parseRSS(xml);
}

async function fetchSnapshot(): Promise<Station[]> {
  const cached = cacheGet<Station[]>(SNAPSHOT_KEY);
  if (cached) return cached;

  // Fan out across all fuel types in parallel
  const results = await Promise.all(PRODUCT_CODES.map(p => fetchOneProduct(p)));
  const now = Date.now();

  // Key by station identity (trading_name + address) since FuelWatch has no
  // stable station ID across products.
  const map = new Map<string, Station>();

  for (let i = 0; i < results.length; i++) {
    const productCode = PRODUCT_CODES[i];
    const fuel = PRODUCT_TO_FUEL[productCode];
    for (const item of results[i]) {
      if (!item.latitude || !item.longitude) continue;
      const key = `${item.trading_name}|${item.address}`.toLowerCase();
      let station = map.get(key);
      if (!station) {
        // FuelWatch street addresses have data quality issues — some stations
        // have incorrect street names (e.g. Victorian highway names for WA stations).
        // Suburb + postcode are always reliable. Build display address from those.
        const suburb  = item.location?.trim() || '';
        const street  = item.address?.trim()  || '';
        const postcode = item.postcode?.trim() || '';

        // Only use street if it looks plausible (has a number) AND suburb is present
        const useStreet = street && /\d/.test(street) && suburb;
        const displayAddress = useStreet ? street : suburb || street;

        station = {
          id: `wa-${key.replace(/[^a-z0-9]/g, '-')}`,
          brand: normalizeBrand(item.brand || item.trading_name),
          name: item.trading_name,
          address: displayAddress,
          suburb,
          state: 'WA',
          postcode,
          lat: parseFloat(item.latitude),
          lng: parseFloat(item.longitude),
          prices: { U91: null, U95: null, U98: null, E10: null, DSL: null, PRDSL: null, LPG: null },
          updatedAt: 0,
          updatedMinutesAgo: 9999,
          source: 'wa-fuelwatch',
        };
        map.set(key, station);
      }
      const price = parseFloat(item.price);
      if (!isNaN(price)) {
        station.prices[fuel] = price;
      }
      if (item.date) {
        const ts = new Date(item.date + 'T00:00:00').getTime();
        if (ts > station.updatedAt) {
          station.updatedAt = ts;
          station.updatedMinutesAgo = Math.max(0, Math.floor((now - ts) / 60000));
        }
      }
    }
  }

  const stations = Array.from(map.values());
  cacheSet(SNAPSHOT_KEY, stations, SNAPSHOT_TTL);
  return stations;
}

export async function fetchStations(opts: FetchOptions): Promise<FetchResult> {
  const radius = opts.radius ?? 5;
  const limit = opts.limit ?? 30;
  const wasCached = cacheGet<Station[]>(SNAPSHOT_KEY) !== null;
  const snapshot = await fetchSnapshot();
  const refreshedAt = cacheWrittenAt(SNAPSHOT_KEY, SNAPSHOT_TTL);

  const stations = snapshot
    .map(s => ({ ...s, distance: distanceKm(opts.lat, opts.lng, s.lat, s.lng) }))
    .filter(s => s.distance! <= radius)
    .filter(s => (opts.fuelType ? s.prices[opts.fuelType] != null : true))
    .sort((a, b) => a.distance! - b.distance!)
    .slice(0, limit);

  return { stations, source: 'wa-fuelwatch', cached: wasCached, refreshedAt };
}
