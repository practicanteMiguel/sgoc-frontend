import type { NextConfig } from 'next';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_INTERNAL_URL ?? 'http://10.10.1.181:3001';

const nextConfig: NextConfig = {
  allowedDevOrigins: ['10.10.1.181', 'metempirical-quarterly-broderick.ngrok-free.dev'],

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