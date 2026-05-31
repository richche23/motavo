/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  async headers() {
    return [
      {
        // Allow Google + other crawlers to index the whole site.
        // This removes the default `noindex` that was blocking organic traffic.
        source: '/(.*)',
        headers: [
          { key: 'X-Robots-Tag', value: 'index, follow' },
        ],
      },
      {
        // Long-cache the fonts/static chunks (immutable, content-hashed by Next).
        source: '/_next/static/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
