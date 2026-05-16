# SwiftPath Frontend — Next.js Edge Security Gateway และ Subdomain-Isolated Portal System

เอกสารนี้ครอบคลุมรายละเอียดด้านวิศวกรรมของชั้น Frontend ของ SwiftPath ที่พัฒนาด้วย Next.js (App Router) ผู้อ่านควรอ่าน [Root README](../README.md) เพื่อทำความเข้าใจสถาปัตยกรรมโดยรวมก่อน

---

## สถาปัตยกรรมซับโดเมนและการ Rewrite

`middleware.ts` คือหัวใจของระบบ Frontend ทำหน้าที่เป็น Edge Security Gateway ที่ประมวลผลก่อน React component จะ render แม้แต่ครั้งเดียว

### ตรรกะการ Rewrite

ระบบแปลงซับโดเมนให้เป็นโฟลเดอร์ภายใน `app/` โดยอัตโนมัติ:

```
app.localhost:3000/dashboard   →  app/customer/dashboard/page.tsx
store.localhost:3000/orders    →  app/merchant/orders/page.tsx
fleet.localhost:3000/radar     →  app/driver/radar/page.tsx
localhost:3000/admin           →  app/admin/ (ต้องผ่าน Admin Gate ก่อน)
```

### ลำดับการตรวจสอบของ Middleware (8 ขั้นตอน)

| ขั้นตอน | ชื่อ | หน้าที่ |
| :--- | :--- | :--- |
| 1 | Admin Gate | ตรวจสอบ `/admin` path ก่อนทุกอย่าง ป้องกัน Redirect Loop |
| 2 | Unauthenticated Guard | ผู้ที่ไม่มี token และไม่ใช่หน้า public → redirect ไป login พร้อม `callbackUrl` |
| 3 | Auth Page Gate | ผู้ที่ login แล้วพยายามเข้าหน้า login/register → redirect กลับ dashboard |
| 4 | Role-Based Access Control | ตรวจสอบว่า role ตรงกับซับโดเมน ถ้าไม่ตรง → evict cookie และ redirect |
| 5 | Root Domain Handler | จัดการ `localhost:3000` โดยตรง (Landing Page) |
| 6 | Wrong-Subdomain Guard | แก้ไขกรณีเข้าผิด path เช่น `/driver/register` บน `app.localhost` |
| 7 | Shared Root Pages | เส้นทางที่ใช้ร่วมกัน เช่น `/verify-otp`, `/track` ปล่อยผ่านโดยไม่ rewrite |
| 8 | Subdomain Folder Rewrite | ทำ rewrite ตามซับโดเมนที่ตรวจพบ |

---

## โครงสร้างโฟลเดอร์

```text
frontend/
├── app/
│   ├── customer/        # หน้าสำหรับ Customer (rewrite จาก app.localhost)
│   │   ├── page.tsx     # Dashboard หลัก
│   │   ├── wallet/      # ระบบกระเป๋าเงินและ Stripe Embedded Checkout
│   │   └── orders/      # ประวัติออเดอร์
│   ├── merchant/        # หน้าสำหรับ Merchant (rewrite จาก store.localhost)
│   │   ├── page.tsx     # Dashboard และ analytics รายได้
│   │   ├── orders/      # จัดการออเดอร์และ Surge Pricing
│   │   └── register/    # ลงทะเบียนร้านค้า
│   ├── driver/          # หน้าสำหรับ Driver (rewrite จาก fleet.localhost)
│   │   ├── page.tsx     # Radar Map รับงาน
│   │   └── orders/      # จัดการงานที่รับ
│   ├── admin/           # ศูนย์บริหารจัดการ (เฉพาะ Admin role)
│   ├── login/           # หน้า Login รวม (ใช้ร่วมกันทุกซับโดเมน)
│   ├── register/        # หน้าลงทะเบียน
│   ├── verify-otp/      # ยืนยัน OTP (shared path — ไม่ rewrite)
│   └── track/           # ติดตามพัสดุสาธารณะ (ไม่ต้อง login)
├── components/
│   ├── OrderMap.tsx     # แผนที่ Leaflet.js สำหรับติดตามพัสดุ
│   ├── FCMProvider.tsx  # Provider สำหรับ Firebase Cloud Messaging
│   └── ...              # UI components อื่นๆ
├── lib/                 # Utility functions และ API client
├── middleware.ts        # Edge Security Gateway (ไฟล์สำคัญที่สุด)
└── next.config.ts       # Next.js configuration
```

---

## มาตรการแก้ไขวิกฤตและการปรับปรุง

### BUG-001: Admin Infinite Redirect Loop (แก้ไขแล้ว)

ฟังก์ชัน `checkAdminAccess` ถูกยกขึ้นมาเป็น **Step 1** ในลำดับ middleware แยกการประเมิน Admin ออกจาก logic ของผู้ใช้ทั่วไปอย่างเด็ดขาด บัญชี Admin จะไม่ถูกส่งเข้า pipeline ของ `checkCustomerAccess` อีกต่อไป จึงไม่มีการเรียก `clearBadCookies` อย่างผิดพลาด

```typescript
// STEP 1: ตรวจสอบ Admin ก่อนทุก check
const adminResult = checkAdminAccess(ctx)
if (adminResult) return adminResult  // short-circuit — ไม่ผ่าน check อื่น
```

### BUG-002: Cumulative Layout Shift (CLS) บนการสลับซับโดเมน (แก้ไขแล้ว)

รูปแบบ `return null` ระหว่างก่อน hydration ถูกแทนที่ด้วย **Safe Server Skeleton** ที่กำหนดขนาดแบบ static ใน Server Component ทำให้เบราว์เซอร์ได้รับโครงสร้างหน้าที่มีมิติ stable ตั้งแต่ HTML payload ชิ้นแรก กำจัดหน้าขาวว่างและรักษาคะแนน Core Web Vitals

---

## Technology Stack

| เทคโนโลยี | เวอร์ชัน | การใช้งาน |
| :--- | :--- | :--- |
| Next.js | 15+ | App Router, Server Components, Edge Middleware |
| TypeScript | 5.x | Type safety ระดับ compile-time |
| Tailwind CSS | v4 | Design system ระดับ production |
| Socket.io-client | ล่าสุด | Real-time WebSocket connection |
| Axios | ล่าสุด | REST API client |
| Leaflet.js | ล่าสุด | Interactive fleet map |
| Recharts | ล่าสุด | Analytics dashboard |

---

## การเริ่มต้นระบบ

```bash
# ติดตั้ง dependencies
npm install

# เริ่มต้นในโหมดพัฒนาบนพอร์ต 3000
npm run dev
```

> **หมายเหตุ:** ต้องกำหนดค่า hosts file (`C:\Windows\System32\drivers\etc\hosts`) ให้ชี้ซับโดเมนมาที่ `127.0.0.1` และสร้างไฟล์ `.env.local` ที่ระบุ `NEXT_PUBLIC_API_URL` และ `NEXT_PUBLIC_BASE_DOMAIN` ก่อนเริ่มต้น

```text
127.0.0.1  app.localhost
127.0.0.1  store.localhost
127.0.0.1  fleet.localhost
```

---

*SwiftPath Frontend — Secured at the edge. Stable under hydration. Isolated by design.*
