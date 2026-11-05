import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { OrdersDeliveryService } from './orders-delivery.service';
import { PrismaService } from '../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OrderStatus, Prisma } from '@prisma/client';
import { ORDER_EVENTS } from './events';

// Mock Firebase storage
jest.mock('../utils/firebase-storage', () => ({
  uploadBase64ToStorage: jest
    .fn()
    .mockResolvedValue('https://storage.googleapis.com/test-proof.jpg'),
}));

const mockPrismaService = {
  order: {
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
  },
  customer: { updateMany: jest.fn() },
  merchant: { update: jest.fn() },
  driver: { findUnique: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
  transaction: { create: jest.fn() },
  trackingLog: { create: jest.fn() },
  $transaction: jest.fn(),
};

const mockEventEmitter = {
  emit: jest.fn(),
};

describe('OrdersDeliveryService', () => {
  let service: OrdersDeliveryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersDeliveryService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<OrdersDeliveryService>(OrdersDeliveryService);
    jest.clearAllMocks();

    mockPrismaService.$transaction.mockImplementation(async (callback: any) => {
      if (typeof callback === 'function') {
        return callback(mockPrismaService);
      }
      return callback;
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // =========================================================================
  // SECTION 1: Driver Job Discovery & History
  // =========================================================================
  describe('findAllAvailable()', () => {
    it('[TC-OD01] ควรดึงออเดอร์ทั้งหมดที่สถานะ PENDING และยังไม่มีคนขับ', async () => {
      mockPrismaService.driver.findUnique.mockResolvedValue({ id: 10, merchantId: null });
      mockPrismaService.order.findMany.mockResolvedValue([
        { id: 1, trackingNumber: 'SP001', status: OrderStatus.PENDING },
      ]);

      const result = await service.findAllAvailable(10);

      expect(result).toHaveLength(1);
      expect(mockPrismaService.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { driverId: null, status: OrderStatus.PENDING },
        }),
      );
    });

    it('[TC-OD02] ควรกักบริเวณให้รับได้เฉพาะร้านค้าตนเอง ถ้าคนขับสังกัดร้านค้า', async () => {
      mockPrismaService.driver.findUnique.mockResolvedValue({ id: 10, merchantId: 5 });
      mockPrismaService.order.findMany.mockResolvedValue([]);

      await service.findAllAvailable(10);

      expect(mockPrismaService.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ merchantId: 5 }),
        }),
      );
    });
  });

  describe('getDriverActiveJobs()', () => {
    it('[TC-OD03] ควรคืนค่างานที่กำลังปฏิบัติการของคนขับ (ACCEPTED, PICKED_UP, SHIPPING)', async () => {
      mockPrismaService.order.findMany.mockResolvedValue([
        { id: 1, status: OrderStatus.SHIPPING, driverId: 10 },
      ]);

      const result = await service.getDriverActiveJobs(10);

      expect(result).toHaveLength(1);
      expect(mockPrismaService.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            driverId: 10,
            status: {
              in: [
                OrderStatus.ACCEPTED,
                OrderStatus.PICKED_UP,
                OrderStatus.SHIPPING,
              ],
            },
          },
        }),
      );
    });
  });

  describe('getDriverHistory()', () => {
    it('[TC-OD04] ควรคืนค่าจำนวนงาน ยอดเงินสดรวม และรายการงานที่จัดส่งสำเร็จ', async () => {
      mockPrismaService.order.count.mockResolvedValue(5);
      mockPrismaService.order.aggregate.mockResolvedValue({
        _sum: { totalPrice: new Prisma.Decimal(2500) },
      });
      mockPrismaService.order.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);

      const result = await service.getDriverHistory(10);

      expect(result.stats.totalDelivered).toBe(5);
      expect(result.stats.totalCashCollected).toBe(2500);
      expect(result.orders).toHaveLength(2);
    });

    it('[TC-OD05] ควรกรองช่วงวันที่เมื่อระบุ startDate และ endDate', async () => {
      mockPrismaService.order.count.mockResolvedValue(0);
      mockPrismaService.order.aggregate.mockResolvedValue({ _sum: { totalPrice: null } });
      mockPrismaService.order.findMany.mockResolvedValue([]);

      await service.getDriverHistory(10, '2026-11-01', '2026-11-05');

      expect(mockPrismaService.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            updatedAt: expect.any(Object),
          }),
        }),
      );
    });
  });

  // =========================================================================
  // SECTION 2: acceptOrder()
  // =========================================================================
  describe('acceptOrder()', () => {
    it('[TC-OD06] ควร throw BadRequestException เมื่อ orderId ไม่ใช่ตัวเลข', async () => {
      await expect(service.acceptOrder(NaN, 10)).rejects.toThrow(BadRequestException);
    });

    it('[TC-OD07] ควร throw BadRequestException เมื่อไม่พบคนขับ', async () => {
      mockPrismaService.driver.findUnique.mockResolvedValue(null);
      await expect(service.acceptOrder(1, 99)).rejects.toThrow('Driver not found');
    });

    it('[TC-OD08] ควร throw NotFoundException เมื่อไม่พบออเดอร์', async () => {
      mockPrismaService.driver.findUnique.mockResolvedValue({ id: 10, merchantId: null });
      mockPrismaService.order.findUnique.mockResolvedValue(null);

      await expect(service.acceptOrder(99, 10)).rejects.toThrow(NotFoundException);
    });

    it('[TC-OD09] ควร throw ConflictException เมื่อออเดอร์ไม่ได้มีสถานะ PENDING', async () => {
      mockPrismaService.driver.findUnique.mockResolvedValue({ id: 10, merchantId: null });
      mockPrismaService.order.findUnique.mockResolvedValue({
        id: 1,
        status: OrderStatus.SHIPPING,
        driverId: null,
      });

      await expect(service.acceptOrder(1, 10)).rejects.toThrow(ConflictException);
    });

    it('[TC-OD10] ควร throw ForbiddenException เมื่อคนขับสังกัดร้านค้าพยายามรับงานข้ามร้าน', async () => {
      mockPrismaService.driver.findUnique.mockResolvedValue({ id: 10, merchantId: 100 });
      mockPrismaService.order.findUnique.mockResolvedValue({
        id: 1,
        status: OrderStatus.PENDING,
        driverId: null,
        merchantId: 200,
      });

      await expect(service.acceptOrder(1, 10)).rejects.toThrow(ForbiddenException);
    });

    it('[TC-OD11] ควร throw ConflictException เมื่อ updateMany count เป็น 0 (Race Condition)', async () => {
      mockPrismaService.driver.findUnique.mockResolvedValue({ id: 10, merchantId: null });
      mockPrismaService.order.findUnique.mockResolvedValue({
        id: 1,
        status: OrderStatus.PENDING,
        driverId: null,
        merchantId: 1,
      });
      mockPrismaService.order.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.acceptOrder(1, 10)).rejects.toThrow(ConflictException);
    });

    it('[TC-OD12] ควรรับงานสำเร็จ บันทึก TrackingLog และยิง Event STATUS_UPDATED', async () => {
      mockPrismaService.driver.findUnique.mockResolvedValue({ id: 10, merchantId: null });
      mockPrismaService.order.findUnique
        .mockResolvedValueOnce({
          id: 1,
          status: OrderStatus.PENDING,
          driverId: null,
          merchantId: 1,
        })
        .mockResolvedValueOnce({
          id: 1,
          status: OrderStatus.ACCEPTED,
          driverId: 10,
        });
      mockPrismaService.order.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.trackingLog.create.mockResolvedValue({ id: 1 });

      const result = await service.acceptOrder(1, 10);

      expect(result.status).toBe(OrderStatus.ACCEPTED);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        ORDER_EVENTS.STATUS_UPDATED,
        expect.any(Object),
      );
    });
  });

  // =========================================================================
  // SECTION 3: pickupOrder() & startShippingOrder()
  // =========================================================================
  describe('pickupOrder()', () => {
    it('[TC-OD13] ควร throw ForbiddenException เมื่อคนขับไม่ใช่คนที่รับออเดอร์นี้', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue({ id: 1, driverId: 99 });
      await expect(service.pickupOrder(1, 10)).rejects.toThrow(ForbiddenException);
    });

    it('[TC-OD14] ควร throw BadRequestException เมื่อสถานะไม่ได้เป็น ACCEPTED', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue({
        id: 1,
        driverId: 10,
        status: OrderStatus.PENDING,
      });
      await expect(service.pickupOrder(1, 10)).rejects.toThrow('ต้องรับงานก่อน (ACCEPTED)');
    });

    it('[TC-OD15] ควรเปลี่ยนสถานะเป็น PICKED_UP สำเร็จและปล่อย Event', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue({
        id: 1,
        driverId: 10,
        status: OrderStatus.ACCEPTED,
      });
      mockPrismaService.order.update.mockResolvedValue({
        id: 1,
        status: OrderStatus.PICKED_UP,
      });

      const result = await service.pickupOrder(1, 10);

      expect(result.status).toBe(OrderStatus.PICKED_UP);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        ORDER_EVENTS.STATUS_UPDATED,
        expect.any(Object),
      );
    });
  });

  describe('startShippingOrder()', () => {
    it('[TC-OD16] ควร throw BadRequestException เมื่อสถานะไม่ได้เป็น PICKED_UP', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue({
        id: 1,
        driverId: 10,
        status: OrderStatus.ACCEPTED,
      });
      await expect(service.startShippingOrder(1, 10)).rejects.toThrow('ต้องรับของก่อน (PICKED_UP)');
    });

    it('[TC-OD17] ควรเปลี่ยนสถานะเป็น SHIPPING สำเร็จและปล่อย Event', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue({
        id: 1,
        driverId: 10,
        status: OrderStatus.PICKED_UP,
      });
      mockPrismaService.order.update.mockResolvedValue({
        id: 1,
        status: OrderStatus.SHIPPING,
      });

      const result = await service.startShippingOrder(1, 10);

      expect(result.status).toBe(OrderStatus.SHIPPING);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        ORDER_EVENTS.STATUS_UPDATED,
        expect.any(Object),
      );
    });
  });

  // =========================================================================
  // SECTION 4: completeOrder()
  // =========================================================================
  describe('completeOrder()', () => {
    it('[TC-OD18] ควร throw BadRequestException เมื่อไม่แนบรูปหลักฐานการส่งมอบ', async () => {
      await expect(service.completeOrder(1, 10, undefined)).rejects.toThrow(
        'ต้องแนบรูปลิงก์หลักฐานการจัดส่ง',
      );
    });

    it('[TC-OD19] ควร throw BadRequestException เมื่อสถานะยังไม่ได้เป็น SHIPPING', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue({
        id: 1,
        driverId: 10,
        status: OrderStatus.PICKED_UP,
      });
      await expect(service.completeOrder(1, 10, 'data:image/png;base64,abc')).rejects.toThrow(
        'ต้องเริ่มการจัดส่งก่อน (SHIPPING)',
      );
    });

    it('[TC-OD20] ควรอัปโหลดรูป อัปเดตสถานะ DELIVERED และปล่อย Event สำเร็จ', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue({
        id: 1,
        trackingNumber: 'SP123',
        driverId: 10,
        status: OrderStatus.SHIPPING,
      });
      mockPrismaService.order.update.mockResolvedValue({
        id: 1,
        status: OrderStatus.DELIVERED,
        proofOfDelivery: 'https://storage.googleapis.com/test-proof.jpg',
      });

      const result = await service.completeOrder(1, 10, 'data:image/png;base64,abc');

      expect(result.status).toBe(OrderStatus.DELIVERED);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        ORDER_EVENTS.STATUS_UPDATED,
        expect.any(Object),
      );
    });
  });

  // =========================================================================
  // SECTION 5: payOrder() (COD & Wallet Settlement)
  // =========================================================================
  describe('payOrder()', () => {
    it('[TC-OD21] ควร throw BadRequestException เมื่อออเดอร์ยังจัดส่งไม่สำเร็จ', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue({
        id: 1,
        driverId: 10,
        status: OrderStatus.SHIPPING,
      });

      await expect(service.payOrder(1, 10)).rejects.toThrow('ชำระเงินได้เฉพาะออเดอร์ที่จัดส่งสำเร็จแล้ว');
    });

    it('[TC-OD22] ควร throw BadRequestException เมื่อออเดอร์ชำระเงินแล้ว', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue({
        id: 1,
        driverId: 10,
        status: OrderStatus.DELIVERED,
        paymentStatus: 'Paid',
      });

      await expect(service.payOrder(1, 10)).rejects.toThrow('ออเดอร์นี้ชำระเงินแล้ว');
    });

    it('[TC-OD23] ควร throw BadRequestException เมื่อยอดเงินคนขับไม่พอตัดเงินสด COD', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue({
        id: 1,
        driverId: 10,
        status: OrderStatus.DELIVERED,
        paymentStatus: 'Unpaid',
        paymentMethod: 'COD',
        totalPrice: new Prisma.Decimal(500),
        insuranceFee: 10,
        merchantId: 1,
        customerId: null,
      });
      mockPrismaService.order.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.driver.updateMany.mockResolvedValue({ count: 0 }); // insufficient balance

      await expect(service.payOrder(1, 10)).rejects.toThrow('ยอดเงินเครดิตคนขับไม่เพียงพอ');
    });

    it('[TC-OD24] ควรหักล้างเงินสด COD สำเร็จและโอนยอดเงินเข้าบัญชีร้านค้า', async () => {
      mockPrismaService.order.findUnique
        .mockResolvedValueOnce({
          id: 1,
          trackingNumber: 'SP123',
          driverId: 10,
          status: OrderStatus.DELIVERED,
          paymentStatus: 'Unpaid',
          paymentMethod: 'COD',
          totalPrice: new Prisma.Decimal(500),
          insuranceFee: 10,
          hasInsurance: true,
          merchantId: 1,
          customerId: null,
        })
        .mockResolvedValueOnce({
          id: 1,
          status: OrderStatus.DELIVERED,
          paymentStatus: 'Paid',
        });
      mockPrismaService.order.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.driver.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.merchant.update.mockResolvedValue({ id: 1 });
      mockPrismaService.transaction.create.mockResolvedValue({ id: 1 });

      const result = await service.payOrder(1, 10);

      expect(result.success).toBe(true);
      expect(mockPrismaService.merchant.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ balance: expect.any(Object) }),
        }),
      );
    });

    it('[TC-OD25] ควรตัดเงินจาก Wallet ลูกค้าเมื่อเป็นการจ่ายออนไลน์ (Non-COD)', async () => {
      mockPrismaService.order.findUnique
        .mockResolvedValueOnce({
          id: 1,
          trackingNumber: 'SP123',
          driverId: 10,
          status: OrderStatus.DELIVERED,
          paymentStatus: 'Unpaid',
          paymentMethod: 'Wallet',
          totalPrice: new Prisma.Decimal(300),
          insuranceFee: 0,
          hasInsurance: false,
          merchantId: 1,
          customerId: 50,
        })
        .mockResolvedValueOnce({
          id: 1,
          status: OrderStatus.DELIVERED,
          paymentStatus: 'Paid',
        });
      mockPrismaService.order.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.customer.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.merchant.update.mockResolvedValue({ id: 1 });
      mockPrismaService.driver.update.mockResolvedValue({ id: 10 });
      mockPrismaService.transaction.create.mockResolvedValue({ id: 1 });

      const result = await service.payOrder(1, 10);

      expect(result.success).toBe(true);
      expect(mockPrismaService.customer.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 50, balance: { gte: 300 } },
        }),
      );
    });
  });
});
