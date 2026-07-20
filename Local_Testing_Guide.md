# คู่มือรันโปรเจกต์และทดสอบระบบด้วยตัวเอง (Local Setup & Testing Guide)

คู่มือนี้รวบรวมคำสั่งพื้นฐานทั้งหมดที่คุณต้องใช้ในการ "เปิดรันโปรเจกต์ SwiftPath" ขึ้นมาทดสอบบนเครื่องตัวเอง รวมถึงวิธีแก้ปัญหา (Troubleshooting) ทีละสเต็ปแบบจับมือทำ

---

## 🚀 1. การเตรียมตัวและสิ่งที่ต้องเปิดก่อนเริ่มเทส

ก่อนจะเทสเว็บได้ ต้องเปิด **3 ส่วนหลัก** ให้ทำงานพร้อมกันเสมอ:

### ส่วนที่ 1: ระบบฐานข้อมูล (Database - PostgreSQL)
ระบบใช้ฐานข้อมูล PostgreSQL ที่รันอยู่ใน Docker
1. เปิดโปรแกรม **Docker Desktop** บนเครื่องคอมพิวเตอร์ของคุณ
2. รอจนกว่าไอคอน Docker จะขึ้นสถานะสีเขียว (Running)
3. รันคำสั่งเปิดฐานข้อมูลใน Terminal (PowerShell):
   ```bash
   docker start logistics_db
   ```
   > [!TIP]
   > ถ้าพิมพ์คำสั่งนี้แล้วขึ้นว่า `Error response from daemon: No such container: logistics_db` แปลว่าคอนเทนเนอร์อาจจะถูกลบไป ให้ใช้คำสั่ง `docker-compose up -d` ในโฟลเดอร์โปรเจกต์แทน

### ส่วนที่ 2: เซิร์ฟเวอร์หลังบ้าน (Backend - NestJS)
ระบบ API, WebSocket และฐานข้อมูลจะถูกประมวลผลที่นี่
1. เปิด Terminal ใหม่ (หรือแท็บใหม่ใน VS Code)
2. เข้าไปที่โฟลเดอร์ Backend:
   ```bash
   cd d:\Project\backend
   ```
3. สั่งรัน Backend (พอร์ต 8000 และ 4000):
   ```bash
   npm run start:dev
   ```
   *รอจนกว่าในหน้าจอจะขึ้นคำว่า `Nest application successfully started`*

### ส่วนที่ 3: ระบบหน้าเว็บ (Frontend - Next.js)
1. เปิด Terminal ใหม่อีก 1 แท็บ
2. เข้าไปที่โฟลเดอร์ Frontend:
   ```bash
   cd d:\Project\frontend
   ```
3. สั่งรัน Frontend (พอร์ต 3000):
   ```bash
   npm run dev
   ```
   *รอจนกว่าจะขึ้นคำว่า `Ready in ... ms`*

---

## 🌐 2. การเข้าสู่หน้าเว็บพอร์ทัลต่างๆ (Subdomains)

โปรเจกต์นี้ใช้ระบบ **Subdomain Routing** เพื่อแยกหน้าจอของแต่ละ Role ให้เข้าผ่าน URL เหล่านี้:

