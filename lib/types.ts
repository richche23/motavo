/**
 * Canonical types shared across all data sources.
 * Each source-specific fetcher transforms upstream responses into these shapes
 * before returning. The frontend only ever sees this normalized form.
 */

export type FuelType =
  | 'U91'    // Unleaded 91
  | 'P95'    // Premium 95
  | 'P98'    // Premium 98
  | 'E10'    // 91 octane ethanol blend
  | 'DSL'    // Regular diesel
  | 'PRDSL'  // Premium diesel
  | 'LPG';   // Autogas

export const FUEL_TYPES: FuelType[] = ['U91', 'P95', 'P98', 'E10', 'DSL', 'PRDSL', 'LPG'];

export type StateCode = 'NSW' | 'VIC' | 'QLD' | 'WA' | 'SA' | 'TAS' | 'NT' | 'ACT';

export type Station = {
  /** Stable identifier — typically `{source}-{stationCode}` */
  id: string;
  /** Canonical brand name — see lib/normalizers.ts for mapping rules */
  brand: string;
  /** Station name (often the brand + suburb, e.g. "Shell Coles Express Glebe") */
  name?: string;
  /** Full street address */
  address: string;
  /** Just the suburb component, parsed from address where needed */
  suburb: string;
  state: StateCode;
  postcode?: string;
  lat: number;
  lng: number;
  /** Map of fuel type to price in cents per litre. Null = not stocked / unknown. */
  prices: Record<FuelType, number | null>;
  /** Unix timestamp of the most recent price update across all fuel types */
  updatedAt: number;
  /** Minutes since updatedAt — computed at fetch time for freshness UI */
  updatedMinutesAgo: number;
  /** Distance from query point in km — only populated when filtering by location */
  distance?: number;
  /** Which upstream data source this came from */
  source: string;
};

export type FetchOptions = {
  lat: number;
  lng: number;
  /** Search radius in km. Default 5. */
  radius?: number;
  /** Optional state filter. When omitted, source decides which states to include. */
  state?: StateCode;
  /** Optional fuel type filter — if set, only stations stocking this fuel are returned. */
  fuelType?: FuelType;
  /** Max stations to return after filtering. Default 30. */
  limit?: number;
};

export type FetchResult = {
  stations: Station[];
  /** Where the data came from — useful for debugging cache hits */
  source: string;
  /** True if the response was served from the in-process cache */
  cached: boolean;
  /** When the underlying data was last refreshed from the upstream API */
  refreshedAt: number;
};

/**
 * Every source module exports this function. The route handler dispatches to
 * the right source based on the URL state param.
 */
export type SourceFetcher = (opts: FetchOptions) => Promise<FetchResult>;
