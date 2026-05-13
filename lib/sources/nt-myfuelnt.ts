/**
 * NT MyFuel NT — Northern Territory's fuel pricing scheme.
 *
 * Smaller market (~150K population in Darwin) and less publicly documented
 * than other states. Contact NT government via nt.gov.au to confirm current
 * API access process.
 *
 * Alternative: NT data may also be queryable via the NSW FuelCheck API if
 * cross-state coverage exists — check with NSW before applying separately.
 *
 * TODO when approval lands:
 *   1. Set NT_MYFUELNT_API_KEY env var
 *   2. Implement fetch
 *   3. Flip DATA_SOURCES['nt-myfuelnt'].status to 'live' in FuelMate.jsx
 */

import { FetchOptions, FetchResult } from '../types';

export async function fetchStations(_opts: FetchOptions): Promise<FetchResult> {
  return {
    stations: [],
    source: 'nt-myfuelnt',
    cached: false,
    refreshedAt: 0,
  };
}
