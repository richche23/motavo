/**
 * POST /api/subscriptions — add or update an email subscription.
 *
 * Body: { email, cities: ['NSW', 'VIC', ...], fuelType: 'U91' }
 *
 * Stores in Redis as:
 *   subscription:{email}:{city}:{fuelType} → JSON { email, city, fuelType, subscribedAt, lastAlertAt }
 *
 * lastAlertAt is updated by the daily cron when an alert is sent, so the same
 * city won't spam you with "buy now" alerts repeatedly within a 24-hour window.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const maxDuration = 10;

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

if (!UPSTASH_URL || !UPSTASH_TOKEN) {
  throw new Error('Upstash Redis env vars missing');
}

const SubscribeSchema = z.object({
  email: z.string().email().toLowerCase(),
  cities: z.array(z.enum(['NSW', 'VIC', 'QLD', 'WA', 'SA', 'ACT', 'TAS', 'NT'])).min(1),
  fuelType: z.enum(['U91', 'P95', 'P98', 'E10', 'DSL', 'PRDSL', 'LPG']).default('U91'),
});

type Subscription = {
  email: string;
  city: string;
  fuelType: string;
  subscribedAt: number;
  lastAlertAt: number | null;
};

async function setRedis(key: string, value: Subscription, ttlSeconds = 365 * 24 * 60 * 60) {
  const res = await fetch(`${UPSTASH_URL}/set/${key}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${UPSTASH_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ value: JSON.stringify(value), ex: ttlSeconds }),
  });
  if (!res.ok) throw new Error(`Redis set failed: ${res.status}`);
  return res.json();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, cities, fuelType } = SubscribeSchema.parse(body);

    // Store one entry per (email, city, fuelType) combo. If they resubscribe,
    // subscribedAt stays the same but lastAlertAt resets so they get alerts again.
    const now = Date.now();
    const tasks = cities.map(city =>
      setRedis(`subscription:${email}:${city}:${fuelType}`, {
        email,
        city,
        fuelType,
        subscribedAt: now,
        lastAlertAt: null,
      })
    );

    await Promise.all(tasks);

    return NextResponse.json({
      ok: true,
      message: `Subscribed to ${cities.length} city alerts`,
      email,
      cities,
      fuelType,
    });
  } catch (e: any) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { ok: false, error: 'Invalid input', details: e.errors },
        { status: 400 }
      );
    }
    console.error('[subscriptions] error:', e);
    return NextResponse.json({ ok: false, error: String(e?.message ?? e) }, { status: 500 });
  }
}
