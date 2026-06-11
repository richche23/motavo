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
    let result = data.result;
    if (!result) return null;
    // Unwrap repeatedly: handles plain JSON strings AND legacy
    // double-wrapped {value, ex} envelopes from the old setRedis bug
    for (let i = 0; i < 3; i++) {
      if (typeof result === 'string') {
        result = JSON.parse(result);
      } else if (result && typeof result === 'object' && typeof result.value === 'string') {
        result = JSON.parse(result.value);
      } else {
        break;
      }
    }
    return result;
  } catch {
    return null;
  }
}

async function setRedis(key: string, value: Subscription) {
  const res = await fetch(`${UPSTASH_URL}/set/${key}?EX=${365 * 24 * 60 * 60}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${UPSTASH_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(value),
  });
  if (!res.ok) throw new Error(`Redis set failed: ${res.status}`);
}

async function getCycleSignals(): Promise<Record<string, string>> {
  try {
    const base = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
    const res = await fetch(`${base}/api/cycle/summary?fuel=U91`, { cache: 'no-store' });
    if (!res.ok) return {};
    const data = await res.json();
    const signals: Record<string, string> = {};
    for (const [state, verdict] of Object.entries(data.signals || {})) {
      signals[state] = (verdict as any)?.tone || 'unknown';
    }
    return signals;
  } catch {
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
    
    // Load subscriptions with detailed debug info
    const debugInfo: Record<string, any> = {};
    const subscriptions = await Promise.all(
      keys.map(async k => {
        const sub = await getRedis(k);
        debugInfo[k] = { loaded: sub, hasSuburb: sub?.suburb ? true : false };
        if (!sub) return null;
        if (!sub.suburb) return null;
        return { key: k, ...sub };
      })
    );
    const validSubs = subscriptions.filter(Boolean) as (Subscription & { key: string })[];

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
      if (!byEmail.has(sub.email)) byEmail.set(sub.email, []);
      byEmail.get(sub.email)!.push({ ...sub, shouldAlert });
    }

    const emailsSent: string[] = [];
    for (const [email, subs] of byEmail) {
      const alertSubs = subs.filter(s => s.shouldAlert);
      if (alertSubs.length === 0) continue;

      const suburbList = alertSubs.map(s => `${s.suburb.split('-')[0]} (${s.fuelType})`).join(', ');
      const result = await resend.emails.send({
        from: 'alerts@motavo.au',
        to: email,
        subject: `⛽ Time to fill up — ${suburbList} prices are up`,
        html: `<p>Hi,</p><p>Prices are <strong>good right now</strong> in ${alertSubs.length === 1 ? 'your area' : 'your areas'}:</p><ul>${alertSubs.map(s => `<li><strong>${s.suburb.split('-')[0]}</strong> (${s.fuelType})</li>`).join('\n')}</ul><p><a href="https://motavo.au">Check live prices</a> and fill up before they climb again.</p><p>— Motavo</p>`,
      });

      if (!result.error) {
        emailsSent.push(email);
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
      _debug: {
        keysFound: keys,
        subscriptionDetails: debugInfo,
        cycleSignals,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message ?? e) }, { status: 500 });
  }
}
