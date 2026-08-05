# คู่มือรันโปรเจกต์และทดสอบระบบด้วยตัวเอง (Local Setup & Testing Guide)

คู่มือนี้รวบรวมคำสั่งพื้นฐานทั้งหมดที่คุณต้องใช้ในการ "เปิดรันโปรเจกต์ SwiftPath" ขึ้นมาทดสอบบนเครื่องตัวเอง รวมถึงวิธีการให้เพื่อนร่วมทีมเชื่อมต่อ และวิธีแก้ปัญหาทีละสเต็ปแบบจับมือทำ

---

## 🚀 1. การเตรียมตัวและสิ่งที่ต้องเปิดก่อนเริ่มเทส

ก่อนจะเทสเว็บได้ ต้องเปิด **3 ส่วนหลัก** ให้ทำงานพร้อมกันเสมอ:

### ส่วนที่ 1: ระบบฐานข้อมูล (Database - PostgreSQL)
ระบบใช้ฐานข้อมูล PostgreSQL ที่รันอยู่ใน Docker
1. เปิดโปรแกรม **Docker Desktop** บนเครื่องคอมพิวเตอร์ของคุณ
2. รันคำสั่งเปิดฐานข้อมูลใน Terminal:
   ```bash
   docker start logistics_db
   ```
   *(หรือถ้ายังไม่เคยสร้าง ให้ใช้ `docker-compose up -d`)*

### ส่วนที่ 2: เซิร์ฟเวอร์หลังบ้าน (Backend - NestJS)
1. เข้าไปที่โฟลเดอร์ Backend:
   ```bash
   cd backend
   ```
2. สั่งรัน Backend (พอร์ต 8000 และ 4000):
   ```bash
   npm run start:dev
   ```

### ส่วนที่ 3: ระบบหน้าเว็บ (Frontend - Next.js)
1. เข้าไปที่โฟลเดอร์ Frontend:
   ```bash
   cd frontend
   ```
2. สั่งรัน Frontend (พอร์ต 3000):
   ```bash
   npm run dev
   ```

---

## 🌐 2. การเข้าสู่หน้าเว็บพอร์ทัลต่างๆ (Subdomains)

โปรเจกต์นี้ใช้ระบบ **Subdomain Routing** เพื่อแยกหน้าจอของแต่ละ Role ให้เข้าผ่าน URL เหล่านี้สำหรับการทดสอบในเครื่องตัวเอง:

