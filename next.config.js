/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizeCss: true
  },
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Robots-Tag', value: 'noai, noimageai' }
      ]
    }
  ]
};

module.exports = nextConfig;
