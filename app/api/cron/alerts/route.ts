/**
 * GET /api/cron/alerts — daily alert dispatcher.
 *
 * 1. Fetches all subscriptions from Redis (pattern: subscription:*:*:*)
 * 2. Groups by email and city
 * 3. For each city, checks if it just flipped to "buy now" (from non-buy or no prior alert today)
 * 4. Batches emails per subscriber (one email per person, lists all their buy-now cities)
 * 5. Sends via Resend
 * 6. Records lastAlertAt in Redis to avoid re-alerting within 24h
 *
 * Triggered daily by Vercel Cron (if Pro plan) or manually via a scheduler external to Vercel.
 * On Hobby, just visit the URL manually once a day or use an external cron service.
 */
import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const RESEND_API_KEY = process.env.RESEND_API_KEY;

if (!UPSTASH_URL || !UPSTASH_TOKEN) {
  throw new Error('Upstash Redis env vars missing');
}
if (!RESEND_API_KEY) {
  throw new Error('RESEND_API_KEY not set');
}

const resend = new Resend(RESEND_API_KEY);

type Subscription = {
  email: string;
  city: string;
  fuelType: string;
  subscribedAt: number;
  lastAlertAt: number | null;
};

type SignalState = 'low' | 'mid' | 'high' | 'peak' | 'unknown' | 'stable';

type CycleSignal = { signal: SignalState; latest?: number };

async function scanRedis(pattern: string, cursor = '0', results: string[] = []): Promise<string[]> {
  const res = await fetch(`${UPSTASH_URL}/scan/${cursor}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${UPSTASH_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ match: pattern, count: 100 }),
  });
  if (!res.ok) throw new Error(`Redis scan failed: ${res.status}`);
  const data = await res.json();
  const keys = (data.result?.[1] || []) as string[];
  results.push(...keys);
  if (data.result?.[0] !== '0') {
    return scanRedis(pattern, data.result?.[0] || '0', results);
  }
  return results;
}

async function getRedis(key: string): Promise<Subscription | null> {
  const res = await fetch(`${UPSTASH_URL}/get/${key}`, {
    headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  try {
    return data.result ? JSON.parse(data.result) : null;
  } catch {
    return null;
  }
}

async function setRedis(key: string, value: Subscription) {
  const res = await fetch(`${UPSTASH_URL}/set/${key}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${UPSTASH_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ value: JSON.stringify(value), ex: 365 * 24 * 60 * 60 }),
  });
  if (!res.ok) throw new Error(`Redis set failed: ${res.status}`);
}

async function getCycleSignal(city: string): Promise<CycleSignal> {
  try {
    // Fetch the computed signal from the existing API endpoint
    const base = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
    const res = await fetch(`${base}/api/cycle/summary?fuel=U91`, {
      cache: 'no-store',
    });
    if (!res.ok) return { signal: 'unknown' };
    const data = await res.json();
    const signals = data.signals || {};
    return signals[city] || { signal: 'unknown' };
  } catch {
    return { signal: 'unknown' };
  }
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // Optional auth: if CRON_SECRET is set, require it. Allows manual testing without auth.
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    // 1. Scan all subscriptions
    const keys = await scanRedis('subscription:*:*:*');
    console.log(`[alerts] found ${keys.length} subscriptions`);

    // 2. Load each subscription
    const subscriptions = await Promise.all(
      keys.map(async k => {
        const sub = await getRedis(k);
        return sub ? { key: k, ...sub } : null;
      })
    );
    const validSubs = subscriptions.filter(Boolean) as (Subscription & { key: string })[];

    // 3. Group by email to batch results
    const byEmail = new Map<string, (Subscription & { key: string; shouldAlert: boolean })[]>();
    for (const sub of validSubs) {
      const signal = await getCycleSignal(sub.city);
      const shouldAlert =
        (signal.signal === 'peak' || signal.signal === 'high') &&
        (!sub.lastAlertAt || sub.lastAlertAt < oneDayAgo);

      const entry = { ...sub, shouldAlert };
      if (!byEmail.has(sub.email)) byEmail.set(sub.email, []);
      byEmail.get(sub.email)!.push(entry);
    }

    // 4. Send emails
    const emailsSent: string[] = [];
    for (const [email, subs] of byEmail) {
      const alertCities = subs.filter(s => s.shouldAlert);
      if (alertCities.length === 0) continue;

      const cityList = alertCities
        .map(s => `${s.city} (${s.fuelType})`)
        .join(', ');

      const result = await resend.emails.send({
        from: 'alerts@motavo.au',
        to: email,
        subject: `⛽ Time to fill up — ${cityList} prices are up`,
        html: `
<p>Hi,</p>
<p>Prices are <strong>good right now</strong> in ${alertCities.length === 1 ? cityList : 'your areas'}:</p>
<ul>
${alertCities.map(s => `<li><strong>${s.city}</strong> (${s.fuelType})</li>`).join('\n')}
</ul>
<p><a href="https://motavo.au">Check live prices</a> and fill up before they climb again.</p>
<p>— Motavo</p>
        `,
      });

      if (result.error) {
        console.error(`[alerts] failed to send to ${email}:`, result.error);
      } else {
        emailsSent.push(email);
        // Update lastAlertAt for each subscribed city so we don't re-alert within 24h
        await Promise.all(
          alertCities.map(s =>
            setRedis(`subscription:${s.email}:${s.city}:${s.fuelType}`, {
              ...s,
              lastAlertAt: now,
            })
          )
        );
      }
    }

    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      subscriptions: validSubs.length,
      emailsSent: emailsSent.length,
      recipients: emailsSent,
    });
  } catch (e: any) {
    console.error('[alerts] error:', e);
    return NextResponse.json({ ok: false, error: String(e?.message ?? e) }, { status: 500 });
  }
}
