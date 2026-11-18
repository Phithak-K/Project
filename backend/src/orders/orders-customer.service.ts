import {
  Injectable,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus, UserRole } from '@prisma/client';
import {
  parseBangkokDateFilter,
  ORDER_CUSTOMER_HISTORY_INCLUDE,
} from './orders.utils';

@Injectable()
export class OrdersCustomerService {
  constructor(private prisma: PrismaService) {}

  async getCustomerOrders(
    customerId: number,
    page: number = 1,
    limit: number = 10,
  ) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where: { customerId: Number(customerId) },
        orderBy: { createdAt: 'desc' },
        include: {
          trackingLogs: true,
          merchant: { select: { storeName: true } },
        },
        skip,
        take: limit,
      }),
      this.prisma.order.count({ where: { customerId: Number(customerId) } }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getPublicOrderTracking(trackingNumber: string) {
    if (!trackingNumber)
      throw new BadRequestException('Tracking number is required');

    // ✅ MEDIUM-02 FIX: Validate format — ป้องกันส่ง payload ยาวไม่จำกัด
    if (!/^SP[A-Z0-9-]{8,15}$/.test(trackingNumber)) {
      throw new BadRequestException(
        'รูปแบบหมายเลขพัสดุไม่ถูกต้อง (ตัวอย่าง: SP1A2B3C4D5E, SP-DEMO-001)',
      );
    }

    const order = await this.prisma.order.findUnique({
      where: { trackingNumber },
      select: {
        id: true,
        trackingNumber: true,
        productName: true,
        status: true,
        weatherWarning: true,
        estimatedMinutes: true,
        estimatedReadyAt: true,
        lat: true,
        lng: true,
        driver: {
          select: { name: true, vehiclePlate: true, vehicleType: true },
        },
        trackingLogs: {
          where: { isPublic: true },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            status: true,
            note: true,
            location: true,
            lat: true,
            lng: true,
            createdAt: true,
          },
        },
      },
    });

    if (!order) throw new BadRequestException('ไม่พบข้อมูลพัสดุสำหรับรหัสนี้');

    // ✅ MEDIUM-01 FIX: Fuzzy lat/lng — ลดความแม่นยำเหลือ ~1km (แสดงโซนบนแมปได้แต่ระบุบ้านไม่ได้)
    const fuzzyLogs = order.trackingLogs.map((log) => ({
      ...log,
      lat: log.lat != null ? Math.round(log.lat * 100) / 100 : null,
      lng: log.lng != null ? Math.round(log.lng * 100) / 100 : null,
    }));

    return {
      ...order,
      lat: order.lat != null ? Math.round(order.lat * 100) / 100 : null,
      lng: order.lng != null ? Math.round(order.lng * 100) / 100 : null,
      trackingLogs: fuzzyLogs,
    };
  }

  async getCustomerHistory(
    customerId: number,
    startDate?: string,
    endDate?: string,
  ) {
    const whereClause: any = {
      customerId,
      status: OrderStatus.DELIVERED,
    };

    if (startDate || endDate) {
      whereClause.updatedAt = parseBangkokDateFilter(startDate, endDate);
    }

    const totalDelivered = await this.prisma.order.count({
      where: whereClause,
    });

    const stats = await this.prisma.order.aggregate({
      _sum: { totalPrice: true },
      where: whereClause,
    });

    const orders = await this.prisma.order.findMany({
      where: whereClause,
      orderBy: { updatedAt: 'desc' },
      take: 50,
      include: ORDER_CUSTOMER_HISTORY_INCLUDE,
    });

    return {
      stats: {
        totalDelivered,
        totalSpent: stats._sum.totalPrice ? stats._sum.totalPrice.toNumber() : 0,
      },
      orders,
    };
  }

  // ==== ⭐ Enterprise Features: Rating System ====
  async rateOrder(
    orderId: number,
    userId: number,
    role: string,
    score: number,
    comment?: string,
  ) {
    if (isNaN(orderId)) throw new BadRequestException('Invalid order ID');
    if (score < 1 || score > 5)
      throw new BadRequestException('คะแนนต้องอยู่ระหว่าง 1 ถึง 5');

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new BadRequestException('ไม่พบออเดอร์นี้');
    if (!order.driverId) throw new BadRequestException('ออเดอร์นี้ไม่มีคนขับ');
    // [H-03] FIX: Verify ownership before rating
    if (order.status !== OrderStatus.DELIVERED)
      throw new BadRequestException('ต้องจัดส่งสำเร็จก่อนจึงจะให้คะแนนได้');
    if (role === 'Customer' && order.customerId !== userId)
      throw new ForbiddenException('คุณไม่ใช่เจ้าของออเดอร์นี้');
    if (role === 'Merchant' && order.merchantId !== userId)
      throw new ForbiddenException('คุณไม่ใช่เจ้าของออเดอร์นี้');

    const existingRating = await this.prisma.rating.findUnique({
      where: { orderId },
    });
    if (existingRating)
      throw new BadRequestException('ออเดอร์นี้ถูกให้คะแนนไปแล้ว');

    const newRating = await this.prisma.rating.create({
      data: {
        score,
        comment,
        orderId,
        raterId: userId,
        raterRole: role as UserRole,
        driverId: order.driverId,
      },
    });

    return newRating;
  }

  // ==== ✅ SME Feature: ค้นหาประวัติออเดอร์ด้วยเบอร์โทรผู้รับ ====
  async getOrdersByPhone(phone: string) {
    if (!phone || phone.length < 9)
      throw new BadRequestException(
        'กรุณาระบุเบอร์โทรที่ถูกต้อง (อย่างน้อย 9 หลัก)',
      );

    const orders = await this.prisma.order.findMany({
      where: { receiverPhone: phone },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        trackingNumber: true,
        productName: true,
        status: true,
        totalPrice: true,
        price: true,
        receiverName: true,
        address: true,
        createdAt: true,
        estimatedMinutes: true,
        items: {
          select: {
            productName: true,
            quantity: true,
            unitPrice: true,
            totalPrice: true,
          },
        },
        merchant: { select: { storeName: true, phone: true } },
        trackingLogs: {
          where: { isPublic: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { status: true, note: true, createdAt: true },
        },
      },
    });

    return orders;
  }
}
