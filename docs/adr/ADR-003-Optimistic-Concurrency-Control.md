# บันทึกการตัดสินใจทางสถาปัตยกรรม 003: Optimistic Concurrency Control สำหรับการดำเนินการกระเป๋าเงินแบบ Multi-Tenant

## สถานะ

อนุมัติแล้ว

## วันที่

2026-05-16

## บริบทของปัญหา

SwiftPath ดูแลระบบกระเป๋าเงินฝังตัวสำหรับผู้ใช้ 3 ประเภท ได้แก่ Customer, Merchant, และ Driver ยอดเงินของแต่ละกระเป๋าคือฟิลด์ `Decimal` ที่แก้ไขได้บน model ฐานข้อมูลของตัวเอง การแก้ไขยอดเงินเกิดขึ้นผ่านสองช่องทางที่เป็นอิสระจากกัน:

1. **ช่องทาง Credit:** Stripe Webhook events ทำให้เกิดการ `increment` ยอดเงิน ช่องทางนี้ถูกเริ่มโดยปัจจัยภายนอกและมาถึงแบบ async
2. **ช่องทาง Debit:** การประมวลผลการชำระเงินออเดอร์ debit กระเป๋าของ Merchant เมื่อมีการวางออเดอร์ ช่องทางนี้ถูกเริ่มโดย action ของผู้ใช้ในพอร์ทัล Merchant

ภายใต้โหลดพร้อมกัน เช่น Webhook top-up มาถึงในมิลลิวินาทีเดียวกับการวางออเดอร์ database transaction สองรายการแยกกันอาจอ่านค่า `balance` เดียวกันก่อนที่ฝ่ายใดจะ commit การ write หากไม่มีการควบคุม concurrency การ write ที่ commit เป็นอันดับสองจะเขียนทับการ write อันดับแรกโดยไม่ส่งเสียงเตือน ทำให้แพลตฟอร์มสูญเสียการแก้ไขทางการเงินทั้งรายการ (lost update anomaly)

คำถามทางวิศวกรรมคือควรใช้กลไก concurrency control แบบใด ภายใต้ข้อจำกัดปัจจุบันของแพลตฟอร์ม: deployment แบบ single-region, single-database-instance ที่มี workload อ่าน/เขียนปะปนกัน

## การตัดสินใจ

ระบบใช้ **Optimistic Concurrency Control (OCC)** ผ่านฟิลด์ `version` ชนิด integer ที่กำหนดในระดับ schema บน model `Customer`, `Merchant`, และ `Driver` การแก้ไขยอดเงินทุกรายการ ไม่ว่าจะเป็น credit หรือ debit ต้อง increment ฟิลด์ `version` พร้อมกับการเปลี่ยนแปลงยอดเงินภายใน `prisma.$transaction` block เดียวกัน

```prisma
model Customer {
  balance  Decimal @default(0)
  version  Int     @default(0)  // ตัวระวังสำหรับ Optimistic Locking
}

model Merchant {
  balance  Decimal @default(0)
  version  Int     @default(0)
}

model Driver {
  balance  Decimal @default(0)
  version  Int     @default(0)
}
```

รูปแบบการ write ใน `stripe.service.ts` แสดงให้เห็นสิ่งนี้:

```typescript
await tx[userRole.toLowerCase()].update({
  where: { id: userId },
  data: {
    balance: { increment: amount },
    version: { increment: 1 },  // ตัวนับ mutation — ติดตามรุ่นของการแก้ไข
  },
});
```

ภายใต้แผนผังนี้ การดำเนินการ `increment` ของ Prisma บน `version` เป็น atomic ในระดับฐานข้อมูล ถ้าสอง transaction พยายาม write พร้อมกัน ฐานข้อมูลจะ serialize ให้ถูกต้อง ฟิลด์ version ทำหน้าที่เป็นตัวนับ audit การแก้ไข ให้ระบบ monitoring ภายนอกตรวจจับรูปแบบ write ที่ผิดปกติ (การกระโดดของ version ที่ไม่คาดคิด)

## ทางเลือกที่ได้พิจารณา

