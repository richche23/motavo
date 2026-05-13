/**
 * VIC Servo Saver Public API — Victoria's mandatory scheme (live March 2026).
 *
 * Free for app developers — requires registration.
 * Apply at: https://service.vic.gov.au/find-services/transport-and-driving/servo-saver/help-centre/servo-saver-public-api
 * Contact: fuel.program@service.vic.gov.au
 *
 * Auth: API Consumer ID issued on approval — passed in request header.
 *
 * Endpoints (per public API docs at time of writing — confirm in your dev portal):
 *   GET /fuel-prices/v1/stations        — list all stations
 *   GET /fuel-prices/v1/prices          — current + tomorrow's locked prices
 *   GET /fuel-prices/v1/prices/nearby   — bounded radius search
 *
 * TODO when approval lands:
 *   1. Set VIC_SERVOSAVER_API_KEY env var
 *   2. Confirm endpoint paths from your dev portal
 *   3. Replace stub body below with real fetch + transform
 *   4. Flip DATA_SOURCES['vic-servosaver'].status to 'live' in FuelMate.jsx
 */

import { FetchOptions, FetchResult } from '../types';

export async function fetchStations(_opts: FetchOptions): Promise<FetchResult> {
  return {
    stations: [],
    source: 'vic-servosaver',
    cached: false,
    refreshedAt: 0,
  };
}
