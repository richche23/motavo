/**
 * Debug endpoint — returns raw geographic info from each state API.
 * Use to identify the correct geoRegionLevel and geoRegionId for each token.
 *
 * Usage:
 *   GET /api/debug?state=qld
 *   GET /api/debug?state=sa
 */

import { NextRequest, NextResponse } from 'next/server';

const CONFIGS: Record<string, { url: string; tokenEnv: string }> = {
  qld: {
    url: 'https://fppdirectapi-prod.fuelpricesqld.com.au',
    tokenEnv: 'QLD_FUEL_API_TOKEN',
  },
  sa: {
    url: 'https://fppdirectapi-prod.safuelpricinginformation.com.au',
    tokenEnv: 'SA_FUEL_API_TOKEN',
  },
};

export async function GET(req: NextRequest) {
  const state = req.nextUrl.searchParams.get('state')?.toLowerCase();
  const config = state ? CONFIGS[state] : null;

  if (!config) {
    return NextResponse.json({
      error: 'Pass ?state=qld or ?state=sa',
      available: Object.keys(CONFIGS),
    });
  }

  const token = process.env[config.tokenEnv];
  if (!token) {
    return NextResponse.json({ error: `${config.tokenEnv} not set in Vercel env vars` }, { status: 400 });
  }

  try {
    const geoRes = await fetch(
      `${config.url}/Subscriber/GetCountryGeographicInformation?countryId=21`,
      { headers: { Authorization: `FPDAPI SubscriberToken=${token}`, 'Content-Type': 'application/json' } }
    );
    const geoText = await geoRes.text();
    let geoData: unknown;
    try { geoData = JSON.parse(geoText); } catch { geoData = geoText; }

    // Also try fetching sites with a few candidate region IDs so we can see which works
    const candidates = [
      { level: 1, id: 1 },
      { level: 2, id: 1 },
      { level: 2, id: 2 },
      { level: 2, id: 3 },
      { level: 2, id: 4 },
      { level: 2, id: 5 },
    ];

    const siteTests: Record<string, unknown> = {};
    for (const { level, id } of candidates) {
      try {
        const r = await fetch(
          `${config.url}/Subscriber/GetFullSiteDetails?countryId=21&geoRegionLevel=${level}&geoRegionId=${id}`,
          { headers: { Authorization: `FPDAPI SubscriberToken=${token}`, 'Content-Type': 'application/json' } }
        );
        const txt = await r.text();
        let parsed: unknown;
        try { parsed = JSON.parse(txt); } catch { parsed = txt; }
        // Count stations in the S array if present
        const stations = Array.isArray((parsed as any)?.S) ? (parsed as any).S.length : 'not an array';
        siteTests[`level${level}_id${id}`] = { status: r.status, stationCount: stations };
      } catch (e: any) {
        siteTests[`level${level}_id${id}`] = { error: e?.message };
      }
    }

    return NextResponse.json({
      state,
      geoInfoStatus: geoRes.status,
      geoInfo: geoData,
      siteTestResults: siteTests,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}

export const runtime = 'nodejs';
