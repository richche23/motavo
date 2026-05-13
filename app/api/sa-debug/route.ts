import { NextResponse } from 'next/server';

const BASE_URL = 'https://fppdirectapi-prod.safuelpricinginformation.com.au';
const COUNTRY_ID = 21;

export async function GET() {
  const token = process.env.SA_FUEL_API_TOKEN;
  if (!token) return NextResponse.json({ error: 'SA_FUEL_API_TOKEN not set' }, { status: 500 });

  const auth = { Authorization: `FPDAPI SubscriberToken=${token}`, 'Content-Type': 'application/json' };

  const results: Record<string, any> = { token_prefix: token.slice(0, 8) + '...' };

  // Step 1: geo discovery
  try {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 6000);
    const geoRes = await fetch(`${BASE_URL}/Subscriber/GetCountryGeographicInformation?countryId=${COUNTRY_ID}`, { headers: auth, signal: ctrl.signal });
    results.geo_status = geoRes.status;
    if (geoRes.ok) {
      results.geo_data = await geoRes.json();
    } else {
      results.geo_error = await geoRes.text();
    }
  } catch (e: any) {
    results.geo_threw = e?.message ?? String(e);
  }

  // Step 2: sites with fallback region
  try {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 6000);
    const sitesRes = await fetch(`${BASE_URL}/Subscriber/GetFullSiteDetails?countryId=${COUNTRY_ID}&geoRegionLevel=3&geoRegionId=1`, { headers: auth, signal: ctrl.signal });
    results.sites_status = sitesRes.status;
    if (sitesRes.ok) {
      const data = await sitesRes.json();
      results.sites_count = data?.S?.length ?? 0;
      results.sites_sample = data?.S?.slice(0, 2) ?? [];
    } else {
      results.sites_error = await sitesRes.text();
    }
  } catch (e: any) {
    results.sites_threw = e?.message ?? String(e);
  }

  // Step 3: prices with fallback region
  try {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 6000);
    const pricesRes = await fetch(`${BASE_URL}/Price/GetSitesPrices?countryId=${COUNTRY_ID}&geoRegionLevel=3&geoRegionId=1`, { headers: auth, signal: ctrl.signal });
    results.prices_status = pricesRes.status;
    if (pricesRes.ok) {
      const data = await pricesRes.json();
      results.prices_count = data?.SitePrices?.length ?? 0;
      results.prices_sample = data?.SitePrices?.slice(0, 2) ?? [];
    } else {
      results.prices_error = await pricesRes.text();
    }
  } catch (e: any) {
    results.prices_threw = e?.message ?? String(e);
  }

  return NextResponse.json(results, { headers: { 'Cache-Control': 'no-store' } });
}

export const runtime = 'nodejs';
