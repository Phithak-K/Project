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
| `GET /orders/:id/pdf` | Merchant/Customer | ดาวน์โหลดใบส่งของ (PDF) พร้อมภาษาไทย |
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

### 11. `merchant/orders/[id]/page.tsx` ✏️ (Updated)
- เพิ่ม **ปุ่มแชร์ LINE (คัดลอกลิงก์)** (ก๊อปปี้ลิงก์ติดตามพัสดุสำเร็จรูปส่งเข้าแชท LINE ของลูกค้าได้ทันที)
- เพิ่ม **ปุ่มดาวน์โหลดใบส่งของ (PDF)** ดึงข้อมูลบิลและออกไฟล์ PDF เพื่อปริ้นท์หน้างานได้สะดวก รองรับภาษาไทย 100%

### 12. `merchant/drivers/page.tsx` ✅ ไฟล์ใหม่
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

## v2 Refactor & Cloud Architecture Enhancements (เวอร์ชัน 2.0)

ในเวอร์ชัน **v2 Refactor** ได้ทำการยกระดับวิศวกรรมซอฟต์แวร์ของโปรเจกต์ ทั้งในด้านสถาปัตยกรรมของ Backend (Event-Driven Architecture), การปรับแต่ง UI/UX หน้าบ้านให้เป็น Zero-Inline-Styles พร้อมระบบแคช SWR, การแก้ปัญหา Flow การส่งของของคนขับ (Driver Simulator), และการติดตั้งขึ้นคลาวด์แบบ Multi-tenant จริง

---

### 1. สถาปัตยกรรม Backend: Event-Driven Architecture (`EventEmitter2`)

* **การ Decouple OrdersService:** 
  เดิมที `OrdersService` ต้องพึ่งพา (Inject) `ChatGateway` และ `NotificationsService` โดยตรงเพื่อส่งข้อความ WebSocket และ Push Notification ในทุกๆ State transition ส่งผลให้เกิด Tight Coupling และทดสอบ Unit Test ได้ยาก
