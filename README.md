# แพลตฟอร์มโลจิสติกส์ SwiftPath (SwiftPath Logistics Platform)

SwiftPath คือระบบบริหารจัดการขนส่งและโลจิสติกส์แบบครบวงจรระดับ Commercial-Grade ที่ถูกออกแบบมาเพื่อรองรับการขยายตัวทางธุรกิจ (Enterprise-level Scalability) และความปลอดภัยขั้นสูงสุด ตัวแพลตฟอร์มเชื่อมโยงเครือข่ายระหว่างร้านค้า คนขับ และลูกค้าเข้าด้วยกันอย่างสมบูรณ์แบบ ผ่านระบบโดเมนย่อยที่แยกจากกัน พร้อมระบบติดตามสถานะแบบเรียลไทม์ และระบบธุรกรรมการเงินอัตโนมัติ

---

## 🛠️ เทคโนโลยีที่ใช้งาน (Technology Stack)

สถาปัตยกรรมของเราเลือกใช้ Modern Stack ประสิทธิภาพสูงที่ออกแบบมาเพื่อความเสถียรและรองรับการขยายตัวในอนาคต

### ฝั่งหน้าบ้าน (Frontend)
* **แกนหลักพื้นฐาน:** Next.js 16.2.2 (React 19) พร้อมระบบ Contextual Subdomain Routing
* **ภาษาหลัก:** TypeScript เพื่อโครงสร้างซอร์สโค้ดที่แข็งแรงและลดข้อผิดพลาด
* **การออกแบบ:** Tailwind CSS v4 สำหรับดีไซน์ระดับ Enterprise ที่สะอาดตาและเป็นมืออาชีพ (Impeccable Style)
* **การวิเคราะห์ข้อมูล:** Recharts สำหรับการสร้างกราฟและแดชบอร์ดข้อมูลสถิติขั้นสูง
* **แผนที่อินเตอร์แอกทีฟ:** Leaflet.js สำหรับแสดงตำแหน่งคนขับและพิกัดแผนที่แบบเรียลไทม์

### ฝั่งหลังบ้าน (Backend)
* **แกนหลักพื้นฐาน:** NestJS (Node.js) รองรับการขยายระบบแบบ Microservice
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

| Portal | URL | กลุ่มผู้ใช้งาน | รายละเอียด |
| :--- | :--- | :--- | :--- |
| **Root/Admin Portal** | `http://localhost:3000/admin` | ผู้ดูแลระบบ | จัดการระบบ ตรวจสอบยอดสถิติ และการยืนยันผู้ใช้งาน |
| **Customer Portal** | `http://app.localhost:3000` | ลูกค้าทั่วไป | ดูหน้าแรกสาธารณะ ค้นหาเลขพัสดุ ล็อกอินดู Wallet และประวัติล่าสุด |
| **Merchant Portal** | `http://store.localhost:3000` | ร้านค้าคู่ค้า | สร้างออเดอร์พัสดุ คำนวณราคาตามสภาพอากาศ ดูสรุปสถิติมุมมองร้าน |
| **Driver Portal** | `http://fleet.localhost:3000` | คนขับรถจัดส่ง | รับงานผ่าน Interactive Radar Map, อัปเดตพิกัด และสะสมรายได้ |

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

## 🛡️ รายการอัปเดตและการแก้ไขล่าสุด (Security Hardening - พฤษภาคม 2569)

### 🔴 ด้านความปลอดภัยระดับวิกฤติ (Critical Security)
- **Stripe Endpoint Lockdown:** บังคับใช้ `JwtAuthGuard` บน API เติมเงิน และอ่านข้อมูลผู้ใช้จาก Token เท่านั้น (ป้องกันการสวมรอย)
- **RBAC Data Integrity:** แก้ไขข้อผิดพลาดในการดึง User ID ใน Orders Controller (`userId` -> `sub`) เพื่อความถูกต้องของสิทธิ์เจ้าของออเดอร์
- **WebSocket Sandboxing:** จำกัด CORS Origin ให้รับเฉพาะ Subdomain ของ SwiftPath เท่านั้น และตรวจสอบ JWT Expiry ในทุก Event

### 🟠 การเพิ่มประสิทธิภาพระบบ (High/Medium Improvements)
- **OTP Hashing:** เปลี่ยนการจัดเก็บ OTP จาก Plaintext เป็น **SHA-256 Hash** เพื่อความปลอดภัยของข้อมูล
- **Social Login Hardening:** ปรับปรุงระบบสร้าง Email ดัมมี่สำหรับ Facebook/LINE ให้เป็น UUID ที่คาดเดาไม่ได้ (ป้องกัน Hijacking)
- **Cross-Subdomain Persistence:** แก้ไขระบบ Cookie ให้ทำงานบน Chrome ได้อย่างสมบูรณ์แม้ใช้งานบน `localhost`
- **Analytics Accuracy:** ปรับปรุงการคำนวณรายได้ให้ใช้ `totalPrice` (ราคาสุทธิ) และนับออเดอร์จากวันเวลาที่สร้างจริง (`createdAt`)

