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

  /**
   * จัดลำดับเส้นทางส่งอัตโนมัติ (Multi-Stop Route Optimization) สำหรับคนขับ
   * ใช้อัลกอริทึม Nearest Neighbor (Greedy TSP) คำนวณด้วย Haversine Formula
   * เปรียบเทียบระยะทางกับลำดับ FIFO เดิม พร้อมสร้าง Google Maps Universal Directions URL
   */
  async optimizeDeliveryRoute(
    driverId: number,
    currentLat?: number,
    currentLng?: number,
  ): Promise<RouteOptimizationResult> {
    const activeOrders = await this.getDriverActiveJobs(driverId);

    // คัดกรองออเดอร์ที่มีและไม่มีพิกัด GPS
    const validOrders: any[] = [];
    const unroutedOrders: UnroutedOrder[] = [];

    for (const order of activeOrders) {
      if (
        order.lat !== null &&
        order.lat !== undefined &&
        order.lng !== null &&
        order.lng !== undefined &&
        !isNaN(Number(order.lat)) &&
        !isNaN(Number(order.lng))
      ) {
        validOrders.push({
          ...order,
          lat: Number(order.lat),
          lng: Number(order.lng),
        });
      } else {
        unroutedOrders.push({
          orderId: order.id,
          trackingNumber: order.trackingNumber,
          receiverName: order.receiverName,
          address: order.address,
          reason: 'ไม่มีข้อมูลพิกัด GPS (lat/lng)',
        });
      }
    }

    if (validOrders.length === 0) {
      const hasDriverGps =
        currentLat !== undefined &&
        currentLng !== undefined &&
        !isNaN(Number(currentLat)) &&
        !isNaN(Number(currentLng));

      return {
        origin: hasDriverGps
          ? { lat: Number(currentLat), lng: Number(currentLng) }
          : null,
        originType: hasDriverGps ? 'DRIVER_GPS' : 'NONE',
        totalStops: 0,
        totalDistanceKm: 0,
        totalEstimatedDurationMin: 0,
        unoptimizedTotalDistanceKm: 0,
        savedDistanceKm: 0,
        savingsPercentage: 0,
        stops: [],
        unroutedOrders,
        googleMapsUrl: null,
      };
    }

    // กำหนดจุดเริ่มต้น (Origin)
    let origin: { lat: number; lng: number };
    let originType: 'DRIVER_GPS' | 'FIRST_ORDER' = 'DRIVER_GPS';

    if (
      currentLat !== undefined &&
      currentLng !== undefined &&
      !isNaN(Number(currentLat)) &&
      !isNaN(Number(currentLng))
    ) {
      origin = { lat: Number(currentLat), lng: Number(currentLng) };
      originType = 'DRIVER_GPS';
    } else {
      origin = { lat: validOrders[0].lat, lng: validOrders[0].lng };
      originType = 'FIRST_ORDER';
    }

    // 1. คำนวณระยะทางแบบเดิม (Unoptimized FIFO Sequence) เพื่อใช้เป็น Benchmark
    let unoptimizedDistance = 0;
    let prevPoint = origin;
    for (const order of validOrders) {
      unoptimizedDistance += calculateHaversineDistance(
        prevPoint.lat,
        prevPoint.lng,
        order.lat,
        order.lng,
      );
      prevPoint = { lat: order.lat, lng: order.lng };
    }
    unoptimizedDistance = Number(unoptimizedDistance.toFixed(2));

    // 2. จัดลำดับด้วยอัลกอริทึม Nearest Neighbor (Greedy TSP)
    const unvisited = [...validOrders];
    let currentPoint = origin;
    const optimizedStops: OptimizedStop[] = [];
    let cumulativeDistance = 0;
    let totalDurationMin = 0;

    let step = 1;
    while (unvisited.length > 0) {
      let nearestIndex = 0;
      let minDistance = Infinity;

      for (let i = 0; i < unvisited.length; i++) {
        const dist = calculateHaversineDistance(
          currentPoint.lat,
          currentPoint.lng,
          unvisited[i].lat,
          unvisited[i].lng,
        );
        if (dist < minDistance) {
          minDistance = dist;
          nearestIndex = i;
        }
      }

      const nextStop = unvisited.splice(nearestIndex, 1)[0];
      cumulativeDistance += minDistance;
      // ประมาณการเวลาเดินทาง (ความเร็วเฉลี่ย 30 กม./ชม. = 2 นาที/กม. + เวลาส่งมอบ 3 นาทีต่อจุด)
      const legDuration =
        Math.max(1, Math.round((minDistance / 30) * 60)) + 3;
      totalDurationMin += legDuration;

      optimizedStops.push({
        step,
        orderId: nextStop.id,
        trackingNumber: nextStop.trackingNumber,
        receiverName: nextStop.receiverName,
        receiverPhone: nextStop.receiverPhone,
        address: nextStop.address,
        lat: nextStop.lat,
        lng: nextStop.lng,
        status: nextStop.status,
        legDistanceKm: Number(minDistance.toFixed(2)),
        cumulativeDistanceKm: Number(cumulativeDistance.toFixed(2)),
        estimatedMinutesFromPrev: legDuration,
      });

      currentPoint = { lat: nextStop.lat, lng: nextStop.lng };
      step++;
    }

    cumulativeDistance = Number(cumulativeDistance.toFixed(2));
    const savedDistanceKm = Math.max(
      0,
      Number((unoptimizedDistance - cumulativeDistance).toFixed(2)),
    );
    const savingsPercentage =
      unoptimizedDistance > 0
        ? Number(((savedDistanceKm / unoptimizedDistance) * 100).toFixed(1))
        : 0;

    // 3. สร้าง Google Maps Universal Directions URL
    let googleMapsUrl: string | null = null;
    if (optimizedStops.length === 1) {
      const dest = optimizedStops[0];
      googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${dest.lat},${dest.lng}&travelmode=driving`;
    } else if (optimizedStops.length > 1) {
      const destination = optimizedStops[optimizedStops.length - 1];
      const waypoints = optimizedStops
        .slice(0, -1)
        .map((s) => `${s.lat},${s.lng}`)
        .join('|');
      googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&waypoints=${encodeURIComponent(waypoints)}&travelmode=driving`;
    }

    return {
      origin,
      originType,
      totalStops: optimizedStops.length,
      totalDistanceKm: cumulativeDistance,
      totalEstimatedDurationMin: totalDurationMin,
      unoptimizedTotalDistanceKm: unoptimizedDistance,
      savedDistanceKm,
      savingsPercentage,
      stops: optimizedStops,
      unroutedOrders,
      googleMapsUrl,
    };
  }
}

