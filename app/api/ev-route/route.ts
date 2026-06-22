/**
 * GET /api/ev-route?fromLat=..&fromLng=..&toLat=..&toLng=..&level=DC&minPower=50
 *
 * "Chargers along my route." Same skeleton as /api/route (fuel): driving
 * geometry from the public OSRM server, sample points along it, pull chargers
 * near each sample from Open Charge Map, dedupe, compute each charger's
 * detour from the route — then return them in TRIP ORDER (alongKm), not by
 * price, because that's how EV stops are planned.
 *
 * Also returns gap analysis: the longest stretch of the route without a
 * charger within the detour band — the "is this trip viable?" number.
 */
import { NextRequest, NextResponse } from 'next/server';
import { cacheGet, cacheSet } from '@/lib/cache';
import { fetchStations } from '@/lib/sources/ev-opencharge';
import type { ChargerLevel } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;
export const runtime = 'nodejs';

/** Max distance a charger can sit off the route to count as "along" it. */
const MAX_DETOUR_KM = 7;
const MAX_RESULTS = 40;
const MAX_SAMPLES = 10;
const MAX_ROUTE_KM = 1200;

type LatLng = [number, number];

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

async function fetchOsrmRoute(
  fromLat: number, fromLng: number, toLat: number, toLng: number
): Promise<{ points: LatLng[]; distanceKm: number; durationMin: number } | null> {
  try {
    const url =
      `https://router.project-osrm.org/route/v1/driving/` +
      `${fromLng},${fromLat};${toLng},${toLat}` +
      `?overview=full&geometries=geojson&alternatives=false&steps=false`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Motavo/1.0 (motavo.au)' },
      signal: AbortSignal.timeout(7000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const route = data?.routes?.[0];
    if (!route?.geometry?.coordinates?.length) return null;
    const points: LatLng[] = route.geometry.coordinates.map(
      (c: [number, number]) => [c[1], c[0]] as LatLng
    );
    return { points, distanceKm: route.distance / 1000, durationMin: route.duration / 60 };
  } catch {
    return null;
  }
}

function straightLine(fromLat: number, fromLng: number, toLat: number, toLng: number) {
  const points: LatLng[] = [];
  const n = 40;
  for (let i = 0; i <= n; i++) {
    points.push([fromLat + ((toLat - fromLat) * i) / n, fromLng + ((toLng - fromLng) * i) / n]);
  }
  return { points, distanceKm: haversineKm(fromLat, fromLng, toLat, toLng), durationMin: 0 };
}

function cumulativeKm(points: LatLng[]): number[] {
  const out = [0];
  for (let i = 1; i < points.length; i++) {
    out.push(out[i - 1] + haversineKm(points[i - 1][0], points[i - 1][1], points[i][0], points[i][1]));
  }
  return out;
}

function samplePoints(points: LatLng[], cumKm: number[], totalKm: number): LatLng[] {
  // Charger queries hit an external API — sample sparser than fuel but widen
  // each sample's radius so the corridor still overlaps (see radius calc below).
  const count = Math.min(MAX_SAMPLES, Math.max(3, Math.ceil(totalKm / 40)));
  const out: LatLng[] = [];
  for (let i = 0; i < count; i++) {
    const target = (totalKm * i) / (count - 1);
    let idx = cumKm.findIndex(d => d >= target);
    if (idx === -1) idx = points.length - 1;
    out.push(points[idx]);
  }
  return out;
}

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

  const rawLevel = sp.get('level');
  const level = rawLevel === 'AC' || rawLevel === 'DC' ? (rawLevel as ChargerLevel) : undefined;
  const minPowerKw = sp.get('minPower') ? parseFloat(sp.get('minPower')!) : undefined;

  const cacheKey = `ev-route:${fromLat.toFixed(3)},${fromLng.toFixed(3)}:${toLat.toFixed(3)},${toLng.toFixed(3)}:${level || 'ALL'}:${minPowerKw || 0}`;
  const cached = cacheGet<object>(cacheKey);
  if (cached) {
    return NextResponse.json({ ...cached, cached: true });
  }

  // 1. Route geometry.
  const osrm = await fetchOsrmRoute(fromLat, fromLng, toLat, toLng);
  const geo = osrm || straightLine(fromLat, fromLng, toLat, toLng);
  const cumKm = cumulativeKm(geo.points);
  const totalKm = cumKm[cumKm.length - 1];

  // 2. Sample along the route, fetch chargers near each sample.
  const samples = samplePoints(geo.points, cumKm, totalKm);
  // Radius covers half the gap between samples so the corridor has no holes,
  // bounded to keep OCM result sets sane.
  const sampleGapKm = totalKm / Math.max(1, samples.length - 1);
  const radius = Math.min(35, Math.max(MAX_DETOUR_KM + 3, Math.ceil(sampleGapKm / 2) + MAX_DETOUR_KM));

  const results = await Promise.allSettled(
    samples.map(([lat, lng]) =>
      fetchStations({ lat, lng, radius, limit: 60, level, minPowerKw })
    )
  );

  // Detect a total Cloudflare block: every sample rejected with OCM_BLOCKED and
  // none returned stations. In that case the server can't reach OCM (its IP is
  // blocked), so hand the client everything it needs to query OCM directly from
  // the browser — same fallback strategy the near-me endpoint uses.
  const anyFulfilled = results.some(r => r.status === 'fulfilled' && (r.value?.stations?.length || 0) >= 0 && r.value !== undefined);
  const anyStations = results.some(r => r.status === 'fulfilled' && (r.value?.stations?.length || 0) > 0);
  const allBlocked = results.every(r => r.status === 'rejected' && (r.reason?.code === 'OCM_BLOCKED'));
  if (!anyStations && allBlocked) {
    const clientKey = process.env.NEXT_PUBLIC_OPENCHARGEMAP_KEY || process.env.OPENCHARGEMAP_API_KEY || '';
    const payload = {
      fallback: 'client',
      key: clientKey,
      radius,
      samples: samples.map(([lat, lng]) => ({ lat, lng })),
      route: {
        distanceKm: Math.round(totalKm),
        durationMin: Math.round(geo.durationMin),
        source: osrm ? 'osrm' : 'straight-line',
        points: downsample(geo.points),
        // Full geometry + cumulative distances so the client can compute
        // detour and along-route position exactly as the server would.
        fullPoints: geo.points,
        cumKm,
      },
      detourKm: MAX_DETOUR_KM,
      maxResults: MAX_RESULTS,
    };
    return NextResponse.json(payload);
  }

  // 3. Dedupe and compute detour + along-route position per charger.
  const byId = new Map<string, any>();
  for (const r of results) {
    if (r.status !== 'fulfilled') continue;
    for (const st of r.value?.stations || []) {
      if (st?.id != null && !byId.has(String(st.id))) byId.set(String(st.id), st);
    }
  }

  const chargers = Array.from(byId.values())
    .map(st => {
      let best = Infinity;
      let bestIdx = 0;
      for (let i = 0; i < geo.points.length; i++) {
        const d = haversineKm(st.lat, st.lng, geo.points[i][0], geo.points[i][1]);
        if (d < best) { best = d; bestIdx = i; }
      }
      return { ...st, detourKm: Math.round(best * 10) / 10, alongKm: Math.round(cumKm[bestIdx]) };
    })
    .filter(st => st.detourKm <= MAX_DETOUR_KM)
    .sort((a, b) => a.alongKm - b.alongKm)   // trip order, not price
    .slice(0, MAX_RESULTS);

  // 4. Gap analysis — longest stretch without a charger stop, including the
  //    runs from the start to the first charger and last charger to the end.
  let longestGapKm = 0;
  let gapFrom = 'Start';
  let gapTo = 'Destination';
  if (chargers.length === 0) {
    longestGapKm = Math.round(totalKm);
  } else {
    const stops = [
      { alongKm: 0, name: 'Start' },
      ...chargers.map(c => ({ alongKm: c.alongKm, name: c.network || 'Charger' })),
      { alongKm: totalKm, name: 'Destination' },
    ];
    for (let i = 1; i < stops.length; i++) {
      const gap = stops[i].alongKm - stops[i - 1].alongKm;
      if (gap > longestGapKm) {
        longestGapKm = Math.round(gap);
        gapFrom = stops[i - 1].name;
        gapTo = stops[i].name;
      }
    }
  }

  const payload = {
    route: {
      distanceKm: Math.round(totalKm),
      durationMin: Math.round(geo.durationMin),
      source: osrm ? 'osrm' : 'straight-line',
      points: downsample(geo.points),
    },
    chargers,
    gaps: { longestGapKm, from: gapFrom, to: gapTo },
  };

  cacheSet(cacheKey, payload, 10 * 60 * 1000);
  return NextResponse.json(payload);
}
