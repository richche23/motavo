/**
 * GET /api/cycle/[state]?fuel=U91
 *
 * Returns the server-logged daily cheapest-price history for a state + fuel,
 * plus a computed cycle verdict. This is the endpoint the CycleSignal
 * component in Motavo.jsx already fetches — it previously 404'd and fell
 * back to per-device localStorage. Now it serves the authoritative history
 * logged daily by /api/cron/cycle, which works even for first-time visitors.
 *
 * Response: { state, fuel, history: [{ d, p }...], signal: {...}, configured }
 */
import { NextRequest, NextResponse } from 'next/server';
import { FuelType, StateCode } from '@/lib/types';
import {
  readCycleHistory,
  computeCycleSignal,
  cycleStoreConfigured,
} from '@/lib/cycleStore';

export const dynamic = 'force-dynamic';

const VALID_STATES: Record<string, StateCode> = {
  nsw: 'NSW', vic: 'VIC', qld: 'QLD', wa: 'WA',
  sa: 'SA', tas: 'TAS', nt: 'NT', act: 'ACT',
};

const VALID_FUEL_TYPES = ['U91', 'P95', 'P98', 'E10', 'DSL', 'PRDSL', 'LPG'] as const;

export async function GET(
  req: NextRequest,
  { params }: { params: { state: string } }
) {
  const state = VALID_STATES[params.state.toLowerCase()];
  if (!state) {
    return NextResponse.json(
      { error: `Unknown state '${params.state}'. Use: nsw, vic, qld, wa, sa, tas, nt, act.` },
      { status: 400 }
    );
  }

  const rawFuel = req.nextUrl.searchParams.get('fuel') || 'U91';
  const fuel = (VALID_FUEL_TYPES.includes(rawFuel as any) ? rawFuel : 'U91') as FuelType;

  const history = await readCycleHistory(state, fuel);
  const signal = computeCycleSignal(history);

  return NextResponse.json(
    { state, fuel, history, signal, configured: cycleStoreConfigured },
    {
      headers: {
        // Fresh enough for a daily-resolution dataset; saves Redis round trips.
        'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600',
      },
    }
  );
}
