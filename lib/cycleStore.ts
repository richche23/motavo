/**
 * Cycle store — server-side daily price history per state + fuel type.
 *
 * Backed by Upstash Redis via its REST API (no SDK dependency — plain fetch,
 * same approach as the rate limiter in app/api/assistant/route.ts).
 *
 * Keys:   cycle:v1:{STATE}:{FUEL}  →  JSON array of { d: 'YYYY-MM-DD', p: cents }
 * Writer: app/api/cron/cycle (daily Vercel cron)
 * Reader: app/api/cycle/[state] and app/api/cycle/summary
 *
 * If the Redis env vars are missing, reads return [] and writes no-op, so the
 * site degrades gracefully (the client falls back to localStorage history).
 */

import { StateCode, FuelType } from './types';

const REDIS_URL =
  process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || '';
const REDIS_TOKEN =
  process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || '';

export const cycleStoreConfigured = Boolean(REDIS_URL && REDIS_TOKEN);

/** Days of history to retain per key. ~2 full Sydney cycles. */
const HISTORY_DAYS = 90;
/** Key TTL — refreshed on every write, so active keys never expire. */
const KEY_TTL_SECONDS = 60 * 60 * 24 * 120;

export type CyclePoint = { d: string; p: number };

export type CycleSignalVerdict = {
  /** 'low' | 'mid' | 'high' | 'peak' — or 'unknown' while still learning */
  tone: 'low' | 'mid' | 'high' | 'peak' | 'unknown';
  /** 0..1 position of the latest price within the recent low–high range */
  position: number | null;
  /** Days of history behind the verdict */
  daysTracked: number;
  low: number | null;
  high: number | null;
  /** Most recent logged cheapest price (cents/L) */
  latest: number | null;
};

function key(state: StateCode, fuel: FuelType): string {
  return `cycle:v1:${state}:${fuel}`;
}

/** Run a single Redis command via the Upstash REST API. */
async function redis<T = unknown>(cmd: (string | number)[]): Promise<T | null> {
  if (!cycleStoreConfigured) return null;
  try {
    const res = await fetch(REDIS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${REDIS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cmd),
      // Redis calls should never hang a request for long.
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { result?: T };
    return data?.result ?? null;
  } catch {
    return null;
  }
}

function parseHistory(raw: unknown): CyclePoint[] {
  if (typeof raw !== 'string' || !raw) return [];
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.filter(
      (x): x is CyclePoint =>
        x && typeof x.d === 'string' && typeof x.p === 'number' && x.p > 0 && x.p < 500
    );
  } catch {
    return [];
  }
}

/** Read the daily history for one state + fuel. Oldest first. */
export async function readCycleHistory(
  state: StateCode,
  fuel: FuelType
): Promise<CyclePoint[]> {
  const raw = await redis<string>(['GET', key(state, fuel)]);
  return parseHistory(raw);
}

/** Read histories for many states in one round trip (MGET). */
export async function readCycleHistories(
  states: StateCode[],
  fuel: FuelType
): Promise<Record<string, CyclePoint[]>> {
  const out: Record<string, CyclePoint[]> = {};
  if (states.length === 0) return out;
  const raw = await redis<(string | null)[]>([
    'MGET',
    ...states.map(s => key(s, fuel)),
  ]);
  states.forEach((s, i) => {
    out[s] = parseHistory(raw?.[i] ?? null);
  });
  return out;
}

/**
 * Record today's cheapest price for a state + fuel. If a point already exists
 * for today, keeps the lower of the two (we want the day's genuine low).
 */
export async function recordCyclePoint(
  state: StateCode,
  fuel: FuelType,
  cents: number
): Promise<void> {
  if (!cycleStoreConfigured) return;
  if (!(cents > 0 && cents < 500)) return;

  const today = new Date().toISOString().slice(0, 10);
  let hist = await readCycleHistory(state, fuel);

  const existing = hist.find(h => h.d === today);
  if (existing) existing.p = Math.min(existing.p, Math.round(cents * 10) / 10);
  else hist.push({ d: today, p: Math.round(cents * 10) / 10 });

  hist.sort((a, b) => (a.d < b.d ? -1 : 1));
  hist = hist.slice(-HISTORY_DAYS);

  await redis(['SET', key(state, fuel), JSON.stringify(hist), 'EX', KEY_TTL_SECONDS]);
}

/**
 * Place the most recent price within its recent range and return a verdict.
 * Mirrors the thresholds used by the client-side CycleSignal component so the
 * homepage chips and the results-page banner never disagree.
 *
 * Honest by design: returns 'unknown' until there are >= 4 days of history
 * AND a meaningful spread (>= 3c/L) — no false precision on day one.
 */
export function computeCycleSignal(history: CyclePoint[]): CycleSignalVerdict {
  const points = history.map(h => h.p);
  const daysTracked = history.length;

  if (daysTracked === 0) {
    return { tone: 'unknown', position: null, daysTracked: 0, low: null, high: null, latest: null };
  }

  const latest = points[points.length - 1];
  const low = Math.min(...points);
  const high = Math.max(...points);
  const span = high - low;

  if (daysTracked < 4 || span < 3) {
    return { tone: 'unknown', position: null, daysTracked, low, high, latest };
  }

  const position = Math.max(0, Math.min(1, (latest - low) / span));
  let tone: CycleSignalVerdict['tone'];
  if (position <= 0.25) tone = 'low';
  else if (position <= 0.6) tone = 'mid';
  else if (position <= 0.85) tone = 'high';
  else tone = 'peak';

  return { tone, position, daysTracked, low, high, latest };
}
