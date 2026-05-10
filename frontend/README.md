# SwiftPath Frontend (Next.js)

หน้าบ้านของ SwiftPath พัฒนาด้วย Next.js 15+ โดยใช้ระบบ Subdomain Routing เพื่อแยกประสบการณ์การใช้งานตามกลุ่มเป้าหมาย

## 🌐 ระบบโดเมนย่อย (Subdomain Architecture)

เราใช้ Middleware ในการตรวจจับ Hostname และ Rewrite เส้นทางไปยังโฟลเดอร์ที่เหมาะสม:

- **Customer (`app.localhost`):** หน้าหลักสำหรับลูกค้า สั่งงาน, ติดตามพัสดุ, จัดการกระเป๋าเงิน
- **Merchant (`store.localhost`):** แผงควบคุมร้านค้า จัดการออเดอร์และดูสถิติรายได้
- **Driver (`fleet.localhost`):** ระบบสำหรับคนขับ รับงานผ่าน Radar และอัปเดตสถานะการจัดส่ง

## 🛠️ ฟีเจอร์สำคัญ (Core Features)

- **Cross-Subdomain Session:** ระบบจัดการ Cookie ที่ฉลาด สามารถคงสถานะ Login ข้าม Subdomain ได้อย่างราบรื่นบน Localhost และ Production
- **Protocol-Relative URLs:** ลิงก์ภายในระบบปรับเปลี่ยนตามโปรโตคอล (HTTP/HTTPS) โดยอัตโนมัติ
- **Real-time Tracking:** เชื่อมต่อ WebSocket เพื่อรับพิกัด GPS ของคนขับแบบวินาทีต่อวินาที
- **Premium UI/UX:** ใช้ Vanilla CSS ร่วมกับ Tailwind CSS v4 เพื่อสร้างอินเทอร์เฟซที่สวยงามและตอบสนองได้รวดเร็ว (Smooth Animations)

## 🔒 การแก้ไขล่าสุด (Recent Fixes)

1.  **Cookie Persistence Fix:** แก้ไขปัญหา Chrome ปฏิเสธ Cookie `domain=localhost` ทำให้ Session ไม่หลุดเมื่อเปลี่ยน Subdomain
2.  **Phone Number Validation:** เพิ่มระบบตรวจสอบรูปแบบเบอร์โทรศัพท์ในหน้าลงทะเบียน
3.  **Global API Fallback:** ตั้งค่า API Port เป็น 8000 เป็นค่าเริ่มต้นทั่วทั้งโปรเจกต์
4.  **Secure Logout:** ระบบล้าง Cookie ทั้งหมด (รวมถึง Domain-level cookie) เมื่อผู้ใช้กดออกจากระบบ

## 🚀 อัปเดตล่าสุด (Phase 2 & Phase 3)

ยกระดับหน้าจอผู้ใช้ให้ทันสมัย ปลอดภัย และสะท้อนมาตรฐานความคลีนระดับ Impeccable Style (ส้ม-ขาว) โดยไร้การใช้สัญลักษณ์ Emoji ในหน้า UI ของแอป:
1.  **Stripe Embedded Payment Elements:** หน้าชำระเงิน `/customer/wallet` ถูกปรับปรุงใหม่ทั้งหมดโดยการฝังตัวรับข้อมูลบัตรเครดิตของ Stripe ลงในเว็บตรง (Embedded Sheet) สบายตากว่าและรักษาความปลอดภัยได้ดีกว่า
2.  **Leaflet.js Dark Map & Pulse Markers:** ยกระดับแผนที่บน `/driver/radar` ให้เป็นแผนที่จริงสไตล์ดาร์ก พร้อมมีจุด Hotspot คอยกระพริบเตือนพื้นที่ฝนตก/พายุเพื่อคำนวณ Surge +20% แบบเรียลไทม์
3.  **Admin Dashboard Center:** หน้าควบคุม `/admin` และหน้าล็อกอิน `/admin/login` แสดงกราฟสถิติความเคลื่อนไหวด้วย Recharts และตารางคัดกรองบัญชีผู้ใช้
4.  **Public Order Tracking (`/track` & `/track/[id]`):** หน้าเว็บสำหรับให้บุคคลภายนอกใช้เลขพัสดุค้นหาสถานะการจัดส่งได้ทันที โดยจะแสดง Timeline ประวัติพร้อมแผนที่ปักหมุด โดยปิดบังข้อมูลสำคัญส่วนบุคคล (PII) ทั้งหมด
5.  **Unified Landing Page (Customer Home):** พัฒนาหน้าแรกของ Customer Portal (`app.`) ให้เป็นหน้ารวมศูนย์แบบไม่มีเงื่อนไขบังคับเข้าสู่ระบบ บุคคลทั่วไปจะเห็น Hero Section และช่องค้นหาเลขพัสดุดีไซน์ทางการ (Corporate Look) หากล็อกอินสำเร็จจะแสดงส่วน Wallet และประวัติออเดอร์ล่าสุดเพิ่มเติมด้านล่าง
6.  **Callback URL Redirection:** หน้า `/login` รองรับการทำงานผ่าน `callbackUrl` นำทางผู้ใช้นอกระบบที่พยายามเข้าหน้าเพจส่วนตัวกลับไปยังหน้าเดิมทันทีหลังยืนยันตนสำเร็จ
7.  **Security Hardening (จากผลการ Audit ความปลอดภัย):**
    - *Anti-XSS Popup:* มีฟังก์ชันแปลงอักขระพิเศษ (Escape HTML) ในแผนที่เรดาร์เพื่อปกป้องคนขับจากการโจมตี XSS ในป๊อปอัป
    - *Middleware Admin Protection:* คัดกรองพาธ `/admin` อย่างเข้มงวด โดยจะอนุญาตให้เข้าดูแดชบอร์ดเฉพาะผู้ใช้ที่มีสถานะ `Admin` ผ่าน Token เท่านั้น
    - *Double-Submit Block:* ใช้ `useRef` และกลไกสกัดกั้นการกดเติมเงินรัวๆ ในหน้า Wallet เพื่อลดการยิง API แบบไม่ตั้งใจ

## 🚀 การรันระบบ (Development)

```bash
# ติดตั้ง dependencies (และ Stripe UI libraries ล่าสุด)
npm install

# รันระบบในโหมดพัฒนา
npm run dev
```

---
*SwiftPath Frontend - Designed for Speed & Beauty.*
