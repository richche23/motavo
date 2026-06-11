/**
 * lib/ev-tariffs.ts — Indicative EV charging tariffs by network.
 *
 * IMPORTANT — read before trusting these numbers:
 *   There is no live, per-charger price feed for EV charging in Australia the
 *   way there is for fuel. Charging cost is set per NETWORK as a published
 *   tariff (usually cents per kWh, sometimes split AC vs DC and peak/off-peak,
 *   often with a session minimum). The figures below are INDICATIVE, rounded,
 *   and dated. They WILL drift — review and update `lastChecked` monthly
 *   against each network's pricing page, and always show users the
 *   "indicative" label (see INDICATIVE_PRICING_NOTE).
 *
 * Live data (locations, connectors, power, operator) comes from Open Charge Map.
 * This table only supplies the indicative price, matched by operator name.
 *
 * Verified June 2026 against published rates and current market reporting.
 */
import type { EVTariff } from './types';

export const TARIFFS_VERIFIED = 'June 2026';

export const INDICATIVE_PRICING_NOTE =
  `Indicative network rates (verified ${TARIFFS_VERIFIED}) — not live per-charger prices. Check the operator’s app for the exact cost before charging.`;

/** Canonical network key -> indicative tariff. cents per kWh. */
export const NETWORK_TARIFFS: Record<string, EVTariff> = {
  'tesla-supercharger': {
    network: 'Tesla Supercharger', acPerKwh: null, dcPerKwh: 60,
    notes: 'Roughly 43–69c; varies by site and time of day. Tesla owners and off-peak cheaper; non-Tesla via the Tesla app ($9.99/mo membership matches Tesla rates).',
    source: 'https://www.tesla.com/en_au/supercharger', lastChecked: '2026-06',
  },
  'chargefox': {
    network: 'Chargefox', acPerKwh: 30, dcPerKwh: 60,
    notes: 'Roughly 40–60c DC depending on site and speed; some AC sites free. Motoring club members (NRMA/RACV/RACQ etc.) save 10% at select sites.',
    source: 'https://www.chargefox.com', lastChecked: '2026-06',
  },
  'evie': {
    network: 'Evie Networks', acPerKwh: null, dcPerKwh: 58,
    notes: '58c at 50–75 kW, 73c at 350 kW ultra-rapid. Some sites peak/off-peak.',
    source: 'https://goevie.com.au', lastChecked: '2026-06',
  },
  'nrma': {
    network: 'NRMA', acPerKwh: null, dcPerKwh: 75,
    notes: 'Location-based pricing, roughly 66–79c by site. NRMA members save a flat 5c/kWh.',
    source: 'https://www.mynrma.com.au/electric/charging', lastChecked: '2026-06',
  },
  'ampol-ampcharge': {
    network: 'Ampol AmpCharge', acPerKwh: null, dcPerKwh: 69,
    notes: 'DC fast charging at Ampol sites; loyalty program discounts may apply.',
    source: 'https://ampcharge.ampol.com.au', lastChecked: '2026-06',
  },
  'bp-pulse': {
    network: 'BP Pulse', acPerKwh: null, dcPerKwh: 66,
    notes: 'BP Pulse rapid/ultra-rapid at BP sites.',
    source: 'https://www.bppulse.com.au', lastChecked: '2026-06',
  },
  'raa-charge': {
    network: 'RAA Charge', acPerKwh: 40, dcPerKwh: 75,
    notes: 'SA. Off-peak ~33–37c AC / 66–71c DC. $1 session minimum.',
    source: 'https://www.raa.com.au/motor/motoring-services/ev-charging-stations', lastChecked: '2026-01',
  },
  'jolt': {
    network: 'Jolt', acPerKwh: null, dcPerKwh: 54,
    notes: 'First 7 kWh free per day, then ~54c/kWh. Daily plan adds a $1.99 service fee; Pro plan has none.',
    source: 'https://jolt.com.au', lastChecked: '2026-06',
  },
  'evx': {
    network: 'EVX', acPerKwh: 50, dcPerKwh: null,
    notes: 'Kerbside AC charging on power poles, mainly NSW/VIC metro.',
    source: 'https://evx.com.au', lastChecked: '2026-06',
  },
  'exploren': {
    network: 'Exploren', acPerKwh: 30, dcPerKwh: 60,
    notes: 'Operator-set; varies by host site.',
    source: 'https://exploren.com.au', lastChecked: '2026-01',
  },
  'agl': {
    network: 'AGL', acPerKwh: 30, dcPerKwh: 60,
    notes: 'Indicative; varies by site.',
    source: 'https://www.agl.com.au', lastChecked: '2026-01',
  },
};

/**
 * Map an Open Charge Map operator title to a canonical tariff key.
 * Returns null when we don't have a tariff for that operator.
 */
export function networkKeyFromOperator(operator: string | null | undefined): string | null {
  if (!operator) return null;
  const s = operator.toLowerCase();
  if (s.includes('tesla')) return 'tesla-supercharger';
  if (s.includes('chargefox')) return 'chargefox';
  if (s.includes('evie')) return 'evie';
  if (s.includes('nrma')) return 'nrma';
  if (s.includes('ampol') || s.includes('ampcharge')) return 'ampol-ampcharge';
  if (s.includes('bp ') || s.includes('bp pulse') || s === 'bp') return 'bp-pulse';
  if (s.includes('raa')) return 'raa-charge';
  if (s.includes('jolt')) return 'jolt';
  if (s.includes('evx')) return 'evx';
  if (s.includes('exploren')) return 'exploren';
  if (s.includes('agl')) return 'agl';
  return null;
}

/** Look up the indicative tariff for an operator title, or null. */
export function getTariff(operator: string | null | undefined): EVTariff | null {
  const key = networkKeyFromOperator(operator);
  return key ? NETWORK_TARIFFS[key] : null;
}
