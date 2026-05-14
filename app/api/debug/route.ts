import { NextRequest, NextResponse } from 'next/server';

const CONFIGS: Record<string, { url: string; tokenEnv: string }> = {
  qld: { url: 'https://fppdirectapi-prod.fuelpricesqld.com.au', tokenEnv: 'QLD_FUEL_API_TOKEN' },
  sa:  { url: 'https://fppdirectapi-prod.safuelpricinginformation.com.au', tokenEnv: 'SA_FUEL_API_TOKEN' },
};

export async function GET(req: NextRequest) {
  const state = req.nextUrl.searchParams.get('state')?.toLowerCase();

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

    // Only test the confirmed working combo — skip the other 13 to save time
    const sitesRes = await fetch(
      `${config.url}/Subscriber/GetFullSiteDetails?countryId=21&geoRegionLevel=3&geoRegionId=4`,
      { headers }
    );
    const sitesTxt = await sitesRes.text();
    const sitesData = JSON.parse(sitesTxt) as { S?: any[] };
    const stationCount = sitesData.S?.length ?? 0;

    // Prices with full FuelId distribution
    const pricesRes = await fetch(
      `${config.url}/Price/GetSitesPrices?countryId=21&geoRegionLevel=3&geoRegionId=4`,
      { headers }
    );
    const pricesTxt = await pricesRes.text();
    const pricesData = JSON.parse(pricesTxt) as { SitePrices?: any[] };
    const prices = pricesData.SitePrices ?? [];

    // Count records per FuelId so we know which fuel types actually have data
    const fuelIdCounts: Record<number, number> = {};
    for (const p of prices) {
      fuelIdCounts[p.FuelId] = (fuelIdCounts[p.FuelId] ?? 0) + 1;
    }

    // Sample one record per FuelId so we can see the price range
    const fuelIdSamples: Record<number, unknown> = {};
    for (const p of prices) {
      if (!fuelIdSamples[p.FuelId]) fuelIdSamples[p.FuelId] = p;
    }

    return NextResponse.json({
      state,
      geoInfoStatus:  geoRes.status,
      geoInfo:        geoData,
      sitesL3ID4:     { status: sitesRes.status, stationCount },
      pricesL3ID4: {
        status:        pricesRes.status,
        totalRecords:  prices.length,
        // Key question: does FuelId 1 (U91) have any records?
        fuelIdCounts,
        fuelIdSamples,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}

export const runtime = 'nodejs';
