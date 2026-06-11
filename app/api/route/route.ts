/**
 * GET /api/route?fromLat=..&fromLng=..&toLat=..&toLng=..&fuel=U91
 *
 * "Cheapest fuel along my route." Fetches driving geometry from the public
 * OSRM server (free, no key — fine at our traffic level), samples points
 * along the route, pulls stations near each sample from the existing state
 * source modules, dedupes, computes each station's detour from the route,
 * and returns them ranked by price.
 *
 * Falls back to straight-line interpolation between the endpoints if OSRM
 * is unavailable — degraded but still useful for metro trips.
 *
 * Response: {
 *   route: { distanceKm, durationMin, source: 'osrm'|'straight-line',
 *            points: [[lat,lng],...] },   // downsampled, for map display
 *   stations: [{ ...Station, detourKm, alongKm }],
 * }
 */
import { NextRequest, NextResponse } from 'next/server';
import { FuelType, StateCode, Station } from '@/lib/types';
import { cacheGet, cacheSet } from '@/lib/cache';

import { fetchStations as fetchNSW } from '@/lib/sources/nsw-fuelcheck';
import { fetchStations as fetchVIC } from '@/lib/sources/vic-servosaver';
import { fetchStations as fetchQLD } from '@/lib/sources/qld-fuelprices';
import { fetchStations as fetchWA  } from '@/lib/sources/wa-fuelwatch';
import { fetchStations as fetchSA  } from '@/lib/sources/sa-informedsources';
import { fetchStations as fetchNT  } from '@/lib/sources/nt-myfuelnt';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const FETCHER: Record<StateCode, (opts: any) => Promise<{ stations: Station[] }>> = {
  NSW: fetchNSW, TAS: fetchNSW, ACT: fetchNSW,
  VIC: fetchVIC, QLD: fetchQLD, WA: fetchWA, SA: fetchSA, NT: fetchNT,
};

const VALID_FUEL_TYPES = ['U91', 'P95', 'P98', 'E10', 'DSL', 'PRDSL', 'LPG'] as const;

/** Max distance a station can sit off the route to count as "along" it. */
const MAX_DETOUR_KM = 5;
/** How many results to return. */
const MAX_RESULTS = 30;
/** Cap on sample points (each may trigger a state-source fetch). */
const MAX_SAMPLES = 12;
/** Hard cap on route length we'll attempt — protects the function budget. */
const MAX_ROUTE_KM = 1200;

