import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OrderStatus, Prisma } from '@prisma/client';
import {
  ORDER_EVENTS,
  OrderStatusUpdatedEvent,
} from './events';
import { uploadBase64ToStorage } from '../utils/firebase-storage';
import { ORDER_MERCHANT_INFO_INCLUDE } from './orders.service';

/** แปลงช่วงวันที่ YYYY-MM-DD ให้ครอบคลุม 00:00:00 ถึง 23:59:59.999 ตามเวลาไทย (UTC+7) */
function parseBangkokDateFilter(startDate?: string, endDate?: string) {
  const filter: any = {};
  if (startDate) {
    filter.gte = startDate.includes('T')
      ? new Date(startDate)
      : new Date(`${startDate}T00:00:00.000+07:00`);
  }
  if (endDate) {
    filter.lte = endDate.includes('T')
      ? new Date(endDate)
      : new Date(`${endDate}T23:59:59.999+07:00`);
  }
  return filter;
}

@Injectable()
export class OrdersDeliveryService {
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
    } catch (error) {
      console.error('Failed to create tracking log:', error);
    }
  }

  // ==== 🛵 Driver Job Discovery & History ====

  async findAllAvailable(driverId: number) {
    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
      select: { merchantId: true },
    });

    return this.prisma.order.findMany({
      where: {
        driverId: null,
        status: OrderStatus.PENDING,
        // If driver is attached to a merchant, only show orders from that merchant
        ...(driver?.merchantId && { merchantId: driver.merchantId }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getDriverActiveJobs(driverId: number) {
    return this.prisma.order.findMany({
      where: {
        driverId: Number(driverId),
        status: {
          in: [
            OrderStatus.ACCEPTED,
            OrderStatus.PICKED_UP,
            OrderStatus.SHIPPING,
          ],
        },
      },
      orderBy: { updatedAt: 'desc' },
      include: ORDER_MERCHANT_INFO_INCLUDE,
    });
  }

  async getDriverHistory(
    driverId: number,
    startDate?: string,
    endDate?: string,
  ) {
    const driverIdNum = Number(driverId);

    const whereClause: any = {
      driverId: driverIdNum,
      status: OrderStatus.DELIVERED,
    };

    if (startDate || endDate) {
      whereClause.updatedAt = parseBangkokDateFilter(startDate, endDate);
    }

    // 1. หาจำนวนงานทั้งหมดในช่วงเวลาที่เลือก (ระดับ DB)
    const totalDelivered = await this.prisma.order.count({
      where: whereClause,
    });

    // 2. หายอดเงินสดรวมผ่าน Aggregate เพื่อลด Memory (เฉพาะ Cash/COD/Unpaid)
    const cashStats = await this.prisma.order.aggregate({
      _sum: { totalPrice: true },
      where: {
        ...whereClause,
        OR: [
          { paymentMethod: 'COD' },
          { paymentMethod: 'Cash' },
          { paymentStatus: 'Unpaid' },
        ],
      },
    });

    // 3. ดึงประวัติรายการล่าสุด 50 รายการ (ลดภาระ RAM)
    const orders = await this.prisma.order.findMany({
      where: whereClause,
      orderBy: { updatedAt: 'desc' },
      take: 50,
      include: ORDER_MERCHANT_INFO_INCLUDE,
    });

    return {
      stats: {
        totalDelivered,
        totalCashCollected: cashStats._sum.totalPrice
          ? cashStats._sum.totalPrice.toNumber()
          : 0,
      },
      orders,
    };
  }

  // ==== 📦 Driver Lifecycle Operations ====

  async acceptOrder(orderId: number, driverId: number) {
    if (isNaN(orderId)) throw new BadRequestException('Invalid order ID');

    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
    });
    if (!driver) throw new BadRequestException('Driver not found');

    // ผูกการทำงานทั้งหมดอยู่ใน Database Transaction เดียวกัน ($transaction) ตามมาตรฐาน Atomic Transaction
    const updatedOrder = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
      });

      if (!order) {
        throw new NotFoundException('ไม่พบออเดอร์นี้');
      }

      if (order.status !== OrderStatus.PENDING || order.driverId !== null) {
        throw new ConflictException(
          'ออเดอร์นี้ถูกคนขับท่านอื่นรับไปแล้ว หรือสถานะไม่ถูกต้อง',
        );
      }

      if (driver.merchantId && order.merchantId !== driver.merchantId) {
        throw new ForbiddenException('คุณไม่มีสิทธิ์รับงานข้ามร้านค้า');
      }

      const updateResult = await tx.order.updateMany({
        where: {
          id: orderId,
          driverId: null,
          status: OrderStatus.PENDING,
          ...(driver.merchantId ? { merchantId: driver.merchantId } : {}),
        },
        data: {
          driverId,
          status: OrderStatus.ACCEPTED,
        },
      });

      if (updateResult.count === 0) {
        throw new ConflictException(
          'ออเดอร์นี้ถูกคนขับท่านอื่นรับไปแล้ว หรือสถานะไม่ถูกต้อง',
        );
      }

      const orderUpdated = await tx.order.findUnique({
        where: { id: orderId },
      });

      await tx.trackingLog.create({
        data: {
          orderId,
          status: OrderStatus.ACCEPTED,
          note: 'คนขับกดรับงานแล้ว กำลังเดินทางไปรับพัสดุที่ร้านค้า',
          location: 'ระบบ SwiftPath (Automatic)',
        },
      });

      return orderUpdated;
    });

    this.eventEmitter.emit(
      ORDER_EVENTS.STATUS_UPDATED,
      new OrderStatusUpdatedEvent(
        orderId,
        OrderStatus.ACCEPTED,
        updatedOrder,
        'คนขับกดรับงานแล้ว กำลังเดินทางไปรับพัสดุที่ร้านค้า',
      ),
    );

    return updatedOrder;
  }

  async pickupOrder(orderId: number, driverId: number) {
    if (isNaN(orderId)) throw new BadRequestException('Invalid order ID');
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new BadRequestException('ไม่พบออเดอร์นี้');
    if (order.driverId !== driverId)
      throw new ForbiddenException('คุณไม่ใช่คนขับที่รับออเดอร์นี้');
    if (order.status !== OrderStatus.ACCEPTED)
      throw new BadRequestException('ต้องรับงานก่อน (ACCEPTED)');

    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.PICKED_UP },
    });

    await this.createTrackingLog(
      orderId,
      'PICKED_UP',
      'คนขับรับพัสดุจากร้านค้าเรียบร้อยแล้ว',
    );
    this.eventEmitter.emit(
      ORDER_EVENTS.STATUS_UPDATED,
      new OrderStatusUpdatedEvent(
        orderId,
        OrderStatus.PICKED_UP,
        updatedOrder,
        'คนขับรับพัสดุจากร้านค้าเรียบร้อยแล้ว',
      ),
    );
    return updatedOrder;
  }

  async startShippingOrder(orderId: number, driverId: number) {
    if (isNaN(orderId)) throw new BadRequestException('Invalid order ID');
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new BadRequestException('ไม่พบออเดอร์นี้');
    if (order.driverId !== driverId)
      throw new ForbiddenException('คุณไม่ใช่คนขับที่รับออเดอร์นี้');
    if (order.status !== OrderStatus.PICKED_UP)
      throw new BadRequestException('ต้องรับของก่อน (PICKED_UP)');

    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.SHIPPING },
    });

    await this.createTrackingLog(
      orderId,
      'SHIPPING',
      'พัสดุกำลังเดินทางไปหาผู้รับพัสดุ',
    );
    this.eventEmitter.emit(
      ORDER_EVENTS.STATUS_UPDATED,
      new OrderStatusUpdatedEvent(
        orderId,
        OrderStatus.SHIPPING,
        updatedOrder,
        'พัสดุกำลังเดินทางไปหาผู้รับพัสดุ',
      ),
    );
    return updatedOrder;
  }

  async completeOrder(
    orderId: number,
    driverId: number,
    proofOfDeliveryBase64?: string,
  ) {
    if (isNaN(orderId)) throw new BadRequestException('Invalid order ID');
    if (!proofOfDeliveryBase64)
      throw new BadRequestException(
        'ต้องแนบรูปลิงก์หลักฐานการจัดส่ง (Proof of Delivery URL)',
      );
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new BadRequestException('ไม่พบออเดอร์นี้');
    if (order.driverId !== driverId)
      throw new ForbiddenException('คุณไม่ใช่คนขับที่รับออเดอร์นี้');
    if (order.status !== OrderStatus.SHIPPING)
      throw new BadRequestException('ต้องเริ่มการจัดส่งก่อน (SHIPPING)');

    let proofUrl: string | null = null;
    try {
      if (proofOfDeliveryBase64) {
        proofUrl = await uploadBase64ToStorage(
          proofOfDeliveryBase64,
          `proofs/${order.trackingNumber}`,
        );
      }
    } catch (e: any) {
      throw new BadRequestException('อัปโหลดหลักฐานไม่สำเร็จ: ' + e.message);
    }

    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.DELIVERED,
        proofOfDelivery: proofUrl,
      },
    });

    await this.createTrackingLog(
      orderId,
      'DELIVERED',
      'พัสดุถูกจัดส่งถึงมือผู้รับเรียบร้อยแล้วพร้อมหลักฐาน',
    );
    this.eventEmitter.emit(
      ORDER_EVENTS.STATUS_UPDATED,
      new OrderStatusUpdatedEvent(
        orderId,
        OrderStatus.DELIVERED,
        updatedOrder,
        'พัสดุถูกจัดส่งถึงมือผู้รับเรียบร้อยแล้วพร้อมหลักฐาน',
      ),
    );
    return updatedOrder;
  }

  async payOrder(orderId: number, driverId: number) {
    if (isNaN(orderId)) throw new BadRequestException('Invalid order ID');
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new BadRequestException('ไม่พบออเดอร์นี้');
    if (order.driverId !== driverId)
      throw new ForbiddenException('สิทธิ์ถูกปฏิเสธ');
    if (order.status !== OrderStatus.DELIVERED)
      throw new BadRequestException(
        '[BUG-002 FIX] ชำระเงินได้เฉพาะออเดอร์ที่จัดส่งสำเร็จแล้ว (DELIVERED) เท่านั้น',
      );
    if (order.paymentStatus === 'Paid')
      throw new BadRequestException('ออเดอร์นี้ชำระเงินแล้ว');

    const amountToPayDecimal = new Prisma.Decimal(
      order.totalPrice || order.price || 0,
    );
    const amountToPay = amountToPayDecimal.toNumber();

    const driverCut = amountToPayDecimal.mul(0.2).toNumber();
    const insuranceFeeNum = Number(order.insuranceFee);
    const merchantCut = amountToPayDecimal
      .minus(driverCut)
      .minus(insuranceFeeNum)
      .toNumber();

    await this.prisma.$transaction(async (tx) => {
      const lockUpdate = await tx.order.updateMany({
        where: { id: orderId, paymentStatus: 'Unpaid' },
        data: { paymentStatus: 'Paid' },
      });

      if (lockUpdate.count === 0) {
        throw new BadRequestException(
          'ออเดอร์นี้ชำระเงินไปแล้ว หรืออยู่ระหว่างทำรายการ',
        );
      }

      if (order.customerId && order.paymentMethod !== 'COD') {
        const updateResult = await tx.customer.updateMany({
          where: {
            id: order.customerId,
            balance: { gte: amountToPay },
          },
          data: { balance: { decrement: amountToPay } },
        });

        if (updateResult.count === 0) {
          throw new BadRequestException(
            `ยอดเงินลูกค้าไม่เพียงพอ (ต้องการ ฿${amountToPay.toFixed(2)})`,
          );
        }
        await tx.transaction.create({
          data: {
            amount: amountToPay,
            type: 'DEBIT',
            note: `ชำระค่าออเดอร์ #${order.trackingNumber}`,
            userId: order.customerId,
            userRole: 'Customer',
            orderId: order.id,
          },
        });
      } else {
        const driverOwed = merchantCut + insuranceFeeNum;
        if (driverOwed > 0) {
          const updateResult = await tx.driver.updateMany({
            where: { id: driverId, balance: { gte: driverOwed } },
            data: { balance: { decrement: driverOwed } },
          });
          if (updateResult.count === 0)
            throw new BadRequestException(
              `ยอดเงินเครดิตคนขับไม่เพียงพอสำหรับการหักเงินสด (COD) ต้องมีขั้นต่ำ ฿${driverOwed.toFixed(2)}`,
            );

          await tx.transaction.create({
            data: {
              amount: driverOwed,
              type: 'DEBIT',
              note: `นำส่งเงินสด COD เข้าสู่ระบบ #${order.trackingNumber}`,
              userId: driverId,
              userRole: 'Driver',
              orderId: order.id,
            },
          });
        }
      }

      if (order.merchantId && merchantCut > 0) {
        await tx.merchant.update({
          where: { id: order.merchantId },
          data: { balance: { increment: merchantCut } },
        });
        await tx.transaction.create({
          data: {
            amount: merchantCut,
            type: 'CREDIT',
            note: `รับเงินค่าสินค้า #${order.trackingNumber}`,
            userId: order.merchantId,
            userRole: 'Merchant',
            orderId: order.id,
          },
        });
      }

      if (order.customerId && order.paymentMethod !== 'COD' && driverCut > 0) {
        await tx.driver.update({
          where: { id: driverId },
          data: { balance: { increment: driverCut } },
        });
        await tx.transaction.create({
          data: {
            amount: driverCut,
            type: 'CREDIT',
            note: `ค่ารอบจัดส่ง #${order.trackingNumber}`,
            userId: driverId,
            userRole: 'Driver',
            orderId: order.id,
          },
        });
      }

      if (order.hasInsurance && insuranceFeeNum > 0) {
        await tx.transaction.create({
          data: {
            amount: insuranceFeeNum,
            type: 'CREDIT',
            note: `รายได้ค่าเบี้ยประกันสินค้า #${order.trackingNumber}`,
            userId: 0,
            userRole: 'Platform',
            orderId: order.id,
          },
        });
      }
    });

    const refreshedOrder = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (refreshedOrder) {
      this.eventEmitter.emit(
        ORDER_EVENTS.STATUS_UPDATED,
        new OrderStatusUpdatedEvent(
          orderId,
          refreshedOrder.status,
          refreshedOrder,
          'ชำระเงินและโอนเข้า Wallet สำเร็จ',
        ),
      );
    }

    return { success: true, message: 'ชำระเงินและโอนเข้า Wallet สำเร็จ' };
  }
}
