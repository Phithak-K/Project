import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ChatGateway } from '../chat.gateway';
import {
  ORDER_EVENTS,
  OrderCreatedEvent,
  OrderStatusUpdatedEvent,
} from '../../orders/events';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class OrderChatListener {
  private readonly logger = new Logger(OrderChatListener.name);

  constructor(private readonly chatGateway: ChatGateway) {}

  /**
   * ดักฟังเหตุการณ์ OrderCreatedEvent
   * กระจาย WebSocket Event 'new_available_order' ไปยังคนขับที่สังกัดร้านค้าแบบ Real-Time
   */
  @OnEvent(ORDER_EVENTS.CREATED, { async: true })
  handleOrderCreated(event: OrderCreatedEvent) {
    this.logger.log(`[Event] handleOrderCreated for Order #${event.orderId}`);

    if (!this.chatGateway?.server) return;

    if (event.merchantId) {
      this.chatGateway.server
        .to(`merchant_${event.merchantId}_drivers`)
        .emit('new_available_order', {
          ...event.order,
          message: 'มีออเดอร์ความต้องการสูงเข้ามาในพื้นที่!',
        });
    }
  }

  /**
   * ดักฟังเหตุการณ์ OrderStatusUpdatedEvent
   * 1. กระจาย 'order_status_update' ไปยังห้องของออเดอร์นั้น (ลูกค้าและคนขับติดตามได้ทันที)
   * 2. หากสถานะเป็น ACCEPTED ให้แจ้งเตือน 'order_taken' ไปยังคนขับคนอื่นในร้าน
   */
  @OnEvent(ORDER_EVENTS.STATUS_UPDATED, { async: true })
  handleOrderStatusUpdated(event: OrderStatusUpdatedEvent) {
    this.logger.log(
      `[Event] handleOrderStatusUpdated for Order #${event.orderId} (Status: ${event.status})`,
    );

    if (!this.chatGateway?.server) return;

    // 1. ส่งสถานะออเดอร์ล่าสุดไปยังห้อง WebSocket ประจำออเดอร์
    this.chatGateway.server
      .to(`order_${event.orderId}`)
      .emit('order_status_update', event.order);

    // 1.1 ส่งไปยังห้อง Public Tracking Room เพื่อให้หน้า track/[id] ได้รับการอัปเดตสถานะแบบเรียลไทม์
    if (event.trackingNumber) {
      this.chatGateway.server
        .to(`tracking_${event.trackingNumber}`)
        .emit('order_status_update', event.order);
    }

    // 2. ถ้ามีคนรับงานแล้ว (ACCEPTED) ให้แจ้งห้องคนขับของร้านว่างานนี้ถูกรับไปแล้ว
    if (
      (event.status === OrderStatus.ACCEPTED || event.status === 'ACCEPTED') &&
      event.merchantId
    ) {
      this.chatGateway.server
        .to(`merchant_${event.merchantId}_drivers`)
        .emit('order_taken', { orderId: event.orderId });
    }
  }
}
