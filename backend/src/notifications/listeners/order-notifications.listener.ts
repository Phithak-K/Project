import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationsService } from '../notifications.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ORDER_EVENTS,
  OrderStatusUpdatedEvent,
  OrderCreatedEvent,
} from '../../orders/events';

@Injectable()
export class OrderNotificationsListener {
  private readonly logger = new Logger(OrderNotificationsListener.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * ดักฟังเหตุการณ์ OrderStatusUpdatedEvent เมื่อสถานะคำสั่งซื้อเปลี่ยนแปลง
   * เพื่อส่ง Push Notification แจ้งเตือนไปยัง Customer และ Merchant ผ่าน Firebase Cloud Messaging
   */
  @OnEvent(ORDER_EVENTS.STATUS_UPDATED, { async: true })
  async handleOrderStatusUpdated(event: OrderStatusUpdatedEvent) {
    this.logger.log(
      `[Event] handleOrderStatusUpdated for Order #${event.orderId} (Status: ${event.status})`,
    );

    try {
      // ดึงข้อมูล FCM Token ของ Customer และ Merchant ใน Query เดียว
      const order = await this.prisma.order.findUnique({
        where: { id: event.orderId },
        include: {
          customer: { select: { fcmToken: true } },
          merchant: { select: { fcmToken: true } },
        },
      });

      if (!order) return;

      const trackingNumber =
        order.trackingNumber || event.trackingNumber || `SP${order.id}`;

      // แจ้งเตือนลูกค้าผ่าน FCM
      if (order.customer?.fcmToken) {
        await this.notificationsService.sendOrderStatusUpdate(
          order.customer.fcmToken,
          trackingNumber,
          String(event.status),
        );
      }

      // แจ้งเตือนร้านค้าผ่าน FCM
      if (order.merchant?.fcmToken) {
        await this.notificationsService.sendOrderStatusUpdate(
          order.merchant.fcmToken,
          trackingNumber,
          String(event.status),
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to send push notification for Order #${event.orderId}:`,
        error,
      );
    }
  }

  /**
   * ดักฟังเหตุการณ์ OrderCreatedEvent เมื่อมีการสร้างออเดอร์ใหม่
   */
  @OnEvent(ORDER_EVENTS.CREATED, { async: true })
  async handleOrderCreated(event: OrderCreatedEvent) {
    this.logger.log(`[Event] handleOrderCreated for Order #${event.orderId}`);
    // สามารถต่อยอดส่ง Push Notification ไปยังร้านค้าหรือระบบ Monitor ได้ที่นี่
  }
}