/**
 * คำนวณระยะทางตามแนวเส้นรอบวงโลก (Great Circle Distance) ด้วย Haversine Formula
 * @param lat1 ละติจูดจุดที่ 1 (องศา)
 * @param lon1 ลองจิจูดจุดที่ 1 (องศา)
 * @param lat2 ละติจูดจุดที่ 2 (องศา)
 * @param lon2 ลองจิจูดจุดที่ 2 (องศา)
 * @returns ระยะทางเป็นกิโลเมตร (km) ปัดเศษทศนิยม 2 ตำแหน่ง
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  if (lat1 === lat2 && lon1 === lon2) return 0;
  const R = 6371; // รัศมีเฉลี่ยของโลก (กิโลเมตร)
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

export interface OptimizedStop {
  step: number;
  orderId: number;
  trackingNumber: string;
  receiverName: string;
  receiverPhone: string;
  address: string;
  lat: number;
  lng: number;
  status: string;
  legDistanceKm: number;
  cumulativeDistanceKm: number;
  estimatedMinutesFromPrev: number;
}

export interface UnroutedOrder {
  orderId: number;
  trackingNumber: string;
  receiverName: string;
  address: string;
  reason: string;
}

export interface RouteOptimizationResult {
  origin: { lat: number; lng: number } | null;
  originType: 'DRIVER_GPS' | 'FIRST_ORDER' | 'NONE';
  totalStops: number;
  totalDistanceKm: number;
  totalEstimatedDurationMin: number;
  unoptimizedTotalDistanceKm: number;
  savedDistanceKm: number;
  savingsPercentage: number;
  stops: OptimizedStop[];
  unroutedOrders: UnroutedOrder[];
  googleMapsUrl: string | null;
}