### 🔵 การปรับปรุงประสบการณ์ผู้ใช้ (UX Enhancements)
- **Protocol-Relative URLs:** ปรับเปลี่ยนทุกลิงก์ให้เป็น `//` เพื่อรองรับการสลับระหว่าง HTTP และ HTTPS โดยอัตโนมัติ
- **Phone Validation:** เพิ่มระบบตรวจสอบเบอร์โทรศัพท์ (9-10 หลัก) ในฝั่งหน้าบ้าน
- **Secure Logout:** ปรับปรุงปุ่มออกจากระบบให้ล้าง Cookie ทุกระดับชั้นอย่างหมดจด

---

## 🚀 ฟีเจอร์ใหม่ที่พัฒนาเพิ่มเติม (Latest Additions & Portal Hardening)

### 1. ระบบผู้ดูแลระบบและแดชบอร์ดความร้อน (Admin & Driver Maps Upgrade)
* **Admin Control Center (`/admin` & `/admin/login`):** เพิ่มระบบผู้ดูแลระบบเต็มรูปแบบ มีระบบ Seeder บัญชีตั้งต้น (`seed-admin.ts`) มีหน้าล็อกอินแยกต่างหาก และแดชบอร์ดสรุปสถิติด้วยกราฟแท่งจาก Recharts รวมถึงตารางจัดการผู้ใช้พร้อมแบ่งแท็บ ค้นหา และตรวจสอบสถานะ `isVerified`
* **Stripe Embedded Payment Sheet:** อัปเกรดหน้ากระเป๋าเงินลูกค้า (`/customer/wallet`) ไปใช้ **Stripe Payment Element (UI แบบฝัง)** หน้าจ่ายเงินอยู่ในเว็บโดยตรงไม่โยกย้ายไปภายนอก ปลอดภัยผ่าน Flow ที่ยอดเงินดึงและอัปเดตอย่างสอดคล้อง
* **Leaflet.js Driver Radar Map:** ยกระดับหน้ารับงานคนขับ (`/driver/radar`) ด้วยแผนที่จริง Leaflet.js ธีม Dark Map พร้อมระบบปักหมุดกระพริบ **Pulse Marker** แสดงจุดร้อนสภาพอากาศ (Rain/Thunderstorm) ที่มีค่ารอบเพิ่มขึ้น +20% (Surge) เชื่อมโยง WebSocket แบบเรียลไทม์

### 2. ระบบค้นหาพัสดุสาธารณะแบบรักษาความเป็นส่วนตัว (Public Order Tracking)
* **Privacy-First Data Selection:** ออกแบบ Endpoint `GET /orders/track/:trackingNumber` ให้ดึงข้อมูลผ่าน Prisma Select ที่คัดกรองข้อมูลส่วนบุคคล (PII) ออกทั้งหมด 100% (ไม่ส่งชื่อผู้รับ, ที่อยู่ละเอียด, ยอดเงิน) เพื่อความปลอดภัยของผู้ใช้
* **Bypass Auth Middleware:** ปรับปรุง [middleware.ts](file:///d:/Project/frontend/middleware.ts) ให้อนุญาตการเข้าถึงพาธ `/track` สำหรับบุคคลทั่วไปแบบไม่ต้องยืนยันตน
* **Interactive Timeline & Map:** พัฒนาหน้าเว็บ `/track/[id]` ให้แสดง Progress Bar สถานะพัสดุ, แผนที่ Leaflet ปักพิกัดการเดินทาง และประวัติเวลาแบบครบถ้วน

### 3. หน้าแรกแบบรวมศูนย์ของพอร์ทัลลูกค้า (Unified Landing Page)
* **Public Root Path Access:** ปรับแก้ Next.js Middleware เพื่ออนุญาตให้บุคคลภายนอกเข้าเยี่ยมชมหน้าแรกของพอร์ทัลลูกค้า (`app.localhost:3000/`) ได้โดยตรงโดยไม่มีการบังคับล็อกอิน
* **Conditional UI Elements:**
  * **ผู้ใช้ทั่วไป (Logged Out):** แสดงผล Hero Section แนะนำบริการที่สวยงามและเป็นทางการ (Corporate Look) ในโทนส้ม-ขาว และช่องกรอกเลขพัสดุเพื่อเข้าสู่พอร์ทัลการติดตามได้ทันที โดยไม่มีการใช้ Emoji ใดๆ ทั้งสิ้น
  * **ผู้ใช้ที่ล็อกอิน (Logged In):** แสดงข้อมูลส่วนตัว ยอดเงินคงเหลือในกระเป๋า (Wallet Balance) และรายการประวัติออเดอร์จัดส่งล่าสุดใต้กล่องค้นหาแบบไร้รอยต่อ
* **Callback URL Redirects:** เมื่อผู้ใช้พยายามเข้าลิงก์ส่วนตัว (เช่น หน้ากระเป๋าเงิน) โดยไม่ได้ล็อกอิน ระบบจะส่งไปยังหน้าเข้าสู่ระบบพร้อมแนบ `callbackUrl` ไปใน Query String และจะพากลับไปหน้าเดิมทันทีหลังเข้าสู่ระบบสำเร็จ

---

*Engineered for scale. Designed for speed. Secured for enterprise.*