/**
 * Helpers to normalize the various ways the same brand or fuel type is named
 * across state APIs. The frontend BRANDS dictionary in Motavo.jsx uses a
 * canonical set of names — these mappers translate from raw API responses.
 */

import { FuelType } from './types';

/* ===== Brand normalization ============================================ */

/**
 * Caltex rebranded to Ampol in 2020 after the EG Group acquisition split the
 * Australian operations. Some APIs still return "Caltex" — treat as Ampol.
 * "Caltex Woolworths" was a distinct co-brand (now mostly EG Ampol).
 */
const BRAND_ALIASES: Record<string, string> = {
  // Direct matches kept as-is — listed for visibility
  '7-Eleven':         '7-Eleven',
  'Ampol':            'Ampol',
  'BP':               'BP',
  'Caltex Woolworths':'Caltex Woolworths',
  'Coles Express':    'Coles Express',
  'Costco':           'Costco',
  'EG Ampol':         'EG Ampol',
  'Liberty':          'Liberty',
  'Metro Petroleum':  'Metro Petroleum',
  'Mobil':            'Mobil',
  'Puma':             'Puma',
  'Shell':            'Shell',
  'United':           'United',
  'Vibe':             'Vibe',
  'Independent':      'Independent',

  // Aliases / historical names
  'Caltex':           'Ampol',                  // pre-2020 brand
  'Caltex Australia': 'Ampol',
  '7 Eleven':         '7-Eleven',
  'Seven Eleven':     '7-Eleven',
  '7-ELEVEN':         '7-Eleven',
  'Puma Energy':      'Puma',
  'Metro':            'Metro Petroleum',
  'Mobil Pegasus':    'Mobil',
  'United Petroleum': 'United',
  'EG Group':         'EG Ampol',
  'Speedway':         'EG Ampol',               // 7-Eleven Australia rebrand path
  'BP Truckstop':     'BP',
  'Westside':         'Independent',
  'Lowes Petroleum':  'Independent',
  'Reddy Express':    'Reddy Express',          // new brand for ex-Coles Express
};

export function normalizeBrand(raw: unknown): string {
  if (raw === null || raw === undefined || raw === '') return 'Independent';
  // Force to string — some APIs return brand as a number or object
  const str = String(raw).trim();
  if (!str) return 'Independent';
  // Try exact match first
  if (BRAND_ALIASES[str]) return BRAND_ALIASES[str];
  const upper = str.toUpperCase();
  for (const [key, value] of Object.entries(BRAND_ALIASES)) {
    if (key.toUpperCase() === upper) return value;
  }
  return str;
}

/* ===== Fuel type normalization ======================================== */

/**
 * Each state uses different fuel-type codes. NSW/QLD/ACT/TAS share NSW
 * FuelCheck conventions. WA and VIC have their own.
 */
const FUEL_TYPE_MAP: Record<string, FuelType> = {
  // NSW FuelCheck codes
  'U91':  'U91',
  'P95':  'P95',
  'P98':  'P98',
  'E10':  'E10',
  'DL':   'DSL',
  'PDL':  'PRDSL',
  'LPG':  'LPG',

  // FuelWatch WA codes
  'ULP':  'U91',
  'PULP': 'P95',
  '98RON':'P98',
  'E85':  'E10',     // close approximation — E85 is its own thing but we don't track it
  'Diesel': 'DSL',
  'PremiumDiesel': 'PRDSL',
  'BioDiesel20': 'DSL',

  // QLD Fuel Prices
  'Unleaded 91':       'U91',
  'Premium 95':        'P95',
  'Premium 98':        'P98',
  'Ethanol E10':       'E10',
  'Diesel - Regular':  'DSL',
  'Diesel - Premium':  'PRDSL',
  'Autogas/LPG':       'LPG',

  // VIC Servo Saver expected codes (spec-based — confirm when API live)
  'unleaded_91':   'U91',
  'unleaded_95':   'P95',
  'unleaded_98':   'P98',
  'ethanol_10':    'E10',
  'diesel':        'DSL',
  'premium_diesel':'PRDSL',
  'autogas':       'LPG',
};

export function normalizeFuelType(raw: unknown): FuelType | null {
  if (raw === null || raw === undefined) return null;
  const trimmed = String(raw).trim();
  if (FUEL_TYPE_MAP[trimmed]) return FUEL_TYPE_MAP[trimmed];
  // Case-insensitive fallback
  const upper = trimmed.toUpperCase();
  for (const [key, value] of Object.entries(FUEL_TYPE_MAP)) {
    if (key.toUpperCase() === upper) return value;
  }
  return null;
}

/* ===== Geography helpers ============================================== */

/** Haversine distance in km between two lat/lng points. */
export function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Parse a typical AU address string like "123 King St, Glebe NSW 2037" into
 * its components. Best-effort — not all addresses follow the same pattern.
 */
export function parseAddress(full: string): { street: string; suburb: string; postcode: string } {
  const parts = full.split(',').map(s => s.trim()).filter(Boolean);
  if (parts.length === 0) return { street: '', suburb: '', postcode: '' };
  const street = parts[0];
  const tail = parts.slice(1).join(' ');
  // Look for trailing "SUBURB STATE POSTCODE" pattern
  const match = tail.match(/^(.+?)\s+(?:NSW|VIC|QLD|WA|SA|TAS|NT|ACT)\s+(\d{4})$/i);
  if (match) {
    return { street, suburb: match[1].trim(), postcode: match[2] };
  }
  // Fallback: try to find a 4-digit postcode anywhere
  const pcMatch = tail.match(/\b(\d{4})\b/);
  return {
    street,
    suburb: tail.replace(/\s*(?:NSW|VIC|QLD|WA|SA|TAS|NT|ACT)\s*\d{4}\s*$/i, '').trim(),
    postcode: pcMatch ? pcMatch[1] : '',
  };
}
