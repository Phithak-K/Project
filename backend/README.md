# SwiftPath Backend (NestJS)

ระบบหลังบ้านของ SwiftPath พัฒนาด้วย NestJS โดยมุ่งเน้นสถาปัตยกรรมที่รองรับการขยายตัว (Scalable Architecture) ความถูกต้องของข้อมูลทางการเงิน และความปลอดภัยระดับสูงสุด (Hardened Security)

---

## 🏗️ โครงสร้างระบบ (Architecture)

Backend ถูกแบ่งออกเป็น Modules เพื่อความเป็นระเบียบและง่ายต่อการบำรุงรักษาตามหลัก Modular Design:

-   **Auth Module:** ระบบยืนยันตัวตน (JWT), การลงทะเบียนแบบ Multi-step, OTP (Hashed), และ Social Login (Google, Facebook, LINE)
-   **Users Module:** จัดการข้อมูลผู้ใช้และระบบ Role-Based Access Control (RBAC)
-   **Orders Module:** หัวใจหลักในการจัดการวงจรชีวิตออเดอร์, การคำนวณราคา Surge Pricing ตามสภาพอากาศ, และระบบ Analytics ขั้นสูง
-   **Stripe Module:** เชื่อมต่อระบบชำระเงิน Stripe API พร้อมระบบ Idempotency Webhook
-   **Weather Module:** บูรณาการ OpenWeather API เพื่อข้อมูลเรียลไทม์ในการตัดสินใจด้านราคาและโลจิสติกส์
-   **Chat Module:** ระบบสื่อสารเรียลไทม์ (WebSocket) พร้อมการตรวจสอบ Signature Verification ในทุกๆ Event
-   **Prisma Module:** Layer จัดการฐานข้อมูล PostgreSQL ผ่าน Prisma ORM

---

## 🔒 ฟีเจอร์ด้านความปลอดภัยและการรักษาความสมบูรณ์ของข้อมูล (Security & Data Integrity)

เราได้ดำเนินการ Hardening ระบบเพื่อป้องกันการโจมตีและความผิดพลาดเชิงตรรกะธุรกิจ (Business Logic Flaws):

1.  **Optimistic Locking (Concurrency Control):** ระบบการเงิน (Top-up/Debit) บังคับใช้ฟิลด์ `version` ในฐานข้อมูลเพื่อป้องกันปัญหา Race Condition 100% ในกรณีที่มีธุรกรรมเกิดขึ้นพร้อมกันในระดับมิลลิวินาที
2.  **SHA-256 OTP Hashing:** รหัส OTP จะถูก Hash ก่อนบันทึกลงฐานข้อมูล ป้องกันความลับรั่วไหลแม้ผู้บุกรุกเข้าถึงฐานข้อมูลได้
3.  **NestJS Throttler (Advanced Rate Limiting):** ป้องกันการโจมตีแบบ Brute-force บน Endpoint สำคัญ เช่น `verify-phone-otp` และ Social Login โดยจำกัดสูงสุด 5-10 ครั้งต่อนาที
4.  **Zero-Trust WebSocket Gateway:** บังคับใช้ JWT Signature Verification ในทุกๆ ข้อความที่ส่งผ่าน Socket.io เพื่อป้องกันการสวมรอยพิกัด GPS หรือข้อความแชท
5.  **Stripe Webhook Idempotency:** ป้องกันปัญหา Double Credit โดยการตรวจสอบ `referenceId` ภายในฐานข้อมูลแบบ Atomic Transaction
6.  **Input Validation & Sanitization:** ใช้ `class-validator` และระบบ DTO ที่เข้มงวดเพื่อป้องกันการยิงข้อมูลแปลกปลอมเข้าระบบ

---

## 🚀 รายการอัปเดตสำคัญ (Latest Hardening)

*   **Financial Integrity Patch:** อัปเกรด `updateBalanceAtomic` ให้รองรับ Versioning เพื่อความปลอดภัยระดับ Enterprise
*   **Auth Vulnerability Mitigation:** ปิดช่องโหว่ Brute-force บนระบบ Firebase OTP ด้วยการเพิ่ม ThrottlerGuard
*   **Public Tracking Security:** ออกแบบระบบ Select Field Filtering เพื่อคัดกรองข้อมูลละเอียดอ่อน (PII) ออกจาก API ติดตามพัสดุสาธารณะโดยสมบูรณ์
*   **Admin Access Lockdown:** เสริมความแข็งแกร่งให้ระบบ Admin Gate ในระดับ Controller เพื่อป้องกันสิทธิ์รั่วไหล

---

## 🛠️ การรันระบบ (Development)

```bash
# ติดตั้ง dependencies
npm install

# รัน Prisma Generate (หากมีการแก้ไข schema)
npx prisma generate

# รัน Seeder สร้างบัญชีผู้ดูแลระบบ (Admin)
npx ts-node prisma/seed-admin.ts

# เริ่มต้นระบบในโหมดพัฒนา (Watch mode)
npm run start:dev
```

---
*SwiftPath Backend - Engineered for Security. Optimized for Scale.*
