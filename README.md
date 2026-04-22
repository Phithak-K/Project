# แพลตฟอร์มโลจิสติกส์ SwiftPath (SwiftPath Logistics Platform)

SwiftPath คือระบบบริหารจัดการขนส่งและโลจิสติกส์แบบครบวงจรระดับ Commercial-Grade ที่ถูกออกแบบมาเพื่อรองรับการขยายตัวทางธุรกิจ (Enterprise-level Scalability) และความปลอดภัยขั้นสูงสุด ตัวแพลตฟอร์มเชื่อมโยงเครือข่ายระหว่างร้านค้า คนขับ และลูกค้าเข้าด้วยกันอย่างสมบูรณ์แบบ ผ่านระบบโดเมนย่อยที่แยกจากกัน พร้อมระบบติดตามสถานะแบบเรียลไทม์ และระบบธุรกรรมการเงินอัตโนมัติ

---

## 🛠️ เทคโนโลยีที่ใช้งาน (Technology Stack)

สถาปัตยกรรมของเราเลือกใช้ Modern Stack ประสิทธิภาพสูงที่ออกแบบมาเพื่อความเสถียรและรองรับการขยายตัวในอนาคต

### ฝั่งหน้าบ้าน (Frontend)
* **แกนหลักพื่นฐาน:** Next.js 16.2.2 (React 19) พร้อมระบบ Contextual Subdomain Routing
* **ภาษาหลัก:** TypeScript เพื่อโครงสร้างซอร์สโค้ดที่แข็งแรงและลดข้อผิดพลาด
* **การออกแบบ:** Tailwind CSS v4 สำหรับดีไซน์ระดับ Enterprise ที่สะอาดตาและเป็นมืออาชีพ (Impeccable Style)
* **การวิเคราะห์ข้อมูล:** Recharts สำหรับการสร้างกราฟและแดชบอร์ดข้อมูลสถิติขั้นสูง

### ฝั่งหลังบ้าน (Backend)
* **แกนหลักพื่นฐาน:** NestJS (Node.js) รองรับการขยายระบบแบบ Microservice
* **Database & ORM:** PostgreSQL ผ่าน Prisma ORM พร้อมระบบ Atomic Transaction
* **Communication:** Socket.io (Real-time WebSockets) และ Firebase Cloud Messaging (Push Notifications)
* **Financial Gateway:** Stripe API Integration (Idempotency Key Secured)

---

## 🌐 การใช้งานระบบโดเมนย่อย (Portal Access)

เพื่อให้ระบบทำงานได้อย่างสมบูรณ์ในเครื่อง Localhost คุณจำเป็นต้องตั้งค่า Domain Mapping ในไฟล์ `hosts` ของเครื่อง (Windows: `C:\Windows\System32\drivers\etc\hosts`) ดังนี้:

```text
127.0.0.1  app.localhost
127.0.0.1  store.localhost
127.0.0.1  fleet.localhost
```

| Portal | URL | กลุ่มผู้ใช้งาน |
| :--- | :--- | :--- |
| **Customer Portal** | `http://app.localhost:3000` | สั่งสินค้า, ติดตามพัสดุแบบสด, เติมเงิน Wallet |
| **Merchant Portal** | `http://store.localhost:3000` | จัดการออเดอร์, ดูสถิติรายได้, วิเคราะห์ Analytics |
| **Driver Portal** | `http://fleet.localhost:3000` | รับงานผ่าน Radar, อัปเดตพิกัด GPS, สะสมรายได้ค่ารอบ |

---

## 🚀 ฟีเจอร์ระดับธุรกิจ (Enterprise Features)