- 👤 **หน้าลูกค้า/หน้าหลัก (Customer/Tracking):** [http://app.localhost:3000](http://app.localhost:3000) 
- 🏪 **หน้าร้านค้า (Merchant):** [http://store.localhost:3000](http://store.localhost:3000)
- 🚗 **หน้าคนขับ (Driver):** [http://fleet.localhost:3000](http://fleet.localhost:3000)

---

## 🤝 3. วิธีการให้เพื่อนร่วมทีมเข้ามาร่วมทดสอบ (Team Collaboration)

หากคุณต้องการรัน Backend และ Database ไว้ที่เครื่องคุณ แล้วให้เพื่อนรันแค่ Frontend:

1. **ฝั่งคุณ (Host):** เปิด Terminal อีก 1 หน้าต่าง (พอร์ต 8000) แล้วพิมพ์คำสั่ง:
   ```bash
   npx localtunnel --port 8000
   ```
   *ส่งลิงก์ที่ได้ (เช่น `https://....loca.lt`) ไปให้เพื่อน*

2. **ฝั่งเพื่อน (Frontend):** ให้เพื่อนเข้าไปตั้งค่าไฟล์ `.env.local` ฝั่ง Frontend โดยใส่ลิงก์ของคุณลงไป
   ```env
   NEXT_PUBLIC_API_URL=https://(ลิงก์จากคุณ).loca.lt
   ```
3. เพื่อนรัน `npm run dev` แล้วเข้าหน้าเว็บตาม Subdomains ปกติ (เช่น `http://app.localhost:3000`) ระบบก็จะดึงข้อมูลจากเครื่องคุณไปแสดงทันที!

---

## 🗄️ 4. รวมคำสั่งจัดการ Database (Prisma)

คำสั่งเหล่านี้ใช้ในโฟลเดอร์ `backend` เท่านั้น:

| คำสั่ง | ใช้ตอนไหน? |
|--------|------------|
| `npx prisma studio` | **(แนะนำ!)** ใช้เปิดหน้าเว็บ `http://localhost:5555` ดู/แก้ไขข้อมูลใน Database แบบตาราง Excel |
| `npx prisma generate` | ใช้เมื่อมีการ **แก้ไขไฟล์ `schema.prisma`** เพื่อให้ VS Code (IntelliSense) รู้จักตารางใหม่ๆ |
| `npx prisma db push` | ใช้เมื่อต้องการ **ส่งโครงสร้างไปสร้างใน Database จริง** |
| `npx prisma migrate reset` | ใช้เมื่อต้องการ **ลบข้อมูลทั้งหมดทิ้ง** และรีเซ็ตโครงสร้างฐานข้อมูลใหม่ |

---

## 🛠️ 5. รวมปัญหาที่เจอบ่อยและ "คำสั่ง" แก้ปัญหา

### ปัญหาที่ 1: เปิดเว็บแล้วขึ้น Error "PrismaClientInitializationError: Can't reach database server"
* **วิธีแก้:** เช็ก Docker ว่าเปิดอยู่หรือไม่ หากยังไม่เปิดให้รัน `docker start logistics_db` แล้ว Restart Backend

### ปัญหาที่ 2: สร้างออเดอร์ หรือ ล็อกอิน แล้วขึ้น "Table does not exist" หรือ Error 500
* **วิธีแก้:** ไปที่โฟลเดอร์ Backend แล้วรัน `npx prisma db push` ตามด้วย `npx prisma generate`

### ปัญหาที่ 3: Backend หรือ Frontend รันไม่ได้ ติด Error "EADDRINUSE: port ... is already in use"
* **วิธีแก้ (สำหรับ Windows):**
  1. ดูว่าใครใช้พอร์ต 3000 อยู่: `netstat -ano | findstr :3000`
  2. สั่ง Kill โปรแกรมนั้นทิ้ง: `taskkill /PID (เลขPID) /F`

### ปัญหาที่ 4: ล็อกอิน (Login) แล้วต้องรอ OTP แต่เทสไม่ได้
* **วิธีแก้:** สามารถ Force Verify ผู้ใช้ใน Database โดยตรงผ่านคำสั่ง SQL:
  ```powershell
  echo "UPDATE ""Merchant"" SET ""isVerified""=true;" | docker exec -i logistics_db psql -U phithak -d logistics_v1
  echo "UPDATE ""Customer"" SET ""isVerified""=true;" | docker exec -i logistics_db psql -U phithak -d logistics_v1
  echo "UPDATE ""Driver"" SET ""isVerified""=true;" | docker exec -i logistics_db psql -U phithak -d logistics_v1
  ```

---

> [!IMPORTANT]
> **เคล็ดลับสำหรับการเทส UI:** หากต้องการเทส Flow ของแอปแบบสมบูรณ์ ให้ใช้การเปิด Chrome หรือ Edge สองหน้าต่างแบบ "ต่าง Profile" หรือหน้าต่างหนึ่งเป็นโหมดปกติ อีกหน้าต่างหนึ่งเป็นโหมดส่วนตัว (Incognito) 
>
> เช่น:
> - หน้าต่างโหมดปกติ: เข้า `store.localhost:3000` (ฝั่งร้านค้า สร้างออเดอร์)
> - หน้าต่าง Incognito: เข้า `fleet.localhost:3000` (ฝั่งคนขับ กดรับงานและดูแชทเด้งอัปเดต)