- **หน้าร้านค้า (Merchant):** [http://store.localhost:3000](http://store.localhost:3000)
- **หน้าคนขับ (Driver):** [http://fleet.localhost:3000](http://fleet.localhost:3000)
- **หน้าลูกค้า/หน้าหลัก (Customer/Tracking):** [http://app.localhost:3000](http://app.localhost:3000) หรือ [http://localhost:3000](http://localhost:3000)

---

## 🛠️ 3. รวมปัญหาที่เจอบ่อยและ "คำสั่ง" แก้ปัญหา

หากตอนเทสระบบเกิด Error ลองตรวจสอบอาการด้านล่างและพิมพ์คำสั่งแก้ตามนี้:

### ปัญหาที่ 1: เปิดเว็บแล้วขึ้น Error "PrismaClientInitializationError: Can't reach database server"
* **สาเหตุ:** ลืมเปิด Docker หรือฐานข้อมูลยังไม่รัน ทำให้ Backend ต่อ Database ไม่ได้ (หรือ Error 500)
* **วิธีแก้:** 
  1. ไปที่ Terminal 
  2. พิมพ์คำสั่งเช็กสถานะ Docker:
     ```bash
     docker ps
     ```
  3. ถ้าไม่เจอ `logistics_db` ให้สั่งรัน:
     ```bash
     docker start logistics_db
     ```
  4. แล้วกลับไปที่แท็บรัน Backend ปิดแล้วรัน `npm run start:dev` ใหม่อีกครั้ง

### ปัญหาที่ 2: สร้างออเดอร์ หรือ ล็อกอิน แล้วขึ้น "Table does not exist" หรือ Error 500
* **สาเหตุ:** มีการเปลี่ยนแปลงโครงสร้างตาราง (Schema) แต่ลืมอัปเดตลง Database ในเครื่อง
* **วิธีแก้:**
  1. ไปที่โฟลเดอร์ Backend (`cd d:\Project\backend`)
  2. สั่งเชื่อมโครงสร้าง (Push Schema) ลง Database:
     ```bash
     npx prisma db push
     ```
  3. สั่งสร้าง Client โค้ดใหม่:
     ```bash
     npx prisma generate
     ```

### ปัญหาที่ 3: Backend หรือ Frontend รันไม่ได้ ติด Error "EADDRINUSE: port ... is already in use"
* **สาเหตุ:** มีโปรแกรมอื่น (หรือ Terminal แท็บอื่น) แอบรันพอร์ต 3000 หรือ 8000 ค้างเอาไว้อยู่
* **วิธีแก้ (สำหรับ Windows):**
  1. ดูว่าใครใช้พอร์ต 3000 อยู่ (เปลี่ยนตัวเลขเป็น 8000 ถ้ารัน Backend ไม่ได้):
     ```powershell
     netstat -ano | findstr :3000
     ```
     *(ระบบจะแสดงตัวเลข PID มาให้ดูท้ายสุดของบรรทัด เช่น `15204`)*
  2. สั่ง Kill โปรแกรมนั้นทิ้ง (สมมติว่า PID คือ 15204):
     ```powershell
     taskkill /PID 15204 /F
     ```
  3. สั่งรัน `npm run dev` หรือ `npm run start:dev` ใหม่อีกครั้ง

### ปัญหาที่ 4: ล็อกอิน (Login) ด้วย Account ทดสอบไม่ได้ (ขึ้นรหัสไม่ถูกต้อง หรือต้องรอ OTP)
* **สาเหตุ:** ข้อมูลใน Database อาจจะโดนรีเซ็ต หรือบัญชียังไม่ได้ Verify ผ่าน OTP
* **วิธีแก้:** เราสามารถข้ามขั้นตอน OTP และ Force Verify ผู้ใช้ใน Database โดยตรงผ่านคำสั่ง SQL ใน Docker:
  ```powershell
  echo "UPDATE ""Merchant"" SET ""isVerified""=true;" | docker exec -i logistics_db psql -U phithak -d logistics_v1
  echo "UPDATE ""Customer"" SET ""isVerified""=true;" | docker exec -i logistics_db psql -U phithak -d logistics_v1
  echo "UPDATE ""Driver"" SET ""isVerified""=true;" | docker exec -i logistics_db psql -U phithak -d logistics_v1
  ```

### ปัญหาที่ 5: แชท (Chat) หรือ GPS ไม่เด้งแบบ Real-time
* **สาเหตุ:** WebSocket อาจจะมีปัญหา หรือรหัส Token อ่านไม่ได้ (เช่น ปัญหา HttpOnly cookie ที่เคยแก้ไป) หรือ พอร์ต 4000 (Socket Port) โดนบล็อก
* **วิธีเช็ก:** 
  1. กด `F12` ในเบราว์เซอร์ -> ไปที่แท็บ **Console** 
  2. ดูว่ามี Error พิมพ์ข้อความสีแดงที่เกี่ยวกับ `socket.io` หรือ `CORS` ไหม
  3. หากมีปัญหา ให้เช็กว่า Backend รันอยู่ปกติไหม และไม่มี Error พ่นออกมาใน Terminal ของ Backend

---

> [!IMPORTANT]
> **เคล็ดลับสำหรับการเทส UI:** หากต้องการเทส Flow ของแอปแบบสมบูรณ์ ให้ใช้การเปิด Chrome หรือ Edge สองหน้าต่างแบบ "ต่าง Profile" หรือหน้าต่างหนึ่งเป็นโหมดปกติ อีกหน้าต่างหนึ่งเป็นโหมดส่วนตัว (Incognito) 
>
> เช่น:
> - หน้าต่างโหมดปกติ: เข้า `store.localhost:3000` (ฝั่งร้านค้า สร้างออเดอร์)
> - หน้าต่าง Incognito: เข้า `fleet.localhost:3000` (ฝั่งคนขับ กดรับงานและดูแชทเด้งอัปเดต)
