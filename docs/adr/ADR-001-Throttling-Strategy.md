# บันทึกการตัดสินใจทางสถาปัตยกรรม 001: การจำกัดอัตราคำขอระดับ Edge สำหรับ Endpoint ที่มีความเสี่ยงสูง

## สถานะ

อนุมัติแล้ว

## วันที่

2026-05-16

## บริบทของปัญหา

พื้นผิวการ authentication ของ SwiftPath เปิด endpoint หลายตัวที่ถ้าถูกนำไปใช้ในทางที่ผิดจะส่งผลเสียเกินกว่าแค่การเข้าถึงโดยไม่ได้รับอนุญาต โดยเฉพาะ:

- `POST /auth/verify-phone-otp` — เรียก Firebase Phone Auth SDK ทุกครั้งที่รับ request แต่ละครั้งมีต้นทุนตัวเงินโดยตรงบน Firebase platform สคริปต์ brute-force อัตโนมัติสามารถทำให้โควต้าหมดหรือสร้างค่าใช้จ่ายที่บิดเบือนได้อย่างรวดเร็ว
- `POST /auth/google-login`, `POST /auth/facebook-login`, `POST /auth/line-login` — endpoint Social Login รับ provider token เป็นหลักฐานยืนยันตัวตน หากไม่มีการจำกัดอัตรา ผู้โจมตีสามารถสุ่มตรวจสอบว่า social account ใดลงทะเบียนไว้ในระบบด้วยการส่ง probe request อย่างรวดเร็ว (Account Enumeration Attack)
- `POST /auth/register` — การสมัครสมาชิกปริมาณสูงจะลดคุณภาพของข้อมูลในฐานข้อมูลและทำให้ analytics ผิดเพี้ยน

ในขณะที่ทำการทบทวนสถาปัตยกรรมเบื้องต้น endpoint การ authentication ทุกตัวทำงานโดยไม่มีการบังคับจำกัดความถี่ของ request ชั้น controller ส่งต่อ request ขาเข้าทั้งหมดไปยัง service layer และต่อไปยังการเรียก SDK ภายนอก โดยไม่มีกลไกสกัดกั้นใดๆ

## การตัดสินใจ

ระบบนำ Stateless API Rate Limiting ที่ติดตั้งที่ขอบเขตขาเข้าของ NestJS controller ผ่าน module `@nestjs/throttler` มาใช้งาน Rate limiting ทำงานโดย `ThrottlerGuard` ซึ่งสกัดกั้น request ก่อนที่จะมีการเรียก service method, ประเมิน business logic, หรือเรียกใช้ external API ใดๆ

การกำหนดค่าการบังคับใช้ที่เฉพาะเจาะจง ตามที่ปรากฏใน `auth.controller.ts` มีดังนี้:

```typescript
// Firebase Phone OTP — จำกัดเข้มงวดที่สุด เพราะทุก call มีต้นทุนตัวเงิน
@UseGuards(ThrottlerGuard)
@Throttle({ default: { limit: 5, ttl: 60000 } })
@Post('verify-phone-otp')
async verifyPhoneOtp(@Body() body: { token: string }) { ... }

// Social Login providers — จำกัดระดับปานกลางเพื่อป้องกัน Account Enumeration
@UseGuards(ThrottlerGuard)
@Throttle({ default: { limit: 20, ttl: 60000 } })
@Post('google-login')
async googleLogin(@Body() body: { token: string }) { ... }
```

การกำหนดค่า rate-limit ถูกใช้ที่ระดับ decorator ของ endpoint ทำให้สามารถกำหนดความละเอียดแบบ per-route ได้โดยไม่ต้องพึ่งพา proxy layer หรือโครงสร้าง API gateway แยกต่างหาก

## ทางเลือกที่ได้พิจารณา

**การ Block ระดับ IP ผ่าน Nginx/Reverse Proxy:** วิธีนี้ให้การป้องกันที่เทียบเท่ากัน แต่ต้องการการ provision infrastructure นอก codebase ของแอปพลิเคชัน ตัดสินใจที่จะให้ security policy อยู่ร่วมกับ business logic ที่มันปกป้อง เพราะทำให้ตรวจสอบได้ง่ายขึ้นและลดความเสี่ยงที่การกำหนดค่าจะไม่ตรงกันระหว่าง version ของแอปพลิเคชันและการกำหนดค่า proxy

**ตัวนับ Request แบบพึ่ง Database:** วิธีที่ใช้ตัวนับถาวรจะรอดพ้นจากการรีสตาร์ทแอปพลิเคชัน แต่ก่อให้เกิด database write ทุกครั้งที่มี request authentication ขาเข้า สร้าง latency overhead ที่ยอมรับไม่ได้สำหรับ endpoint ที่มีความถี่สูง

## ผลที่ตามมา

### ผลเชิงบวก

- การเรียก Firebase SDK ถูกป้องกันไม่ให้รับมากกว่า 5 ครั้งต่อ client ต่อช่วง 60 วินาทีในระดับโครงสร้าง จำกัดการขยายต้นทุนในกรณีเลวร้ายที่สุดให้อยู่ในขอบเขตที่คำนวณได้
- Account Enumeration ผ่าน Social Login ถูกลดให้อยู่ในอัตราที่ไม่เพียงพอสำหรับการ enumerate อัตโนมัติในขนาดใหญ่
- `ThrottlerGuard` ทำงานก่อนการ acquire connection pool ของฐานข้อมูล หมายความว่า request ที่ถูก block สร้างภาระบน database แทบจะเป็นศูนย์

### ผลเชิงลบ

- ผู้ใช้จริงที่ยืนยัน OTP ทางโทรศัพท์ผิดพลาด 5 ครั้งติดต่อกันภายในหนึ่งนาที จะถูก lock เป็นเวลา 60 วินาที นี่เป็นการแลกเปลี่ยนด้าน usability ที่ยอมรับได้เพื่อความสมบูรณ์ของระบบข้อมูลส่วนบุคคล
- การ implement ปัจจุบันใช้ rate-limit store แบบ in-process ในการ deploy แบบ horizontally-scaled หลาย instance จำเป็นต้องใช้ throttle store แบบ shared ที่ใช้ Redis เพื่อบังคับใช้ limit ข้าม application replica ทั้งหมด นี่คือ prerequisite สำหรับการ scale แนวนอนบน production

## เอกสารอ้างอิง

- `backend/src/auth/auth.controller.ts` — การ implement endpoint authentication ทั้งหมดที่มีการจำกัดอัตรา
- `backend/src/app.module.ts` — การลงทะเบียน `ThrottlerModule` แบบ global
- ADR-002: Isolation Boundary และ Idempotency Keys ใน Stripe Financial Workflows
