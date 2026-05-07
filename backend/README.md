# SwiftPath Backend (NestJS)

ระบบหลังบ้านของ SwiftPath พัฒนาด้วย NestJS โดยมุ่งเน้นสถาปัตยกรรมที่รองรับการขยายตัว (Scalable Architecture) และความปลอดภัยระดับสูงสุด

## 🏗️ โครงสร้างระบบ (Architecture)

Backend ถูกแบ่งออกเป็น Modules เพื่อความเป็นระเบียบและง่ายต่อการบำรุงรักษา:

- **Auth Module:** ระบบยืนยันตัวตน (JWT), การลงทะเบียน, OTP (Hashed), และ Social Login (Google, Facebook, LINE)
- **Users Module:** จัดการข้อมูลผู้ใช้และลำดับสิทธิ์ (RBAC)
- **Orders Module:** หัวใจหลักของระบบ จัดการวงจรชีวิตของออเดอร์, การคำนวณราคา (Surge Pricing), และระบบ Analytics
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

## 🚀 การรันระบบ (Development)

```bash
# ติดตั้ง dependencies
npm install

# รัน Prisma Generate (หากมีการแก้ไข schema)
npx prisma generate

# เริ่มต้นระบบในโหมดพัฒนา
npm run start:dev
```

---
*SwiftPath Backend - Engineered for Security.*
