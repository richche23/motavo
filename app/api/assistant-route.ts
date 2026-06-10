import { NextRequest, NextResponse } from 'next/server';
import { SUBURBS } from '@/lib/suburbs';
import { fetchStations as fetchNSW } from '@/lib/sources/nsw-fuelcheck';
import { fetchStations as fetchVIC } from '@/lib/sources/vic-servosaver';
import { fetchStations as fetchQLD } from '@/lib/sources/qld-fuelprices';
import { fetchStations as fetchWA } from '@/lib/sources/wa-fuelwatch';
import { fetchStations as fetchSA } from '@/lib/sources/sa-informedsources';
import { fetchStations as fetchNT } from '@/lib/sources/nt-myfuelnt';
import type { StateCode, FuelType, SourceFetcher } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 30;

const FETCHER: Record<StateCode, SourceFetcher> = {
  NSW: fetchNSW, TAS: fetchNSW, ACT: fetchNSW,
  VIC: fetchVIC, QLD: fetchQLD, WA: fetchWA, SA: fetchSA, NT: fetchNT,
};

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

// ── Rate limit (Upstash REST — reuses your existing Redis, no SDK) ──────────
// Fails OPEN: if Upstash isn't configured or errors, the request is allowed.
const RL_URL = process.env.UPSTASH_REDIS_REST_URL;
const RL_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const RL_LIMIT = 20;          // requests
const RL_WINDOW = 3600;       // per hour, per IP

async function underRateLimit(ip: string): Promise<boolean> {
  if (!RL_URL || !RL_TOKEN) return true; // not configured → allow
  try {
    const bucket = Math.floor(Date.now() / 1000 / RL_WINDOW);
    const key = `rl:asst:${ip}:${bucket}`;
    const r = await fetch(`${RL_URL}/incr/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${RL_TOKEN}` },
      cache: 'no-store',
    });
    const data = await r.json();
    const count = Number(data?.result ?? 0);
    if (count === 1) {
      await fetch(`${RL_URL}/expire/${encodeURIComponent(key)}/${RL_WINDOW}`, {
        headers: { Authorization: `Bearer ${RL_TOKEN}` },
        cache: 'no-store',
      });
    }
    return count <= RL_LIMIT;
  } catch {
    return true; // on any Redis error, don't block the user
  }
}

// ── Parse suburb + fuel type from the message (deterministic, free) ─────────
const SUBURBS_BY_LEN = [...SUBURBS].sort((a, b) => b.name.length - a.name.length);

function detectSuburb(text: string) {
  const t = text.toLowerCase();
  return SUBURBS_BY_LEN.find((s) => t.includes(s.name.toLowerCase())) || null;
}

function detectFuel(text: string): FuelType {
  const t = text.toLowerCase();
  if (/premium diesel|prdsl/.test(t)) return 'PRDSL';
  if (/diesel|dsl/.test(t)) return 'DSL';
  if (/\b98\b|p98/.test(t)) return 'P98';
  if (/\b95\b|p95|premium/.test(t)) return 'P95';
  if (/e10/.test(t)) return 'E10';
  if (/lpg|autogas|\bgas\b/.test(t)) return 'LPG';
  return 'U91';
}

const FUEL_LABEL: Record<FuelType, string> = {
  U91: 'unleaded 91', P95: 'premium 95', P98: 'premium 98', E10: 'E10',
  DSL: 'diesel', PRDSL: 'premium diesel', LPG: 'LPG',
};

