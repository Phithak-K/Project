export const CHART_TZ = 'Asia/Bangkok';

/** แปลงช่วงวันที่ YYYY-MM-DD ให้ครอบคลุม 00:00:00 ถึง 23:59:59.999 ตามเวลาไทย (UTC+7) */
export function parseBangkokDateFilter(startDate?: string, endDate?: string) {
  const filter: any = {};
  if (startDate) {
    filter.gte = startDate.includes('T')
      ? new Date(startDate)
      : new Date(`${startDate}T00:00:00.000+07:00`);
  }
  if (endDate) {
    filter.lte = endDate.includes('T')
      ? new Date(endDate)
      : new Date(`${endDate}T23:59:59.999+07:00`);
  }
  return filter;
}

/** รวมข้อมูลออเดอร์แบบครบถ้วน (สินค้า, ประวัติการจัดส่ง, ร้านค้า, ไรเดอร์, ลูกค้า) */
export const ORDER_FULL_DETAILS_INCLUDE = {
  items: true,
  trackingLogs: { orderBy: { createdAt: 'desc' as const } },
  merchant: { select: { id: true, storeName: true, phone: true } },
  driver: { select: { id: true, name: true, phone: true, vehiclePlate: true } },
  customer: { select: { id: true, name: true } },
} as const;

/** รวมข้อมูลร้านค้าพื้นฐานสำหรับบัตรงาน */
export const ORDER_MERCHANT_INFO_INCLUDE = {
  merchant: { select: { storeName: true, phone: true } },
} as const;

/** รวมข้อมูลคนขับพื้นฐานสำหรับประวัติร้านค้า */
export const ORDER_DRIVER_INFO_INCLUDE = {
  driver: { select: { name: true, phone: true } },
} as const;

/** รวมข้อมูลคนขับและร้านค้าสำหรับประวัติลูกค้า */
export const ORDER_CUSTOMER_HISTORY_INCLUDE = {
  driver: { select: { name: true, phone: true } },
  merchant: { select: { name: true, storeName: true } },
} as const;
