// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    // ตระกูล localhost
    'localhost:3000',
    'app.localhost:3000',
    'fleet.localhost:3000',
    'store.localhost:3000',
    
    // ตระกูล swiftpath.com (ที่คุณกำลังใช้อยู่ในรูป)
    'swiftpath.com:3000',
    'app.swiftpath.com:3000',
    'fleet.swiftpath.com:3000',
    'store.swiftpath.com:3000',
  ],
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'http', hostname: '127.0.0.1' },
      { protocol: 'https', hostname: 'swiftpath.com' }
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;