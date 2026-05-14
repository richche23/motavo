/**
 * NT MyFuel NT — Northern Territory fuel pricing scheme.
 *
 * NO official API. Scrapes myfuelnt.nt.gov.au HTML.
 *
 * Flow per snapshot refresh:
 *   1. GET homepage → extract __RequestVerificationToken + Set-Cookie
 *   2. One GET /Home/Results per fuel type (NT doesn't support all-fuel query)
 *   3. Merge results, combining prices onto each station by OutletId
 *
 * Limitations:
 *   - NT site does not expose lat/lng anywhere in the HTML.
 *     Distance filtering is skipped; all Darwin area stations are returned.
 *   - Darwin City only (SuburbId=1). Covers 0800 postcode.
 *   - CSRF token + cookie required — one extra round-trip per cache miss.
 *   - HTML structure changes will break parsing.
 */

import { cacheGet, cacheSet } from '../cache';
import { normalizeBrand } from '../normalizers';
import { FetchOptions, FetchResult, FuelType, Station } from '../types';

const BASE_URL     = 'https://myfuelnt.nt.gov.au';
const SNAPSHOT_KEY = 'nt:snapshot';
const SNAPSHOT_TTL = 10 * 60 * 1000; // 10 minutes

const DARWIN_SUBURB    = 'DARWIN CITY (0800)';
const DARWIN_SUBURB_ID = '1';

// NT fuel codes to fetch. Each needs a separate request.
// LAF (Low Aromatic Fuel) is the NT-mandated U91 substitute in some areas.
const NT_FUEL_CODES: Array<{ ntCode: string; fuelType: FuelType }> = [
  { ntCode: 'ULP',  fuelType: 'U91'   },
  { ntCode: 'LAF',  fuelType: 'U91'   }, // Low Aromatic Fuel — U91 substitute
  { ntCode: 'PULP', fuelType: 'P95'   },
  { ntCode: 'P98',  fuelType: 'P98'   },
  { ntCode: 'E10',  fuelType: 'E10'   },
  { ntCode: 'DL',   fuelType: 'DSL'   },
  { ntCode: 'PD',   fuelType: 'PRDSL' },
  { ntCode: 'LPG',  fuelType: 'LPG'   },
];

// ── Snapshot ──────────────────────────────────────────────────────────────────

interface Snapshot {
  stations:    Station[];
  refreshedAt: number;
}

async function fetchSnapshot(): Promise<Snapshot> {
  const cached = cacheGet<Snapshot>(SNAPSHOT_KEY);
  if (cached) return cached;

  // Step 1: GET homepage for CSRF token + session cookie.
  const homeRes = await fetch(`${BASE_URL}/`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; FuelMate/1.0; +https://fuelmate.app)',
      Accept:       'text/html',
    },
    redirect: 'follow',
  });
  if (!homeRes.ok) throw new Error(`NT homepage ${homeRes.status}`);

  const homeHtml = await homeRes.text();

  // Extract CSRF token from hidden input.
  const tokenMatch = homeHtml.match(
    /<input[^>]+name="__RequestVerificationToken"[^>]+value="([^"]+)"/
  ) ?? homeHtml.match(
    /<input[^>]+value="([^"]+)"[^>]+name="__RequestVerificationToken"/
  );
  if (!tokenMatch) throw new Error('NT: CSRF token not found in homepage');
  const token = tokenMatch[1];

  // Collect cookies from homepage response.
  const setCookie = homeRes.headers.get('set-cookie') ?? '';
  const cookies   = setCookie
    .split(/,(?=\s*\w+=)/)
    .map(c => c.split(';')[0].trim())
    .filter(Boolean)
    .join('; ');

  const refreshedAt = Date.now();

  // Step 2: Fetch results for each NT fuel code.
  // Merge by OutletId so each station has all its prices on one object.
  const stationMap = new Map<string, Station>();

  await Promise.allSettled(
    NT_FUEL_CODES.map(async ({ ntCode, fuelType }) => {
      const params = new URLSearchParams({
        __RequestVerificationToken: token,
        searchOptions:              'suburbPostcode',
        Suburb:                     DARWIN_SUBURB,
        SuburbId:                   DARWIN_SUBURB_ID,
        RegionId:                   '',
        FuelCode:                   ntCode,
        BrandIdentifier:            '',
      });

      const res = await fetch(`${BASE_URL}/Home/Results?${params}`, {
        headers: {
          Cookie:       cookies,
          Referer:      `${BASE_URL}/`,
          'User-Agent': 'Mozilla/5.0 (compatible; FuelMate/1.0; +https://fuelmate.app)',
          Accept:       'text/html',
        },
        redirect: 'follow',
      });
      if (!res.ok) return;

      const html = await res.text();
      parseRows(html, fuelType, refreshedAt, stationMap);
    })
  );

  const snapshot: Snapshot = {
    stations:    Array.from(stationMap.values()),
    refreshedAt,
  };
  cacheSet(SNAPSHOT_KEY, snapshot, SNAPSHOT_TTL);
  return snapshot;
}

