# บันทึกการตัดสินใจทางสถาปัตยกรรม 002: ขอบเขต Isolation และ Idempotency Keys ในกระบวนการทางการเงินของ Stripe

## สถานะ

อนุมัติแล้ว

## วันที่

2026-05-16

## บริบทของปัญหา

ระบบกระเป๋าเงินของ SwiftPath เชื่อมต่อกับ Stripe Payments สำหรับการเติมเงิน สถาปัตยกรรมการเชื่อมต่อนี้ใช้รูปแบบการชำระเงินที่แนะนำโดย Stripe แบบ Webhook-based: frontend เริ่ม `PaymentIntent`, Stripe ประมวลผลการชำระเงินแบบ async, และ backend ของแพลตฟอร์มรับ Webhook event `payment_intent.succeeded` เพื่อทำการ credit ยอดเงิน

ข้อกำหนดการส่ง Webhook ของ Stripe ระบุ **at-least-once delivery semantics** หมายความว่าภายใต้เงื่อนไข network partition หรือความล้มเหลวของ infrastructure ชั่วคราว event `payment_intent.succeeded` เดียวกันอาจถูกส่งซ้ำหลายครั้ง หากไม่มีการป้องกัน idempotency การส่งซ้ำแต่ละครั้งจะทำการ credit ยอดเงินอิสระ ส่งผลให้เกิดการเพิ่มยอดเงินที่ไม่ได้รับอนุญาต — ซึ่งเป็นความล้มเหลวด้านความสมบูรณ์ทางการเงินที่วิกฤต

ความกังวลที่สองเกิดขึ้นจากภาวะพร้อมกัน: ถ้าการส่งซ้ำสองครั้งของ event เดียวกันมาถึงพร้อมกัน (ภายในมิลลิวินาทีเดียวกัน) รูปแบบ check-then-write ที่ครอบคลุม transaction ฐานข้อมูลสองรายการแยกกันจะมีช่องโหว่ TOCTOU (Time-of-Check/Time-of-Use) race condition ทั้งสอง request อาจผ่านการตรวจสอบ uniqueness ก่อนที่ฝ่ายใดจะ commit การ write ส่งผลให้เกิดการ credit สองครั้งสำเร็จ

## การตัดสินใจ

ระบบใช้กลยุทธ์ **Database Transaction Boundary พร้อม Unique Constraint Application** การตรวจสอบ idempotency และการ write ยอดเงินทั้งหมดอยู่ร่วมกันภายใน `prisma.$transaction` atomic block เดียว ตาราง `Transaction` บังคับใช้ constraint `@unique` บนคอลัมน์ `referenceId` ซึ่งบันทึก Stripe PaymentIntent ID ไว้

การ implement ใน `stripe.service.ts` ดำเนินการดังนี้:

```typescript
await this.prisma.$transaction(async (tx) => {
  // ตรวจสอบ idempotency ภายในขอบเขต transaction — กำจัดช่องว่าง TOCTOU
  const existing = await tx.transaction.findUnique({
    where: { referenceId: paymentIntent.id },
  });
  if (existing) {
    console.log(`ข้ามการเติมเงิน (idempotent): ${paymentIntent.id}`);
    return; // ไม่มีการ write ที่ commit — transaction rollback อย่างสะอาด
  }

  // Credit ยอดเงินพร้อม increment version สำหรับ Optimistic Locking
  await tx[userRole.toLowerCase()].update({
    where: { id: userId },
    data: {
      balance: { increment: amount },
      version: { increment: 1 },
    },
  });

  // บันทึก Transaction โดยใช้ referenceId เป็น idempotency anchor
  await tx.transaction.create({
    data: {
      amount,
      type: 'CREDIT',
      referenceId: paymentIntent.id, // @unique — ตาข่ายความปลอดภัยระดับฐานข้อมูล
      userId,
      userRole,
    },
  });
});
```

constraint ระดับ schema ทำหน้าที่เป็นชั้นป้องกันเชิงลึก: แม้ว่า transaction พร้อมกันสองรายการจะผ่านการตรวจสอบ `findUnique` ระดับแอปพลิเคชันก่อนที่ฝ่ายใดจะ commit ฐานข้อมูลจะปฏิเสธการเรียก `create` ของรายการที่สอง ด้วยการละเมิด unique constraint ทำให้ transaction ที่สอง rollback แบบ atomic

