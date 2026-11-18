import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WeatherService } from '../weather/weather.service';
import { MailerService } from '@nestjs-modules/mailer';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ORDER_EVENTS, OrderCreatedEvent } from './events';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateCustomerInfoDto } from './dto/update-customer-info.dto';
import { OrderStatus, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { Response } from 'express';
import { OrdersExportService } from './orders-export.service';
import { OrdersAnalyticsService } from './orders-analytics.service';
import { OrdersDeliveryService } from './orders-delivery.service';
import { OrdersMerchantService } from './orders-merchant.service';
import { OrdersCustomerService } from './orders-customer.service';
import {
  ORDER_FULL_DETAILS_INCLUDE,
  ORDER_MERCHANT_INFO_INCLUDE,
  ORDER_DRIVER_INFO_INCLUDE,
  ORDER_CUSTOMER_HISTORY_INCLUDE,
} from './orders.utils';

export {
  ORDER_FULL_DETAILS_INCLUDE,
  ORDER_MERCHANT_INFO_INCLUDE,
  ORDER_DRIVER_INFO_INCLUDE,
  ORDER_CUSTOMER_HISTORY_INCLUDE,
};

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private weatherService: WeatherService,
    private mailerService: MailerService,
    private eventEmitter: EventEmitter2,
    @Optional() private ordersExportService?: OrdersExportService,
    @Optional() private ordersAnalyticsService?: OrdersAnalyticsService,
    @Optional() private ordersDeliveryService?: OrdersDeliveryService,
    @Optional() private ordersMerchantService?: OrdersMerchantService,
    @Optional() private ordersCustomerService?: OrdersCustomerService,
  ) {
    if (!this.ordersExportService) {
      this.ordersExportService = new OrdersExportService(this.prisma);
    }
    if (!this.ordersAnalyticsService) {
      this.ordersAnalyticsService = new OrdersAnalyticsService(this.prisma);
    }
    if (!this.ordersDeliveryService) {
      this.ordersDeliveryService = new OrdersDeliveryService(
        this.prisma,
        this.eventEmitter,
      );
    }
    if (!this.ordersMerchantService) {
      this.ordersMerchantService = new OrdersMerchantService(
        this.prisma,
        this.eventEmitter,
      );
    }
    if (!this.ordersCustomerService) {
      this.ordersCustomerService = new OrdersCustomerService(this.prisma);
    }
  }

  private async createTrackingLog(
    orderId: number,
    status: string,
    note: string,
  ) {
    try {
      await this.prisma.trackingLog.create({
        data: {
          orderId,
          status,
          note,
          location: 'ระบบ SwiftPath (Automatic)',
        },
      });
    } catch (error) {
      console.error('Failed to create tracking log:', error);
    }
  }

  /**
   * สร้าง Tracking Number ที่ไม่ซ้ำกัน โดยใช้ crypto.randomUUID()
   */
  private generateTrackingNumber(): string {
    const uuid = randomUUID().replace(/-/g, '').substring(0, 10).toUpperCase();
    return `SP${uuid}`;
  }

  /**
   * Calculate distance between two points in km (Haversine formula)
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  async createOrder(merchantId: number, data: CreateOrderDto) {
    try {
      const trackingNumber = this.generateTrackingNumber();

      // ✅ SME Feature: คำนวณราคาจาก items[] ถ้ามี — มิฉะนั้นใช้ legacy price field
      const hasItems = data.items && data.items.length > 0;
      let basePrice = 0;
      if (hasItems) {
        basePrice = data.items!.reduce(
          (sum, item) => sum + item.unitPrice * item.quantity,
          0,
        );
      } else {
        basePrice = Number(data.price) || 0;
      }

      let finalTotalPrice = basePrice;
      let weatherWarning: string | null = null;
      let weatherLogMessage: string | null = null;
      let estimatedMinutes = 30;
      let isRaining = false;

      // auto-generate productName จาก items ถ้าไม่ได้ระบุมา
      const resolvedProductName =
        data.productName ||
        (hasItems
          ? data.items!.length === 1
            ? data.items![0].productName
            : `สินค้า ${data.items!.length} รายการ`
          : 'สินค้าไม่ระบุชื่อ');

      // 1. Fetch Merchant for location
      const merchant = await this.prisma.merchant.findUnique({
        where: { id: merchantId },
      });
      const merchantLat = merchant?.lat || 13.7563;
      const merchantLng = merchant?.lng || 100.5018;

      // 2. Check Weather for Surge Pricing and ETA Penalty
      if (data.city) {
        const city = data.city.trim();
        const weatherData = await this.weatherService.getWeather(city);
        if (
          weatherData &&
          weatherData.weather &&
          weatherData.weather.length > 0
        ) {
          const mainWeather = weatherData.weather[0].main;
          if (
            mainWeather === 'Rain' ||
            mainWeather === 'Thunderstorm' ||
            mainWeather === 'Drizzle'
          ) {
            isRaining = true;
            finalTotalPrice = finalTotalPrice * 1.2;
            weatherWarning = `คำเตือน: ตรวจพบฝนใน ${city} (เพิ่มค่าบริการ 20%, เวลาจัดส่งเพิ่มขึ้น)`;
            weatherLogMessage = `ตรวจพบสภาพอากาศ: ${mainWeather} ในพื้นที่ปลายทาง (ปรับราคาส่วนต่าง +20% & ETA +15 นาที)`;
          }
        }
      }

      // 3. Calculate ETA (Distance + Weather)
      if (data.lat && data.lng) {
        const distance = this.calculateDistance(
          merchantLat,
          merchantLng,
          data.lat,
          data.lng,
        );
        estimatedMinutes = Math.ceil(distance * 2) + 10;
        if (isRaining) estimatedMinutes += 15;
      }

      // 4. Insurance System
      const insuranceFee = data.hasInsurance ? 50 : 0;
      finalTotalPrice += insuranceFee;

      // 4.5 [P0 FIX] Auto-assign customerId if receiverPhone matches an existing customer
      const receiverPhoneStr =
        (data as any).recipientPhone || data.receiverPhone;
      let linkedCustomerId: number | null = null;
      if (receiverPhoneStr) {
        const existingCustomer = await this.prisma.customer.findUnique({
          where: { phone: receiverPhoneStr },
        });
        if (existingCustomer) {
          linkedCustomerId = existingCustomer.id;
        }
      }

      // 5. Create Order, OrderItems & Logs in Atomic Transaction
      const newOrder = await this.prisma.$transaction(async (tx) => {
        const order = await tx.order.create({
          data: {
            merchantId: Number(merchantId),
            customerId: linkedCustomerId, // ผูกกับลูกค้าระบบอัตโนมัติ
            trackingNumber,
            productName: resolvedProductName,
            productDetail: data.productDetail || null,
            quantity: hasItems
              ? data.items!.reduce((s, i) => s + i.quantity, 0)
              : data.quantity || 1,
            price: basePrice,
            totalPrice: finalTotalPrice,
            weatherWarning,
            estimatedMinutes,
            hasInsurance: !!data.hasInsurance,
            insuranceFee,

            // 🛡️ พิมพ์เปลี่ยน 3 บรรทัดนี้ให้เป็นแบบนี้ครับ
            receiverName: (data as any).recipientName || data.receiverName,
            receiverPhone: (data as any).recipientPhone || data.receiverPhone,
            address: (data as any).deliveryAddress || data.address,

            lat: data.lat,
            lng: data.lng,
            status: OrderStatus.PENDING,
          },
        });

        // ✅ SME Feature: สร้าง OrderItems ถ้ามีหลายรายการ
        if (hasItems) {
          await tx.orderItem.createMany({
            data: data.items!.map((item) => ({
              orderId: order.id,
              productName: item.productName,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.unitPrice * item.quantity,
              note: item.note || null,
              productId: item.productId || null,
            })),
          });
        }

        await tx.trackingLog.create({
          data: {
            orderId: order.id,
            status: 'PENDING',
            note: `ร้านค้าสร้างออเดอร์สำเร็จ (ETA: ${estimatedMinutes} นาที)`,
            location: 'ระบบ SwiftPath (Automatic)',
          },
        });
        if (weatherLogMessage) {
          await tx.trackingLog.create({
            data: {
              orderId: order.id,
              status: 'PENDING',
              note: weatherLogMessage,
              location: 'ระบบ SwiftPath (Automatic)',
            },
          });
        }
        if (data.hasInsurance) {
          await tx.trackingLog.create({
            data: {
              orderId: order.id,
              status: 'PENDING',
              note: 'มีการเปิดความคุ้มครองประกันภัยสินค้า SwiftPath Insurance',
              location: 'ระบบ SwiftPath (Automatic)',
            },
          });
        }
        return order;
      });

      this.notifyDrivers({
        ...newOrder,
        productName: newOrder.productName ?? 'หลายรายการ',
      });

      // ปล่อย Event เมื่อสร้างคำสั่งซื้อสำเร็จ (Event-Driven Architecture)
      this.eventEmitter.emit(
        ORDER_EVENTS.CREATED,
        new OrderCreatedEvent(newOrder),
      );

      return newOrder;
    } catch (error: any) {
      // [BUG-01 FIX] Re-throw known NestJS exceptions directly — preserve their status codes
      // and structured messages. Only wrap truly unexpected errors as 500.
      if (
        error instanceof BadRequestException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      // Log with structured context so the root cause is traceable in any log aggregator
      console.error('[createOrder] Unexpected failure', {
        merchantId,
        errorCode: error?.code,
        errorMessage: error?.message,
      });
      throw new InternalServerErrorException(
        'เกิดข้อผิดพลาดภายในระบบขณะสร้างออเดอร์ กรุณาลองใหม่อีกครั้งหรือติดต่อผู้ดูแลระบบ',
      );
    }
  }

  private async notifyDrivers(order: {
    trackingNumber: string;
    productName: string;
    merchantId?: number | null;
  }) {
    // [PERF-03 FIX] Run email sending in the next event loop tick (non-blocking).
    // Previously this was awaited inside the request cycle, meaning the API response
    // was delayed by email SMTP latency (typically 500ms–3s).
    // setImmediate schedules this after all I/O events in the current iteration.
    setImmediate(async () => {
      try {
        // [PERF-03 FIX] Only notify drivers affiliated with this merchant, not every driver in the system.
        // Sending to all verified drivers is a scalability problem at 100+ drivers.
        const whereClause: any = { isVerified: true, isActive: true };
        if (order.merchantId) {
          whereClause.merchantId = order.merchantId;
        }

        const drivers = await this.prisma.driver.findMany({
          where: whereClause,
          select: { email: true },
        });
        const driverEmails = drivers.map((driver) => driver.email);
        if (driverEmails.length > 0) {
          await this.mailerService.sendMail({
            to: driverEmails,
            subject: `มีงานใหม่เข้ามา! รหัสพัสดุ: ${order.trackingNumber}`,
            html: `<h3>มีออเดอร์ใหม่จาก SwiftPath</h3><p>รหัส: ${order.trackingNumber}</p><p>สินค้า: ${order.productName}</p>`,
          });
        }
      } catch (error) {
        // Email failure is non-critical — log but never throw to avoid crashing order creation
        console.error(
          '[notifyDrivers] Email notification failed (non-critical):',
          error,
        );
      }
    });
  }

  // ==== 🏪 Merchant Operations (Delegated to OrdersMerchantService) ====

  async getMyOrders(merchantId: number, page: number = 1, limit: number = 10) {
    return this.ordersMerchantService!.getMyOrders(merchantId, page, limit);
  }

  // ==== 🛒 Customer Operations (Delegated to OrdersCustomerService) ====

  async getCustomerOrders(
    customerId: number,
    page: number = 1,
    limit: number = 10,
  ) {
    return this.ordersCustomerService!.getCustomerOrders(customerId, page, limit);
  }

  async getOrderById(orderId: number, userId: number, role: string) {
    if (isNaN(orderId)) throw new BadRequestException('Invalid order ID');
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: ORDER_FULL_DETAILS_INCLUDE,
    });

    if (!order) throw new BadRequestException('Order not found');

    // Access Control: Strict — only directly involved parties
    if (role === 'Merchant' && order.merchantId !== userId)
      throw new ForbiddenException('Access denied');
    // [C-01] FIX: Driver must be the assigned driver — null driverId means no one has access
    if (role === 'Driver') {
      if (!order.driverId || order.driverId !== userId)
        throw new ForbiddenException('Access denied');
    }
    // [C-02] FIX: Customer must be explicitly assigned — null customerId means no customer access
    if (role === 'Customer') {
      if (!order.customerId || order.customerId !== userId)
        throw new ForbiddenException('Access denied');
    }

    return order;
  }

  async getPublicOrderTracking(trackingNumber: string) {
    return this.ordersCustomerService!.getPublicOrderTracking(trackingNumber);
  }

  async getOrderMessages(orderId: number, userId: number, role: string) {
    if (isNaN(orderId)) throw new BadRequestException('Invalid order ID');
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new BadRequestException('Order not found');

    // Access Control — same strict rules as getOrderById
    if (role === 'Merchant' && order.merchantId !== userId)
      throw new ForbiddenException('Access denied');
    if (role === 'Driver') {
      if (!order.driverId || order.driverId !== userId)
        throw new ForbiddenException('Access denied');
    }
    if (role === 'Customer') {
      if (!order.customerId || order.customerId !== userId)
        throw new ForbiddenException('Access denied');
    }

    return this.prisma.message.findMany({
      where: { orderId: Number(orderId) },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ==== Merchant Specific Features (Delegated to OrdersMerchantService) ====

  async getOrderStats(merchantId: number) {
    return this.ordersAnalyticsService!.getOrderStats(merchantId);
  }

  async cancelOrderByMerchant(orderId: number, merchantId: number) {
    return this.ordersMerchantService!.cancelOrderByMerchant(
      orderId,
      merchantId,
    );
  }

  async updateCustomerInfoByMerchant(
    orderId: number,
    merchantId: number,
    dto: UpdateCustomerInfoDto,
  ) {
    return this.ordersMerchantService!.updateCustomerInfoByMerchant(
      orderId,
      merchantId,
      dto,
    );
  }

  async updatePreparationTime(
    orderId: number,
    merchantId: number,
    estimatedReadyAt: string,
  ) {
    return this.ordersMerchantService!.updatePreparationTime(
      orderId,
      merchantId,
      estimatedReadyAt,
    );
  }

  async getMerchantHistory(
    merchantId: number,
    startDate?: string,
    endDate?: string,
  ) {
    return this.ordersMerchantService!.getMerchantHistory(
      merchantId,
      startDate,
      endDate,
    );
  }

  // ==== Customer Routes (Delegated to OrdersCustomerService) ====
  async getCustomerHistory(
    customerId: number,
    startDate?: string,
    endDate?: string,
  ) {
    return this.ordersCustomerService!.getCustomerHistory(
      customerId,
      startDate,
      endDate,
    );
  }

  // ==== 🆕 Analytics Dashboard Feature (Delegated to OrdersAnalyticsService) ====
  async getMerchantAnalytics(merchantId: number) {
    return this.ordersAnalyticsService!.getMerchantAnalytics(merchantId);
  }

  // ==== 🛵 Driver Operations (Delegated to OrdersDeliveryService) ====

  async findAllAvailable(driverId: number) {
    return this.ordersDeliveryService!.findAllAvailable(driverId);
  }

  async getDriverActiveJobs(driverId: number) {
    return this.ordersDeliveryService!.getDriverActiveJobs(driverId);
  }

  async getDriverHistory(
    driverId: number,
    startDate?: string,
    endDate?: string,
  ) {
    return this.ordersDeliveryService!.getDriverHistory(
      driverId,
      startDate,
      endDate,
    );
  }

  async acceptOrder(orderId: number, driverId: number) {
    return this.ordersDeliveryService!.acceptOrder(orderId, driverId);
  }

  async pickupOrder(orderId: number, driverId: number) {
    return this.ordersDeliveryService!.pickupOrder(orderId, driverId);
  }

  async startShippingOrder(orderId: number, driverId: number) {
    return this.ordersDeliveryService!.startShippingOrder(orderId, driverId);
  }

  async completeOrder(
    orderId: number,
    driverId: number,
    proofOfDeliveryBase64?: string,
  ) {
    return this.ordersDeliveryService!.completeOrder(
      orderId,
      driverId,
      proofOfDeliveryBase64,
    );
  }

  async payOrder(orderId: number, driverId: number) {
    return this.ordersDeliveryService!.payOrder(orderId, driverId);
  }

  async optimizeDeliveryRoute(
    driverId: number,
    currentLat?: number,
    currentLng?: number,
  ) {
    return this.ordersDeliveryService!.optimizeDeliveryRoute(
      driverId,
      currentLat,
      currentLng,
    );
  }

  // ==== ⭐ Enterprise Features: Rating System (Delegated to OrdersCustomerService) ====
  async rateOrder(
    orderId: number,
    userId: number,
    role: string,
    score: number,
    comment?: string,
  ) {
    return this.ordersCustomerService!.rateOrder(
      orderId,
      userId,
      role,
      score,
      comment,
    );
  }

  // ==== 📊 Driver Stats (Delegated to OrdersAnalyticsService) ====
  async getDriverStats(driverId: number) {
    return this.ordersAnalyticsService!.getDriverStats(driverId);
  }

  // Admin: สถิติภาพรวมทั้งระบบ (Delegated to OrdersAnalyticsService)
  async getAdminStats() {
    return this.ordersAnalyticsService!.getAdminStats();
  }

  // ==== ✅ SME Feature: Merchant Assigns Driver (Delegated to OrdersMerchantService) ====
  async assignDriver(orderId: number, merchantId: number, driverId: number) {
    return this.ordersMerchantService!.assignDriver(
      orderId,
      merchantId,
      driverId,
    );
  }

  // ==== ✅ SME Feature: ค้นหาประวัติออเดอร์ด้วยเบอร์โทรผู้รับ (Delegated to OrdersCustomerService) ====
  async getOrdersByPhone(phone: string) {
    return this.ordersCustomerService!.getOrdersByPhone(phone);
  }

  // ==== ✅ SME Feature: Export รายการออเดอร์เป็น CSV (Delegated to OrdersExportService) ====
  async exportOrdersCsv(
    merchantId: number,
    dateFrom?: string,
    dateTo?: string,
  ): Promise<string> {
    return this.ordersExportService!.exportOrdersCsv(
      merchantId,
      dateFrom,
      dateTo,
    );
  }

  // ==== ✅ SME Feature: Generate PDF Delivery Order (Delegated to OrdersExportService) ====
  async exportOrderPdf(
    orderId: number,
    userId: number,
    userRole: string,
    res: Response,
  ): Promise<void> {
    return this.ordersExportService!.exportOrderPdf(
      orderId,
      userId,
      userRole,
      res,
    );
  }
}
