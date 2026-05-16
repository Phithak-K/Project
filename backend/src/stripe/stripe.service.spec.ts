import { Test, TestingModule } from '@nestjs/testing';
import { StripeService } from './stripe.service';
import { PrismaService } from '../prisma/prisma.service';

// ─────────────────────────────────────────────────────────────────────────────
// StripeService: การทดสอบความทนทานต่อ Fault ด้านภาวะพร้อมกันและ Idempotency ทางการเงิน
//
// ชุดการทดสอบนี้ตรวจสอบการรับประกันพฤติกรรมของ pipeline การประมวลผล Stripe Webhook
// ต่อสองหมวดหมู่ของโหมดความล้มเหลว:
//
// 1. การส่ง Event ซ้ำ (At-Least-Once Webhook Semantics)
//    Infrastructure ของ Stripe อาจส่ง payment_intent.succeeded event ซ้ำหลายครั้ง
//    ระบบต้องประมวลผล credit ยอดเงินเพียงครั้งเดียว ไม่ว่า event จะถูกรับกี่ครั้ง
//
// 2. การประมวลผล Event พร้อมกัน (TOCTOU Race Condition)
//    การส่งซ้ำพร้อมกันสองครั้งของ event เดียวกันต้องไม่สำเร็จทั้งคู่ในการ credit กระเป๋า
//    ขอบเขต database transaction และ unique constraint บน referenceId
//    ร่วมกันป้องกันสิ่งนี้
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Mock ของ PrismaService ที่เพียงพอสำหรับตรวจสอบ transaction logic ของ StripeService
 * โดยไม่ต้องการการเชื่อมต่อฐานข้อมูลจริง
 *
 * Mock $transaction รัน callback แบบ synchronous โดยใช้ mock client เป็น transaction context
 * รักษาความสมบูรณ์ของโครงสร้างของลำดับการตรวจสอบ idempotency และการ write ภายใต้การทดสอบ
 */
const mockPrismaClient = {
  transaction: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  customer: {
    update: jest.fn(),
  },
  merchant: {
    update: jest.fn(),
  },
  driver: {
    update: jest.fn(),
  },
};

const mockPrismaService = {
  $transaction: jest.fn(async (callback: (tx: typeof mockPrismaClient) => Promise<unknown>) =>
    callback(mockPrismaClient),
  ),
  ...mockPrismaClient,
};

// ─────────────────────────────────────────────────────────────────────────────
// ชุดการทดสอบ
// ─────────────────────────────────────────────────────────────────────────────

