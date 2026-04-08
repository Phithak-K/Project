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
};

export default nextConfig;