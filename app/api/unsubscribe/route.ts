/**
 * /api/unsubscribe?email=..&token=..
 *
 * Removes every alert subscription for the address. GET serves a small
 * confirmation page (link clicks); POST supports RFC 8058 one-click
 * unsubscribe (the List-Unsubscribe-Post header Gmail/Yahoo act on).
 * Tokens are HMAC-signed per address — see lib/alertTokens.ts.
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifyUnsubscribeToken } from '@/lib/alertTokens';

export const dynamic = 'force-dynamic';

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

async function redisCmd(path: string) {
  const res = await fetch(`${UPSTASH_URL}/${path}`, {
    headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
  });
  if (!res.ok) throw new Error(`Redis ${path.split('/')[0]} failed: ${res.status}`);
  return res.json();
}

async function removeAll(email: string): Promise<number> {
  const safe = email.toLowerCase().trim();
  const data = await redisCmd(`keys/subscription:${encodeURIComponent(safe)}:*:*`);
  const keys: string[] = data.result || [];
  for (const k of keys) {
    await redisCmd(`del/${encodeURIComponent(k)}`);
  }
  return keys.length;
}

function page(title: string, body: string, status = 200) {
  return new NextResponse(
    `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>${title} — Motavo</title>
<style>
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
    background:#e7e4dd;color:#15120e;font-family:'Hanken Grotesk',system-ui,sans-serif;padding:24px}
  .card{max-width:420px;background:#f2f0ea;border:1px solid #15120e;padding:28px}
  h1{font-size:22px;margin:0 0 10px}
  p{margin:0 0 8px;color:#4a453d;line-height:1.6;font-size:15px}
  a{color:#d6390e;font-weight:600;text-decoration:none}
</style></head><body><div class="card"><h1>${title}</h1>${body}</div></body></html>`,
    { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}

async function handle(req: NextRequest, oneClick: boolean) {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) {
    return page('Something went wrong', '<p>Service unavailable — please try again later.</p>', 500);
  }
  const sp = req.nextUrl.searchParams;
  const email = sp.get('email') || '';
  const token = sp.get('token') || '';

  if (!verifyUnsubscribeToken(email, token)) {
    return page('Link not valid', '<p>This unsubscribe link is invalid or has expired. If you still want to stop alerts, reply to any alert email and we&rsquo;ll remove you manually.</p>', 400);
  }

  try {
    const removed = await removeAll(email);
    if (oneClick) {
      // RFC 8058: a plain 200 is all the mail client needs.
      return NextResponse.json({ ok: true, removed });
    }
    return page(
      'You&rsquo;re unsubscribed',
      `<p>${email} won&rsquo;t receive any more price alerts${removed ? ` (${removed} subscription${removed === 1 ? '' : 's'} removed)` : ''}.</p>
       <p>Changed your mind? You can re-subscribe any time at <a href="https://motavo.au">motavo.au</a>.</p>`
    );
  } catch {
    return page('Something went wrong', '<p>We couldn&rsquo;t process that just now — please try the link again in a minute.</p>', 500);
  }
}

export async function GET(req: NextRequest) { return handle(req, false); }
export async function POST(req: NextRequest) { return handle(req, true); }
