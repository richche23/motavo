import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';

// ⬇️ REPLACE these imports with your real data modules.
// import { CITIES, SUBURBS, FUEL_TYPES, EV_CITIES } from '@/lib/data';
//
// Each helper below shows the shape it expects. Delete the placeholder
// const declarations once you've wired the real imports.
const CITIES: { slug: string }[] = [];
const SUBURBS: { slug: string; citySlug: string }[] = [];
const EV_CITIES: { slug: string }[] = [];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/ev`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${SITE_URL}/methodology`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${SITE_URL}/guides/fuel-price-cycles`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
  ];

  // Prices change daily, so lastModified = now gives Google a genuine freshness signal.
  const cityPages: MetadataRoute.Sitemap = CITIES.map((c) => ({
    url: `${SITE_URL}/fuel/${c.slug}`,
    lastModified: now,
    changeFrequency: 'daily',
    priority: 0.8,
  }));

  const suburbPages: MetadataRoute.Sitemap = SUBURBS.map((s) => ({
    url: `${SITE_URL}/fuel/${s.citySlug}/${s.slug}`,
    lastModified: now,
    changeFrequency: 'daily',
    priority: 0.7,
  }));

  const evPages: MetadataRoute.Sitemap = EV_CITIES.map((c) => ({
    url: `${SITE_URL}/ev/${c.slug}`,
    lastModified: now,
    changeFrequency: 'daily',
    priority: 0.7,
  }));

  return [...staticPages, ...cityPages, ...suburbPages, ...evPages];
}
