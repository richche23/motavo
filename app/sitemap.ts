import type { MetadataRoute } from 'next';
import { SUBURBS } from '../lib/suburbs';

const BASE = 'https://www.fuelmate.au';

const CITIES = [
  'sydney', 'melbourne', 'brisbane', 'perth',
  'adelaide', 'canberra', 'hobart', 'darwin',
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const home = {
    url: BASE,
    lastModified: now,
    changeFrequency: 'daily' as const,
    priority: 1,
  };

  const nearMe = {
    url: `${BASE}/near-me`,
    lastModified: now,
    changeFrequency: 'daily' as const,
    priority: 0.7,
  };

  const cities = CITIES.map((slug) => ({
    url: `${BASE}/${slug}`,
    lastModified: now,
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }));

  const suburbs = SUBURBS.map((s) => ({
    url: `${BASE}/fuel/${s.slug}`,
    lastModified: now,
    changeFrequency: 'daily' as const,
    priority: 0.6,
  }));

  return [home, nearMe, ...cities, ...suburbs];
}
