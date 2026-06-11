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

async function getKeysRedis(pattern: string): Promise<string[]> {
  const res = await fetch(`${UPSTASH_URL}/keys/${pattern}`, {
    headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
  });
  if (!res.ok) throw new Error(`Redis keys failed: ${res.status}`);
  const data = await res.json();
  return (data.result || []) as string[];
}

async function getRedis(key: string): Promise<any> {
  const res = await fetch(`${UPSTASH_URL}/get/${key}`, {
    headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  try {
    return data.result ? JSON.parse(data.result) : null;
  } catch (e) {
    console.error(`[alerts] parse failed for ${key}`, e);
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
    console.log(`[alerts] fetching cycle signals from ${base}/api/cycle/summary`);
    const res = await fetch(`${base}/api/cycle/summary?fuel=U91`, { cache: 'no-store' });
    if (!res.ok) {
      console.warn(`[alerts] cycle fetch failed: ${res.status}`);
      return {};
    }
    const data = await res.json();
    const signals: Record<string, SignalState> = {};
    for (const [state, signal] of Object.entries(data.signals || {})) {
      signals[state] = (signal as any)?.signal || 'unknown';
    }
    console.log(`[alerts] loaded cycle signals:`, signals);
    return signals;
  } catch (e) {
    console.error('[alerts] cycle fetch error', e);
    return {};
  }
}

export async function GET(req: NextRequest) {
  if (!UPSTASH_URL || !UPSTASH_TOKEN || !RESEND_API_KEY) {
    return NextResponse.json({ error: 'Missing env vars' }, { status: 500 });
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

    const keys = await getKeysRedis('subscription:*:*:*');
    console.log(`[alerts] found ${keys.length} keys:`, keys);

    // Load subscriptions
    const subscriptions = await Promise.all(
      keys.map(async k => {
        const sub = await getRedis(k);
        console.log(`[alerts] key ${k} loaded as:`, sub);
        if (!sub) {
          console.warn(`[alerts] ${k} returned null`);
          return null;
        }
        if (!sub.suburb) {
          console.warn(`[alerts] ${k} missing suburb. contents:`, sub);
          return null;
        }
        return { key: k, ...sub };
      })
    );
    const validSubs = subscriptions.filter(Boolean) as (Subscription & { key: string })[];
    console.log(`[alerts] ${validSubs.length} subscriptions passed validation`);

    // Get signals
    const cycleSignals = await getCycleSignals();

    const getStateFromSuburb = (suburb: string): string => {
      if (!suburb) return 'unknown';
      const parts = suburb.split('-');
      return parts[1]?.toUpperCase() || 'unknown';
    };

    // Group and evaluate
    const byEmail = new Map<string, (Subscription & { key: string; shouldAlert: boolean })[]>();
    for (const sub of validSubs) {
      const state = getStateFromSuburb(sub.suburb);
      const signal = cycleSignals[state] || 'unknown';
      const shouldAlert = (signal === 'peak' || signal === 'high') && (!sub.lastAlertAt || sub.lastAlertAt < oneDayAgo);
      console.log(`[alerts] ${sub.suburb} state=${state} signal=${signal} shouldAlert=${shouldAlert}`);
      if (!byEmail.has(sub.email)) byEmail.set(sub.email, []);
      byEmail.get(sub.email)!.push({ ...sub, shouldAlert });
    }

    const emailsSent: string[] = [];
    for (const [email, subs] of byEmail) {
      const alertSubs = subs.filter(s => s.shouldAlert);
      if (alertSubs.length === 0) {
        console.log(`[alerts] ${email}: 0 suburbs to alert`);
        continue;
      }

      const suburbList = alertSubs.map(s => `${s.suburb.split('-')[0]} (${s.fuelType})`).join(', ');
      const result = await resend.emails.send({
        from: 'alerts@motavo.au',
        to: email,
        subject: `⛽ Time to fill up — ${suburbList} prices are up`,
        html: `<p>Hi,</p><p>Prices are <strong>good right now</strong> in ${alertSubs.length === 1 ? 'your area' : 'your areas'}:</p><ul>${alertSubs.map(s => `<li><strong>${s.suburb.split('-')[0]}</strong> (${s.fuelType})</li>`).join('\n')}</ul><p><a href="https://motavo.au">Check live prices</a> and fill up before they climb again.</p><p>— Motavo</p>`,
      });

      if (result.error) {
        console.error(`[alerts] send to ${email} failed:`, result.error);
      } else {
        emailsSent.push(email);
        console.log(`[alerts] sent email to ${email}`);
        await Promise.all(
          alertSubs.map(s =>
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
      totalKeys: keys.length,
      validSubscriptions: validSubs.length,
      emailsSent: emailsSent.length,
      recipients: emailsSent,
    });
  } catch (e: any) {
    console.error('[alerts] error:', e?.message);
    return NextResponse.json({ ok: false, error: String(e?.message ?? e) }, { status: 500 });
  }
}
