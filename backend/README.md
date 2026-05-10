# SwiftPath Backend (NestJS)

ระบบหลังบ้านของ SwiftPath พัฒนาด้วย NestJS โดยมุ่งเน้นสถาปัตยกรรมที่รองรับการขยายตัว (Scalable Architecture) และความปลอดภัยระดับสูงสุด

## 🏗️ โครงสร้างระบบ (Architecture)

Backend ถูกแบ่งออกเป็น Modules เพื่อความเป็นระเบียบและง่ายต่อการบำรุงรักษา:

- **Auth Module:** ระบบยืนยันตัวตน (JWT), การลงทะเบียน, OTP (Hashed), และ Social Login (Google, Facebook, LINE)
- **Users Module:** จัดการข้อมูลผู้ใช้และลำดับสิทธิ์ (RBAC)
- **Orders Module:** หัวใจหลักของระบบ จัดการวงจรชีวิตของออเดอร์, การคำนวณราคา (Surge Pricing), ระบบจัดส่งสาธารณะ และระบบ Analytics
- **Stripe Module:** เชื่อมต่อระบบชำระเงินและจัดการ Wallet
- **Weather Module:** ดึงข้อมูลสภาพอากาศเพื่อใช้ในการคำนวณราคาและแสดง Hotspots
- **Chat Module:** ระบบสื่อสารเรียลไทม์ผ่าน WebSocket (Socket.io)
- **Prisma Module:** จัดการการเชื่อมต่อฐานข้อมูล PostgreSQL

## 🔒 ฟีเจอร์ด้านความปลอดภัย (Security Features)

เราได้ดำเนินการ Hardening ระบบเพื่อป้องกันการโจมตีในรูปแบบต่างๆ:

1.  **OTP Hashing (SHA-256):** รหัส OTP จะถูก Hash ก่อนบันทึกลงฐานข้อมูล เพื่อป้องกันการรั่วไหลหากฐานข้อมูลถูกโจมตี
2.  **Rate Limiting (Throttler):** ป้องกันการโจมตีแบบ Brute-force บน Endpoint ที่สำคัญ เช่น การลงทะเบียนและการยืนยัน OTP
3.  **Strict RBAC:** การควบคุมสิทธิ์เข้าถึงตามบทบาท (Customer, Merchant, Driver, Admin) อย่างเข้มงวด
4.  **Zero-Trust WebSocket:** ตรวจสอบ JWT ทุกครั้งที่มี Event เกิดขึ้น และจำกัด CORS เฉพาะโดเมนที่อนุญาตเท่านั้น
5.  **Stripe Integrity:** ตรวจสอบสิทธิ์เจ้าของบัญชีก่อนสร้าง Payment Intent และระบบ Webhook ที่รองรับการ Retry เมื่อเกิดข้อผิดพลาด
6.  **Input Validation:** ใช้ `class-validator` และ `ValidationPipe` เพื่อตรวจสอบความถูกต้องของข้อมูลที่ส่งเข้ามา

## 🚀 อัปเดตล่าสุด (Phase 2 & Phase 3)

เราได้เสริมฟีเจอร์ระดับองค์กรและปิดจุดอ่อนด้านความปลอดภัยระดับหลังบ้าน:
1.  **Admin Stats API (`GET /orders/admin/stats`):** เพิ่ม Endpoint ดึงข้อมูลสถิติรวมของระบบ รวมถึงรายได้ย้อนหลัง 7 วันเพื่อใช้วิเคราะห์กระแสเงินสด
2.  **Admin Database Seeding:** เพิ่มระบบ Seed บัญชีผู้ดูแลระบบผ่าน `prisma/seed-admin.ts`
3.  **Unified User Profiles (`GET /users/me`):** API คืนโปรไฟล์และยอดเงินคงเหลือล่าสุดของผู้ใช้ที่ผ่านการยืนยันตัวตน JWT อย่างปลอดภัย
4.  **Stripe Webhook Idempotency:** ป้องกันปัญหาการเติมเงินซ้ำซ้อนระดับ Webhook โดยสร้างกลไกตรวจสอบ `referenceId` ของ PaymentIntent และปรับปรุงระบบการโยน Error ให้ระบบจ่ายเงินภายนอกรู้เพื่อรับประกันความถูกต้องสูงสุดในการเพิ่มเงิน
5.  **Public Tracking API (`GET /orders/track/:trackingNumber`):** เพิ่ม Endpoint สำหรับดึงสถานะการจัดส่งพัสดุและพิกัดการเดินทางแบบสาธารณะ โดยไม่มีการตรวจสอบสิทธิ์ JWT และควบคุมความปลอดภัยด้วยกลไก **Select Field Filter** คัดกรองข้อมูลละเอียดอ่อนส่วนบุคคล (PII) ออกจากผลลัพธ์ทั้งหมดอย่างเด็ดขาด

## 🚀 การรันระบบ (Development)

```bash
# ติดตั้ง dependencies
npm install

# รัน Prisma Generate (หากมีการแก้ไข schema)
npx prisma generate

# รัน Seeder สร้างบัญชีผู้ดูแลระบบ (Admin)
npx ts-node prisma/seed-admin.ts

# เริ่มต้นระบบในโหมดพัฒนา
npm run start:dev
```

---
*SwiftPath Backend - Engineered for Security.*
