import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Motavo — Cheapest fuel & EV charging near you',
    short_name: 'Motavo',
    description:
      'Real-time Australian fuel prices. Compare petrol, diesel and LPG near you. Free, independent, government data.',
    start_url: '/',
    display: 'standalone',
    background_color: '#e7e4dd',
    theme_color: '#ff4a17',
    orientation: 'portrait',
    categories: ['travel', 'utilities', 'navigation'],
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
