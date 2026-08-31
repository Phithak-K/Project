import type { Metadata } from 'next';
import { getSiteUrl } from '@/lib/site-url';

/**
 * Metadata ของหน้าติดตามพัสดุ
 *
 * ทำไมต้องแยกมาไว้ที่ layout: page.tsx เป็น 'use client' ซึ่ง Next ห้าม export metadata
 * layout ตัวนี้เป็น server component จึงทำ generateMetadata ได้โดยไม่ต้องแตะหน้าเดิมเลย
 *
 * รูปการ์ดมาจาก route handler ที่ og/route.tsx ในโฟลเดอร์เดียวกัน
 */

// รูปแบบเดียวกับที่ backend ตรวจใน getPublicOrderTracking
const TRACKING_PATTERN = /^SP[A-Z0-9-]{8,15}$/;

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> },
): Promise<Metadata> {
  const { id } = await params;
  const code = decodeURIComponent(id).toUpperCase();
  const isValid = TRACKING_PATTERN.test(code);

  // ระบุ URL เต็มของรูปเอง แทนที่จะปล่อยให้ Next เดา
  // (โหมด dev จะตรึงเป็น localhost:3000 เสมอ ทำให้แชร์ออกไปแล้วรูปไม่ขึ้น)
  const siteUrl = getSiteUrl();
  const ogImage = {
    url: `${siteUrl}/track/${encodeURIComponent(code)}/og`,
    width: 1200,
    height: 630,
    alt: 'SwiftPath — delivery tracking',
  };

  const title = isValid
    ? `ติดตามพัสดุ ${code} · SwiftPath`
    : 'ติดตามพัสดุ · SwiftPath';
  const description = 'ดูสถานะและตำแหน่งพัสดุแบบเรียลไทม์';

  return {
    title,
    description,
    // ไม่ใส่สถานะลงใน metadata เพราะ LINE/Facebook cache การ์ดไว้ต่อ URL
    // ถ้าใส่ไป การ์ดในแชทเก่าจะค้างสถานะเดิมตลอดไป
    openGraph: {
      title,
      description,
      siteName: 'SwiftPath',
      type: 'website',
      locale: 'th_TH',
      url: `${siteUrl}/track/${encodeURIComponent(code)}`,
      images: [ogImage],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage.url],
    },
  };
}

export default function TrackLayout({ children }: { children: React.ReactNode }) {
  return children;
}