// ── HTML parser ───────────────────────────────────────────────────────────────

function parseRows(
  html:        string,
  fuelType:    FuelType,
  refreshedAt: number,
  out:         Map<string, Station>
): void {
  // Match each <tr id="row-{id}" ...> block.
  const rowRe = /<tr\s+id="(row-\d+)"[^>]*>([\s\S]*?)<\/tr>/g;
  let m: RegExpExecArray | null;

  while ((m = rowRe.exec(html)) !== null) {
    const rowId  = m[1];                // e.g. "row-45"
    const rowHtml = m[2];

    // Name: first <strong> inside outletdetails cell.
    const nameM = rowHtml.match(
      /class="[^"]*outletdetails[^"]*"[^>]*>[\s\S]*?<strong>([^<]+)<\/strong>/
    );
    if (!nameM) continue;
    const name = decodeEntities(nameM[1].trim());

    // Address: full outletdetails cell text, strip name prefix.
    const cellM = rowHtml.match(
      /class="[^"]*outletdetails[^"]*">([\s\S]*?)<\/td>/
    );
    const rawAddr = cellM
      ? decodeEntities(cellM[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
      : '';
    const address = rawAddr.startsWith(name)
      ? rawAddr.slice(name.length).replace(/^[\s,]+/, '')
      : rawAddr;

    const suburbM  = address.match(/,\s*([^,]+),\s*NT\s*\d{4}/);
    const suburb   = suburbM ? suburbM[1].trim() : '';
    const postcodeM = address.match(/NT\s*(\d{4})/);
    const postcode  = postcodeM ? postcodeM[1] : undefined;

    // Price.
    const priceM = rowHtml.match(
      /class="fuelPrice[^"]*"[^>]*>[\s\S]*?<strong>([\d.]+)<\/strong>/
    );
    if (!priceM) continue;
    const priceVal = parseFloat(priceM[1]);
    if (isNaN(priceVal) || priceVal <= 0) continue;
    // NT prices are decimal cents (e.g. 235.9 c/L).
    // Store as integer tenths-of-a-cent to match SA/QLD format (e.g. 2359).
    const price = Math.round(priceVal * 10);

    if (out.has(rowId)) {
      // Station already seen from another fuel type — just add this price.
      out.get(rowId)!.prices[fuelType] = price;
    } else {
      const prices: Record<FuelType, number | null> = {
        U91: null, P95: null, P98: null,
        E10: null, DSL: null, PRDSL: null, LPG: null,
      };
      prices[fuelType] = price;

      out.set(rowId, {
        id:               `nt-${rowId}`,
        brand:            normalizeBrand(name),
        name,
        address,
        suburb,
        state:            'NT',
        postcode,
        // NT HTML has no lat/lng. Fallback to Darwin CBD so the app doesn't crash.
        lat:              -12.4634,
        lng:              130.8456,
        prices,
        updatedAt:        refreshedAt,
        updatedMinutesAgo: 0,
        source:           'nt-myfuelnt',
      });
    }
  }
}

function decodeEntities(s: string): string {
  return s
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

  const results = snapshot.stations
    .filter(s => !fuelType || s.prices[fuelType] !== null)
    .sort((a, b) =>
      fuelType
        ? (a.prices[fuelType] ?? 9999) - (b.prices[fuelType] ?? 9999)
        : 0
    )
    .slice(0, limit);

  return {
    stations:    results,
    source:      'nt-myfuelnt',
    cached:      fromCache,
    refreshedAt: snapshot.refreshedAt,
  };
}
