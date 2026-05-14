/**
 * NT MyFuel NT — Northern Territory fuel pricing scheme.
 *
 * NO official API. This scrapes myfuelnt.nt.gov.au HTML.
 *
 * Flow per snapshot refresh:
 *   1. GET homepage → extract __RequestVerificationToken + Set-Cookie
 *   2. GET /Home/Results with token, cookies, and Darwin City suburb params
 *   3. Parse HTML table rows for station data
 *
 * Known limitations:
 *   - NT site does not expose station lat/lng anywhere in the rendered HTML.
 *     Distance filtering is skipped; all Darwin area stations are returned.
 *   - Suburb-based search only. Darwin City (SuburbId=1) is hardcoded.
 *     Stations outside Darwin City suburb are not returned.
 *   - CSRF token rotation adds one extra HTTP round-trip per cache miss.
 *   - If NT Consumer Affairs changes their HTML structure, parsing will break.
 *   - FuelCode='' (empty) returns all fuel types in one request.
 */

import { cacheGet, cacheSet } from '../cache';
import { normalizeBrand } from '../normalizers';
import { FetchOptions, FetchResult, FuelType, Station } from '../types';

const BASE_URL      = 'https://myfuelnt.nt.gov.au';
const SNAPSHOT_KEY  = 'nt:snapshot';
const SNAPSHOT_TTL  = 10 * 60 * 1000; // 10 minutes

// Darwin City suburb — SubPostCodeId confirmed via GetSuburbPostcode API.
// Covers 0800 postcode (Darwin CBD + surrounding).
const DARWIN_SUBURB    = 'DARWIN CITY (0800)';
const DARWIN_SUBURB_ID = '1';

// NT site fuel codes → canonical FuelType.
// LAF (Low Aromatic Fuel) is a U91 substitute mandated in some NT areas.
const NT_FUEL_CODE_MAP: Record<string, FuelType> = {
  ULP:  'U91',
  LAF:  'U91',   // Low Aromatic Fuel — direct U91 substitute
  PULP: 'P95',
  P98:  'P98',
  E10:  'E10',
  DL:   'DSL',
  PD:   'PRDSL',
  LPG:  'LPG',
};

// ── Snapshot ──────────────────────────────────────────────────────────────────

interface Snapshot {
  stations:    Station[];
  refreshedAt: number;
}

async function fetchSnapshot(): Promise<Snapshot> {
  const cached = cacheGet<Snapshot>(SNAPSHOT_KEY);
  if (cached) return cached;

  // Step 1: GET homepage to obtain CSRF token + session cookie.
  const homeRes = await fetch(BASE_URL, { redirect: 'follow' });
  if (!homeRes.ok) throw new Error(`NT homepage ${homeRes.status}`);

  const homeHtml   = await homeRes.text();
  const cookieHeader = homeRes.headers.get('set-cookie') ?? '';

  // Extract __RequestVerificationToken from hidden input.
  const tokenMatch = homeHtml.match(
    /<input[^>]+name="__RequestVerificationToken"[^>]+value="([^"]+)"/
  );
  if (!tokenMatch) throw new Error('NT CSRF token not found in homepage');
  const token = tokenMatch[1];

  // Build cookie string for the next request.
  // The site uses ASP.NET session — we only need to forward the cookies.
  const cookies = cookieHeader
    .split(/,(?=[^ ])/)
    .map(c => c.split(';')[0].trim())
    .filter(Boolean)
    .join('; ');

  // Step 2: GET results for Darwin City, all fuel types.
  const params = new URLSearchParams({
    __RequestVerificationToken: token,
    searchOptions:              'suburbPostcode',
    Suburb:                     DARWIN_SUBURB,
    SuburbId:                   DARWIN_SUBURB_ID,
    RegionId:                   '',
    FuelCode:                   '',   // empty = all fuel types
    BrandIdentifier:            '',
  });

  const resultsRes = await fetch(`${BASE_URL}/Home/Results?${params}`, {
    headers: {
      Cookie:  cookies,
      Referer: BASE_URL,
      'User-Agent':
        'Mozilla/5.0 (compatible; FuelMate/1.0; +https://fuelmate.app)',
    },
    redirect: 'follow',
  });

  if (!resultsRes.ok) {
    throw new Error(`NT results ${resultsRes.status}`);
  }

  const html        = await resultsRes.text();
  const refreshedAt = Date.now();
  const stations    = parseStations(html, refreshedAt);

  const snapshot: Snapshot = { stations, refreshedAt };
  cacheSet(SNAPSHOT_KEY, snapshot, SNAPSHOT_TTL);
  return snapshot;
}

// ── HTML parser ───────────────────────────────────────────────────────────────