* **แผนที่ติดตามแบบเรียลไทม์ (Real-time Logistics Map):** ระบบติดตามตำแหน่งของคนขับบนแผนที่แบบสดๆ ผ่าน WebSockets ตำแหน่ง GPS จะถูกบรอดแคสต์เสี้ยววินาทีโดยไม่ต้องรีเฟรชหน้าจอ
* **ระบบกระเป๋าเงินและตัดบัตร (Stripe Top-up Wallet):** กระเป๋าเงินดิจิทัลในตัวที่ให้ผู้ใช้สามารถเติมเงินเข้ากระเป๋าได้อย่างปลอดภัยผ่านการตัดบัตรเครดิตจริงด้วยคอร์ของ Stripe
* **การแจ้งเตือนข้ามแพลตฟอร์ม (Cross-Platform Notifications):** ระบบส่ง Push Notification อัตโนมัติผ่าน FCM ทั้งลูกค้าและร้านค้าจะได้รับการแจ้งเตือนสถานะทันทีเมื่อมีความเคลื่อนไหว
* **แดชบอร์ดวิเคราะห์ยอดขาย (Merchant Analytics):** แผงควบคุมพิเศษสำหรับร้านค้าโดยเฉพาะ ใช้กราฟสุดล้ำจาก Recharts ในการวิเคราะห์แนวโน้มรายได้ 7 วันย้อนหลัง
* **ราคาแปรผันตามสภาพอากาศ (Weather-based Surge Pricing):** ระบบคำนวณราคาแปรผันอัตโนมัติ โดยอ้างอิงจากข้อมูลสภาพอากาศของพื้นที่ต้นทาง-ปลายทาง

---

## 🔒 ความปลอดภัยและความถูกต้องทางการเงิน (Security & Financial Integrity)

SwiftPath บังคับใช้มาตรฐานความปลอดภัยระดับรัดกุมสูงสุด (Zero-Trust Security Architecture) เพื่อป้องกันธุรกรรมผิดพลาดและปกป้องบัญชีผู้ใช้งาน

* **ระบบป้องกันการเติมเงินซ้ำ (Idempotency Protection):** ป้องกันปัญหา Double Credit 100% โดยการใช้ `referenceId` ตรวจสอบสถานะธุรกรรมจาก Stripe Webhook
* **ความปลอดภัยระดับอะตอมแท้ (Native Atomic Transactions):** ระบบหักเงินใน Wallet ถูกล็อคด้วยเงื่อนไขระดับฐานข้อมูล และใช้ `Prisma.Decimal` ในการคำนวณเพื่อป้องกันปัญหา Precision Loss ระดับการเงิน
* **การป้องกันความปลอดภัยระดับ Zero-Trust บน WebSocket (Persistent Guard):**
  * **Continuous Auth:** ระบบตรวจสอบวันหมดอายุของ JWT ในทุกๆ Event (ไม่ใช่แค่ตอน Connect) หาก Token หมดอายุระบบจะเตะการเชื่อมต่อทันที
  * **GPS Range Validation:** ระบบตรวจสอบความถูกต้องของพิกัด (lat -90 to 90, lng -180 to 180) เพื่อป้องกันการส่งพิกัดลวง (GPS Spoofing)
* **การป้องกันการสวมรอยบัญชี (Identity Hijacking Protection):** ระบบ Social Login ป้องกันการควบรวมบัญชีโดยไม่ได้รับอนุญาต (Anti-Silent Account Merging)
* **มาตรฐานการแสดงผลระดับสากล (Impeccable Style):** ระบบหลังบ้านทั้งหมดถูกทำความสะอาด (Purged) จากสัญลักษณ์ Emoji และใช้ภาษาที่เป็นทางการระดับสากล

---

## 💡 คำแนะนำสำหรับการพัฒนา (Development Tips)

### การตั้งค่า Google OAuth (Social Login)
หากต้องการใช้งาน Social Login บน Subdomain `app.localhost:3000` คุณต้องเข้าไปตั้งค่าใน **Google Cloud Console** ดังนี้:
1. ไปที่ `APIs & Services` > `Credentials`
2. เลือก OAuth 2.0 Client IDs ของคุณ
3. ในส่วน **Authorized JavaScript origins** ให้เพิ่ม:
   - `http://app.localhost:3000`
   - `http://localhost:3000`

### ระบบ Middleware Routing
ระบบใช้ Next.js Middleware ในการบริหารจัดการ Subdomain อัตโนมัติ โดยมีการทำ **Shared Path Bypass** สำหรับหน้าเพจที่ใช้ร่วมกันทุก Domain เช่น `/verify-otp` เพื่อป้องกันอาการ 404 เมื่อเปลี่ยน Portal

---

*Engineered for scale. Designed for speed. Secured for enterprise.*