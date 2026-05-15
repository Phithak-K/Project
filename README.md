# แพลตฟอร์มโลจิสติกส์ SwiftPath (SwiftPath Logistics Platform)

SwiftPath คือระบบบริหารจัดการขนส่งและโลจิสติกส์แบบครบวงจรระดับ Commercial-Grade ที่ถูกออกแบบมาเพื่อรองรับการขยายตัวทางธุรกิจ (Enterprise-level Scalability) และความปลอดภัยขั้นสูงสุด ตัวแพลตฟอร์มเชื่อมโยงเครือข่ายระหว่างร้านค้า คนขับ และลูกค้าเข้าด้วยกันอย่างสมบูรณ์แบบ ผ่านระบบโดเมนย่อยที่แยกจากกัน พร้อมระบบติดตามสถานะแบบเรียลไทม์ และระบบธุรกรรมการเงินอัตโนมัติ

---

## 🛠️ เทคโนโลยีที่ใช้งาน (Technology Stack)

สถาปัตยกรรมของเราเลือกใช้ Modern Stack ประสิทธิภาพสูงที่ออกแบบมาเพื่อความเสถียรและรองรับการขยายตัวในอนาคต

### ฝั่งหน้าบ้าน (Frontend)
*   **Framework:** Next.js 16.2.2 (App Router) พร้อมระบบ Contextual Subdomain Routing
*   **Language:** TypeScript 5.x สำหรับ Type-safety ขั้นสูงสุด
*   **Styling:** Tailwind CSS v4 สำหรับดีไซน์ระดับ Enterprise ที่สะอาดตา (Impeccable Style)
*   **State & Data:** Axios สำหรับ API Client และ Socket.io-client สำหรับ Real-time Sync
*   **Visualization:** Recharts (Analytics Dashboard) และ Leaflet.js (Interactive Fleet Maps)

### ฝั่งหลังบ้าน (Backend)
*   **Framework:** NestJS (Node.js) สถาปัตยกรรมแบบ Modular
*   **Database:** PostgreSQL ผ่าน Prisma ORM พร้อมระบบ Strict Type และ Atomic Transaction
*   **Security:** Passport.js (JWT Auth), SHA-256 OTP Hashing, และ NestJS Throttler (Rate Limiting)
*   **Real-time:** Socket.io Gateway พร้อม Signature Verification
*   **Infrastructure:** Docker & Docker Compose สำหรับ Containerized Database

---

## 🌐 การใช้งานระบบโดเมนย่อย (Portal Access)

เพื่อให้ระบบทำงานได้อย่างสมบูรณ์ในเครื่อง Localhost คุณจำเป็นต้องตั้งค่า Domain Mapping ในไฟล์ `hosts` ของเครื่อง (Windows: `C:\Windows\System32\drivers\etc\hosts`) ดังนี้:

```text
127.0.0.1  app.localhost
127.0.0.1  store.localhost
127.0.0.1  fleet.localhost
```

| Portal | Local URL | สิทธิ์การเข้าถึง | หน้าที่หลัก |
| :--- | :--- | :--- | :--- |
| **Root/Admin** | `http://localhost:3000/admin` | ผู้ดูแลระบบ | Dashboard สถิติกลาง, จัดการผู้ใช้ และ Seeding ข้อมูล |
| **Customer** | `http://app.localhost:3000` | ลูกค้า | ติดตามพัสดุสาธารณะ, จัดการ Wallet และดูประวัติการสั่งซื้อ |
| **Merchant** | `http://store.localhost:3000` | ร้านค้า | สร้างออเดอร์, คำนวณราคา Surge Price และวิเคราะห์ยอดขาย |
| **Driver** | `http://fleet.localhost:3000` | คนขับ | รับงานผ่าน Radar Map, อัปเดตพิกัด และสะสมรายได้ |

---

## 🚀 ฟีเจอร์ระดับธุรกิจ (Enterprise Features)

*   **Intelligent ETA & Surge Pricing:** ระบบคำนวณระยะเวลาจัดส่งและราคาแปรผันตามสภาพอากาศ (Weather API integration) และความหนาแน่นของงานในพื้นที่
*   **Stripe Embedded Checkout:** ระบบเติมเงินเข้า Wallet แบบฝังตัว (Embedded UI) ปลอดภัยระดับ PCI-DSS ผ่าน Stripe Payment Element
*   **Zero-Trust WebSocket Architecture:** ทุกความเคลื่อนไหวของคนขับและข้อความแชทถูกตรวจสอบ JWT Signature ทุกครั้งที่รับส่งข้อมูล (Persistent Auth Guard)
*   **Privacy-First Public Tracking:** ระบบค้นหาพัสดุสาธารณะที่กรองข้อมูลส่วนบุคคล (PII) ออกอัตโนมัติ เพื่อรักษาความเป็นส่วนตัวของผู้รับและผู้ส่ง
*   **Interactive Fleet Radar:** แผนที่คนขับแบบ Dark Mode พร้อมระบบ Marker Pulse แจ้งเตือนโซนรายได้พิเศษ (Surge Hotspots) แบบเรียลไทม์

