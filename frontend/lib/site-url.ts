/**
 * URL เต็มของเว็บ ใช้แปลง og:image ให้เป็น absolute
 *
 * ทำไมต้องมี: Next ในโหมด dev จะตรึง og:image แบบ file-based ไว้ที่
 * http://localhost:3000 เสมอ ไม่สนใจ metadataBase และไม่สนใจ host ที่เข้ามา
 * ค่าที่ถูกต้องจะถูกคำนวณตอน production build เท่านั้น
 * เราจึงระบุ URL เต็มเองใน generateMetadata เพื่อให้ถูกต้องทั้งสองโหมด
 *
 * ลำดับการหาค่า:
 *   1. NEXT_PUBLIC_SITE_URL — ตั้งตรง ๆ (เช่นตอนเทสผ่าน tunnel)
 *   2. NEXT_PUBLIC_BASE_DOMAIN — โดเมนหลักที่ระบบใช้อยู่แล้ว
 *   3. localhost:3000
 */
export function getSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/+$/, '');
  }
  const domain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'localhost:3000';
  const protocol = domain.startsWith('localhost') ? 'http' : 'https';
  return protocol + '://' + domain;
}
