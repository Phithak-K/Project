# SwiftPath Backend — NestJS API Layer

เอกสารนี้ครอบคลุมรายละเอียดด้านวิศวกรรมของชั้น Backend ของ SwiftPath ที่พัฒนาด้วย NestJS ผู้อ่านควรอ่าน [Root README](../README.md) และ [Architecture Decision Records](../docs/adr/) ควบคู่กันเพื่อทำความเข้าใจบริบทเชิงระบบโดยรวมก่อน

---

## โครงสร้าง Module

Backend ถูกแบ่งออกเป็น Module ตามหลักการ Separation of Concerns แต่ละ Module รับผิดชอบขอบเขตหน้าที่ของตัวเองอย่างชัดเจน

| Module | ไฟล์หลัก | หน้าที่ |
| :--- | :--- | :--- |
| `AuthModule` | `src/auth/` | JWT authentication, OTP (SHA-256 hashed), Social Login (Google, Facebook, LINE), Firebase Phone Auth |
| `UsersModule` | `src/users/` | จัดการ profile และ Role-Based Access Control สำหรับทุก actor |
| `OrdersModule` | `src/orders/` | วงจรชีวิตออเดอร์, Surge Pricing ตามสภาพอากาศ, การคำนวณ ETA, analytics |
| `StripeModule` | `src/stripe/` | Webhook handler พร้อม Idempotency Guard, การสร้าง PaymentIntent |
| `ChatModule` | `src/chat/` | Real-time messaging ผ่าน Socket.io พร้อม JWT verification ทุก event |
| `NotificationsModule` | `src/notifications/` | ส่ง FCM push notification ผ่าน Firebase Admin SDK |
| `WeatherModule` | `src/weather/` | บูรณาการ OpenWeather API สำหรับ Surge Pricing และข้อมูล logistics |
| `UploadModule` | `src/upload/` | จัดการรูปภาพ proof-of-delivery |
| `PrismaModule` | `src/prisma/` | Database access layer — PostgreSQL ผ่าน Prisma ORM |

---

## มาตรการความปลอดภัยและความสมบูรณ์ของข้อมูล

รายการด้านล่างสะท้อนการตัดสินใจที่บันทึกไว้อย่างละเอียดใน [docs/adr/](../docs/adr/)

### 1. Optimistic Concurrency Control (ADR-003)

ฟิลด์ `version` บน model `Customer`, `Merchant`, และ `Driver` ป้องกัน Lost Update Anomaly เมื่อมีการแก้ไขยอดเงินพร้อมกันจากหลายช่องทาง เช่น Stripe Webhook credit racing กับ order debit

```prisma
model Customer {
  balance  Decimal @default(0)
  version  Int     @default(0)  // OCC sentinel — ป้องกัน Race Condition
}
```

### 2. Stripe Webhook Idempotency (ADR-002)

การตรวจสอบ `referenceId` ทำงานภายใน `prisma.$transaction` เดียวกับการ write ยอดเงิน กำจัดช่องว่าง TOCTOU race condition ในกรณีที่ Stripe ส่ง Webhook ซ้ำ

```typescript
// การตรวจสอบและการ write อยู่ใน atomic boundary เดียวกัน
await this.prisma.$transaction(async (tx) => {
  const existing = await tx.transaction.findUnique({ where: { referenceId: paymentIntent.id } });
  if (existing) return; // idempotent — ไม่มีการ write
  await tx[role].update({ data: { balance: { increment: amount }, version: { increment: 1 } } });
  await tx.transaction.create({ data: { referenceId: paymentIntent.id, ... } });
});
```

### 3. Rate Limiting บน Endpoint ความเสี่ยงสูง (ADR-001)

`ThrottlerGuard` สกัดกั้น request ก่อนที่จะถึง service logic หรือ external API call ใดๆ

| Endpoint | จำกัด | เหตุผล |
| :--- | :--- | :--- |
| `POST /auth/verify-phone-otp` | 5 ครั้ง / 60 วินาที | ป้องกัน Firebase OTP brute-force และการขยายต้นทุน |
| `POST /auth/google-login` | 20 ครั้ง / 60 วินาที | ป้องกัน Account Enumeration |
| `POST /auth/facebook-login` | 20 ครั้ง / 60 วินาที | ป้องกัน Account Enumeration |
| `POST /auth/line-login` | 20 ครั้ง / 60 วินาที | ป้องกัน Account Enumeration |

### 4. Zero-Trust WebSocket Gateway

Socket.io Gateway บังคับตรวจสอบ JWT signature ทุก event ไม่ใช่แค่ตอน connection เริ่มต้น ป้องกันการ hijack session หลัง token หมดอายุ

### 5. SHA-256 OTP Hashing

รหัส OTP ถูก hash ก่อนบันทึกลงฐานข้อมูลในทุกกรณี ป้องกันการรั่วไหลแม้ฐานข้อมูลถูกเข้าถึงโดยไม่ได้รับอนุญาต

---

## การทดสอบ

ไฟล์ทดสอบวิกฤตที่ตรวจสอบความถูกต้องของระบบการเงิน:

```bash
# รัน test suite ของ Stripe Webhook Idempotency
npx jest src/stripe/stripe.service.spec.ts --verbose
```

ชุดการทดสอบ `stripe.service.spec.ts` ครอบคลุม 3 specifications:
- **Idempotency Guard:** Webhook ซ้ำต้องไม่ก่อให้เกิดการ credit ยอดเงินซ้ำ
- **Transaction Atomicity:** การ write บางส่วนต้อง rollback ทั้งหมดเมื่อมีความผิดพลาด
- **Role Dispatch:** ระบบต้องเลือก database model ที่ถูกต้องตาม `userRole`

---

## การเริ่มต้นระบบ

```bash
# ติดตั้ง dependencies
npm install

# สร้าง Prisma client จาก schema
npx prisma generate

# ดัน schema ขึ้นฐานข้อมูล
npx prisma db push

# สร้างบัญชี Admin เริ่มต้น
npx ts-node prisma/seed-admin.ts

# เริ่มต้นในโหมดพัฒนา (watch mode)
npm run start:dev
```

> **หมายเหตุ:** ต้องมีไฟล์ `.env` ที่ระบุค่า `DATABASE_URL`, `JWT_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` และข้อมูล Firebase Admin SDK ก่อนเริ่มต้นระบบ

---

*SwiftPath Backend — Engineered for correctness under concurrency. Secured at every boundary.*
