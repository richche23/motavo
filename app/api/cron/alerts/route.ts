/**
 * GET /api/cron/alerts — daily alert dispatcher.
 *
 * 1. Fetches all subscriptions from Redis (pattern: subscription:*:*:*)
 * 2. For each suburb subscription, checks if its state's price cycle is "peak" or "high"
 * 3. If yes AND no alert sent today (lastAlertAt check), sends email
 * 4. Records lastAlertAt in Redis to throttle alerts to once per 24 hours per suburb
 *
 * Suburb-level alerts check state-level cycle signals. When NSW says "buy now",
 * all NSW suburb subscribers get alerted (once per day max).
 */
import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const RESEND_API_KEY = process.env.RESEND_API_KEY;

type Subscription = {
  email: string;
  suburb: string;
  fuelType: string;
  subscribedAt: number;
  lastAlertAt: number | null;
};

type SignalState = 'low' | 'mid' | 'high' | 'peak' | 'unknown' | 'stable';

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

async function getCycleSignals(): Promise<Record<string, SignalState>> {
  try {
    const base = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
    const res = await fetch(`${base}/api/cycle/summary?fuel=U91`, {
      cache: 'no-store',
    });
    if (!res.ok) return {};
    const data = await res.json();
    const signals: Record<string, SignalState> = {};
    for (const [state, signal] of Object.entries(data.signals || {})) {
      signals[state] = (signal as any)?.signal || 'unknown';
    }
    return signals;
  } catch {
    return {};
  }
}

export async function GET(req: NextRequest) {
  if (!UPSTASH_URL || !UPSTASH_TOKEN || !RESEND_API_KEY) {
    return NextResponse.json(
      { error: 'Missing environment variables (Upstash or Resend config)' },
      { status: 500 }
    );
  }

  const resend = new Resend(RESEND_API_KEY);
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    // Fetch all subscriptions
    const keys = await scanRedis('subscription:*:*:*');
    console.log(`[alerts] found ${keys.length} subscriptions`);

    // Load each subscription
    const subscriptions = await Promise.all(
      keys.map(async k => {
        const sub = await getRedis(k);
        return sub ? { key: k, ...sub } : null;
      })
    );
    const validSubs = subscriptions.filter(Boolean) as (Subscription & { key: string })[];

    // Get state-level cycle signals
    const cycleSignals = await getCycleSignals();

    // Extract state from suburb slug (e.g., "melbourne-vic-3000" → "VIC")
    const getStateFromSuburb = (suburb: string): string => {
      const parts = suburb.split('-');
      return parts[1]?.toUpperCase() || 'unknown';
    };

    // Group by email to batch emails
    const byEmail = new Map<string, (Subscription & { key: string; shouldAlert: boolean; suburb: string })[]>();
    for (const sub of validSubs) {
      const state = getStateFromSuburb(sub.suburb);
      const signal = cycleSignals[state] || 'unknown';
      const shouldAlert =
        (signal === 'peak' || signal === 'high') &&
        (!sub.lastAlertAt || sub.lastAlertAt < oneDayAgo);

      const entry = { ...sub, shouldAlert, suburb: sub.suburb };
      if (!byEmail.has(sub.email)) byEmail.set(sub.email, []);
      byEmail.get(sub.email)!.push(entry);
    }

    // Send emails
    const emailsSent: string[] = [];
    for (const [email, subs] of byEmail) {
      const alertSuburbs = subs.filter(s => s.shouldAlert);
      if (alertSuburbs.length === 0) continue;

      const suburbList = alertSuburbs
        .map(s => `${s.suburb.split('-')[0]} (${s.fuelType})`)
        .join(', ');

      const result = await resend.emails.send({
        from: 'alerts@motavo.au',
        to: email,
        subject: `⛽ Time to fill up — ${suburbList} prices are up`,
        html: `
<p>Hi,</p>
<p>Prices are <strong>good right now</strong> in ${alertSuburbs.length === 1 ? 'your area' : 'your areas'}:</p>
<ul>
${alertSuburbs.map(s => `<li><strong>${s.suburb.split('-')[0]}</strong> (${s.fuelType})</li>`).join('\n')}
</ul>
<p><a href="https://motavo.au">Check live prices</a> and fill up before they climb again.</p>
<p>— Motavo</p>
        `,
      });

      if (result.error) {
        console.error(`[alerts] failed to send to ${email}:`, result.error);
      } else {
        emailsSent.push(email);
        // Update lastAlertAt for each suburb
        await Promise.all(
          alertSuburbs.map(s =>
            setRedis(`subscription:${s.email}:${s.suburb}:${s.fuelType}`, {
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
