import type { NextConfig } from 'next';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://10.10.1.181:3001';

const nextConfig: NextConfig = {
  allowedDevOrigins: ['sgoc-backend-production.up.railway.app'],

  async rewrites() {
    return [
      {
        source: '/proxy/:path*',
        destination: `${BACKEND_URL}/api/v1/:path*`,
      },
    ];
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

export default nextConfig;