async function liveDataBlock(text: string): Promise<string> {
  const sub = detectSuburb(text);
  if (!sub) {
    return '[LIVE_DATA: none. If the user wants a price, ask them to name a supported suburb (e.g. Frankston, Bondi, Geelong, Glenelg). You may still give general fuel-cycle guidance.]';
  }
  const fuelType = detectFuel(text);
  const fetcher = FETCHER[sub.state as StateCode];
  try {
    const res = await fetcher({ lat: sub.lat, lng: sub.lng, radius: 5, limit: 8, state: sub.state as StateCode, fuelType });
    const priced = (res?.stations ?? [])
      .map((st: any) => ({ brand: st.brand, price: st.prices?.[fuelType], address: st.address }))
      .filter((s: any) => typeof s.price === 'number' && s.price > 0)
      .sort((a: any, b: any) => a.price - b.price);
    if (!priced.length) {
      return `[LIVE_DATA: no live ${FUEL_LABEL[fuelType]} prices for ${sub.name}, ${sub.state} right now. Tell the user that and suggest checking back shortly. Do not invent prices.]`;
    }
    const avg = priced.reduce((t: number, s: any) => t + s.price, 0) / priced.length;
    const list = priced.slice(0, 5).map((s: any) => `${s.brand} ${s.price.toFixed(1)}c/L (${s.address})`).join('; ');
    return `[LIVE_DATA — use ONLY this for any price you state; never invent a price. Suburb: ${sub.name}, ${sub.state}. Fuel: ${FUEL_LABEL[fuelType]}. Cheapest: ${priced[0].price.toFixed(1)}c/L at ${priced[0].brand}. Average: ${avg.toFixed(1)}c/L across ${priced.length} stations. Top stations: ${list}.]`;
  } catch {
    return `[LIVE_DATA: lookup for ${sub.name} failed. Apologise briefly and ask them to try again. Do not invent prices.]`;
  }
}

const SYSTEM = `You are Motavo's assistant, helping Australian drivers find cheap fuel and decide when to fill up.
Rules:
- Any price you state MUST come from the [LIVE_DATA] block in the latest message. NEVER invent, estimate, or recall a price.
- Prices are cents per litre (c/L). Be concise and practical, in Australian English.
- If LIVE_DATA has no prices, say so and (if useful) ask for a supported suburb. Do not make up numbers.
- You may give general guidance on fuel price cycles (e.g. Perth is weekly, cheapest Tuesdays; Sydney/Brisbane run ~3–6 week cycles) but never claim a specific current cycle position you weren't given.
- Politely steer off-topic questions back to fuel and EV charging.`;

export async function POST(req: NextRequest) {
  if (!GEMINI_KEY) {
    return NextResponse.json({ reply: "The assistant isn't configured yet. Add GEMINI_API_KEY to your environment." });
  }

  const ip = (req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()) || req.headers.get('x-real-ip') || 'unknown';
  if (!(await underRateLimit(ip))) {
    return NextResponse.json({ reply: "You've reached the message limit for now — please try again in a little while." }, { status: 429 });
  }

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ reply: 'Bad request.' }, { status: 400 }); }

  const incoming = Array.isArray(body?.messages) ? body.messages : [];
  const msgs = incoming
    .filter((m: any) => (m?.role === 'user' || m?.role === 'assistant') && typeof m?.content === 'string')
    .slice(-12);
  const lastUser = [...msgs].reverse().find((m: any) => m.role === 'user');
  if (!lastUser) return NextResponse.json({ reply: 'Ask me about fuel prices near you.' });

  // Build Gemini contents (roles: user/model). Drop history up to first user turn.
  const history = msgs.slice(0, msgs.lastIndexOf(lastUser));
  const contents: any[] = [];
  for (const m of history) {
    if (contents.length === 0 && m.role !== 'user') continue; // first turn must be user
    contents.push({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] });
  }
  const dataBlock = await liveDataBlock(lastUser.content);
  contents.push({ role: 'user', parts: [{ text: `${lastUser.content}\n\n${dataBlock}` }] });

  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM }] },
          contents,
          generationConfig: { maxOutputTokens: 600, temperature: 0.3 },
        }),
      }
    );
    const data = await r.json();
    if (!r.ok) {
      console.error('[assistant] gemini error:', data?.error?.message ?? r.status);
      return NextResponse.json({ reply: 'The assistant hit an error. Please try again shortly.' });
    }
    const reply = (data?.candidates?.[0]?.content?.parts ?? [])
      .map((p: any) => p?.text || '')
      .join('')
      .trim();
    return NextResponse.json({ reply: reply || "Sorry, I couldn't work that out — try naming a suburb." });
  } catch (err: any) {
    console.error('[assistant] error:', err?.message ?? err);
    return NextResponse.json({ reply: 'The assistant hit an error. Please try again shortly.' });
  }
}
