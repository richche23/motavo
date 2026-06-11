/**
 * POST /api/subscriptions — add or update email subscriptions.
 *
 * Body: { email, suburbs: ['melbourne-vic-3000', ...], fuelType: 'U91' }
 *
 * Stores in Redis as:
 *   subscription:{email}:{suburbuslug}:{fuelType} → JSON { email, suburb, fuelType, subscribedAt, lastAlertAt }
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const maxDuration = 10;

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

const SubscribeSchema = z.object({
  email: z.string().email().toLowerCase(),
  suburbs: z.array(z.string()).min(1),
  fuelType: z.enum(['U91', 'P95', 'P98', 'E10', 'DSL', 'PRDSL', 'LPG']).default('U91'),
});

type Subscription = {
  email: string;
  suburb: string;
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
  if (!UPSTASH_URL || !UPSTASH_TOKEN) {
    return NextResponse.json(
      { ok: false, error: 'Missing Upstash Redis configuration' },
      { status: 500 }
    );
  }

  try {
    const body = await req.json();
    const { email, suburbs, fuelType } = SubscribeSchema.parse(body);

    const now = Date.now();
    const tasks = suburbs.map(suburb =>
      setRedis(`subscription:${email}:${suburb}:${fuelType}`, {
        email,
        suburb,
        fuelType,
        subscribedAt: now,
        lastAlertAt: null,
      })
    );

    await Promise.all(tasks);

    return NextResponse.json({
      ok: true,
      message: `Subscribed to ${suburbs.length} suburb alerts`,
      email,
      suburbs,
      fuelType,
    });
  } catch (e) {
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
