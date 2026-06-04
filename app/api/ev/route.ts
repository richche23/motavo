/**
 * GET /api/ev?lat=X&lng=Y&radius=10&level=DC&connector=CCS2&minPower=50
 *
 * Live charger locations from Open Charge Map, with indicative network tariffs
 * attached. Mirrors /api/fuel/[state]: parse query, call the source, return the
 * canonical EVFetchResult shape.
 *
 * Frontend usage:
 *   fetch(`/api/ev?lat=${lat}&lng=${lng}&radius=10`)
 */
import { NextRequest, NextResponse } from 'next/server';
import { fetchStations } from '@/lib/sources/ev-opencharge';
import type { ChargerLevel, ConnectorType } from '@/lib/types';

const VALID_CONNECTORS = ['CCS2', 'CHAdeMO', 'Type2', 'Type1', 'Tesla', 'Other'] as const;
const VALID_LEVELS = ['AC', 'DC'] as const;

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const lat = parseFloat(sp.get('lat') || '');
  const lng = parseFloat(sp.get('lng') || '');
  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json(
      { error: 'lat and lng query parameters are required and must be numeric.' },
      { status: 400 }
    );
  }

  const radius = sp.get('radius') ? parseFloat(sp.get('radius')!) : 10;
  const limit = sp.get('limit') ? parseInt(sp.get('limit')!, 10) : 40;
  const minPowerKw = sp.get('minPower') ? parseFloat(sp.get('minPower')!) : undefined;

  const rawLevel = sp.get('level');
  const level = rawLevel && VALID_LEVELS.includes(rawLevel as any)
    ? (rawLevel as ChargerLevel) : undefined;

  const rawConnector = sp.get('connector');
  const connector = rawConnector && VALID_CONNECTORS.includes(rawConnector as any)
    ? (rawConnector as ConnectorType) : undefined;

  try {
    const result = await fetchStations({ lat, lng, radius, limit, level, connector, minPowerKw });
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600' },
    });
  } catch (err: any) {
    console.error('[api/ev] fetch failed:', err);
    return NextResponse.json(
      { error: 'Upstream fetch failed', details: err?.message ?? 'unknown' },
      { status: 502 }
    );
  }
}

export const runtime = 'nodejs';
