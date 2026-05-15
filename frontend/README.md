# SwiftPath Frontend (Next.js)

หน้าบ้านของ SwiftPath พัฒนาด้วย Next.js 16.x (App Router) โดยใช้ระบบสถาปัตยกรรม Subdomain-based Routing เพื่อแยกประสบการณ์การใช้งานตามกลุ่มเป้าหมาย (Customer, Merchant, Driver, Admin)

---

## 🌐 ระบบโดเมนย่อย (Subdomain Architecture)

เราใช้ Middleware ขั้นสูงในการตรวจจับ Hostname และจัดการ Rewrite/Redirect ไปยัง Micro-frontend ภายในโฟลเดอร์ `app`:

-   **Customer Portal (`app.localhost`):** หน้าหลักสำหรับลูกค้า สั่งงาน, ติดตามพัสดุสาธารณะ, และจัดการ Wallet
-   **Merchant Portal (`store.localhost`):** แผงควบคุมร้านค้าสำหรับจัดการออเดอร์และวิเคราะห์สถิติรายได้
-   **Fleet Portal (`fleet.localhost`):** ระบบสำหรับคนขับเพื่อรับงานผ่าน Interactive Radar Map และอัปเดตสถานะแบบเรียลไทม์
-   **Admin Center (`localhost/admin`):** ศูนย์กลางการบริหารจัดการระบบและตรวจสอบสถิติภาพรวม

---

## 🛠️ ฟีเจอร์สำคัญและเทคโนโลยี (Core Features & Tech)

-   **Next.js App Router & Server Components:** ใช้ประโยชน์สูงสุดจากสถาปัตยกรรม React สมัยใหม่เพื่อความเร็วและ SEO
-   **CLS Optimization (Hydration Stability):** ใช้ระบบ Skeleton Loading และ Hydration Guard เพื่อป้องกันปัญหา Cumulative Layout Shift (CLS) และหน้าจอขาวระหว่างโหลด
-   **Cross-Subdomain Persistence:** ระบบจัดการ Cookie ที่ออกแบบมาให้รองรับการทำงานข้าม Subdomain ได้อย่างราบรื่น (Shared Session)
-   **Premium UI Architecture:** ดีไซน์แบบ "Impeccable Style" ในโทนส้ม-ขาว ที่เป็นทางการและสะอาดตา โดยไม่มีการใช้ Emoji ในส่วน UI หลัก
-   **Interactive Data Visualization:** บูรณาการ Recharts สำหรับกราฟวิเคราะห์ข้อมูล และ Leaflet.js สำหรับระบบแผนที่โลจิสติกส์

---

## 🔒 การปรับปรุงด้านความปลอดภัยและเสถียรภาพ (Security & Stability Fixes)

1.  **Middleware Gatekeeping:** ปรับปรุงระบบป้องกัน Admin Redirect Loop และการเข้าถึงพาธ Auth อย่างถูกต้อง
2.  **Public Path Access:** อนุญาตให้บุคคลทั่วไปเข้าถึงหน้า Landing Page และระบบติดตามพัสดุ (/track) ได้โดยไม่ต้อง Login
3.  **Secure Session Management:** ระบบ Logout ที่ล้าง Cookie ทุกระดับชั้น (Domain-level) เพื่อความปลอดภัยสูงสุด
4.  **Anti-Brute Force Protection:** บูรณาการหน้าจอเข้าสู่ระบบให้รองรับข้อความแจ้งเตือน Rate Limit จาก Backend อย่างชัดเจน
5.  **Environment Sync:** การใช้ระบบ API URL และ Base Domain ที่ยืดหยุ่น รองรับทั้งการพัฒนาบน Localhost และการใช้งานจริงบน Production

---

## 🚀 อัปเดตล่าสุด (Phase 3 Hardening)

*   **Skeleton Hydration:** อัปเกรดหน้า Dashboard ให้ใช้ Skeleton แทนการใช้ `null` เพื่อคะแนน Core Web Vitals ที่ดีขึ้น
*   **Stripe Embedded Element:** หน้าชำระเงินที่ฝังตัว (Embedded Sheet) สมบูรณ์แบบ ไม่ต้องออกจากเว็บไซต์เพื่อจ่ายเงิน
*   **Unified Auth Flow:** ระบบ Redirect พร้อม `callbackUrl` ที่พาท่านกลับไปยังหน้าเดิมหลังจากเข้าสู่ระบบสำเร็จ
*   **Admin Dashboard Fix:** แก้ไขปัญหาการเข้าถึงของ Admin บนระบบ Subdomain ให้ทำงานได้อย่างไร้รอยต่อ

---

## 🛠️ การรันระบบ (Development)

```bash
# ติดตั้ง dependencies และ UI libraries
npm install

# รันระบบในโหมดพัฒนาบนพอร์ต 3000
npm run dev
```

---
*SwiftPath Frontend - Engineered for Speed. Designed for Beauty.*