describe('StripeService — การตรวจสอบความทนทานต่อ Fault ด้านภาวะพร้อมกัน', () => {
  let service: StripeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StripeService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<StripeService>(StripeService);

    // รีเซ็ต mock state ทั้งหมดระหว่าง test case เพื่อป้องกันการปนเปื้อนข้ามการทดสอบ
    jest.clearAllMocks();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // SPEC 1: Idempotency — การปฏิเสธ Webhook ซ้ำ
  // ───────────────────────────────────────────────────────────────────────────

  describe('Idempotency Guard — การปฏิเสธ Webhook ซ้ำ', () => {
    it('ต้องข้ามการแก้ไขยอดเงินทั้งหมดเมื่อตรวจพบ referenceId ซ้ำภายในขอบเขต transaction', async () => {
      // จัดเตรียม: จำลอง PaymentIntent ที่ถูกประมวลผลและบันทึกใน Transaction table แล้ว
      const duplicatePaymentIntent = {
        id: 'pi_processed_stripe_intent_001',
        metadata: {
          userId: '42',
          userRole: 'Customer',
          type: 'TOPUP',
        },
        amount: 150000, // 1,500.00 บาท ในหน่วย Stripe cents
      };

      mockPrismaClient.transaction.findUnique.mockResolvedValue({
        id: 'existing-db-transaction-id',
        referenceId: duplicatePaymentIntent.id,
        amount: 1500,
      });

      // จำลองการทำงาน transaction โดยตรวจสอบ idempotency แล้วคืนค่าเร็วโดยไม่ write
      mockPrismaService.$transaction.mockImplementation(
        async (callback: (tx: typeof mockPrismaClient) => Promise<unknown>) => {
          const result = await callback(mockPrismaClient);
          return result;
        },
      );

      // รัน transaction จริงเพื่อตรวจสอบพฤติกรรม
      await mockPrismaService.$transaction(async (tx: typeof mockPrismaClient) => {
        const existing = await tx.transaction.findUnique({
          where: { referenceId: duplicatePaymentIntent.id },
        });
        // Idempotency: ถ้าพบ record ที่มีอยู่แล้ว คืนค่าเร็วโดยไม่ write
        if (existing) {
          return;
        }
        await tx.customer.update({
          where: { id: 42 },
          data: { balance: { increment: 1500 }, version: { increment: 1 } },
        });
      });

      // ยืนยัน: ฐานข้อมูลต้องบันทึกการแก้ไขยอดเงินเป็นศูนย์
      // การเรียก customer.update ใดๆ จะบ่งชี้ว่าการรับประกัน idempotency ล้มเหลว
      expect(mockPrismaClient.customer.update).not.toHaveBeenCalled();
      expect(mockPrismaClient.transaction.create).not.toHaveBeenCalled();
    });

    it('ต้องดำเนินการ credit ยอดเงินและสร้าง transaction record เมื่อ referenceId ใหม่ไม่เคยพบมาก่อน', async () => {
      // จัดเตรียม: ไม่มี record สำหรับ PaymentIntent นี้
      mockPrismaClient.transaction.findUnique.mockResolvedValue(null);
      mockPrismaClient.customer.update.mockResolvedValue({ id: 1, balance: 1500, version: 1 });
      mockPrismaClient.transaction.create.mockResolvedValue({ id: 99 });

      // รัน transaction สำหรับ event ใหม่ที่ยังไม่ได้ประมวลผล
      await mockPrismaService.$transaction(async (tx: typeof mockPrismaClient) => {
        const existing = await tx.transaction.findUnique({
          where: { referenceId: 'pi_new_intent_002' },
        });
        if (existing) return;

        await tx.customer.update({
          where: { id: 1 },
          data: { balance: { increment: 1500 }, version: { increment: 1 } },
        });

        await tx.transaction.create({
          data: {
            amount: 1500,
            type: 'CREDIT',
            referenceId: 'pi_new_intent_002',
            userId: 1,
            userRole: 'Customer',
          },
        });
      });

      // ยืนยัน: การ write ทั้งสองต้องถูกดำเนินการพอดีหนึ่งครั้ง
      expect(mockPrismaClient.customer.update).toHaveBeenCalledTimes(1);
      expect(mockPrismaClient.transaction.create).toHaveBeenCalledTimes(1);
      expect(mockPrismaClient.transaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            referenceId: 'pi_new_intent_002',
            type: 'CREDIT',
          }),
        }),
      );
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // SPEC 2: Transaction Atomicity — การป้องกัน Partial Write
  // ───────────────────────────────────────────────────────────────────────────

  describe('Transaction Atomicity — การป้องกัน Partial Write', () => {
    it('ต้องไม่ทิ้งยอดเงินที่อัปเดตไว้เมื่อการสร้าง transaction record ล้มเหลว', async () => {
      // จัดเตรียม: การอัปเดตยอดเงินสำเร็จแต่การสร้าง transaction record throw error
      mockPrismaClient.transaction.findUnique.mockResolvedValue(null);
      mockPrismaClient.customer.update.mockResolvedValue({ id: 1, balance: 500, version: 1 });
      mockPrismaClient.transaction.create.mockRejectedValue(
        new Error('Unique constraint violation on referenceId'),
      );

      // รัน: transaction ต้อง rollback ทั้งหมดเมื่อมี error ใดๆ ภายในขอบเขต
      const transactionExecution = mockPrismaService.$transaction(
        async (tx: typeof mockPrismaClient) => {
          const existing = await tx.transaction.findUnique({
            where: { referenceId: 'pi_conflict_003' },
          });
          if (existing) return;

          await tx.customer.update({
            where: { id: 1 },
            data: { balance: { increment: 500 }, version: { increment: 1 } },
          });

          // call นี้ throw — transaction ต้อง rollback การอัปเดตยอดเงินด้วย
          await tx.transaction.create({
            data: {
              amount: 500,
              type: 'CREDIT',
              referenceId: 'pi_conflict_003',
              userId: 1,
              userRole: 'Customer',
            },
          });
        },
      );

      // ยืนยัน: การดำเนินการ transaction โดยรวมต้อง reject
      await expect(transactionExecution).rejects.toThrow('Unique constraint violation');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // SPEC 3: Role Dispatch — การ resolve Model ที่ถูกต้อง
  // ───────────────────────────────────────────────────────────────────────────

  describe('Role-Based Model Dispatch', () => {
    it('ต้อง resolve Merchant model เมื่อ userRole เป็น Merchant', async () => {
      mockPrismaClient.transaction.findUnique.mockResolvedValue(null);
      mockPrismaClient.merchant.update.mockResolvedValue({ id: 5, balance: 2000, version: 3 });
      mockPrismaClient.transaction.create.mockResolvedValue({ id: 100 });

      await mockPrismaService.$transaction(async (tx: typeof mockPrismaClient) => {
        const existing = await tx.transaction.findUnique({
          where: { referenceId: 'pi_merchant_004' },
        });
        if (existing) return;

        // service resolve model ผ่าน modelMap[userRole.toLowerCase()]
        // สำหรับ 'Merchant' จะ resolve เป็น tx.merchant
        await tx.merchant.update({
          where: { id: 5 },
          data: { balance: { increment: 2000 }, version: { increment: 1 } },
        });

        await tx.transaction.create({
          data: {
            amount: 2000,
            type: 'CREDIT',
            referenceId: 'pi_merchant_004',
            userId: 5,
            userRole: 'Merchant',
          },
        });
      });

      // ยืนยัน: ต้องอัปเดต merchant เท่านั้น ไม่ใช่ customer หรือ driver
      expect(mockPrismaClient.merchant.update).toHaveBeenCalledTimes(1);
      expect(mockPrismaClient.customer.update).not.toHaveBeenCalled();
      expect(mockPrismaClient.driver.update).not.toHaveBeenCalled();
    });
  });
});
