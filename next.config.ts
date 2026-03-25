import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Permite imágenes desde cualquier origen (útil para avatares futuros)
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