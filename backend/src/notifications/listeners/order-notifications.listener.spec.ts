import { Test, TestingModule } from '@nestjs/testing';
import { OrderNotificationsListener } from './order-notifications.listener';
import { NotificationsService } from '../notifications.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  OrderCreatedEvent,
  OrderStatusUpdatedEvent,
} from '../../orders/events';
import { OrderStatus } from '@prisma/client';

describe('OrderNotificationsListener', () => {
  let listener: OrderNotificationsListener;

  const mockNotificationsService = {
    sendOrderStatusUpdate: jest.fn(),
  };

  const mockPrismaService = {
    order: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderNotificationsListener,
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    listener = module.get<OrderNotificationsListener>(
      OrderNotificationsListener,
    );
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(listener).toBeDefined();
  });

  describe('handleOrderStatusUpdated()', () => {
    it('ควรส่ง Push Notification ไปยัง Customer และ Merchant เมื่อพบ fcmToken', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue({
        id: 1,
        trackingNumber: 'SP1234567890',
        customer: { fcmToken: 'customer_fcm_token' },
        merchant: { fcmToken: 'merchant_fcm_token' },
      });

      const event = new OrderStatusUpdatedEvent(
        1,
        OrderStatus.ACCEPTED,
        { id: 1, trackingNumber: 'SP1234567890', status: OrderStatus.ACCEPTED },
        'คนขับรับงานแล้ว',
      );

      await listener.handleOrderStatusUpdated(event);

      expect(mockPrismaService.order.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: {
          customer: { select: { fcmToken: true } },
          merchant: { select: { fcmToken: true } },
        },
      });

      expect(
        mockNotificationsService.sendOrderStatusUpdate,
      ).toHaveBeenCalledWith(
        'customer_fcm_token',
        'SP1234567890',
        OrderStatus.ACCEPTED,
      );

      expect(
        mockNotificationsService.sendOrderStatusUpdate,
      ).toHaveBeenCalledWith(
        'merchant_fcm_token',
        'SP1234567890',
        OrderStatus.ACCEPTED,
      );
    });

    it('ไม่ควรส่ง Push Notification ถ้าไม่พบออเดอร์ในระบบ', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(null);

      const event = new OrderStatusUpdatedEvent(999, OrderStatus.DELIVERED, {
        id: 999,
        status: OrderStatus.DELIVERED,
      });

      await listener.handleOrderStatusUpdated(event);

      expect(
        mockNotificationsService.sendOrderStatusUpdate,
      ).not.toHaveBeenCalled();
    });
  });

  describe('handleOrderCreated()', () => {
    it('ควรทำงานได้โดยไม่เกิดข้อผิดพลาด', async () => {
      const event = new OrderCreatedEvent({
        id: 1,
        trackingNumber: 'SP1234567890',
        merchantId: 5,
      });

      await expect(listener.handleOrderCreated(event)).resolves.not.toThrow();
    });
  });
});
