import {
  Injectable,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OrderStatus } from '@prisma/client';
import { ORDER_EVENTS, OrderStatusUpdatedEvent } from './events';
import { UpdateCustomerInfoDto } from './dto/update-customer-info.dto';
import {
  CHART_TZ,
  parseBangkokDateFilter,
  ORDER_FULL_DETAILS_INCLUDE,
  ORDER_DRIVER_INFO_INCLUDE,
} from './orders.utils';

@Injectable()
export class OrdersMerchantService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

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
    } catch (e) {
      console.warn('⚠️ TrackingLog Failed:', e);
    }
  }

  async getMyOrders(merchantId: number, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where: { merchantId: Number(merchantId) },
        orderBy: { createdAt: 'desc' },
        include: { trackingLogs: true },
        skip,
        take: limit,
      }),
      this.prisma.order.count({ where: { merchantId: Number(merchantId) } }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async cancelOrderByMerchant(orderId: number, merchantId: number) {
    if (isNaN(orderId)) throw new BadRequestException('Invalid order ID');
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) throw new BadRequestException('ไม่พบออเดอร์นี้');
    if (order.merchantId !== merchantId)
      throw new ForbiddenException('คุณไม่ใช่เจ้าของร้านค้านี้');
    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(
        'ยกเลิกได้เฉพาะออเดอร์ที่ยังไม่มีคนขับรับ (สถานะ PENDING) เท่านั้น',
      );
    }

    const canceledOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.CANCELLED },
    });

    await this.createTrackingLog(
      orderId,
      'CANCELLED',
      'ร้านค้ายกเลิกออเดอร์นี้แล้ว',
    );

    this.eventEmitter.emit(
      ORDER_EVENTS.STATUS_UPDATED,
      new OrderStatusUpdatedEvent(
        orderId,
        OrderStatus.CANCELLED,
        canceledOrder,
        'ร้านค้ายกเลิกออเดอร์นี้แล้ว',
      ),
    );

    return canceledOrder;
  }

  async updateCustomerInfoByMerchant(
    orderId: number,
    merchantId: number,
    dto: UpdateCustomerInfoDto,
  ) {
    if (isNaN(orderId)) throw new BadRequestException('Invalid order ID');
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) throw new BadRequestException('ไม่พบออเดอร์นี้');
    if (order.merchantId !== merchantId)
      throw new ForbiddenException('คุณไม่ใช่เจ้าของร้านค้านี้');

    if (
      order.status !== OrderStatus.PENDING &&
      order.status !== OrderStatus.ACCEPTED
    ) {
      throw new BadRequestException(
        'ไม่สามารถแก้ไขข้อมูลจัดส่งได้ในสถานะนี้ (พัสดุอยู่ระหว่างนำส่งหรือเสร็จสิ้นแล้ว)',
      );
    }

    const dataToUpdate: any = {};
    if (dto.receiverName && dto.receiverName.trim()) {
      dataToUpdate.receiverName = dto.receiverName.trim();
    }
    if (dto.receiverPhone && dto.receiverPhone.trim()) {
      dataToUpdate.receiverPhone = dto.receiverPhone.trim();
    }
    if (dto.address && dto.address.trim()) {
      dataToUpdate.address = dto.address.trim();
    }
    if (dto.productDetail !== undefined) {
      dataToUpdate.productDetail = dto.productDetail.trim();
    }

    if (Object.keys(dataToUpdate).length === 0) {
      return order;
    }

    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: dataToUpdate,
      include: ORDER_FULL_DETAILS_INCLUDE,
    });

    await this.createTrackingLog(
      orderId,
      order.status,
      'ร้านค้าแก้ไขข้อมูลผู้รับ / สถานที่จัดส่ง',
    );

    if (this.eventEmitter) {
      this.eventEmitter.emit(
        ORDER_EVENTS.STATUS_UPDATED,
        new OrderStatusUpdatedEvent(
          orderId,
          order.status,
          updatedOrder,
          'ร้านค้าแก้ไขข้อมูลผู้รับ / สถานที่จัดส่ง',
        ),
      );
    }
    return updatedOrder;
  }

  async updatePreparationTime(
    orderId: number,
    merchantId: number,
    estimatedReadyAt: string,
  ) {
    if (isNaN(orderId)) throw new BadRequestException('Invalid order ID');
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) throw new BadRequestException('ไม่พบออเดอร์นี้');
    if (order.merchantId !== merchantId)
      throw new ForbiddenException('คุณไม่ใช่เจ้าของร้านค้านี้');

    // ร้านค้าควรอัปเดตเวลาได้ตอน PENDING หรือ SHIPPING ก็ได้ (เช่น ของมาช้า)
    if (
      order.status === OrderStatus.DELIVERED ||
      order.status === OrderStatus.CANCELLED
    ) {
      throw new BadRequestException('ไม่สามารถเปลี่ยนเวลาเตรียมของได้แล้ว');
    }

    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: { estimatedReadyAt: new Date(estimatedReadyAt) },
    });

    await this.createTrackingLog(
      orderId,
      order.status,
      `ร้านค้าอัปเดตเวลาเตรียมของเสร็จเป็น: ${new Date(estimatedReadyAt).toLocaleString('th-TH', { timeZone: CHART_TZ })}`,
    );

    return updatedOrder;
  }

  // ✅ New Feature: Fetch merchant history and stats (Optimized + Date Filter)
  async getMerchantHistory(
    merchantId: number,
    startDate?: string,
    endDate?: string,
  ) {
    const merchantIdNum = Number(merchantId);

    // สร้าง Date Filter Clause
    const whereClause: any = {
      merchantId: merchantIdNum,
      status: OrderStatus.DELIVERED,
    };

    if (startDate || endDate) {
      whereClause.updatedAt = parseBangkokDateFilter(startDate, endDate);
    }

    // 1. หาจำนวนงานทั้งหมดในช่วงเวลาที่เลือก (ระดับ DB)
    const totalDelivered = await this.prisma.order.count({
      where: whereClause,
    });

    // 2. หายอดขายรวมผ่าน Aggregate เพื่อลด Memory
    const stats = await this.prisma.order.aggregate({
      _sum: { totalPrice: true },
      where: whereClause,
    });

    // 3. ดึงประวัติรายการล่าสุด 50 รายการ (ลดภาระ RAM)
    const orders = await this.prisma.order.findMany({
      where: whereClause,
      orderBy: { updatedAt: 'desc' },
      take: 50,
      include: ORDER_DRIVER_INFO_INCLUDE,
    });

    return {
      stats: {
        totalDelivered,
        totalRevenue: stats._sum.totalPrice ? stats._sum.totalPrice.toNumber() : 0,
      },
      orders,
    };
  }

  // ==== ✅ SME Feature: Merchant Assigns Driver ====
  async assignDriver(orderId: number, merchantId: number, driverId: number) {
    if (isNaN(orderId)) throw new BadRequestException('Invalid order ID');

    // Verify driver belongs to this merchant first
    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
    });
    if (!driver) throw new BadRequestException('ไม่พบข้อมูลคนขับ');
    if (driver.merchantId && driver.merchantId !== merchantId) {
      throw new ForbiddenException('คนขับคนนี้ไม่ได้สังกัดร้านของคุณ');
    }

    try {
      // [SEC-02 ARC FIX] Use Atomic update with compound WHERE clause — same pattern as acceptOrder.
      const updatedOrder = await this.prisma.order.update({
        where: {
          id: orderId,
          merchantId, // Guard: caller must own this order
          status: OrderStatus.PENDING, // Guard: can only assign to PENDING orders
        },
        data: { driverId, status: OrderStatus.ACCEPTED },
      });

      await this.createTrackingLog(
        orderId,
        'ACCEPTED',
        `ร้านค้ามอบหมายงานให้ ${driver.name || 'คนขับ'} (ทะเบียน: ${driver.vehiclePlate || '-'})`,
      );

      this.eventEmitter.emit(
        ORDER_EVENTS.STATUS_UPDATED,
        new OrderStatusUpdatedEvent(
          orderId,
          OrderStatus.ACCEPTED,
          updatedOrder,
          `ร้านค้ามอบหมายงานให้ ${driver.name || 'คนขับ'} (ทะเบียน: ${driver.vehiclePlate || '-'})`,
        ),
      );

      return updatedOrder;
    } catch (error: any) {
      // P2025 = record matching the WHERE clause not found
      if (error.code === 'P2025') {
        throw new BadRequestException(
          'ไม่พบออเดอร์นี้ หรือออเดอร์ไม่ได้อยู่ในสถานะที่สามารถมอบหมายได้ (ต้องเป็น PENDING และเป็นออเดอร์ของคุณ)',
        );
      }
      throw error;
    }
  }
}
