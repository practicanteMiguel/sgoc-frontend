import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Permite acceso a la API desde cualquier origen
  allowedDevOrigins: ['10.10.1.181'],

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