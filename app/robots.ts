import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: 'https://www.fuelmate.au/sitemap.xml',
    host: 'https://www.fuelmate.au',
  };
}
