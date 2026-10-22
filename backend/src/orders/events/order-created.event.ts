/**
 * OrderCreatedEvent
 * เหตุการณ์ที่ถูกปล่อยออกมาเมื่อมีการสร้างออเดอร์ใหม่ในระบบสำเร็จ
 */
export class OrderCreatedEvent {
  constructor(
    public readonly order: {
      id: number;
      trackingNumber: string;
      productName?: string | null;
      merchantId?: number | null;
      totalPrice?: number | any;
      originLat?: number | null;
      originLng?: number | null;
      destLat?: number | null;
      destLng?: number | null;
      [key: string]: any;
    },
  ) {}

  get orderId(): number {
    return this.order.id;
  }

  get merchantId(): number | null | undefined {
    return this.order.merchantId;
  }

  get trackingNumber(): string {
    return this.order.trackingNumber;
  }

  get productName(): string {
    return this.order.productName ?? 'หลายรายการ';
  }
}
