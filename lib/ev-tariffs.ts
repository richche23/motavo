/**
 * Indicative EV charging tariffs by network.
 *
 * IMPORTANT — read before trusting these numbers:
 *   There is no live, per-charger price feed for EV charging in Australia the
 *   way there is for fuel. Charging cost is set per NETWORK as a published
 *   tariff (usually cents per kWh, sometimes split AC vs DC and peak/off-peak,
 *   often with a session minimum). The figures below are INDICATIVE, rounded,
 *   and dated. They WILL drift — review and update `lastChecked` periodically,
 *   and always show users the "indicative" label (see INDICATIVE_PRICING_NOTE).
 *
 * Live data (locations, connectors, power, operator) comes from Open Charge Map.
 * This table only supplies the indicative price, matched by operator name.
 */
import type { EVTariff } from './types';

export const INDICATIVE_PRICING_NOTE =
  'Prices are indicative network rates, not live per-charger prices. Check the operator’s app for the exact cost before charging.';

/** Canonical network key -> indicative tariff. cents per kWh. */
export const NETWORK_TARIFFS: Record<string, EVTariff> = {
  'tesla-supercharger': {
    network: 'Tesla Supercharger', acPerKwh: null, dcPerKwh: 79,
    notes: 'Varies by site and time of day; non-Tesla via the Tesla app.',
    source: 'https://www.tesla.com/en_au/supercharger', lastChecked: '2026-01',
  },
  'chargefox': {
    network: 'Chargefox', acPerKwh: 30, dcPerKwh: 60,
    notes: 'Operator-set; ultra-rapid DC can be higher. Some AC sites free.',
    source: 'https://www.chargefox.com', lastChecked: '2026-01',
  },
  'evie': {
    network: 'Evie Networks', acPerKwh: 35, dcPerKwh: 65,
    notes: 'Peak/off-peak vary by site.',
    source: 'https://www.evie.com.au', lastChecked: '2026-01',
  },
  'nrma': {
    network: 'NRMA', acPerKwh: null, dcPerKwh: 30,
    notes: 'Many regional sites low-cost or free; member benefits apply.',
    source: 'https://www.mynrma.com.au/electric/charging', lastChecked: '2026-01',
  },
  'ampol-ampcharge': {
    network: 'Ampol AmpCharge', acPerKwh: null, dcPerKwh: 69,
    notes: 'DC fast charging at Ampol sites.',
    source: 'https://ampcharge.ampol.com.au', lastChecked: '2026-01',
  },
  'bp-pulse': {
    network: 'BP Pulse', acPerKwh: null, dcPerKwh: 60,
    notes: 'BP Pulse rapid/ultra-rapid.',
    source: 'https://www.bppulse.com.au', lastChecked: '2026-01',
  },
  'raa-charge': {
    network: 'RAA Charge', acPerKwh: 40, dcPerKwh: 75,
    notes: 'SA. Off-peak ~33–37c AC / 66–71c DC. $1 session minimum.',
    source: 'https://www.raa.com.au/motor/motoring-services/ev-charging-stations', lastChecked: '2026-01',
  },
  'jolt': {
    network: 'Jolt', acPerKwh: null, dcPerKwh: 42,
    notes: 'First 7 kWh free per day, then a flat per-kWh rate.',
    source: 'https://jolt.com.au', lastChecked: '2026-01',
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
  if (s.includes('exploren')) return 'exploren';
  if (s.includes('agl')) return 'agl';
  return null;
}

/** Look up the indicative tariff for an operator title, or null. */
export function getTariff(operator: string | null | undefined): EVTariff | null {
  const key = networkKeyFromOperator(operator);
  return key ? NETWORK_TARIFFS[key] : null;
}
