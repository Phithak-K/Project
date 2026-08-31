import { getSiteUrl } from './site-url';

/**
 * แชร์ลิงก์ติดตามพัสดุ
 *
 * ทำไมต้องรวมไว้ที่เดียว: URL ของหน้าติดตามต้องตรงกับ URL ที่ใช้ทำ og:image
 * (ดู app/track/[id]/layout.tsx) ถ้าแต่ละหน้าประกอบ URL เอง จะหลุดง่ายมาก —
 * เช่นตอนเทสผ่าน tunnel ปุ่มแชร์จะคัดลอก localhost ออกไปทั้งที่การ์ดชี้ไป tunnel
 *
 * ทำไมใช้ navigator.share ก่อน: บนมือถือมันเปิด share sheet ของเครื่อง
 * ซึ่งมี LINE อยู่ในนั้น กดส่งเข้าแชทได้เลยโดยไม่ต้องคัดลอกไปวางเอง
 * บนเดสก์ท็อป (และ browser ที่ไม่รองรับ) ค่อยตกไปใช้คลิปบอร์ดแทน
 */

export function getTrackingUrl(trackingNumber: string): string {
  return `${getSiteUrl()}/track/${encodeURIComponent(trackingNumber)}`;
}

export type ShareResult =
  | 'shared'    // ส่งผ่าน share sheet สำเร็จ
  | 'copied'    // ไม่มี share sheet เลยคัดลอกใส่คลิปบอร์ดแทน
  | 'cancelled' // ผู้ใช้ปิด share sheet เอง — ไม่ต้องแจ้งอะไร
  | 'failed';

export async function shareTracking(
  trackingNumber: string,
  message?: string,
): Promise<ShareResult> {
  const url = getTrackingUrl(trackingNumber);
  const text = message ?? `ติดตามสถานะพัสดุ ${trackingNumber}`;

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title: `พัสดุ ${trackingNumber}`, text, url });
      return 'shared';
    } catch (err) {
      // ผู้ใช้กดยกเลิกเอง ถือว่าจบงานปกติ ไม่ใช่ error
      if (err instanceof DOMException && err.name === 'AbortError') {
        return 'cancelled';
      }
      // รองรับแต่ใช้ไม่ได้ (เช่นหน้าไม่ได้เสิร์ฟผ่าน https) → ตกไปใช้คลิปบอร์ด
    }
  }

  try {
    await navigator.clipboard.writeText(`${text}\n${url}`);
    return 'copied';
  } catch {
    return 'failed';
  }
}