## ทางเลือกที่ได้พิจารณา

**Application-Level Seen-Event Cache (Redis):** Cache แบบกระจายที่ key ด้วย PaymentIntent ID จะให้การ lookup idempotency ที่เร็วกว่ามิลลิวินาที อย่างไรก็ตาม วิธีนี้เพิ่ม dependency ต่อความพร้อมใช้งานของ cache และเพิ่มความเสี่ยงด้านการ synchronize ระหว่าง cache กับฐานข้อมูล หาก cache entry ถูกเอาออกหรือ cache instance ไม่พร้อมใช้งาน การป้องกันจะหายไปทั้งหมด constraint ในฐานข้อมูลเชิงสัมพันธ์เป็นแบบถาวรและไม่มีเงื่อนไข

**Stripe Idempotency Keys บนการสร้าง Payment:** Stripe รองรับ idempotency key บน API request จากแพลตฟอร์มไปยัง Stripe แต่สิ่งนี้ไม่ได้แก้ปัญหาการส่ง Webhook ซ้ำขาเข้า ซึ่งมีต้นกำเนิดจาก infrastructure ของ Stripe ไม่ใช่จาก request ของแพลตฟอร์ม

**ตาราง Deduplication แยกต่างหาก:** การมีตาราง `ProcessedWebhookEvent` แยกต่างหากจาก `Transaction` ได้รับการพิจารณา แต่ถูกปฏิเสธเนื่องจากเป็นความซ้ำซ้อนทางสถาปัตยกรรม ฟิลด์ `Transaction.referenceId` ทำหน้าที่ทั้งเป็น business record และ idempotency anchor หลีกเลี่ยงภาระการดูแลสอง table ที่มี state ที่สัมพันธ์กัน

## ผลที่ตามมา

### ผลเชิงบวก

- การ credit ยอดเงินซ้ำซ้อนเป็นไปไม่ได้ในระดับโครงสร้าง constraint ฐานข้อมูลให้การรับประกันที่รอดพ้นจากการรีสตาร์ทแอปพลิเคชัน, deployment โค้ด, และภาวะพร้อมกันสูง
- ฟิลด์ `referenceId` ให้ audit trail ที่สมบูรณ์ เชื่อมการเปลี่ยนแปลงยอดเงินทุกรายการกับ Stripe PaymentIntent ต้นกำเนิด ตอบสนองข้อกำหนดด้านความสามารถในการตรวจสอบทางการเงิน
- Infrastructure retry ของ Stripe ได้รับการตอบกลับ `200 OK` สำหรับ event ซ้ำ (service คืน `{ received: true }` โดยไม่ throw) ทำให้ Stripe หยุดส่งซ้ำ

### ผลเชิงลบ

- ทุกครั้งที่ประมวลผล Webhook จะเปิด database transaction ข้าม table หลายตาราง ครอบคลุม `Transaction` table และหนึ่งใน table ยอดเงินของแต่ละ Role (`customer`, `merchant`, `driver`) ในสถานการณ์ที่มี Webhook volume สูงมาก สิ่งนี้จะเพิ่ม connection pool pressure ที่วัดได้ ในระดับปฏิบัติการที่คาดหวัง overhead นี้มีน้อยมาก
- ขอบเขต transaction ป้องกันการมองเห็น state บางส่วน: ถ้าการ credit ยอดเงินสำเร็จแต่ `transaction.create` ล้มเหลว (ด้วยเหตุผลใดก็ตามนอกจาก unique constraint) การดำเนินการทั้งหมดจะ rollback นี่คือพฤติกรรมที่ถูกต้อง แต่หมายความว่า Stripe จะ retry event ทำให้ระบบต้องประมวลผลอีกครั้ง

## เอกสารอ้างอิง

- `backend/src/stripe/stripe.service.ts` — Webhook handler และการ implement `processTopUp` ทั้งหมด
- `backend/prisma/schema.prisma` — นิยาม constraint `Transaction.referenceId @unique`
- `backend/src/stripe/stripe.service.spec.ts` — Test specification สำหรับ concurrency fault-tolerance
- ADR-001: Edge-Level Rate Limiting สำหรับ Authentication Endpoints ที่มีความเสี่ยงสูง
- ADR-003: Optimistic Concurrency Control สำหรับการดำเนินการกระเป๋าเงินแบบ Multi-Tenant
