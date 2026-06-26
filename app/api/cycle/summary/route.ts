/**
 * GET /api/cycle/summary?fuel=U91
 *
 * One round trip for the homepage: cycle verdicts for all eight states at
 * once (single Redis MGET). Powers the live "Buy now / Wait / Peak" chips on
 * the city grid.
 *
 * Response: { fuel, signals: { NSW: { tone, position, daysTracked, ... }, ... } }
 */
import { NextRequest, NextResponse } from 'next/server';
import { FuelType, StateCode } from '@/lib/types';
import {
  readCycleHistories,
  computeCycleSignal,
  cycleStoreConfigured,
  CycleSignalVerdict,
} from '@/lib/cycleStore';
import { cacheGet, cacheSet } from '@/lib/cache';

export const dynamic = 'force-dynamic';

const ALL_STATES: StateCode[] = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'NT', 'ACT'];
const VALID_FUEL_TYPES = ['U91', 'P95', 'P98', 'E10', 'DSL', 'PRDSL', 'LPG'] as const;
const CACHE_TTL_MS = 10 * 60 * 1000; // in-process; underlying data is daily

export async function GET(req: NextRequest) {
  const rawFuel = req.nextUrl.searchParams.get('fuel') || 'U91';
  const fuel = (VALID_FUEL_TYPES.includes(rawFuel as any) ? rawFuel : 'U91') as FuelType;

  const cacheKey = `cycle-summary:${fuel}`;
  let signals = cacheGet<Record<string, CycleSignalVerdict>>(cacheKey);

  if (!signals) {
    const histories = await readCycleHistories(ALL_STATES, fuel);
    signals = {};
    for (const state of ALL_STATES) {
      signals[state] = computeCycleSignal(histories[state] || []);
    }
    cacheSet(cacheKey, signals, CACHE_TTL_MS);
  }

  return NextResponse.json(
    { fuel, signals, configured: cycleStoreConfigured },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=3600',
      },
    }
  );
}