---

## 🔒 ความปลอดภัยและการรักษาความถูกต้องของข้อมูล (Security & Data Integrity)

SwiftPath บังคับใช้มาตรฐานความปลอดภัยระดับรัดกุมสูงสุด (Hardened Architecture)

### 1. การรักษาความสมบูรณ์ทางการเงิน (Financial Integrity)
*   **Optimistic Locking (Version Control):** ป้องกันปัญหา Race Condition เมื่อมีการแก้ไขยอดเงินพร้อมกัน (เช่น เติมเงินขณะกำลังจ่ายเงิน) โดยใช้ฟิลด์ `version` ในการทำ Check-and-Set
*   **Idempotency Safety Net:** ระบบ Stripe Webhook ตรวจสอบ `referenceId` ภายใน Atomic Transaction เพื่อป้องกันการเติมเงินซ้ำซ้อน 100%
*   **Decimal Precision:** ใช้ประเภทข้อมูล Decimal สำหรับยอดเงินทั้งหมดเพื่อป้องกันปัญหา Precision Loss ระดับการเงิน

### 2. การป้องกันการโจมตี (Attack Mitigation)
*   **Strict Rate Limiting:** บังคับใช้ `ThrottlerGuard` บนทุก Endpoint ที่มีความเสี่ยง รวมถึงระบบ Firebase Phone OTP และ Social Login (จำกัดสูงสุด 5-20 ครั้งต่อนาที)
*   **SHA-256 OTP Hashing:** รหัส OTP จะถูก Hash ก่อนจัดเก็บลงฐานข้อมูล ป้องกันการรั่วไหลแม้ฐานข้อมูลจะถูกเข้าถึงโดยไม่ได้รับอนุญาต
*   **JWT Multi-layer Validation:** ตรวจสอบทั้งความถูกต้อง (Sign), วันหมดอายุ (Exp), และสิทธิ์ (Role) ในทุกระดับ Middleware และ Socket Gateway

### 3. Middleware & Rendering Stability
*   **Infinite Loop Prevention:** ระบบ Middleware อัจฉริยะที่จัดการ Role-based Redirection ได้อย่างถูกต้อง รวมถึงกรณีบัญชี Admin ป้องกันอาการ Redirect Loop
*   **CLS Optimization (Hydration Guard):** แก้ไขปัญหาหน้าจอขาวและ Cumulative Layout Shift (CLS) โดยการใช้ Skeleton Loading ตั้งแต่ระดับ SSR (Server-Side Rendering)
*   **Clean Session Management:** ฟังก์ชัน `clearBadCookies` ที่ล้างเซสชันออกอย่างหมดจดในทุกระดับ Subdomain เมื่อมีการข้ามสิทธิ์การใช้งาน

---

## 📦 โครงสร้างโปรเจกต์ (Project Structure)

```text
d:/Project
├── backend                # NestJS API Server
│   ├── prisma             # Database Schema & Migrations
│   └── src                # Business Logic (Modules, Services, Controllers)
├── frontend               # Next.js Application
│   ├── app                # Next.js App Router (Subdomain-based folders)
│   ├── components         # Reusable UI Components (Maps, Charts)
│   └── middleware.ts      # Core Routing & Security Middleware
└── docker-compose.yml     # Infrastructure (PostgreSQL Container)
```

---

## 🛠️ ขั้นตอนการติดตั้งและเริ่มใช้งาน (Setup Guide)

### 1. การเตรียมสภาพแวดล้อม
*   ติดตั้ง **Node.js v20+** และ **Docker Desktop**
*   ตั้งค่าไฟล์ `hosts` ตามคู่มือด้านบน

### 2. การตั้งค่า Backend
```bash
cd backend
npm install
# สร้างไฟล์ .env และระบุ DATABASE_URL, STRIPE_SECRET_KEY, JWT_SECRET
npx prisma generate
npx prisma db push
npm run start:dev
```

### 3. การตั้งค่า Frontend
```bash
cd frontend
npm install
# สร้างไฟล์ .env.local และระบุ NEXT_PUBLIC_API_URL, NEXT_PUBLIC_BASE_DOMAIN
npm run dev
```

---

*Engineered for scale. Designed for speed. Secured for enterprise.*