* **การเปลี่ยนผ่านสู่ Domain Events:**
  - ติดตั้ง `@nestjs/event-emitter`
  - สร้าง Domain Events ใน `backend/src/orders/events/`:
    - `OrderCreatedEvent`
    - `OrderStatusUpdatedEvent`
    - `OrderCustomerUpdatedEvent`
  - สร้าง Dedicated Listeners แยกส่วน:
    - [OrderChatListener](file:///d:/Project/backend/src/chat/listeners/order-chat.listener.ts): ดักฟัง Event เพื่อส่ง Broadcast สู่ห้อง Socket.IO (`order_{id}`)
    - [OrderNotificationsListener](file:///d:/Project/backend/src/notifications/listeners/order-notifications.listener.ts): ดักฟัง Event เพื่อยิง FCM Push Notification แบบ Asynchronous
* **Unit Tests สำหรับ Listeners และ Core Service:**
  - เพิ่ม Unit Tests ใน `order-chat.listener.spec.ts`, `order-notifications.listener.spec.ts` และ `orders.service.spec.ts`

---

### 2. การแก้ไขข้อมูลผู้รับปลายทางแบบไดนามิก (Dynamic Customer Info)

* **ความต้องการ:** ในกรณีที่ลูกค้าโทรมาขอเปลี่ยนเบอร์โทรศัพท์ แก้ไขชื่อ หรือระบุจุดสังเกตของที่อยู่ใหม่หลังจากร้านค้าเปิดบิลไปแล้ว
* **การแก้ไข:**
  - เพิ่ม Endpoint `PATCH /orders/:id/customer` ใน `OrdersController`
  - ตรวจสอบสิทธิ์ร้านค้า และอนุญาตให้แก้ไขได้เฉพาะขณะสถานะเป็น `PENDING` หรือ `ACCEPTED`
  - ทำการ Emit `ORDER_EVENTS.CUSTOMER_UPDATED` เพื่อให้หน้าจอคนขับและหน้า Tracking ของลูกค้าอัปเดตข้อมูลพิกัดและที่อยู่ใหม่สดๆ ในทันที
  - เพิ่มหน้าต่าง Modal ปรับแก้ข้อมูลในหน้า [app/merchant/orders/[id]/page.tsx](file:///d:/Project/frontend/app/merchant/orders/%5Bid%5D/page.tsx)

---

### 3. การยกเครื่อง Frontend: Zero-Inline-Styles และ SWR Real-Time Caching

* **Zero-Inline-Styles:**
  - กำจัด Inline Styles ที่กระจัดกระจายอยู่ในหน้า Admin, Merchant, Driver และ Customer Tracking
  - กำหนด Design Tokens และคลาสมาตรฐาน เช่น `.adm-*` ใน `frontend/app/globals.css` ทำให้ CSS มีความสม่ำเสมอ ประหยัดการเรนเดอร์ของเบราว์เซอร์
* **SWR Real-Time Caching (`swr`):**
  - นำ `useSWR` มาใช้ในการดึงข้อมูลและจัดการ Local Cache
  - แสดงผลข้อมูลเดิมทันทีแบบไม่มี Layout Shift หรือกระพริบ
  - Revalidate ข้อมูลในพื้นหลัง และประสานงานกับ Socket.IO เพื่อสั่ง `mutate()` แคชเฉพาะจุดเมื่อได้รับเหตุการณ์จากเซิร์ฟเวอร์

---

### 4. การปรับปรุงกระบวนการส่งของของไรเดอร์ (Driver State Machine & Guided Demo)

* **ปัญหาเดิม:** 
  1. ในหน้าของไรเดอร์ สามารถกดเปิด Real GPS หรือกดเริ่มเดโม่จำลองการส่งของได้ทันทีแม้ยังไม่ได้กดยืนยันการรับพัสดุจากร้าน (`ACCEPTED`)
  2. เมื่อเดโม่วิ่งไปถึงจุดหมายแล้ว ปุ่ม "ปิดเสร็จสิ้นงานส่ง" ติดสถานะ `disabled={!proofImage}` ทำให้ไรเดอร์กดส่งงานไม่ได้ ค้างอยู่ที่หน้าจอ
* **การแก้ไข:**
  1. **Strict Pickup Guard:** เพิ่มการดักสถานะใน `startRealGPS` และ `startSimulator` หากสถานะยังเป็น `ACCEPTED` ระบบจะบล็อกและแสดงข้อความแจ้งเตือน *"กรุณากดยืนยันการรับพัสดุก่อน จึงจะเริ่มแชร์ตำแหน่งหรือจำลองการส่งได้"* พร้อมแสดงแถบ Banner สีส้มแนะนำให้กด "ยืนยันการรับพัสดุจากร้านค้า"
  2. **Auto-Transition & Auto Mock POD:** เมื่อกดยืนยันรับของแล้วกดเริ่ม Demo ระบบจะเปลี่ยนสถานะเข้าสู่ `SHIPPING` ให้อัตโนมัติ และเมื่อวิ่งถึงปลายทาง ระบบจะแนบรูปถ่ายหลักฐานการจัดส่งจำลอง (Mock POD) และพิกัดส่งมอบให้อัตโนมัติทันที ทำให้ปุ่ม "ปิดเสร็จสิ้นงานส่ง" ปลดล็อกเป็นสีเขียว สามารถกดส่งงานต่อได้ทันทีโดยไม่ติดขัด

---

### 5. สถาปัตยกรรมคลาวด์และการ Deploy บน Production

| ส่วนประกอบ | แพลตฟอร์มที่ใช้ | รายละเอียดการทำงาน |
| :--- | :--- | :--- |
| **Frontend & Edge Gateway** | **Vercel** | โฮสต์ Next.js พร้อมรัน `proxy.ts` รองรับซับโดเมน `swiftpath-app.xyz` |
| **Backend API & WebSockets** | **Render** | โฮสต์ NestJS Web Service (`https://project-wi39.onrender.com`) พร้อม CORS และ WebSocket Gateway |
| **Database** | **Supabase** | โฮสต์ฐานข้อมูล PostgreSQL บน Region โตเกียว (Tokyo) รองรับ Connection Pooling |
| **Edge Security Proxy** | **Next.js `/api/proxy`** | ทำหน้าที่เป็นตัวกลางเชื่อมระหว่าง Frontend Vercel และ Backend Render ซ่อน JWT Cookie และซ่อน Origin |

---

### 6. ผลการตรวจสอบและคอมไพล์ (Validation Results)

| การทดสอบ | ผลลัพธ์ | รายละเอียด |
| :--- | :---: | :--- |
| **Backend Build (`nest build`)** | ✅ สำเร็จ (Exit code: 0) | TypeScript build ผ่านทุกไฟล์ ไม่พบ Circular Dependencies |
| **Frontend Build (`next build`)** | ✅ สำเร็จ (Exit code: 0) | Turbopack prerender หน้าเว็บทั้งหมด 43 เส้นทางผ่านสมบูรณ์ |
| **Lint & Type Check** | ✅ สำเร็จ | ไร้ข้อผิดพลาดระดับ Compile-time |



