import { NextRequest, NextResponse } from 'next/server';
import { SUBURBS } from '@/lib/suburbs';
import { fetchStations as fetchNSW } from '@/lib/sources/nsw-fuelcheck';
import { fetchStations as fetchVIC } from '@/lib/sources/vic-servosaver';
import { fetchStations as fetchQLD } from '@/lib/sources/qld-fuelprices';
import { fetchStations as fetchWA } from '@/lib/sources/wa-fuelwatch';
import { fetchStations as fetchSA } from '@/lib/sources/sa-informedsources';
import { fetchStations as fetchNT } from '@/lib/sources/nt-myfuelnt';
import type { StateCode, FuelType, SourceFetcher } from '@/lib/types';
import { cacheGet, cacheSet } from '@/lib/cache';

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
// Auto-detects both common naming styles (native Upstash and Vercel KV/Marketplace).
const RL_URL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || '';
const RL_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || '';
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

// ── Resolve a location from the message ─────────────────────────────────────
// 1. Instant, free: substring match against the curated SUBURBS list.
// 2. Fallback: extract a place phrase and geocode it via Nominatim (AU-only),
//    so ANY Australian suburb, town or postcode works — not just the 91 curated.
const SUBURBS_BY_LEN = [...SUBURBS].sort((a, b) => b.name.length - a.name.length);

type ResolvedPlace = { name: string; state: StateCode; lat: number; lng: number };

function detectSuburb(text: string): ResolvedPlace | null {
  const t = text.toLowerCase();
  const hit = SUBURBS_BY_LEN.find((s) => t.includes(s.name.toLowerCase()));
  return hit ? { name: hit.name, state: hit.state as StateCode, lat: hit.lat, lng: hit.lng } : null;
}

const STATE_NAME_TO_CODE: Record<string, StateCode> = {
  'New South Wales': 'NSW', 'Victoria': 'VIC', 'Queensland': 'QLD',
  'Western Australia': 'WA', 'South Australia': 'SA', 'Tasmania': 'TAS',
  'Australian Capital Territory': 'ACT', 'Northern Territory': 'NT',
};

// Same bounding boxes as elsewhere in the app — used when Nominatim's
// address details don't include a recognisable state.
function stateFromCoords(lat: number, lng: number): StateCode {
  if (lat <= -35.1 && lat >= -35.95 && lng >= 148.75 && lng <= 149.45) return 'ACT';
  if (lat <= -39.2 && lng >= 143.5 && lng <= 149.2) return 'TAS';
  if (lat <= -33.9 && lat >= -39.3 && lng >= 140.8 && lng <= 150.2) return 'VIC';
  if (lat <= -28.0 && lat >= -37.6 && lng >= 140.9 && lng <= 153.7) return 'NSW';
  if (lat <= -9.5  && lat >= -29.2 && lng >= 137.9 && lng <= 153.6) return 'QLD';
  if (lat <= -25.9 && lat >= -38.2 && lng >= 128.9 && lng <= 141.1) return 'SA';
  if (lat <= -10.9 && lat >= -26.1 && lng >= 128.9 && lng <= 138.1) return 'NT';
  if (lng <= 129.1) return 'WA';
  return 'NSW';
}

/** Words that are about fuel/asking, not the place itself. */
const NOISE_WORDS = /\b(please|today|now|right now|currently|tomorrow|tonight|cheapest|cheap|fuel|petrol|price|prices|cost|station|servo|where|what|whats|what's|is|the|find|me|near|nearby|best|premium|diesel|unleaded|e10|lpg|u91|p95|p98|91|95|98)\b/gi;

/** Pull the most likely place phrase out of a chat message. */
function extractPlaceQuery(text: string): string | null {
  // 4-digit postcode (fuel types are 2-digit, so no collision)
  const postcode = text.match(/\b(0[289]\d{2}|[1-9]\d{3})\b/);
  if (postcode) return postcode[1];
  // "... in/near/at/around <place>" — grab up to 4 trailing words
  const m = text.match(/\b(?:in|near|at|around)\s+([a-zA-Z][a-zA-Z'\- ]{2,40})/i);
  if (m) {
    const cleaned = m[1].replace(NOISE_WORDS, '').replace(/[?.!,].*$/, '').replace(/\s+/g, ' ').trim();
    if (cleaned.length >= 3) return cleaned;
  }
  // Bare place name: short message that's mostly a location ("seaford",
  // "wagga wagga prices", "98 frankston"). Strip fuel/asking words and see
  // what's left.
  const words = text.trim().split(/\s+/);
  if (words.length <= 5) {
    const cleaned = text.replace(NOISE_WORDS, '').replace(/[?.!,]/g, '').replace(/\s+/g, ' ').trim();
    if (cleaned.length >= 3 && /^[a-zA-Z'\- ]+$/.test(cleaned)) return cleaned;
  }
  return null;
}

/** Geocode an AU place via Nominatim. Cached 24h to respect their rate policy. */
async function geocodePlace(q: string): Promise<ResolvedPlace | null> {
  const key = `geo:asst:${q.toLowerCase()}`;
  const cached = cacheGet<ResolvedPlace | 'miss'>(key);
  if (cached) return cached === 'miss' ? null : cached;
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q + ', Australia')}&format=json&countrycodes=au&limit=1&addressdetails=1&email=privacy%40motavo.au`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Motavo/1.0 (https://motavo.au; privacy@motavo.au)',
        'Referer': 'https://motavo.au',
      },
      signal: AbortSignal.timeout(5000),
      cache: 'no-store',
    });
    if (!res.ok) {
      console.warn(`[assistant] geocode "${q}" failed: HTTP ${res.status}`);
      return null;
    }
    const data = await res.json();
    const r = data?.[0];
    if (!r?.lat || !r?.lon) {
      console.warn(`[assistant] geocode "${q}": no results`);
      cacheSet(key, 'miss', 24 * 60 * 60 * 1000);
      return null;
    }
    const lat = parseFloat(r.lat);
    const lng = parseFloat(r.lon);
    const name =
      r.address?.suburb || r.address?.town || r.address?.city || r.address?.village ||
      (r.display_name || q).split(',')[0].trim();
    const state = STATE_NAME_TO_CODE[r.address?.state] || stateFromCoords(lat, lng);
    const place: ResolvedPlace = { name, state, lat, lng };
    cacheSet(key, place, 24 * 60 * 60 * 1000);
    console.log(`[assistant] geocoded "${q}" → ${place.name}, ${place.state}`);
    return place;
  } catch (e: any) {
    console.warn(`[assistant] geocode "${q}" error: ${e?.message ?? e}`);
    return null;
  }
}

/** Local list first (instant), then geocode whatever place the message names. */
async function resolveLocation(text: string): Promise<ResolvedPlace | null> {
  const local = detectSuburb(text);
  if (local) return local;
  const q = extractPlaceQuery(text);
  if (!q) return null;
  return geocodePlace(q);
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
  const sub = await resolveLocation(text);
  if (!sub) {
    return '[LIVE_DATA: none. If the user wants a price, ask them to name any Australian suburb, town or postcode (e.g. "cheapest 91 in Pakenham" or "diesel near 3196"). You may still give general fuel-cycle guidance.]';
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
- If LIVE_DATA has no prices, say so and (if useful) ask for a suburb, town or postcode anywhere in Australia. Do not make up numbers.
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
    return NextResponse.json({ reply: reply || "Sorry, I couldn't work that out — try naming a suburb or postcode." });
  } catch (err: any) {
    console.error('[assistant] error:', err?.message ?? err);
    return NextResponse.json({ reply: 'The assistant hit an error. Please try again shortly.' });
  }
}
