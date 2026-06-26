/**
 * GET /api/debug-nt — TEMPORARY diagnostic endpoint.
 *
 * Runs the exact same scrape as lib/sources/nt-myfuelnt.ts but instead of
 * parsing prices, returns the raw payload structure: outlet count, the field
 * names present, and the first two outlets verbatim. Visit it in a browser
 * and the output shows exactly what MyFuel NT is sending now.
 *
 * DELETE THIS FILE once NT is fixed — it's public-data only but there's no
 * reason to keep a scrape-debugging endpoint in production.
 */
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const BASE_URL = 'https://myfuelnt.nt.gov.au';

function decodeEntities(s: string): string {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

export async function GET() {
  const steps: Record<string, unknown> = {};
  try {
    const ua = 'Mozilla/5.0 (compatible; Motavo/1.0; +https://motavo.com.au)';

    // Step 1: homepage → CSRF token + cookies
    const homeRes = await fetch(`${BASE_URL}/`, {
      headers: { 'User-Agent': ua, Accept: 'text/html' },
      redirect: 'follow',
      cache: 'no-store',
    });
    steps.homepageStatus = homeRes.status;
    const homeHtml = await homeRes.text();

    const tokenMatch =
      homeHtml.match(/<input[^>]+name="__RequestVerificationToken"[^>]+value="([^"]+)"/) ??
      homeHtml.match(/<input[^>]+value="([^"]+)"[^>]+name="__RequestVerificationToken"/);
    steps.tokenFound = Boolean(tokenMatch);
    if (!tokenMatch) {
      return NextResponse.json({ steps, error: 'CSRF token not found on homepage' });
    }

    const cookies = (homeRes.headers.get('set-cookie') ?? '')
      .split(/,(?=\s*\w+=)/)
      .map(c => c.split(';')[0].trim())
      .filter(Boolean)
      .join('; ');
    steps.cookieCount = cookies.split(';').length;

    // Step 2: Results for Darwin City
    const params = new URLSearchParams({
      __RequestVerificationToken: tokenMatch[1],
      searchOptions: 'suburbPostcode',
      Suburb: 'DARWIN CITY (0800)',
      SuburbId: '1',
      RegionId: '',
      FuelCode: 'ALLU',
      BrandIdentifier: '',
    });
    const resultsRes = await fetch(`${BASE_URL}/Home/Results?${params}`, {
      headers: { Cookie: cookies, Referer: `${BASE_URL}/`, 'User-Agent': ua, Accept: 'text/html' },
      redirect: 'follow',
      cache: 'no-store',
    });
    steps.resultsStatus = resultsRes.status;
    const html = await resultsRes.text();
    steps.resultsHtmlLength = html.length;

    // Step 3: serverJson extraction
    const jsonMatch =
      html.match(/<input[^>]+id="serverJson"[^>]+value="([^"]*)"/) ??
      html.match(/<input[^>]+value="([^"]*)"[^>]+id="serverJson"/);
    steps.serverJsonFound = Boolean(jsonMatch);
    if (!jsonMatch) {
      // Show what hidden inputs DO exist so we can find the renamed one.
      const hiddenInputs = [...html.matchAll(/<input[^>]+type="hidden"[^>]+id="([^"]+)"/g)].map(m => m[1]);
      return NextResponse.json({ steps, hiddenInputIds: hiddenInputs.slice(0, 30), error: '#serverJson not found' });
    }

    const decoded = decodeEntities(jsonMatch[1]);
    const server = JSON.parse(decoded);

    const topLevelKeys = Object.keys(server ?? {});
    const outlets = server?.FuelOutlet ?? [];
    const first = outlets[0] ?? null;
    const second = outlets[1] ?? null;

    return NextResponse.json({
      steps,
      topLevelKeys,
      outletCount: Array.isArray(outlets) ? outlets.length : 'FuelOutlet not an array',
      firstOutletKeys: first ? Object.keys(first) : null,
      firstOutlet: first,
      secondOutlet: second,
    });
  } catch (e: any) {
    return NextResponse.json({ steps, error: String(e?.message ?? e) });
  }
}
