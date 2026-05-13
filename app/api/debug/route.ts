import { NextRequest, NextResponse } from 'next/server';

const CONFIGS: Record<string, { url: string; tokenEnv: string }> = {
  qld: { url: 'https://fppdirectapi-prod.fuelpricesqld.com.au', tokenEnv: 'QLD_FUEL_API_TOKEN' },
  sa:  { url: 'https://fppdirectapi-prod.safuelpricinginformation.com.au', tokenEnv: 'SA_FUEL_API_TOKEN' },
};

export async function GET(req: NextRequest) {
  const state = req.nextUrl.searchParams.get('state')?.toLowerCase();

  // NSW credential check
  if (state === 'nsw') {
    const key    = process.env.NSW_FUELCHECK_API_KEY;
    const secret = process.env.NSW_FUELCHECK_API_SECRET;
    const result: Record<string, unknown> = {
      NSW_FUELCHECK_API_KEY_set:       !!key,
      NSW_FUELCHECK_API_SECRET_set:    !!secret,
      NSW_FUELCHECK_API_KEY_length:    key?.length ?? 0,
      NSW_FUELCHECK_API_SECRET_length: secret?.length ?? 0,
    };
    if (key && secret) {
      const basic = Buffer.from(`${key}:${secret}`).toString('base64');
      try {
        const tokenRes = await fetch(
          'https://api.onegov.nsw.gov.au/oauth/client_credential/accesstoken?grant_type=client_credentials',
          { method: 'GET', headers: { Authorization: `Basic ${basic}` } }
        );
        const body = await tokenRes.text();
        result.tokenExchangeStatus   = tokenRes.status;
        result.tokenExchangeResponse = body.substring(0, 300);
      } catch (e: any) {
        result.tokenExchangeError = e?.message;
      }
    }
    return NextResponse.json(result);
  }

  // QLD / SA geographic info + site tests
  const config = state ? CONFIGS[state] : null;
  if (!config) {
    return NextResponse.json({
      usage: 'Pass ?state=nsw, ?state=qld, or ?state=sa',
      allEnvVarsPresent: {
        NSW_FUELCHECK_API_KEY:    !!process.env.NSW_FUELCHECK_API_KEY,
        NSW_FUELCHECK_API_SECRET: !!process.env.NSW_FUELCHECK_API_SECRET,
        QLD_FUEL_API_TOKEN:       !!process.env.QLD_FUEL_API_TOKEN,
        SA_FUEL_API_TOKEN:        !!process.env.SA_FUEL_API_TOKEN,
      },
    });
  }

  const token = process.env[config.tokenEnv];
  if (!token) {
    return NextResponse.json({ error: `${config.tokenEnv} not set` }, { status: 400 });
  }

  const headers = {
    Authorization:  `FPDAPI SubscriberToken=${token}`,
    'Content-Type': 'application/json',
  };

  try {
    const geoRes  = await fetch(
      `${config.url}/Subscriber/GetCountryGeographicInformation?countryId=21`,
      { headers }
    );
    const geoText = await geoRes.text();
    let geoData: unknown;
    try { geoData = JSON.parse(geoText); } catch { geoData = geoText; }

    // Extended candidate list — covers all level/id combos that could be SA
    const candidates = [
      { level: 1, id: 1 },
      { level: 2, id: 1 }, { level: 2, id: 2 }, { level: 2, id: 3 },
      { level: 2, id: 4 }, { level: 2, id: 5 },
      { level: 3, id: 1 }, { level: 3, id: 2 }, { level: 3, id: 3 },
      { level: 3, id: 4 }, { level: 3, id: 5 }, { level: 3, id: 6 },
      { level: 3, id: 7 }, { level: 3, id: 8 },
    ];

    const siteTests: Record<string, unknown> = {};

    for (const { level, id } of candidates) {
      try {
        const r   = await fetch(
          `${config.url}/Subscriber/GetFullSiteDetails?countryId=21&geoRegionLevel=${level}&geoRegionId=${id}`,
          { headers }
        );
        const txt = await r.text();
        let parsed: unknown;
        try { parsed = JSON.parse(txt); } catch { parsed = txt; }

        const arr   = (parsed as any)?.S;
        const count = Array.isArray(arr) ? arr.length : null;

        siteTests[`L${level}_ID${id}`] = {
          status:       r.status,
          stationCount: count,
          rawSample:    count === 0 || count === null ? txt.substring(0, 300) : undefined,
        };
      } catch (e: any) {
        siteTests[`L${level}_ID${id}`] = { error: e?.message };
      }
    }

    return NextResponse.json({ state, geoInfoStatus: geoRes.status, geoInfo: geoData, siteTests });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}

export const runtime = 'nodejs';
