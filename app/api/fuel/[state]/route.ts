/**
 * GET /api/fuel/[state]?lat=X&lng=Y&radius=5&fuelType=U91
 *
 * Dispatches to the right state-specific source module. Each source handles
 * its own caching internally and returns the canonical FetchResult shape.
 *
 * Frontend usage:
 *   fetch(`/api/fuel/nsw?lat=${lat}&lng=${lng}&fuelType=U91`)
 *
 * State codes accepted: nsw, vic, qld, wa, sa, tas, nt, act
 * TAS and ACT are aliased to nsw (they share the FuelCheck scheme).
 */
import { NextRequest, NextResponse } from 'next/server';
import { FetchOptions, FuelType, StateCode } from '@/lib/types';
// Source modules — same export shape across all of them
import { fetchStations as fetchNSW } from '@/lib/sources/nsw-fuelcheck';
import { fetchStations as fetchVIC } from '@/lib/sources/vic-servosaver';
import { fetchStations as fetchQLD } from '@/lib/sources/qld-fuelprices';
import { fetchStations as fetchWA  } from '@/lib/sources/wa-fuelwatch';
import { fetchStations as fetchSA  } from '@/lib/sources/sa-informedsources';
import { fetchStations as fetchNT  } from '@/lib/sources/nt-myfuelnt';

type Fetcher = (opts: FetchOptions) => Promise<any>;

// State -> source mapping. TAS and ACT ride on NSW FuelCheck.
const SOURCE_BY_STATE: Record<string, { fetcher: Fetcher; state: StateCode }> = {
  nsw: { fetcher: fetchNSW, state: 'NSW' },
  tas: { fetcher: fetchNSW, state: 'TAS' },
  act: { fetcher: fetchNSW, state: 'ACT' },
  vic: { fetcher: fetchVIC, state: 'VIC' },
  qld: { fetcher: fetchQLD, state: 'QLD' },
  wa:  { fetcher: fetchWA,  state: 'WA'  },
  sa:  { fetcher: fetchSA,  state: 'SA'  },
  nt:  { fetcher: fetchNT,  state: 'NT'  },
};

// Must match the FuelType union in lib/types.ts exactly
const VALID_FUEL_TYPES = ['U91', 'P95', 'P98', 'E10', 'DSL', 'PRDSL', 'LPG'] as const;

export async function GET(
  req: NextRequest,
  { params }: { params: { state: string } }
) {
  const stateKey = params.state.toLowerCase();
  const source = SOURCE_BY_STATE[stateKey];
  if (!source) {
    return NextResponse.json(
      { error: `Unknown state '${params.state}'. Use: nsw, vic, qld, wa, sa, tas, nt, act.` },
      { status: 400 }
    );
  }

  const sp = req.nextUrl.searchParams;
  const lat = parseFloat(sp.get('lat') || '');
  const lng = parseFloat(sp.get('lng') || '');
  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json(
      { error: 'lat and lng query parameters are required and must be numeric.' },
      { status: 400 }
    );
  }

  const radius = sp.get('radius') ? parseFloat(sp.get('radius')!) : 5;
  const limit  = sp.get('limit')  ? parseInt(sp.get('limit')!, 10) : 30;

  const rawFuelType = sp.get('fuelType');
  const fuelType = rawFuelType && VALID_FUEL_TYPES.includes(rawFuelType as any)
    ? (rawFuelType as FuelType)
    : undefined;

  try {
    const result = await source.fetcher({
      lat,
      lng,
      radius,
      limit,
      state: source.state,
      fuelType,
    });

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=900',
      },
    });
  } catch (err: any) {
    console.error(`[fuel/${stateKey}] fetch failed:`, err);
    return NextResponse.json(
      { error: 'Upstream fetch failed', details: err?.message ?? 'unknown' },
      { status: 502 }
    );
  }
}

export const runtime = 'nodejs';
