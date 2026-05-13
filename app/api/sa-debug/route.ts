import { NextResponse } from 'next/server';

const BASE_URL = 'https://fppdirectapi-prod.safuelpricinginformation.com.au';

export async function GET() {
  const token = process.env.SA_FUEL_API_TOKEN;
  if (!token) return NextResponse.json({ error: 'SA_FUEL_API_TOKEN not set' }, { status: 500 });

  const auth = { Authorization: `FPDAPI SubscriberToken=${token}`, 'Content-Type': 'application/json' };

  const probe = async (label: string, url: string) => {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 6000);
    try {
      const res = await fetch(url, { headers: auth, signal: ctrl.signal });
      const body = res.ok ? await res.json() : await res.text();
      return { status: res.status, body: typeof body === 'string' ? body.slice(0, 200) : body };
    } catch (e: any) {
      return { threw: e?.message ?? String(e) };
    }
  };

  const results: Record<string, any> = {};

  // Try different geo endpoints
  results.geo_regions_21    = await probe('geo_regions_21',    `${BASE_URL}/Subscriber/GetCountryGeographicRegions?countryId=21`);
  results.geo_info_21       = await probe('geo_info_21',       `${BASE_URL}/Subscriber/GetCountryGeographicInformation?countryId=21`);
  results.geo_regions_1     = await probe('geo_regions_1',     `${BASE_URL}/Subscriber/GetCountryGeographicRegions?countryId=1`);
  results.geo_regions_noct  = await probe('geo_regions_noct',  `${BASE_URL}/Subscriber/GetCountryGeographicRegions`);

  // Try sites with a range of level/id combos
  for (const [level, id] of [[1,1],[1,2],[2,1],[2,2],[2,3],[2,4],[2,5],[3,4],[3,5],[4,1]]) {
    const key = `sites_L${level}_I${id}`;
    const r = await probe(key, `${BASE_URL}/Subscriber/GetFullSiteDetails?countryId=21&geoRegionLevel=${level}&geoRegionId=${id}`);
    if ((r as any).body?.S?.length > 0) {
      results[key] = { status: (r as any).status, sites_count: (r as any).body.S.length, sample: (r as any).body.S[0] };
    } else {
      results[key] = r;
    }
  }

  return NextResponse.json(results, { headers: { 'Cache-Control': 'no-store' } });
}

export const runtime = 'nodejs';