function parseStations(html: string, refreshedAt: number): Station[] {
  const stations: Station[] = [];

  // Match each station row: <tr id="row-{id}" value="{id}">...</tr>
  const rowRegex = /<tr\s+id="row-(\d+)"[^>]*>([\s\S]*?)<\/tr>/g;
  let rowMatch: RegExpExecArray | null;

  while ((rowMatch = rowRegex.exec(html)) !== null) {
    const outletId  = rowMatch[1];
    const rowHtml   = rowMatch[2];

    // Station name: first <strong> inside .outletdetails
    const nameMatch = rowHtml.match(
      /class="[^"]*outletdetails[^"]*"[^>]*>[\s\S]*?<strong>([\s\S]*?)<\/strong>/
    );
    if (!nameMatch) continue;
    const name = decodeHtmlEntities(nameMatch[1].trim());

    // Address: text content of .outletdetails after stripping HTML tags,
    // then removing the leading name.
    const addrCellMatch = rowHtml.match(
      /class="[^"]*outletdetails[^"]*"[^>]*>([\s\S]*?)<\/td>/
    );
    const rawAddr = addrCellMatch
      ? decodeHtmlEntities(addrCellMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
      : '';
    // The cell text starts with the name, strip it to get just the address.
    const address = rawAddr.startsWith(name)
      ? rawAddr.slice(name.length).trim().replace(/^,?\s*/, '')
      : rawAddr;

    // Suburb: last part of address before postcode (best-effort).
    // Format: "46 Coonawarra Road, Winnellie, NT 0820"
    const suburbMatch = address.match(/,\s*([^,]+),\s*NT\s*\d{4}/);
    const suburb      = suburbMatch ? suburbMatch[1].trim() : '';

    // Postcode
    const postcodeMatch = address.match(/NT\s*(\d{4})/);
    const postcode      = postcodeMatch ? postcodeMatch[1] : undefined;

    // NT fuel code
    const fuelCodeMatch = rowHtml.match(/class="fuelCode"[^>]*>[\s\S]*?<strong>([\s\S]*?)<\/strong>/);
    const ntFuelCode    = fuelCodeMatch ? fuelCodeMatch[1].trim() : '';
    const fuelType      = NT_FUEL_CODE_MAP[ntFuelCode];
    if (!fuelType) continue; // skip unknown fuel codes

    // Price in cents (e.g. "235.9")
    const priceMatch = rowHtml.match(/class="fuelPrice[^"]*"[^>]*>[\s\S]*?<strong>([\d.]+)<\/strong>/);
    if (!priceMatch) continue;
    const priceRaw = parseFloat(priceMatch[1]);
    if (isNaN(priceRaw) || priceRaw <= 0) continue;
    // Convert to integer cents (multiply by 10 to match other sources' format,
    // e.g. 235.9 → 2359 to represent 235.9 c/L as 2359 tenths-of-a-cent).
    // Note: SA/QLD APIs return prices as integer tenths-of-a-cent (e.g. 1769).
    // NT site returns decimal cents (e.g. 235.9 = 235.9 c/L).
    // Store as rounded integer tenths: 235.9 * 10 = 2359.
    const price = Math.round(priceRaw * 10);

    const prices: Record<FuelType, number | null> = {
      U91: null, P95: null, P98: null,
      E10: null, DSL: null, PRDSL: null, LPG: null,
    };
    prices[fuelType] = price;

    stations.push({
      id:               `nt-${outletId}`,
      brand:            normalizeBrand(name),
      name,
      address,
      suburb,
      state:            'NT',
      postcode,
      // NT site does not expose lat/lng in HTML — use Darwin CBD as fallback
      // so distance calculations don't crash. Radius filtering is skipped below.
      lat:              -12.4634,
      lng:              130.8456,
      prices,
      updatedAt:        refreshedAt,
      updatedMinutesAgo: 0,
      source:           'nt-myfuelnt',
    });
  }

  return stations;
}

// Minimal HTML entity decoder for the characters the NT site uses.
function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g,  '&')
    .replace(/&lt;/g,   '<')
    .replace(/&gt;/g,   '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g,  "'")
    .replace(/&nbsp;/g, ' ');
}

// ── Public fetch ──────────────────────────────────────────────────────────────

export async function fetchStations(opts: FetchOptions): Promise<FetchResult> {
  const { fuelType, limit = 30 } = opts;

  let snapshot: Snapshot;
  let fromCache = false;

  try {
    const preFetch = cacheGet<Snapshot>(SNAPSHOT_KEY);
    fromCache = preFetch !== null;
    snapshot  = preFetch ?? await fetchSnapshot();
  } catch (err) {
    console.error('[NT] fetchSnapshot error:', err);
    return {
      stations:    [],
      source:      'nt-myfuelnt',
      cached:      false,
      refreshedAt: 0,
    };
  }

  // NT has no lat/lng data — skip distance filter, return all Darwin stations.
  // Filter by fuelType if specified; otherwise return all.
  const results = snapshot.stations
    .filter(s => !fuelType || s.prices[fuelType] !== null)
    .sort((a, b) => {
      if (fuelType) {
        return (a.prices[fuelType] ?? 9999) - (b.prices[fuelType] ?? 9999);
      }
      return 0;
    })
    .slice(0, limit);

  return {
    stations:    results,
    source:      'nt-myfuelnt',
    cached:      fromCache,
    refreshedAt: snapshot.refreshedAt,
  };
}
