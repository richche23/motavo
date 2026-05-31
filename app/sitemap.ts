import type { MetadataRoute } from 'next';

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

  const cities = CITIES.map((slug) => ({
    url: `${BASE}/${slug}`,
    lastModified: now,
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }));

  return [home, ...cities];
}
