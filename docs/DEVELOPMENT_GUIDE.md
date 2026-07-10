# คู่มือการติดตั้งและพัฒนาโปรเจกต์ SwiftPath (Development & Setup Guide)

เอกสารนี้รวบรวมขั้นตอนทั้งหมดที่จำเป็นสำหรับการตั้งค่าและเปิดใช้งานระบบ SwiftPath ทั้งหมดในเครื่อง (Local Environment) สำหรับให้คุณสามารถทำตามขั้นตอนได้อย่างสะดวกในอนาคต

---

## 📋 1. สิ่งที่ต้องเตรียม (Prerequisites)

ก่อนเริ่มรันโปรเจกต์ ตรวจสอบว่าเครื่องของคุณได้ติดตั้งเครื่องมือเหล่านี้เรียบร้อยแล้ว:
* **Node.js**: เวอร์ชั่น 20 ขึ้นไป
* **Docker Desktop**: สำหรับรันฐานข้อมูล PostgreSQL
* **Hosts File Configuration**: ระบบพอร์ทัลใช้การแยก Subdomain ดังนั้นต้องตั้งค่าไฟล์ hosts ในเครื่องของคุณก่อน
  * **ที่อยู่ไฟล์ (Windows)**: `C:\Windows\System32\drivers\etc\hosts` (ต้องเปิดด้วยสิทธิ์ Administrator)
  * **บรรทัดที่ต้องเพิ่มเข้าไป**:
    ```text
    127.0.0.1  app.localhost
    127.0.0.1  store.localhost
    127.0.0.1  fleet.localhost
    ```

---

## 🗄️ 2. การเริ่มต้นฐานข้อมูล (Database Setup)

ระบบใช้ PostgreSQL ใน Docker Container ในการจัดการข้อมูล:

1. **เปิดใช้งาน Docker Container**:
   เปิด Terminal ที่ Root Directory (`d:/Project`) จากนั้นรันคำสั่งเพื่อเปิดฐานข้อมูลในโหมด Background:
   ```bash
   docker compose up -d
   ```
2. **ตรวจสอบการทำงานของ Database**:
   ```bash
   docker ps
   ```
   *จะเห็นคอนเทนเนอร์ชื่อ `logistics_db` ทำงานอยู่บนพอร์ต `5432`*

---

## ⚙️ 3. การเตรียมความพร้อมฝั่ง Backend

ย้ายเข้าสู่ไดเรกทอรี `backend` เพื่อซิงก์ฐานข้อมูลและสร้างข้อมูลเริ่มต้น:

```bash
cd backend
```

1. **ซิงก์โครงสร้างฐานข้อมูล (Prisma Sync)**:
   รันคำสั่งด้านล่างเพื่อสร้างตารางทั้งหมดใน PostgreSQL ให้ตรงกับ Prisma Schema:
   ```bash
   npx prisma db push
   ```
2. **สร้างข้อมูล Admin เริ่มต้น (Seeding)**:
   รันสคริปต์สำหรับการลงทะเบียนบัญชี Admin ตัวแรกเข้าฐานข้อมูล:
   ```bash
   npx ts-node prisma/seed-admin.ts
   ```
    * **บัญชีผู้ดูแลระบบที่จะถูกสร้าง (อิงตามที่กำหนดใน .env)**:
      * **Email**: `<ADMIN_SEED_EMAIL>` (เช่น `admin@swiftpath.com`)
      * **Password**: `<ADMIN_SEED_PASSWORD>`


---

## 🚀 4. การเปิดใช้งานเซิร์ฟเวอร์ (Running the Servers)

ในการใช้งานระบบแบบเต็มรูปแบบ คุณจำเป็นต้องเปิดโปรแกรมเซิร์ฟเวอร์ทั้งสองฝั่ง:

### การรัน Backend (NestJS)
1. เปิด Terminal ใหม่แล้วเข้าไปยังโฟลเดอร์ `backend`
2. รันเซิร์ฟเวอร์ด้วยคำสั่ง:
   ```bash
   npm run start:dev
   ```
   *ระบบ Backend จะทำงานบนพอร์ต [http://localhost:8000](http://localhost:8000)*

### การรัน Frontend (Next.js)
1. เปิด Terminal อีกหน้าต่างหนึ่งแล้วเข้าไปยังโฟลเดอร์ `frontend`
2. รันเว็บแอปพลิเคชันด้วยคำสั่ง:
   ```bash
   npm run dev
   ```
   *ระบบ Frontend จะทำงานบนพอร์ต [http://localhost:3000](http://localhost:3000)*

---

## 🔗 5. ช่องทางการเข้าถึงพอร์ทัลต่าง ๆ (Portals Access URLs)

หลังจากเริ่มระบบเรียบร้อยแล้ว คุณสามารถเข้าใช้งานแต่ละหน้าเว็บตามบทยาทต่าง ๆ ได้ดังนี้:

| พอร์ทัล (Portal) | ลิงก์สำหรับเข้าใช้งาน (URL) | บทบาทที่ได้รับอนุญาต | หน้าที่หลัก |
| :--- | :--- | :--- | :--- |
| **Root / Admin** | [http://localhost:3000/admin/login](http://localhost:3000/admin/login) | Admin | หน้าแดชบอร์ดควบคุมระบบกลาง และจัดการผู้ใช้ |
| **Customer** | [http://app.localhost:3000](http://app.localhost:3000) | Customer | ลูกค้าเข้าสั่งงาน จัดการกระเป๋าเงิน และติดตามพัสดุ |
| **Merchant** | [http://store.localhost:3000](http://store.localhost:3000) | Merchant | ร้านค้าสร้างออเดอร์ คำนวณราคาจัดส่ง และดูรายงาน |
| **Driver** | [http://fleet.localhost:3000](http://fleet.localhost:3000) | Driver | คนขับรับออเดอร์ ส่งอัปเดตพิกัดตำแหน่ง และเก็บสะสมรายได้ |

---

## 💡 6. คำแนะนำเพิ่มเติม: การตั้งค่าจำกัดแรมของ WSL2 (Windows Option)

หากคุณใช้ Windows และพบว่า Docker หรือ WSL2 (`vmmem`) แย่งหน่วยความจำแรมไปมากเกินไป คุณสามารถจำกัดการใช้แรมของระบบเหล่านี้ได้ด้วยวิธีนี้:

1. สร้างไฟล์ชื่อ `.wslconfig` ไว้ที่โฟลเดอร์โปรไฟล์ผู้ใช้ของคุณ เช่น `C:\Users\<ชื่อผู้ใช้ของคุณ>\.wslconfig`
2. ใส่ข้อมูล config ด้านล่างลงไปเพื่อจำกัดแรมที่ WSL2 จะจองไปใช้งาน (เช่น จำกัดไว้ที่ 4GB):
   ```ini
   [wsl2]
   memory=4GB
   ```
3. เปิด Command Prompt หรือ PowerShell แล้วรันคำสั่งเพื่อรีสตาร์ท WSL:
   ```bash
   wsl --shutdown
   ```
   *(การตั้งค่านี้จะเริ่มมีผลในทันทีและถาวร ช่วยให้คอมพิวเตอร์ของคุณมีแรมเหลือสำหรับรันโปรแกรมอื่น ๆ ได้อย่างลื่นไหล)*
