/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow station-logo favicons from Google's S2 service
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'www.google.com', pathname: '/s2/favicons/**' },
    ],
  },
};

export default nextConfig;
