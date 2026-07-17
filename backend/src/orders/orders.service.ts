import { Injectable, BadRequestException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WeatherService } from '../weather/weather.service';
import { MailerService } from '@nestjs-modules/mailer';
import { ChatGateway } from '../chat/chat.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderStatus, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { uploadBase64ToStorage } from '../utils/firebase-storage';
import { Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';
const PDFDocument = require('pdfkit');

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private weatherService: WeatherService,
    private mailerService: MailerService,
    @Inject(forwardRef(() => ChatGateway))
    private chatGateway: ChatGateway,
    private notificationsService: NotificationsService,
  ) {}

  private async createTrackingLog(orderId: number, status: string, note: string) {
    try {
      await this.prisma.trackingLog.create({
        data: {
          orderId,
          status,
          note,
          location: 'ระบบ SwiftPath (Automatic)',
        },
      });
      await this.notifyOrderParties(orderId, status);
    } catch (error) {
      console.error('Failed to create tracking log:', error);
    }
  }

  private async notifyOrderParties(orderId: number, status: string) {
    // [PERF-01 FIX] ใช้ include ดึงข้อมูล Customer และ Merchant ใน Query เดียวแทน 3 Queries
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: { select: { fcmToken: true } },
        merchant: { select: { fcmToken: true } },
      },
    });
    if (!order) return;

    if (order.customer?.fcmToken) {
      await this.notificationsService.sendOrderStatusUpdate(order.customer.fcmToken, order.trackingNumber, status);
    }
    if (order.merchant?.fcmToken) {
      await this.notificationsService.sendOrderStatusUpdate(order.merchant.fcmToken, order.trackingNumber, status);
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
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
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
        basePrice = data.items!.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
      } else {
        basePrice = Number(data.price) || 0;
      }

      let finalTotalPrice = basePrice;
      let weatherWarning: string | null = null;
      let weatherLogMessage: string | null = null;
      let estimatedMinutes = 30;
      let isRaining = false;

      // auto-generate productName จาก items ถ้าไม่ได้ระบุมา
      const resolvedProductName = data.productName
        || (hasItems ? (data.items!.length === 1 ? data.items![0].productName : `สินค้า ${data.items!.length} รายการ`) : 'สินค้าไม่ระบุชื่อ');

      // 1. Fetch Merchant for location
      const merchant = await this.prisma.merchant.findUnique({ where: { id: merchantId } });
      const merchantLat = merchant?.lat || 13.7563;
      const merchantLng = merchant?.lng || 100.5018;

      // 2. Check Weather for Surge Pricing and ETA Penalty
      if (data.city) {
        const city = data.city.trim();
        const weatherData = await this.weatherService.getWeather(city);
        if (weatherData && weatherData.weather && weatherData.weather.length > 0) {
          const mainWeather = weatherData.weather[0].main;
          if (mainWeather === 'Rain' || mainWeather === 'Thunderstorm' || mainWeather === 'Drizzle') {
            isRaining = true;
            finalTotalPrice = finalTotalPrice * 1.20;
            weatherWarning = `คำเตือน: ตรวจพบฝนใน ${city} (เพิ่มค่าบริการ 20%, เวลาจัดส่งเพิ่มขึ้น)`;
            weatherLogMessage = `ตรวจพบสภาพอากาศ: ${mainWeather} ในพื้นที่ปลายทาง (ปรับราคาส่วนต่าง +20% & ETA +15 นาที)`;
          }
        }
      }

      // 3. Calculate ETA (Distance + Weather)
      if (data.lat && data.lng) {
        const distance = this.calculateDistance(merchantLat, merchantLng, data.lat, data.lng);
        estimatedMinutes = Math.ceil(distance * 2) + 10;
        if (isRaining) estimatedMinutes += 15;
      }

      // 4. Insurance System
      const insuranceFee = data.hasInsurance ? 50 : 0;
      finalTotalPrice += insuranceFee;

      // 5. Create Order, OrderItems & Logs in Atomic Transaction
      const newOrder = await this.prisma.$transaction(async (tx) => {
        const order = await tx.order.create({
  data: {
    merchantId: Number(merchantId),
    trackingNumber,
    productName: resolvedProductName,
    productDetail: data.productDetail || null,
    quantity: hasItems ? data.items!.reduce((s, i) => s + i.quantity, 0) : (data.quantity || 1),
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
          data: { orderId: order.id, status: 'PENDING', note: `ร้านค้าสร้างออเดอร์สำเร็จ (ETA: ${estimatedMinutes} นาที)`, location: 'ระบบ SwiftPath (Automatic)' }
        });
        if (weatherLogMessage) {
          await tx.trackingLog.create({
            data: { orderId: order.id, status: 'PENDING', note: weatherLogMessage, location: 'ระบบ SwiftPath (Automatic)' }
          });
        }
        if (data.hasInsurance) {
          await tx.trackingLog.create({
            data: { orderId: order.id, status: 'PENDING', note: 'มีการเปิดความคุ้มครองประกันภัยสินค้า SwiftPath Insurance', location: 'ระบบ SwiftPath (Automatic)' }
          });
        }
        return order;
      });

      this.notifyDrivers({
        ...newOrder,
        productName: newOrder.productName ?? 'หลายรายการ'
      });

      if (this.chatGateway && this.chatGateway.server) {
        this.chatGateway.server.emit('new_available_order', {
          ...newOrder,
          message: 'มีออเดอร์ความต้องการสูงเข้ามาในพื้นที่!',
        });
      }

      return newOrder;
    } catch (error) {
      console.error('Create Order Error:', error);
      throw new BadRequestException('ไม่สามารถสร้างออเดอร์ได้ กรุณาตรวจสอบข้อมูลอีกครั้ง');
    }
  }

  private async notifyDrivers(order: { trackingNumber: string; productName: string }) {
    try {
      // ✅ BUG-04: เฉพาะ Driver ที่ verified และ active เท่านั้น
      const drivers = await this.prisma.driver.findMany({
        where: { isVerified: true, isActive: true },
        select: { email: true },
      });
      const driverEmails = drivers.map(driver => driver.email);
      if (driverEmails.length > 0) {
        await this.mailerService.sendMail({
          to: driverEmails,
          subject: `มีงานใหม่เข้ามา! รหัสพัสดุ: ${order.trackingNumber}`,
          html: `<h3>มีออเดอร์ใหม่จาก SwiftPath</h3><p>รหัส: ${order.trackingNumber}</p><p>สินค้า: ${order.productName}</p>`,
        });
      }
    } catch (error) {
      console.error('Email Notification Error:', error);
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
      this.prisma.order.count({ where: { merchantId: Number(merchantId) } })
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getCustomerOrders(customerId: number, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where: { customerId: Number(customerId) },
        orderBy: { createdAt: 'desc' },
        include: { trackingLogs: true, merchant: { select: { storeName: true } } },
        skip,
        take: limit,
      }),
      this.prisma.order.count({ where: { customerId: Number(customerId) } })
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getOrderById(orderId: number, userId: number, role: string) {
    if (isNaN(orderId)) throw new BadRequestException('Invalid order ID');
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        trackingLogs: { orderBy: { createdAt: 'desc' } },
        merchant: { select: { storeName: true, phone: true } },
        driver: { select: { name: true, phone: true, vehiclePlate: true } },
        customer: { select: { name: true } },
        items: true,
      },
    });

    if (!order) throw new BadRequestException('Order not found');

    // Access Control: Strict — only directly involved parties
    if (role === 'Merchant' && order.merchantId !== userId) throw new ForbiddenException('Access denied');
    // [C-01] FIX: Driver must be the assigned driver — null driverId means no one has access
    if (role === 'Driver') {
      if (!order.driverId || order.driverId !== userId) throw new ForbiddenException('Access denied');
    }
    // [C-02] FIX: Customer must be explicitly assigned — null customerId means no customer access
    if (role === 'Customer') {
      if (!order.customerId || order.customerId !== userId) throw new ForbiddenException('Access denied');
    }

    return order;
  }

  async getPublicOrderTracking(trackingNumber: string) {
    if (!trackingNumber) throw new BadRequestException('Tracking number is required');

    // ✅ MEDIUM-02 FIX: Validate format — ป้องกันส่ง payload ยาวไม่จำกัด
    if (!/^SP[A-Z0-9]{10}$/.test(trackingNumber)) {
      throw new BadRequestException('รูปแบบหมายเลขพัสดุไม่ถูกต้อง (ตัวอย่าง: SP1A2B3C4D5E)');
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
        driver: { select: { name: true, vehiclePlate: true, vehicleType: true } },
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
          }
        }
      }
    });

    if (!order) throw new BadRequestException('ไม่พบข้อมูลพัสดุสำหรับรหัสนี้');

    // ✅ MEDIUM-01 FIX: Fuzzy lat/lng — ลดความแม่นยำเหลือ ~1km (แสดงโซนบนแมปได้แต่ระบุบ้านไม่ได้)
    return {
      ...order,
      lat: order.lat != null ? Math.round(order.lat * 100) / 100 : null,
      lng: order.lng != null ? Math.round(order.lng * 100) / 100 : null,
    };
  }

  async getOrderMessages(orderId: number, userId: number, role: string) {
    if (isNaN(orderId)) throw new BadRequestException('Invalid order ID');
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new BadRequestException('Order not found');

    // Access Control — same strict rules as getOrderById
    if (role === 'Merchant' && order.merchantId !== userId) throw new ForbiddenException('Access denied');
    if (role === 'Driver') {
      if (!order.driverId || order.driverId !== userId) throw new ForbiddenException('Access denied');
    }
    if (role === 'Customer') {
      if (!order.customerId || order.customerId !== userId) throw new ForbiddenException('Access denied');
    }

    return this.prisma.message.findMany({
      where: { orderId: Number(orderId) },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ==== Merchant Specific Features ====

  async getOrderStats(merchantId: number) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const pendingCount = await this.prisma.order.count({
      where: { merchantId: Number(merchantId), status: OrderStatus.PENDING },
    });

    const activeDeliveringCount = await this.prisma.order.count({
      where: { merchantId: Number(merchantId), status: OrderStatus.SHIPPING },
    });

    const deliveredOrders = await this.prisma.order.findMany({
      where: { merchantId: Number(merchantId), status: OrderStatus.DELIVERED },
    });

    const todaySales = await this.prisma.order.aggregate({
      where: {
        merchantId: Number(merchantId),
        status: OrderStatus.DELIVERED,
        createdAt: { gte: startOfDay }, // [M-04] FIX: ใช้ createdAt เพื่อกันออเดอร์เก่าที่ update วันนี้
      },
      _sum: { totalPrice: true },
    });

    return {
      pendingOrders: pendingCount,
      shippingOrders: activeDeliveringCount,
      deliveredOrders: deliveredOrders.length,
      todaySales: todaySales._sum.totalPrice || 0, // [M-02] FIX: ใช้ totalPrice
    };
  }

  async cancelOrderByMerchant(orderId: number, merchantId: number) {
    if (isNaN(orderId)) throw new BadRequestException('Invalid order ID');
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) throw new BadRequestException('ไม่พบออเดอร์นี้');
    if (order.merchantId !== merchantId) throw new ForbiddenException('คุณไม่ใช่เจ้าของร้านค้านี้');
    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('ยกเลิกได้เฉพาะออเดอร์ที่ยังไม่มีคนขับรับ (สถานะ PENDING) เท่านั้น');
    }

    const canceledOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.CANCELLED },
    });

    await this.createTrackingLog(orderId, 'CANCELLED', 'ร้านค้ายกเลิกออเดอร์นี้แล้ว');
    return canceledOrder;
  }

  async updatePreparationTime(orderId: number, merchantId: number, estimatedReadyAt: string) {
    if (isNaN(orderId)) throw new BadRequestException('Invalid order ID');
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) throw new BadRequestException('ไม่พบออเดอร์นี้');
    if (order.merchantId !== merchantId) throw new ForbiddenException('คุณไม่ใช่เจ้าของร้านค้านี้');
    
    // ร้านค้าควรอัปเดตเวลาได้ตอน PENDING หรือ SHIPPING ก็ได้ (เช่น ของมาช้า)
    if (order.status === OrderStatus.DELIVERED || order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('ไม่สามารถเปลี่ยนเวลาเตรียมของได้แล้ว');
    }

    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: { estimatedReadyAt: new Date(estimatedReadyAt) },
    });

    await this.createTrackingLog(
      orderId, 
      order.status, 
      `ร้านค้าอัปเดตเวลาเตรียมของเสร็จเป็น: ${new Date(estimatedReadyAt).toLocaleString('th-TH')}`
    );

    return updatedOrder;
  }

  // ==== 🆕 Analytics Dashboard Feature ====
  async getMerchantAnalytics(merchantId: number) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const orders = await this.prisma.order.findMany({
      where: { merchantId: Number(merchantId) },
      select: { status: true, price: true, totalPrice: true, createdAt: true },
    });

    // 1. Status Distribution
    const statusDistribution = {
      PENDING: 0, ACCEPTED: 0, PICKED_UP: 0, SHIPPING: 0, DELIVERED: 0, CANCELLED: 0
    };
    
    let totalRevenue = 0;
    
    // 2. Revenue Trend (Last 7 Days)
    const revenue7Days = Array(7).fill(0).map((_, i) => {
       const d = new Date();
       d.setDate(d.getDate() - (6 - i));
       return { date: d.toISOString().split('T')[0], revenue: 0 };
    });

    orders.forEach(o => {
      // Status
      statusDistribution[o.status] = (statusDistribution[o.status] || 0) + 1;
      
      // Revenue
      if (o.status === OrderStatus.DELIVERED) {
      // [M-02] FIX: ใช้ totalPrice (รวม Surge + ประกัน) แทน price (ราคาต้นทุน)
         const amount = Number(o.totalPrice || o.price);
         totalRevenue += amount;

         const dateStr = o.createdAt.toISOString().split('T')[0];
         const dayIndex = revenue7Days.findIndex(r => r.date === dateStr);
         if (dayIndex !== -1) {
            revenue7Days[dayIndex].revenue += amount;
         }
      }
    });

    return {
       totalOrders: orders.length,
       totalRevenue,
       statusDistribution,
       revenueChart: revenue7Days,
       successRate: orders.length ? ((statusDistribution.DELIVERED / orders.length) * 100).toFixed(1) : 0
    };
  }

  async findAllAvailable() {
    return this.prisma.order.findMany({
      where: {
        driverId: null,
        status: OrderStatus.PENDING,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ✅ New Feature: Fetch assigned/active jobs for a specific driver
  async getDriverActiveJobs(driverId: number) {
    return this.prisma.order.findMany({
      where: {
        driverId: Number(driverId),
        status: {
          in: [OrderStatus.ACCEPTED, OrderStatus.PICKED_UP, OrderStatus.SHIPPING]
        }
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        merchant: { select: { storeName: true, phone: true } },
      }
    });
  }

  async acceptOrder(orderId: number, driverId: number) {
    if (isNaN(orderId)) throw new BadRequestException('Invalid order ID');

    try {
      // 1. Atomic Update: ฐานข้อมูลจะล็อคและอัปเดตบรรทัดนี้ได้ก็ต่อเมื่อยัง PENDING และ driverId เป็น null เท่านั้น
      const updatedOrder = await this.prisma.order.update({
        where: { 
          id: orderId,
          driverId: null,
          status: OrderStatus.PENDING
        },
        data: { driverId, status: OrderStatus.ACCEPTED },
      });
      
      await this.createTrackingLog(orderId, 'ACCEPTED', 'คนขับกดรับงานแล้ว กำลังเดินทางไปรับพัสดุที่ร้านค้า');
      
      if (this.chatGateway?.server) {
        this.chatGateway.server.to(`order_${orderId}`).emit('order_status_update', updatedOrder);
        this.chatGateway.server.emit('order_taken', { orderId }); // ลบออกจาก Radar
      }
      
      return updatedOrder;
    } catch (error: any) {
      // P2025: Record to update not found (แปลว่าเงื่อนไข where 3 ข้อข้างบนไม่เป็นจริง)
      if (error.code === 'P2025') {
        throw new BadRequestException('ออเดอร์นี้ถูกรับไปแล้ว หรือออเดอร์ถูกยกเลิก');
      }
      throw error;
    }
  }

  async pickupOrder(orderId: number, driverId: number) {
    if (isNaN(orderId)) throw new BadRequestException('Invalid order ID');
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new BadRequestException('ไม่พบออเดอร์นี้');
    if (order.driverId !== driverId) throw new ForbiddenException('คุณไม่ใช่คนขับที่รับออเดอร์นี้');
    if (order.status !== OrderStatus.ACCEPTED) throw new BadRequestException('ต้องรับงานก่อน (ACCEPTED)');

    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.PICKED_UP },
    });
    
    await this.createTrackingLog(orderId, 'PICKED_UP', 'คนขับรับพัสดุจากร้านค้าเรียบร้อยแล้ว');
    if (this.chatGateway?.server) {
      this.chatGateway.server.to(`order_${orderId}`).emit('order_status_update', updatedOrder);
    }
    return updatedOrder;
  }

  async startShippingOrder(orderId: number, driverId: number) {
    if (isNaN(orderId)) throw new BadRequestException('Invalid order ID');
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new BadRequestException('ไม่พบออเดอร์นี้');
    if (order.driverId !== driverId) throw new ForbiddenException('คุณไม่ใช่คนขับที่รับออเดอร์นี้');
    if (order.status !== OrderStatus.PICKED_UP) throw new BadRequestException('ต้องรับของก่อน (PICKED_UP)');

    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.SHIPPING },
    });
    
    await this.createTrackingLog(orderId, 'SHIPPING', 'พัสดุกำลังเดินทางไปหาผู้รับพัสดุ');
    if (this.chatGateway?.server) {
      this.chatGateway.server.to(`order_${orderId}`).emit('order_status_update', updatedOrder);
    }
    return updatedOrder;
  }

  async completeOrder(orderId: number, driverId: number, proofOfDeliveryBase64?: string) {
    if (isNaN(orderId)) throw new BadRequestException('Invalid order ID');
    if (!proofOfDeliveryBase64) throw new BadRequestException('ต้องแนบรูปลิงก์หลักฐานการจัดส่ง (Proof of Delivery URL)');
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new BadRequestException('ไม่พบออเดอร์นี้');
    if (order.driverId !== driverId) throw new ForbiddenException('คุณไม่ใช่คนขับที่รับออเดอร์นี้');
    if (order.status !== OrderStatus.SHIPPING) throw new BadRequestException('ต้องเริ่มการจัดส่งก่อน (SHIPPING)');

    let proofUrl: string | null = null;
    try {
      if (proofOfDeliveryBase64) {
        proofUrl = await uploadBase64ToStorage(proofOfDeliveryBase64, `proofs/${order.trackingNumber}`);
      }
    } catch(e: any) {
      throw new BadRequestException('อัปโหลดหลักฐานไม่สำเร็จ: ' + e.message);
    }

    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: { 
        status: OrderStatus.DELIVERED,
        proofOfDelivery: proofUrl
      },
    });
    
    await this.createTrackingLog(orderId, 'DELIVERED', 'พัสดุถูกจัดส่งถึงมือผู้รับเรียบร้อยแล้วพร้อมหลักฐาน');
    if (this.chatGateway?.server) {
      this.chatGateway.server.to(`order_${orderId}`).emit('order_status_update', updatedOrder);
    }
    return updatedOrder;
  }

  // ==== 💰 Enterprise Features: Payment & Wallet ====
  async payOrder(orderId: number, driverId: number) {
    if (isNaN(orderId)) throw new BadRequestException('Invalid order ID');
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new BadRequestException('ไม่พบออเดอร์นี้');
    if (order.driverId !== driverId) throw new ForbiddenException('สิทธิ์ถูกปฏิเสธ');
    if (order.status !== OrderStatus.DELIVERED) throw new BadRequestException('[BUG-002 FIX] ชำระเงินได้เฉพาะออเดอร์ที่จัดส่งสำเร็จแล้ว (DELIVERED) เท่านั้น');
    if (order.paymentStatus === 'Paid') throw new BadRequestException('ออเดอร์นี้ชำระเงินแล้ว');

    // [DATA INTEGRITY] ใช้ Prisma.Decimal ป้องกัน Precision Loss
    const amountToPayDecimal = new Prisma.Decimal(order.totalPrice || order.price || 0);
    const amountToPay = amountToPayDecimal.toNumber();
    const driverCut = amountToPayDecimal.mul(0.2).toNumber(); 
    const merchantCut = new Prisma.Decimal(order.price || 0).toNumber(); 

    // เริ่ม Transaction พร้อม ป้องกัน Race Condition
    await this.prisma.$transaction(async (tx) => {
      // 0. Atomic lock to prevent double-spend
      const lockUpdate = await tx.order.updateMany({
        where: { id: orderId, paymentStatus: 'Unpaid' },
        data: { paymentStatus: 'Paid' }
      });
      
      if (lockUpdate.count === 0) {
        throw new BadRequestException('ออเดอร์นี้ชำระเงินไปแล้ว หรืออยู่ระหว่างทำรายการ');
      }

      // 1. [H-02] FIX: Native Atomic Update with condition to prevent negative balance
      if (order.customerId) {
        const updateResult = await tx.customer.updateMany({
          where: { 
            id: order.customerId,
            balance: { gte: amountToPay } // Guard: Balance must be >= amountToPay
          },
          data: { balance: { decrement: amountToPay } }
        });

        if (updateResult.count === 0) {
          throw new BadRequestException(`ยอดเงินไม่เพียงพอ (ต้องการ ฿${amountToPay.toFixed(2)}) หรือไม่พบบัญชีลูกค้า`);
        }
        await tx.transaction.create({
          data: { amount: amountToPay, type: 'DEBIT', note: `ชำระค่าออเดอร์ #${order.trackingNumber}`, userId: order.customerId!, userRole: 'Customer', orderId: order.id }
        });
      }

      // 2. เพิ่มเงินให้ร้านค้า
      if (order.merchantId) {
        await tx.merchant.update({
          where: { id: order.merchantId },
          data: { balance: { increment: merchantCut } }
        });
        await tx.transaction.create({
          data: { amount: merchantCut, type: 'CREDIT', note: `รับเงินค่าสินค้า #${order.trackingNumber}`, userId: order.merchantId, userRole: 'Merchant', orderId: order.id }
        });
      }

      // 3. เพิ่มเงินให้คนขับ
      await tx.driver.update({
        where: { id: driverId },
        data: { balance: { increment: driverCut } }
      });
      await tx.transaction.create({
        data: { amount: driverCut, type: 'CREDIT', note: `ค่ารอบจัดส่ง #${order.trackingNumber}`, userId: driverId, userRole: 'Driver', orderId: order.id }
      });

      // 4. หักค่าประกัน (Platform Revenue)
      const insuranceFeeNum = Number(order.insuranceFee);
      if (order.hasInsurance && insuranceFeeNum > 0) {
        // ในระบบจริง เราอาจจะโอนให้ SwiftPath Insurance Wallet
        await tx.transaction.create({
          data: { amount: insuranceFeeNum, type: 'DEBIT', note: `ค่าเบี้ยประกันสินค้า #${order.trackingNumber}`, userId: order.customerId || 0, userRole: 'Platform', orderId: order.id }
        });
      }
    });

    const refreshedOrder = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (this.chatGateway?.server) {
      this.chatGateway.server.to(`order_${orderId}`).emit('order_status_update', refreshedOrder);
    }
    
    return { success: true, message: 'ชำระเงินและโอนเข้า Wallet สำเร็จ' };
  }

  // ==== ⭐ Enterprise Features: Rating System ====
  async rateOrder(orderId: number, userId: number, role: string, score: number, comment?: string) {
    if (isNaN(orderId)) throw new BadRequestException('Invalid order ID');
    if (score < 1 || score > 5) throw new BadRequestException('คะแนนต้องอยู่ระหว่าง 1 ถึง 5');
    
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new BadRequestException('ไม่พบออเดอร์นี้');
    if (!order.driverId) throw new BadRequestException('ออเดอร์นี้ไม่มีคนขับ');
    // [H-03] FIX: Verify ownership before rating
    if (order.status !== OrderStatus.DELIVERED) throw new BadRequestException('ต้องจัดส่งสำเร็จก่อนจึงจะให้คะแนนได้');
    if (role === 'Customer' && order.customerId !== userId) throw new ForbiddenException('คุณไม่ใช่เจ้าของออเดอร์นี้');
    if (role === 'Merchant' && order.merchantId !== userId) throw new ForbiddenException('คุณไม่ใช่เจ้าของออเดอร์นี้');

    const existingRating = await this.prisma.rating.findUnique({ where: { orderId } });
    if (existingRating) throw new BadRequestException('ออเดอร์นี้ถูกให้คะแนนไปแล้ว');

    const newRating = await this.prisma.rating.create({
      data: {
        score,
        comment,
        orderId,
        raterId: userId,
        raterRole: role,
        driverId: order.driverId
      }
    });

    return newRating;
  }

  // ==== 📊 Driver Stats ====
  async getDriverStats(driverId: number) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const activeOrdersCount = await this.prisma.order.count({
      where: { 
        driverId, 
        status: { in: [OrderStatus.ACCEPTED, OrderStatus.PICKED_UP, OrderStatus.SHIPPING] } 
      },
    });

    const deliveredOrdersCount = await this.prisma.order.count({
      where: { driverId, status: OrderStatus.DELIVERED, updatedAt: { gte: startOfDay } },
    });

    // สมมติ: คนขับได้ค่า GP หรือได้โบนัสจาก Surge
    const todayEarnings = await this.prisma.order.aggregate({
      where: {
        driverId,
        status: OrderStatus.DELIVERED,
        updatedAt: { gte: startOfDay },
      },
      _sum: { totalPrice: true, price: true },
    });

    const totalIncome = Number(todayEarnings._sum.totalPrice) || 0;
    const baseIncome = Number(todayEarnings._sum.price) || 0;
    const weatherBonus = totalIncome - baseIncome; // ส่วนต่างของ Surge

    return {
      activeOrders: activeOrdersCount,
      completedTrips: deliveredOrdersCount,
      totalIncome: totalIncome,
      weatherBonus: weatherBonus, // โชว์โบนัสให้คนขับเห็นชัดๆ
    };
  }

  // Admin: สถิติภาพรวมทั้งระบบ
  async getAdminStats() {
    const [
      totalOrders,
      deliveredOrders,
      pendingOrders,
      cancelledOrders,
      totalCustomers,
      totalMerchants,
      totalDrivers,
      revenueResult,
    ] = await Promise.all([
      this.prisma.order.count(),
      this.prisma.order.count({ where: { status: OrderStatus.DELIVERED } }),
      this.prisma.order.count({ where: { status: OrderStatus.PENDING } }),
      this.prisma.order.count({ where: { status: OrderStatus.CANCELLED } }),
      this.prisma.customer.count({ where: { isVerified: true } }),
      this.prisma.merchant.count({ where: { isVerified: true } }),
      this.prisma.driver.count({ where: { isVerified: true } }),
      this.prisma.order.aggregate({
        where: { status: OrderStatus.DELIVERED },
        _sum: { totalPrice: true },
      }),
    ]);

    const days: { date: string; revenue: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push({ date: d.toISOString().split('T')[0], revenue: 0 });
    }
    const recentOrders = await this.prisma.order.findMany({
      where: { status: OrderStatus.DELIVERED, createdAt: { gte: new Date(days[0].date) } },
      select: { totalPrice: true, price: true, createdAt: true },
    });
    recentOrders.forEach((o: any) => {
      const dateStr = o.createdAt.toISOString().split('T')[0];
      const idx = days.findIndex((d: any) => d.date === dateStr);
      if (idx !== -1) days[idx].revenue += Number(o.totalPrice || o.price);
    });

    return {
      totalOrders,
      deliveredOrders,
      pendingOrders,
      cancelledOrders,
      totalRevenue: Number(revenueResult._sum.totalPrice) || 0,
      successRate: totalOrders ? ((deliveredOrders / totalOrders) * 100).toFixed(1) : '0',
      activeUsers: {
        customers: totalCustomers,
        merchants: totalMerchants,
        drivers: totalDrivers,
        total: totalCustomers + totalMerchants + totalDrivers,
      },
      revenueChart: days,
    };
  }

  // ==== ✅ SME Feature: Merchant Assigns Driver ====
  async assignDriver(orderId: number, merchantId: number, driverId: number) {
    if (isNaN(orderId)) throw new BadRequestException('Invalid order ID');

    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new BadRequestException('ไม่พบออเดอร์นี้');
    if (order.merchantId !== merchantId) throw new ForbiddenException('คุณไม่ใช่เจ้าของออเดอร์นี้');
    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('สามารถมอบหมายคนขับได้เฉพาะออเดอร์ที่ยังรอดำเนินการ (PENDING) เท่านั้น');
    }

    // ✅ ตรวจว่า Driver สังกัดร้านนี้จริง
    const driver = await this.prisma.driver.findUnique({ where: { id: driverId } });
    if (!driver) throw new BadRequestException('ไม่พบข้อมูลคนขับ');
    if (driver.merchantId && driver.merchantId !== merchantId) {
      throw new ForbiddenException('คนขับคนนี้ไม่ได้สังกัดร้านของคุณ');
    }

    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: { driverId, status: OrderStatus.ACCEPTED },
    });

    await this.createTrackingLog(orderId, 'ACCEPTED', `ร้านค้ามอบหมายงานให้ ${driver.name || 'คนขับ'} (ทะเบียน: ${driver.vehiclePlate || '-'})`);

    if (this.chatGateway?.server) {
      this.chatGateway.server.to(`order_${orderId}`).emit('order_status_update', updatedOrder);
    }

    return updatedOrder;
  }

  // ==== ✅ SME Feature: ค้นหาประวัติออเดอร์ด้วยเบอร์โทรผู้รับ ====
  async getOrdersByPhone(phone: string) {
    if (!phone || phone.length < 9) throw new BadRequestException('กรุณาระบุเบอร์โทรที่ถูกต้อง (อย่างน้อย 9 หลัก)');

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
          select: { productName: true, quantity: true, unitPrice: true, totalPrice: true }
        },
        merchant: { select: { storeName: true, phone: true } },
        trackingLogs: {
          where: { isPublic: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { status: true, note: true, createdAt: true }
        }
      }
    });

    return orders;
  }

  // ==== ✅ SME Feature: Export รายการออเดอร์เป็น CSV ====
  async exportOrdersCsv(merchantId: number, dateFrom?: string, dateTo?: string): Promise<string> {
    const whereClause: any = { merchantId: Number(merchantId) };

    if (dateFrom || dateTo) {
      whereClause.createdAt = {};
      if (dateFrom) whereClause.createdAt.gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        whereClause.createdAt.lte = end;
      }
    }

    const orders = await this.prisma.order.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        items: true,
        driver: { select: { name: true, vehiclePlate: true } },
      },
    });

    const headers = [
      'Tracking Number', 'วันที่สร้าง', 'สินค้า', 'จำนวนรายการ',
      'ราคาสุทธิ (บาท)', 'สถานะ', 'ชื่อผู้รับ', 'เบอร์ผู้รับ',
      'ที่อยู่', 'คนขับ', 'ทะเบียน'
    ];

    const rows = orders.map(o => [
      o.trackingNumber,
      new Date(o.createdAt).toLocaleDateString('th-TH', { year: 'numeric', month: '2-digit', day: '2-digit' }),
      o.productName || '-',
      o.items.length > 0 ? o.items.length : 1,
      Number(o.totalPrice || o.price).toFixed(2),
      o.status,
      o.receiverName,
      o.receiverPhone,
      `"${o.address.replace(/"/g, '""')}"`,
      o.driver?.name || '-',
      o.driver?.vehiclePlate || '-',
    ]);

    const csvLines = [headers.join(','), ...rows.map(r => r.join(','))];
    return csvLines.join('\n');
  }

  // ✅ SME Feature: Generate PDF Delivery Order
  async exportOrderPdf(orderId: number, userId: number, userRole: string, res: Response) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        merchant: true,
        customer: true,
        driver: true,
      }
    });

    if (!order) throw new BadRequestException('Order not found');
    
    // Auth Check — [SEC-02 FIX] เพิ่ม Driver guard ป้องกัน Driver คนอื่นดู PDF
    if (userRole === 'Merchant' && order.merchantId !== userId) throw new ForbiddenException('Access denied');
    if (userRole === 'Customer' && order.customerId !== userId) throw new ForbiddenException('Access denied');
    if (userRole === 'Driver') {
      if (!order.driverId || order.driverId !== userId) throw new ForbiddenException('Access denied: คุณไม่ใช่คนขับของออเดอร์นี้');
    }

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    
    const dateStr = new Date(order.createdAt).toISOString().split('T')[0];
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="delivery-order-${order.trackingNumber}.pdf"`);
    
    doc.pipe(res);

    // Register Thai Font
    const regularFontPath = path.join(process.cwd(), 'assets', 'fonts', 'Kanit-Regular.ttf');
    const boldFontPath = path.join(process.cwd(), 'assets', 'fonts', 'Kanit-Bold.ttf');
    
    if (fs.existsSync(regularFontPath)) {
      doc.registerFont('Kanit', regularFontPath);
      doc.font('Kanit');
    }
    if (fs.existsSync(boldFontPath)) {
      doc.registerFont('Kanit-Bold', boldFontPath);
    }

    // Header
    doc.fontSize(24).text('ใบส่งของ / Delivery Order', { align: 'center' });
    doc.moveDown(1);

    // Store Info
    if (fs.existsSync(boldFontPath)) doc.font('Kanit-Bold');
    doc.fontSize(14).text('ข้อมูลร้านค้า (Merchant)');
    if (fs.existsSync(regularFontPath)) doc.font('Kanit');
    doc.fontSize(12).text(`ร้าน: ${order.merchant?.storeName || 'SwiftPath Shop'}`);
    doc.text(`เบอร์โทร: ${order.merchant?.phone || '-'}`);
    doc.moveDown(1);

    // Customer Info
    if (fs.existsSync(boldFontPath)) doc.font('Kanit-Bold');
    doc.fontSize(14).text('ข้อมูลผู้รับ (Receiver)');
    if (fs.existsSync(regularFontPath)) doc.font('Kanit');
    doc.fontSize(12).text(`ชื่อผู้รับ: ${order.receiverName}`);
    doc.text(`เบอร์โทร: ${order.receiverPhone}`);
    doc.text(`ที่อยู่จัดส่ง: ${order.address}`);
    doc.moveDown(1);

    // Order Info
    if (fs.existsSync(boldFontPath)) doc.font('Kanit-Bold');
    doc.fontSize(14).text('รายละเอียดคำสั่งซื้อ (Order Details)');
    if (fs.existsSync(regularFontPath)) doc.font('Kanit');
    doc.fontSize(12).text(`หมายเลขติดตาม (Tracking): ${order.trackingNumber}`);
    doc.text(`วันที่สร้าง: ${new Date(order.createdAt).toLocaleString('th-TH')}`);
    doc.moveDown(1);

    // Items Table Header
    const startY = doc.y;
    doc.rect(50, startY, 495, 25).fillAndStroke('#f3f4f6', '#d1d5db');
    doc.fillColor('#111827');
    if (fs.existsSync(boldFontPath)) doc.font('Kanit-Bold');
    doc.text('รายการสินค้า (Item)', 60, startY + 7);
    doc.text('จำนวน (Qty)', 350, startY + 7);
    doc.text('ราคา (Price)', 420, startY + 7, { width: 70, align: 'right' });
    if (fs.existsSync(regularFontPath)) doc.font('Kanit');

    // Items List
    let currentY = startY + 30;
    if (order.items && order.items.length > 0) {
      order.items.forEach((item, index) => {
        doc.text(`${index + 1}. ${item.productName}`, 60, currentY);
        doc.text(`${item.quantity}`, 350, currentY);
        doc.text(`฿${Number(item.totalPrice).toLocaleString('th-TH', { minimumFractionDigits: 2 })}`, 420, currentY, { width: 70, align: 'right' });
        currentY += 20;
      });
    } else {
      doc.text(`1. ${order.productName || 'สินค้าทั่วไป'}`, 60, currentY);
      doc.text(`${order.quantity || 1}`, 350, currentY);
      doc.text(`฿${Number(order.price || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}`, 420, currentY, { width: 70, align: 'right' });
      currentY += 20;
    }

    doc.moveTo(50, currentY).lineTo(545, currentY).stroke('#d1d5db');
    currentY += 10;

    // Total Amount
    if (fs.existsSync(boldFontPath)) doc.font('Kanit-Bold');
    doc.text('รวมสุทธิ (Total Amount):', 300, currentY);
    doc.text(`฿${Number(order.totalPrice || order.price).toLocaleString('th-TH', { minimumFractionDigits: 2 })}`, 420, currentY, { width: 70, align: 'right' });

    // Footer Signatures
    doc.moveDown(4);
    const signY = doc.y;
    doc.text('ผู้ส่งของ (Driver)..........................................', 50, signY);
    doc.text('ผู้รับของ (Receiver)..........................................', 300, signY);

    doc.end();
  }
}
