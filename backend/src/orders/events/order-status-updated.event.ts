import { OrderStatus } from '@prisma/client';

/**
 * OrderStatusUpdatedEvent
 * เหตุการณ์ที่ถูกปล่อยออกมาเมื่อสถานะของออเดอร์มีการเปลี่ยนแปลง
 * เช่น ACCEPTED, PICKED_UP, SHIPPING, DELIVERED, CANCELLED
 */
export class OrderStatusUpdatedEvent {
  constructor(
    public readonly orderId: number,
    public readonly status: OrderStatus | string,
    public readonly order: any,
    public readonly note?: string,
    public readonly previousStatus?: OrderStatus | string,
  ) {}

  get merchantId(): number | null | undefined {
    return this.order?.merchantId;
  }

  get driverId(): number | null | undefined {
    return this.order?.driverId;
  }

  get customerId(): number | null | undefined {
    return this.order?.customerId;
  }

  get trackingNumber(): string | undefined {
    return this.order?.trackingNumber;
  }
}
