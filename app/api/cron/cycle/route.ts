/**
 * GET /api/cron/cycle
 *
 * Daily Vercel cron (see vercel.json). For every capital city, pulls live
 * stations from the existing state source modules and logs the day's cheapest
 * price per fuel type into the cycle store. This is what makes the cycle
 * signal authoritative for first-time visitors — history accrues server-side
 * every day regardless of traffic.
 *
 * Auth: when a CRON_SECRET env var is set, Vercel sends it as
 * `Authorization: Bearer <CRON_SECRET>` and we require it. If unset, the
 * route is open (handy for manual testing right after deploy — set the
 * secret once you've confirmed it works).
 */
import { NextRequest, NextResponse } from 'next/server';
import { FuelType, StateCode, Station } from '@/lib/types';
import { recordCyclePoint, cycleStoreConfigured } from '@/lib/cycleStore';

import { fetchStations as fetchNSW } from '@/lib/sources/nsw-fuelcheck';
import { fetchStations as fetchVIC } from '@/lib/sources/vic-servosaver';
import { fetchStations as fetchQLD } from '@/lib/sources/qld-fuelprices';
import { fetchStations as fetchWA  } from '@/lib/sources/wa-fuelwatch';
import { fetchStations as fetchSA  } from '@/lib/sources/sa-informedsources';
import { fetchStations as fetchNT  } from '@/lib/sources/nt-myfuelnt';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Fuels worth logging daily. LPG/PRDSL excluded — sparse coverage adds noise. */
const CRON_FUELS: FuelType[] = ['U91', 'E10', 'P95', 'P98', 'DSL'];

type Capital = {
  state: StateCode;
  name: string;
  lat: number;
  lng: number;
  fetcher: (opts: any) => Promise<{ stations: Station[] }>;
};

// TAS and ACT ride on NSW FuelCheck, same as /api/fuel/[state].
const CAPITALS: Capital[] = [
  { state: 'NSW', name: 'Sydney',    lat: -33.8688, lng: 151.2093, fetcher: fetchNSW },
  { state: 'VIC', name: 'Melbourne', lat: -37.8136, lng: 144.9631, fetcher: fetchVIC },
  { state: 'QLD', name: 'Brisbane',  lat: -27.4698, lng: 153.0251, fetcher: fetchQLD },
  { state: 'WA',  name: 'Perth',     lat: -31.9523, lng: 115.8613, fetcher: fetchWA  },
  { state: 'SA',  name: 'Adelaide',  lat: -34.9285, lng: 138.6007, fetcher: fetchSA  },
  { state: 'ACT', name: 'Canberra',  lat: -35.2809, lng: 149.1300, fetcher: fetchNSW },
  { state: 'TAS', name: 'Hobart',    lat: -42.8821, lng: 147.3272, fetcher: fetchNSW },
  { state: 'NT',  name: 'Darwin',    lat: -12.4634, lng: 130.8456, fetcher: fetchNT  },
];

function cheapestPerFuel(stations: Station[]): Partial<Record<FuelType, number>> {
  const out: Partial<Record<FuelType, number>> = {};
  for (const s of stations) {
    for (const fuel of CRON_FUELS) {
      const p = s.prices?.[fuel];
      if (p != null && p > 0 && p < 500) {
        if (out[fuel] == null || p < out[fuel]!) out[fuel] = p;
      }
    }
  }
  return out;
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!cycleStoreConfigured) {
    return NextResponse.json(
      { ok: false, error: 'Redis not configured — set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.' },
      { status: 503 }
    );
  }

  const results = await Promise.allSettled(
    CAPITALS.map(async (cap) => {
      const res = await cap.fetcher({
        lat: cap.lat,
        lng: cap.lng,
        radius: 15,
        limit: 200,
        state: cap.state,
      });
      const cheapest = cheapestPerFuel(res.stations || []);
      const logged: string[] = [];
      for (const [fuel, cents] of Object.entries(cheapest)) {
        await recordCyclePoint(cap.state, fuel as FuelType, cents as number);
        logged.push(`${fuel}=${(cents as number).toFixed(1)}`);
      }
      return { state: cap.state, city: cap.name, stations: res.stations?.length ?? 0, logged };
    })
  );

  const summary = results.map((r, i) =>
    r.status === 'fulfilled'
      ? r.value
      : { state: CAPITALS[i].state, city: CAPITALS[i].name, error: String(r.reason).slice(0, 200) }
  );
  const ok = results.some(r => r.status === 'fulfilled');

  return NextResponse.json({ ok, ranAt: new Date().toISOString(), summary }, { status: ok ? 200 : 500 });
}
