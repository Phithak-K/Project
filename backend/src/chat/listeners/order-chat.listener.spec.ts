import { Test, TestingModule } from '@nestjs/testing';
import { OrderChatListener } from './order-chat.listener';
import { ChatGateway } from '../chat.gateway';
import {
  OrderCreatedEvent,
  OrderStatusUpdatedEvent,
} from '../../orders/events';
import { OrderStatus } from '@prisma/client';

describe('OrderChatListener', () => {
  let listener: OrderChatListener;

  const mockEmit = jest.fn();
  const mockTo = jest.fn().mockReturnValue({ emit: mockEmit });
  const mockChatGateway = {
    server: {
      to: mockTo,
      emit: mockEmit,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderChatListener,
        { provide: ChatGateway, useValue: mockChatGateway },
      ],
    }).compile();

    listener = module.get<OrderChatListener>(OrderChatListener);
    jest.clearAllMocks();
    mockTo.mockReturnValue({ emit: mockEmit });
  });

  it('should be defined', () => {
    expect(listener).toBeDefined();
  });

  describe('handleOrderCreated()', () => {
    it('ควรกระจาย WebSocket new_available_order ไปยังห้องคนขับของร้าน', () => {
      const order = {
        id: 1,
        trackingNumber: 'SP1234567890',
        merchantId: 5,
        productName: 'อาหาร',
      };
      const event = new OrderCreatedEvent(order);

      listener.handleOrderCreated(event);

      expect(mockTo).toHaveBeenCalledWith('merchant_5_drivers');
      expect(mockEmit).toHaveBeenCalledWith(
        'new_available_order',
        expect.objectContaining({
          ...order,
          message: 'มีออเดอร์ความต้องการสูงเข้ามาในพื้นที่!',
        }),
      );
    });

    it('ไม่ควรกระจาย event ถ้า order ไม่มี merchantId', () => {
      const event = new OrderCreatedEvent({
        id: 1,
        trackingNumber: 'SP1234567890',
        merchantId: null,
      });

      listener.handleOrderCreated(event);

      expect(mockTo).not.toHaveBeenCalled();
    });
  });

  describe('handleOrderStatusUpdated()', () => {
    it('ควรกระจาย order_status_update ไปยังห้องประจำออเดอร์', () => {
      const updatedOrder = {
        id: 1,
        status: OrderStatus.SHIPPING,
        merchantId: null,
      };
      const event = new OrderStatusUpdatedEvent(
        1,
        OrderStatus.SHIPPING,
        updatedOrder,
        'พัสดุกำลังเดินทาง',
      );

      listener.handleOrderStatusUpdated(event);

      expect(mockTo).toHaveBeenCalledWith('order_1');
      expect(mockEmit).toHaveBeenCalledWith('order_status_update', updatedOrder);
    });

    it('ควรกระจาย order_taken ไปยังคนขับของร้านถ้าสถานะเป็น ACCEPTED', () => {
      const updatedOrder = {
        id: 1,
        status: OrderStatus.ACCEPTED,
        merchantId: 5,
        driverId: 10,
      };
      const event = new OrderStatusUpdatedEvent(
        1,
        OrderStatus.ACCEPTED,
        updatedOrder,
        'คนขับรับงานแล้ว',
      );

      listener.handleOrderStatusUpdated(event);

      expect(mockTo).toHaveBeenCalledWith('order_1');
      expect(mockEmit).toHaveBeenCalledWith('order_status_update', updatedOrder);
      expect(mockTo).toHaveBeenCalledWith('merchant_5_drivers');
      expect(mockEmit).toHaveBeenCalledWith('order_taken', { orderId: 1 });
    });
  });
});
