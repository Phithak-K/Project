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

## 🚀 การรันระบบ (Development)

```bash
# ติดตั้ง dependencies
npm install

# รันระบบในโหมดพัฒนา
npm run dev
```

---
*SwiftPath Frontend - Designed for Speed & Beauty.*
