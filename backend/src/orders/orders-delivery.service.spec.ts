import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { OrdersDeliveryService, calculateHaversineDistance } from './orders-delivery.service';
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

  describe('calculateHaversineDistance', () => {
    it('should return 0 when two points are identical', () => {
      const dist = calculateHaversineDistance(13.7563, 100.5018, 13.7563, 100.5018);
      expect(dist).toBe(0);
    });

    it('should calculate accurate distance between Siam Paragon and IconSiam (~3.42 km)', () => {
      const dist = calculateHaversineDistance(13.7466, 100.5349, 13.7267, 100.5107);
      expect(dist).toBeGreaterThan(3.3);
      expect(dist).toBeLessThan(3.6);
      expect(dist).toBe(3.42);
    });

    it('should calculate 1 degree longitude on equator (~111.19 km)', () => {
      const dist = calculateHaversineDistance(0, 0, 0, 1);
      expect(dist).toBeCloseTo(111.19, 1);
    });
  });

  describe('optimizeDeliveryRoute', () => {
    it('should return 0 stops and null googleMapsUrl when driver has no active jobs', () => {
      return (async () => {
        mockPrismaService.order.findMany.mockResolvedValue([]);

        const result = await service.optimizeDeliveryRoute(10, 13.75, 100.5);

        expect(result.totalStops).toBe(0);
        expect(result.totalDistanceKm).toBe(0);
        expect(result.googleMapsUrl).toBeNull();
        expect(result.originType).toBe('DRIVER_GPS');
        expect(result.origin).toEqual({ lat: 13.75, lng: 100.5 });
      })();
    });

    it('should return originType NONE when no jobs and no driver GPS provided', async () => {
      mockPrismaService.order.findMany.mockResolvedValue([]);

      const result = await service.optimizeDeliveryRoute(10);

      expect(result.totalStops).toBe(0);
      expect(result.originType).toBe('NONE');
      expect(result.origin).toBeNull();
      expect(result.googleMapsUrl).toBeNull();
    });

    it('should isolate orders without GPS coordinates into unroutedOrders', async () => {
      mockPrismaService.order.findMany.mockResolvedValue([
        {
          id: 101,
          trackingNumber: 'TRACK-NO-GPS',
          receiverName: 'สมชาย ไร้พิกัด',
          receiverPhone: '0811111111',
          address: 'บ้านไม่มีจีพีเอส',
          lat: null,
          lng: null,
          status: OrderStatus.SHIPPING,
        },
      ]);

      const result = await service.optimizeDeliveryRoute(10, 13.75, 100.5);

      expect(result.totalStops).toBe(0);
      expect(result.unroutedOrders.length).toBe(1);
      expect(result.unroutedOrders[0].orderId).toBe(101);
      expect(result.unroutedOrders[0].reason).toContain('ไม่มีข้อมูลพิกัด');
    });

    it('should optimize single stop and generate point-to-point Google Maps URL', async () => {
      mockPrismaService.order.findMany.mockResolvedValue([
        {
          id: 201,
          trackingNumber: 'TRACK-SINGLE',
          receiverName: 'สมศรี มีพิกัด',
          receiverPhone: '0822222222',
          address: 'สยามพารากอน',
          lat: 13.7466,
          lng: 100.5349,
          status: OrderStatus.PICKED_UP,
        },
      ]);

      const result = await service.optimizeDeliveryRoute(10, 13.7267, 100.5107); // จาก IconSiam

      expect(result.totalStops).toBe(1);
      expect(result.totalDistanceKm).toBe(3.42);
      expect(result.stops[0].orderId).toBe(201);
      expect(result.stops[0].step).toBe(1);
      expect(result.googleMapsUrl).toContain('origin=13.7267,100.5107');
      expect(result.googleMapsUrl).toContain('destination=13.7466,100.5349');
      expect(result.googleMapsUrl).toContain('travelmode=driving');
    });

    it('should fallback to first order coordinates if driver coordinates are not provided', async () => {
      mockPrismaService.order.findMany.mockResolvedValue([
        {
          id: 301,
          trackingNumber: 'TRACK-FALLBACK-1',
          receiverName: 'ลูกค้า 1',
          receiverPhone: '0810000001',
          address: 'จุด 1',
          lat: 13.75,
          lng: 100.5,
          status: OrderStatus.ACCEPTED,
        },
        {
          id: 302,
          trackingNumber: 'TRACK-FALLBACK-2',
          receiverName: 'ลูกค้า 2',
          receiverPhone: '0810000002',
          address: 'จุด 2',
          lat: 13.76,
          lng: 100.51,
          status: OrderStatus.SHIPPING,
        },
      ]);

      const result = await service.optimizeDeliveryRoute(10); // ไม่ส่ง lat, lng

      expect(result.originType).toBe('FIRST_ORDER');
      expect(result.origin).toEqual({ lat: 13.75, lng: 100.5 });
      expect(result.totalStops).toBe(2);
    });

    it('should reorder multi-stop delivery using Nearest Neighbor TSP and save distance compared to FIFO', async () => {
      // Driver starts at (0, 0)
      // Unoptimized FIFO order:
      // Order 1 (Far: 0, 3) -> Order 2 (Near: 0, 1) -> Order 3 (Mid: 0, 2)
      // Distance FIFO: (0,0)->(0,3) [333km] + (0,3)->(0,1) [222km] + (0,1)->(0,2) [111km] = 666km
      // Optimized: (0,0)->(0,1) [111km] -> (0,2) [111km] -> (0,3) [111km] = 333km (~50% savings!)
      mockPrismaService.order.findMany.mockResolvedValue([
        {
          id: 1,
          trackingNumber: 'TRACK-FAR',
          receiverName: 'ไกลสุด',
          receiverPhone: '0811111111',
          address: 'จุดไกล 3',
          lat: 0,
          lng: 3,
          status: OrderStatus.SHIPPING,
        },
        {
          id: 2,
          trackingNumber: 'TRACK-NEAR',
          receiverName: 'ใกล้สุด',
          receiverPhone: '0822222222',
          address: 'จุดใกล้ 1',
          lat: 0,
          lng: 1,
          status: OrderStatus.SHIPPING,
        },
        {
          id: 3,
          trackingNumber: 'TRACK-MID',
          receiverName: 'ปานกลาง',
          receiverPhone: '0833333333',
          address: 'จุดกลาง 2',
          lat: 0,
          lng: 2,
          status: OrderStatus.SHIPPING,
        },
      ]);

      const result = await service.optimizeDeliveryRoute(10, 0, 0);

      expect(result.totalStops).toBe(3);
      // ตรวจสอบลำดับการส่งว่าใกล้สุดก่อน: Order 2 -> Order 3 -> Order 1
      expect(result.stops[0].orderId).toBe(2);
      expect(result.stops[0].step).toBe(1);
      expect(result.stops[1].orderId).toBe(3);
      expect(result.stops[1].step).toBe(2);
      expect(result.stops[2].orderId).toBe(1);
      expect(result.stops[2].step).toBe(3);

      // ตรวจสอบการประหยัดระยะทาง
      expect(result.totalDistanceKm).toBeLessThan(result.unoptimizedTotalDistanceKm);
      expect(result.savedDistanceKm).toBeGreaterThan(300);
      expect(result.savingsPercentage).toBeGreaterThan(45);

      // ตรวจสอบ Google Maps Multi-stop URL (waypoints และ destination)
      expect(result.googleMapsUrl).toContain('origin=0,0');
      expect(result.googleMapsUrl).toContain('destination=0,3'); // ปลายทางสุดท้ายคือ Order 1
      expect(result.googleMapsUrl).toContain('waypoints=');
      expect(result.googleMapsUrl).toContain('travelmode=driving');
    });
  });
});