// Same bounding boxes as the client's stateFromCoords in Motavo.jsx.
function stateFromCoords(lat: number, lng: number): StateCode {
  if (lat <= -35.1 && lat >= -35.95 && lng >= 148.75 && lng <= 149.45) return 'ACT';
  if (lat <= -39.2 && lng >= 143.5 && lng <= 149.2) return 'TAS';
  if (lat <= -33.9 && lat >= -39.3 && lng >= 140.8 && lng <= 150.2) return 'VIC';
  if (lat <= -28.0 && lat >= -37.6 && lng >= 140.9 && lng <= 153.7) return 'NSW';
  if (lat <= -9.5  && lat >= -29.2 && lng >= 137.9 && lng <= 153.6) return 'QLD';
  if (lat <= -25.9 && lat >= -38.2 && lng >= 128.9 && lng <= 141.1) return 'SA';
  if (lat <= -10.9 && lat >= -26.1 && lng >= 128.9 && lng <= 138.1) return 'NT';
  if (lng <= 129.1) return 'WA';
  return 'NSW';
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

type LatLng = [number, number]; // [lat, lng]

/** Fetch driving geometry from the public OSRM demo server. */
async function fetchOsrmRoute(
  fromLat: number, fromLng: number, toLat: number, toLng: number
): Promise<{ points: LatLng[]; distanceKm: number; durationMin: number } | null> {
  try {
    const url =
      `https://router.project-osrm.org/route/v1/driving/` +
      `${fromLng},${fromLat};${toLng},${toLat}` +
      `?overview=full&geometries=geojson&alternatives=false&steps=false`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Motavo/1.0 (fuel price comparison; motavo.com.au)' },
      signal: AbortSignal.timeout(7000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const route = data?.routes?.[0];
    if (!route?.geometry?.coordinates?.length) return null;
    // OSRM returns [lng, lat]; flip to [lat, lng].
    const points: LatLng[] = route.geometry.coordinates.map(
      (c: [number, number]) => [c[1], c[0]] as LatLng
    );
    return {
      points,
      distanceKm: route.distance / 1000,
      durationMin: route.duration / 60,
    };
  } catch {
    return null;
  }
}

/** Straight-line fallback when OSRM is down. */
function straightLine(fromLat: number, fromLng: number, toLat: number, toLng: number) {
  const points: LatLng[] = [];
  const n = 40;
  for (let i = 0; i <= n; i++) {
    points.push([fromLat + ((toLat - fromLat) * i) / n, fromLng + ((toLng - fromLng) * i) / n]);
  }
  return { points, distanceKm: haversineKm(fromLat, fromLng, toLat, toLng), durationMin: 0 };
}

/** Cumulative distance along the polyline at each vertex. */
function cumulativeKm(points: LatLng[]): number[] {
  const out = [0];
  for (let i = 1; i < points.length; i++) {
    out.push(out[i - 1] + haversineKm(points[i - 1][0], points[i - 1][1], points[i][0], points[i][1]));
  }
  return out;
}

/** Pick evenly-spaced sample points along the polyline. */
function samplePoints(points: LatLng[], cumKm: number[], totalKm: number): LatLng[] {
  const count = Math.min(MAX_SAMPLES, Math.max(3, Math.ceil(totalKm / 25)));
  const out: LatLng[] = [];
  for (let i = 0; i < count; i++) {
    const target = (totalKm * i) / (count - 1);
    // Find first vertex at/after the target distance.
    let idx = cumKm.findIndex(d => d >= target);
    if (idx === -1) idx = points.length - 1;
    out.push(points[idx]);
  }
  return out;
}

/** Downsample geometry to a manageable size for the response payload. */
function downsample(points: LatLng[], maxPoints = 200): LatLng[] {
  if (points.length <= maxPoints) return points;
  const step = points.length / maxPoints;
  const out: LatLng[] = [];
  for (let i = 0; i < points.length; i += step) out.push(points[Math.floor(i)]);
  if (out[out.length - 1] !== points[points.length - 1]) out.push(points[points.length - 1]);
  return out.map(p => [Math.round(p[0] * 1e5) / 1e5, Math.round(p[1] * 1e5) / 1e5] as LatLng);
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const fromLat = parseFloat(sp.get('fromLat') || '');
  const fromLng = parseFloat(sp.get('fromLng') || '');
  const toLat = parseFloat(sp.get('toLat') || '');
  const toLng = parseFloat(sp.get('toLng') || '');

  if ([fromLat, fromLng, toLat, toLng].some(isNaN)) {
    return NextResponse.json(
      { error: 'fromLat, fromLng, toLat and toLng are required numeric query parameters.' },
      { status: 400 }
    );
  }

  const crowKm = haversineKm(fromLat, fromLng, toLat, toLng);
  if (crowKm < 1) {
    return NextResponse.json({ error: 'Origin and destination are the same place.' }, { status: 400 });
  }
  if (crowKm > MAX_ROUTE_KM) {
    return NextResponse.json(
      { error: `Route too long — keep it under ${MAX_ROUTE_KM} km for now.` },
      { status: 400 }
    );
  }

  const rawFuel = sp.get('fuel') || 'U91';
  const fuel = (VALID_FUEL_TYPES.includes(rawFuel as any) ? rawFuel : 'U91') as FuelType;

  // Whole-response cache: same trip + fuel within 5 min returns instantly.
  const cacheKey = `route:${fromLat.toFixed(3)},${fromLng.toFixed(3)}:${toLat.toFixed(3)},${toLng.toFixed(3)}:${fuel}`;
  const cached = cacheGet<object>(cacheKey);
  if (cached) {
    return NextResponse.json({ ...cached, cached: true });
  }

  // 1. Route geometry.
  const osrm = await fetchOsrmRoute(fromLat, fromLng, toLat, toLng);
  const geo = osrm || straightLine(fromLat, fromLng, toLat, toLng);
  const cumKm = cumulativeKm(geo.points);
  const totalKm = cumKm[cumKm.length - 1];

  // 2. Sample along the route and fetch stations near each sample.
  const samples = samplePoints(geo.points, cumKm, totalKm);
  const results = await Promise.allSettled(
    samples.map(([lat, lng]) => {
      const state = stateFromCoords(lat, lng);
      const fetcher = FETCHER[state];
      return fetcher({ lat, lng, radius: MAX_DETOUR_KM + 2, limit: 40, state, fuelType: fuel });
    })
  );

  // 3. Dedupe and compute detour + along-route position per station.
  const byId = new Map<string, Station>();
  for (const r of results) {
    if (r.status !== 'fulfilled') continue;
    for (const st of r.value?.stations || []) {
      if (st?.id && !byId.has(st.id)) byId.set(st.id, st);
    }
  }

  const stations = Array.from(byId.values())
    .map(st => {
      let best = Infinity;
      let bestIdx = 0;
      // Nearest route vertex — OSRM geometry is dense enough for a good approximation.
      for (let i = 0; i < geo.points.length; i++) {
        const d = haversineKm(st.lat, st.lng, geo.points[i][0], geo.points[i][1]);
        if (d < best) { best = d; bestIdx = i; }
      }
      return { ...st, detourKm: Math.round(best * 10) / 10, alongKm: Math.round(cumKm[bestIdx]) };
    })
    .filter(st => st.detourKm <= MAX_DETOUR_KM && st.prices?.[fuel] != null)
    .sort((a, b) => (a.prices[fuel]! - b.prices[fuel]!))
    .slice(0, MAX_RESULTS);

  const payload = {
    route: {
      distanceKm: Math.round(totalKm),
      durationMin: Math.round(geo.durationMin),
      source: osrm ? 'osrm' : 'straight-line',
      points: downsample(geo.points),
    },
    fuel,
    stations,
  };

  cacheSet(cacheKey, payload, 5 * 60 * 1000);
  return NextResponse.json(payload);
}
