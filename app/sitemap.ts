import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';
import { SUBURBS } from '@/lib/suburbs'; // ⬅️ adjust path to wherever suburbs.ts actually lives

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/ev`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${SITE_URL}/methodology`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${SITE_URL}/guides/fuel-price-cycles`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
  ];

  // One entry per suburb. Prices change daily, so lastModified = now is a genuine
  // freshness signal (not a fake one) — these pages really do update every day.
  const suburbPages: MetadataRoute.Sitemap = SUBURBS.map((s) => ({
    url: `${SITE_URL}/fuel/${s.slug}`,
    lastModified: now,
    changeFrequency: 'daily',
    priority: 0.7,
  }));

  return [...staticPages, ...suburbPages];
}