**Pessimistic Locking ผ่าน `SELECT ... FOR UPDATE`:** วิธีนี้จะ acquire exclusive row-level lock ตอนอ่าน blocking การอ่านและเขียนพร้อมกันทั้งหมดบน row จนกว่า transaction จะ commit แม้จะให้การรับประกัน consistency ที่แข็งแกร่งที่สุด แต่ pessimistic locking ลดปริมาณการอ่านภายใต้ concurrency สูง และเพิ่มความเสี่ยง deadlock เมื่อมีการ lock หลาย table ในลำดับการ acquire ที่ไม่สอดคล้องกัน

**Application-Level Mutex (Node.js):** Lock ระดับ process (โดยใช้ library เช่น `async-mutex`) จะ serialize การดำเนินการกระเป๋าเงินภายใน application instance เดียว วิธีนี้ล้มเหลวโดยสิ้นเชิงใน deployment แบบ horizontally-scaled หลาย instance และไม่ให้การป้องกันต่อ request พร้อมกันที่ประมวลผลโดย instance แยกต่างหาก

**Event Sourcing พร้อม Append-Only Ledger:** วิธีนี้จะกำจัดปัญหา lost-update ในระดับโครงสร้าง โดยแทนที่ฟิลด์ยอดเงินที่แก้ไขได้ด้วย event log แบบ immutable แม้จะเหนือกว่าทางสถาปัตยกรรมสำหรับระบบการเงิน volume สูง แต่ complexity overhead ของ event sourcing เกินความต้องการทางวิศวกรรมของ phase ปัจจุบันของแพลตฟอร์ม แนวทางนี้ถูกระบุไว้เป็น migration path ที่แนะนำหากปริมาณ transaction เกิน 10,000 รายการต่อชั่วโมงต่อกระเป๋าเงิน

## ผลที่ตามมา

### ผลเชิงบวก

- การอ่านไม่ต้องการ lock รักษาปริมาณการอ่านเต็มที่ภายใต้การเข้าถึงพร้อมกัน
- ความเสี่ยง deadlock ถูกกำจัดโดยการออกแบบ — ไม่มีการถือ exclusive lock นอกเหนือจากการดำเนินการ atomic increment
- ฟิลด์ `version` ให้ตัวนับ mutation ต่อ entity ที่ระบบ monitoring สามารถใช้ตรวจจับ write anomaly ได้โดยไม่ต้อง query transaction log

### ผลเชิงลบ

- การ implement ปัจจุบันไม่บังคับใช้ `where: { version: expectedVersion }` ใน Prisma `update` call หมายความว่าระบบพึ่งพา atomic `increment` ของฐานข้อมูลแทนการตรวจจับ version mismatch แบบชัดเจน ในสถานการณ์ที่มี write contention สูงมาก การดำเนินการ `increment` จะ serialize อย่างถูกต้องแต่ไม่แสดง conflict error ให้ผู้เรียก ถ้าต้องการการตรวจจับ conflict แบบ explicit (คืน HTTP 409 เมื่อชนกัน) query การ write ต้องขยายให้รวม version predicate ด้วย
- กลยุทธ์นี้ไม่เพียงพอเป็น mechanism เดี่ยวสำหรับการดำเนินการ debit ความถี่สูงที่เริ่มโดย order service แนะนำให้ใช้ retry queue ระดับ application เป็นตัวควบคุมเพิ่มเติมสำหรับช่องทาง debit

## ข้อพิจารณาในอนาคต

หาก SwiftPath scale ไปสู่ deployment แบบ multi-region กระจายตัว แบบจำลอง OCC แบบ single-database ต้องได้รับการประเมินใหม่ ในช่วงเวลานั้น distributed saga pattern หรือ event-driven credit ledger ที่มีการรับประกัน exactly-once delivery ควรได้รับการประเมินเป็นสถาปัตยกรรมทดแทน

## เอกสารอ้างอิง

- `backend/prisma/schema.prisma` — นิยามฟิลด์ `version` บน model ทุกตัวที่มีกระเป๋าเงิน
- `backend/src/stripe/stripe.service.ts` — `version: { increment: 1 }` ใน `processTopUp`
- ADR-002: Isolation Boundary และ Idempotency Keys ใน Stripe Financial Workflows
