# Walkthrough — SME Logistics Feature Set

> ✅ **`npx prisma db push` สำเร็จ** — Database synced ใน 347ms

---

## Backend Changes

### 1. `prisma/schema.prisma`
- **`productName String?`** — เป็น Optional แล้ว (auto-gen จาก items)
- **`Order.items OrderItem[]`** — relation ใหม่สำหรับ multi-item
- **`Driver.merchantId Int?`** + **`Driver.merchant Merchant?`** — Driver สังกัดร้านได้
- **`Merchant.drivers Driver[]`** — ดู driver list ได้จากฝั่ง Merchant
- **`Merchant.products Product[]`** — Catalog สินค้าของร้าน
- **`model OrderItem`** — ✅ ใหม่: id, orderId, productName, quantity, unitPrice, totalPrice, note, productId
- **`model Product`** — ✅ ใหม่: id, merchantId, name, unit, defaultPrice, isActive

### 2. `orders/dto/create-order.dto.ts`
- `productName`, `price`, `quantity` → **Optional** (backward compat)
- เพิ่ม `items?: CreateOrderItemDto[]` array

### 3. `orders/dto/create-order-item.dto.ts` ✅ ไฟล์ใหม่
- DTO สำหรับแต่ละรายการใน invoice

### 4. `orders/orders.service.ts`
| Method | คำอธิบาย |
|---|---|
| `createOrder()` | คำนวณ `basePrice` จาก `items[]` ถ้ามี; สร้าง `OrderItem` rows ใน transaction เดียวกัน |
| `assignDriver()` | ✅ ใหม่: Merchant มอบหมาย Driver → เปลี่ยนสถานะเป็น ACCEPTED |
| `getOrdersByPhone()` | ✅ ใหม่: ดึง orders จาก `receiverPhone` พร้อม items + trackingLogs |
| `exportOrdersCsv()` | ✅ ใหม่: สร้าง CSV string พร้อม UTF-8 BOM สำหรับ Excel ไทย |

### 5. `orders/orders.controller.ts`
| Endpoint | Role | คำอธิบาย |
|---|---|---|
| `PATCH /orders/:id/assign` | Merchant | มอบหมายคนขับ |
| `GET /orders/track-by-phone/:phone` | Public | ค้นหา order ด้วยเบอร์โทร (rate-limited 5 req/min) |
| `GET /orders/export/csv` | Merchant | ดาวน์โหลด CSV + query `dateFrom`, `dateTo` |

### 6. `users/users.service.ts`
| Method | คำอธิบาย |
|---|---|
| `getMyDrivers()` | ✅ ใหม่: list คนขับที่ผูกกับร้าน |
| `linkDriverToMerchant()` | ✅ ใหม่: ผูก Driver (ต้อง verified แล้ว) |
| `unlinkDriverFromMerchant()` | ✅ ใหม่: ยกเลิกความสัมพันธ์ Driver กลายเป็น Freelance |
| `findDriverByContact()` | ✅ ใหม่: ค้นหา Driver ด้วย email หรือ phone |

### 7. `users/users.controller.ts`
| Endpoint | Role | คำอธิบาย |
|---|---|---|
| `GET /users/my-drivers` | Merchant | list คนขับในร้าน |
| `GET /users/find-driver?contact=` | Merchant | ค้นหาคนขับก่อน Link |
| `PATCH /users/drivers/:id/link` | Merchant | ผูกคนขับ |
| `PATCH /users/drivers/:id/unlink` | Merchant | ยกเลิก |

---

## Frontend Changes

### 8. `merchant/create-order/page.tsx` ✏️ (Rewrite)
- **Dynamic item list** — เพิ่ม/ลบรายการได้ไม่จำกัด
- **Product Catalog dropdown** — เลือกสินค้าที่บันทึกไว้ล่วงหน้า
- **Running total** — คำนวณยอดรวม, Surge Weather, Insurance แบบ Real-time
- ส่ง `items[]` array ไปที่ backend (backward compat กับ `productName` เดิม)

### 9. `merchant/page.tsx` ✏️ (Updated)
- เพิ่ม **"มอบหมายคนขับ" button** บน PENDING order rows ที่ยังไม่มี driver
- **AssignDriverModal** — แสดง driver list, กด "มอบหมาย" → PATCH `/orders/:id/assign`

### 10. `merchant/stats/page.tsx` ✏️ (Updated)
- เพิ่ม **CSV Export Panel** พร้อม date picker (จากวันที่ - ถึงวันที่)
- กดดาวน์โหลด → ไฟล์ `.csv` UTF-8 BOM เปิดใน Excel ได้ทันที

### 11. `merchant/drivers/page.tsx` ✅ ไฟล์ใหม่
- ค้นหาคนขับด้วย email / เบอร์โทร
- แสดง isVerified badge และ merchantId ก่อนอนุญาต Link
- ยกเลิกคนขับออกจากร้าน (Unlink → Freelance)

### 12. `merchant/catalog/page.tsx` ✅ ไฟล์ใหม่
- CRUD Product Catalog inline editing
- ชื่อสินค้า, หน่วย (ถุง/เส้น/กก.), ราคาเริ่มต้น
- สินค้าจะปรากฏใน Dropdown ตอนสร้างออเดอร์

### 13. `customer/track-by-phone/page.tsx` ✅ ไฟล์ใหม่
- กรอกเบอร์โทรผู้รับ → ดูประวัติออเดอร์ทั้งหมด
- แสดง items breakdown, status badge, ร้านต้นทาง
- กดที่ card → ไปหน้า tracking สาธารณะ

---

## Validation Results

| Step | Result |
|---|---|
| `npx prisma generate` | ✅ Prisma Client (v6.19.2) generated in 193ms |
| `npx prisma db push` | ✅ Database synced in 347ms (OrderItem, Product tables created) |

---

> [!TIP]
> **สิ่งที่ต้องทำต่อ:**
> 1. สร้าง `/products` backend module (controller + service) สำหรับ Catalog CRUD ที่หน้า merchant/catalog ต้องการ
> 2. เพิ่มลิงก์ "จัดการคนขับ" และ "Catalog สินค้า" ไว้ใน Merchant navbar หรือ Dashboard

