import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { WeatherService } from '../weather/weather.service';
import { MailerService } from '@nestjs-modules/mailer';
import { NotificationsService } from '../notifications/notifications.service';
import { ChatGateway } from '../chat/chat.gateway';
import { OrderStatus } from '@prisma/client';

// Mock ทุก dependency เพื่อไม่ให้ต้องเชื่อม Database จริง
const mockPrismaService = {
  order: {
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
  },
  customer: { updateMany: jest.fn() },
  merchant: { findUnique: jest.fn(), update: jest.fn() },
  driver: { findMany: jest.fn(), update: jest.fn() },
  transaction: { create: jest.fn() },
  trackingLog: { create: jest.fn() },
  rating: { findUnique: jest.fn(), create: jest.fn() },
  $transaction: jest.fn(),
};

const mockWeatherService = { getWeather: jest.fn() };
const mockMailerService = { sendMail: jest.fn() };
const mockChatGateway = {
  server: { emit: jest.fn(), to: jest.fn().mockReturnThis() },
};
const mockNotificationsService = { sendOrderStatusUpdate: jest.fn() };

describe('OrdersService', () => {
  let service: OrdersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: WeatherService, useValue: mockWeatherService },
        { provide: MailerService, useValue: mockMailerService },
        { provide: ChatGateway, useValue: mockChatGateway },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ===== payOrder Tests (BUG-002 FIX) =====
  describe('payOrder()', () => {
    const mockOrderDelivered = {
      id: 1,
      driverId: 10,
      customerId: 5,
      merchantId: 3,
      status: OrderStatus.DELIVERED,
      paymentStatus: 'Unpaid',
      totalPrice: 100,
      price: 80,
      trackingNumber: 'SP1234567890',
      hasInsurance: false,
      insuranceFee: 0,
    };

    it('[BUG-002] ควร throw BadRequestException ถ้า order ยังไม่ถึงสถานะ DELIVERED (SHIPPING)', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue({
        ...mockOrderDelivered,
        status: OrderStatus.SHIPPING,
      });

      await expect(service.payOrder(1, 10)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.payOrder(1, 10)).rejects.toThrow(
        'ชำระเงินได้เฉพาะออเดอร์ที่จัดส่งสำเร็จแล้ว (DELIVERED) เท่านั้น',
      );
    });

    it('[BUG-002] ควร throw BadRequestException ถ้า order อยู่สถานะ ACCEPTED', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue({
        ...mockOrderDelivered,
        status: OrderStatus.ACCEPTED,
      });

      await expect(service.payOrder(1, 10)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('[BUG-002] ควร throw BadRequestException ถ้า order อยู่สถานะ PICKED_UP', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue({
        ...mockOrderDelivered,
        status: OrderStatus.PICKED_UP,
      });

      await expect(service.payOrder(1, 10)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('ควร throw ForbiddenException ถ้า driverId ไม่ตรงกับ order', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue({
        ...mockOrderDelivered,
        driverId: 99,
      });

      await expect(service.payOrder(1, 10)).rejects.toThrow(ForbiddenException);
    });

    it('ควร throw BadRequestException ถ้าชำระเงินไปแล้ว', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue({
        ...mockOrderDelivered,
        paymentStatus: 'Paid',
      });

      await expect(service.payOrder(1, 10)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.payOrder(1, 10)).rejects.toThrow(
        'ออเดอร์นี้ชำระเงินแล้ว',
      );
    });

    it('ควรคืนผลสำเร็จถ้า order อยู่สถานะ DELIVERED และยังไม่ชำระเงิน', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(mockOrderDelivered);
      mockPrismaService.$transaction.mockImplementation(
        async (fn: (tx: any) => Promise<any>) => {
          const mockTx = {
            order: {
              updateMany: jest.fn().mockResolvedValue({ count: 1 }),
            },
            customer: {
              updateMany: jest.fn().mockResolvedValue({ count: 1 }),
            },
            merchant: { update: jest.fn().mockResolvedValue({}) },
            driver: { update: jest.fn().mockResolvedValue({}) },
            transaction: { create: jest.fn().mockResolvedValue({}) },
          };
          return fn(mockTx);
        },
      );

      const result = await service.payOrder(1, 10);
      expect(result).toEqual({
        success: true,
        message: 'ชำระเงินและโอนเข้า Wallet สำเร็จ',
      });
    });
  });

  // ===== rateOrder Tests =====
  describe('rateOrder()', () => {
    it('ควร throw BadRequestException ถ้าคะแนนน้อยกว่า 1', async () => {
      await expect(service.rateOrder(1, 5, 'Customer', 0)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('ควร throw BadRequestException ถ้าคะแนนมากกว่า 5', async () => {
      await expect(service.rateOrder(1, 5, 'Customer', 6)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('ควร throw BadRequestException ถ้า orderId ไม่ใช่ตัวเลข', async () => {
      await expect(service.rateOrder(NaN, 5, 'Customer', 4)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('ควร throw ForbiddenException ถ้า Customer ไม่ใช่เจ้าของออเดอร์', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue({
        id: 1,
        driverId: 10,
        customerId: 99, // เจ้าของจริงคือ 99 ไม่ใช่ 5
        merchantId: 3,
        status: OrderStatus.DELIVERED,
      });

      await expect(service.rateOrder(1, 5, 'Customer', 4)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ===== acceptOrder Tests =====
  describe('acceptOrder()', () => {
    it('ควร throw BadRequestException ถ้า orderId ไม่ใช่ตัวเลข', async () => {
      await expect(service.acceptOrder(NaN, 10)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('[Race Condition] ควร throw BadRequestException ถ้าออเดอร์ถูกรับไปแล้ว (Prisma P2025)', async () => {
      const prismaError = { code: 'P2025' };
      mockPrismaService.order.update.mockRejectedValue(prismaError);

      await expect(service.acceptOrder(1, 10)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.acceptOrder(1, 10)).rejects.toThrow(
        'ออเดอร์นี้ถูกรับไปแล้ว หรือออเดอร์ถูกยกเลิก',
      );
    });
  });

  // ===== getPublicOrderTracking Tests (MEDIUM-01 + MEDIUM-02) =====
  describe('getPublicOrderTracking()', () => {
    it('[MEDIUM-02] ควร throw BadRequestException ถ้า tracking number รูปแบบผิด', async () => {
      await expect(service.getPublicOrderTracking('INVALID')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('[MEDIUM-02] ควร throw ถ้าขึ้นต้นด้วย SP แต่สั้นเกินไป', async () => {
      await expect(service.getPublicOrderTracking('SP123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('[MEDIUM-02] ควรยอมรับ tracking number รูปแบบถูกต้อง SP + 10 ตัวอักษรพิมพ์ใหญ่', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue({
        id: 1,
        trackingNumber: 'SP1A2B3C4D5E',
        productName: 'Test Product',
        status: OrderStatus.PENDING,
        weatherWarning: null,
        estimatedMinutes: 30,
        estimatedReadyAt: null,
        lat: 13.7563,
        lng: 100.5018,
        driver: null,
        trackingLogs: [],
      });

      const result = await service.getPublicOrderTracking('SP1A2B3C4D5E');
      expect(result).toBeDefined();
      expect(result.trackingNumber).toBe('SP1A2B3C4D5E');
    });

    it('[MEDIUM-01] ควร fuzzy lat/lng ให้ความแม่นยำแค่ ~1km', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue({
        id: 1,
        trackingNumber: 'SP1A2B3C4D5E',
        productName: 'Test',
        status: OrderStatus.SHIPPING,
        weatherWarning: null,
        estimatedMinutes: 25,
        estimatedReadyAt: null,
        lat: 13.756789, // ละติจูดแม่นยำสูง
        lng: 100.501812,
        driver: null,
        trackingLogs: [],
      });

      const result = await service.getPublicOrderTracking('SP1A2B3C4D5E');
      // ต้องถูก round ให้เหลือ 2 ตำแหน่งทศนิยม (~1km)
      expect(result.lat).toBe(13.76);
      expect(result.lng).toBe(100.5);
    });
  });
});
