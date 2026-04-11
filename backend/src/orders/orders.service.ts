import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WeatherService } from '../weather/weather.service';
import { MailerService } from '@nestjs-modules/mailer';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderStatus } from '@prisma/client';
import { randomUUID } from 'crypto';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private weatherService: WeatherService,
    private mailerService: MailerService,
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

  async createOrder(merchantId: number, data: CreateOrderDto) {
    try {
      const trackingNumber = this.generateTrackingNumber();

      const newOrder = await this.prisma.order.create({
        data: {
          merchantId: Number(merchantId),
          trackingNumber,
          productName: data.productName,
          productDetail: data.productDetail || null,
          quantity: data.quantity,
          price: data.price,
          totalPrice: Number(data.price),
          receiverName: data.receiverName,
          receiverPhone: data.receiverPhone,
          address: data.address,
          status: OrderStatus.PENDING,
        },
      });

      await this.createTrackingLog(newOrder.id, 'PENDING', 'ร้านค้าสร้างออเดอร์สำเร็จและรอคนขับมารับพัสดุ');

      let finalOrder = newOrder;
      if (data.address) {
        const addressParts = data.address.trim().split(/\s+/);
        const city = addressParts[addressParts.length - 1];

        if (city) {
          const weatherData = await this.weatherService.getWeather(city);
          if (weatherData && weatherData.weather && weatherData.weather.length > 0) {
            const mainWeather = weatherData.weather[0].main;

            if (mainWeather === 'Rain' || mainWeather === 'Thunderstorm') {
              finalOrder = await this.prisma.order.update({
                where: { id: newOrder.id },
                data: { weatherWarning: `⚠️ คำเตือน: ตรวจพบฝนใน ${city} โปรดป้องกันสินค้าเปียกชื้น` },
              });
              await this.createTrackingLog(newOrder.id, 'PENDING', `ตรวจพบสภาพอากาศ: ${mainWeather} ในพื้นที่ปลายทาง`);
            }
          }
        }
      }

      this.notifyDrivers(finalOrder);
      return finalOrder;
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
          subject: `🚚 มีงานใหม่เข้ามา! รหัสพัสดุ: ${order.trackingNumber}`,
          html: `<h3>มีออเดอร์ใหม่จาก SwiftPath</h3><p>รหัส: ${order.trackingNumber}</p><p>สินค้า: ${order.productName}</p>`,
        });
      }
    } catch (error) {
      console.error('Email Notification Error:', error);
    }
  }

  async getMyOrders(merchantId: number) {
    return this.prisma.order.findMany({
      where: { merchantId: Number(merchantId) },
      orderBy: { createdAt: 'desc' },
      include: { trackingLogs: true },
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
        updatedAt: { gte: startOfDay },
      },
      _sum: { price: true },
    });

    return {
      pendingOrders: pendingCount,
      shippingOrders: activeDeliveringCount,
      deliveredOrders: deliveredOrders.length,
      todaySales: todaySales._sum.price || 0,
    };
  }

  async cancelOrderByMerchant(orderId: number, merchantId: number) {
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

  async findAllAvailable() {
    return this.prisma.order.findMany({
      where: {
        driverId: null,
        status: OrderStatus.PENDING,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async acceptOrder(orderId: number, driverId: number) {
    // ดึง Order มาเช็คสถานะก่อน
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new BadRequestException('ไม่พบออเดอร์นี้');
    }

    // ป้องกันการรับงานซ้อน หรือรับงานที่ถูกยกเลิกแล้ว
    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(
        `ไม่สามารถรับออเดอร์นี้ได้ เนื่องจากสถานะปัจจุบันคือ "${order.status}" (ต้องเป็น PENDING เท่านั้น)`,
      );
    }

    if (order.driverId !== null) {
      throw new BadRequestException('ออเดอร์นี้มีคนขับรับไปแล้ว');
    }

    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        driverId,
        status: OrderStatus.SHIPPING,
      },
    });
    await this.createTrackingLog(orderId, 'SHIPPING', 'คนขับได้รับพัสดุแล้ว กำลังเริ่มจัดส่ง');
    return updatedOrder;
  }

  async completeOrder(orderId: number, driverId: number) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) throw new BadRequestException('ไม่พบออเดอร์นี้');
    if (order.driverId !== driverId) throw new ForbiddenException('คุณไม่ใช่คนขับที่รับออเดอร์นี้');
    // ✅ BUG-03: เช็ค Status ก่อนว่าเป็น SHIPPING
    if (order.status !== OrderStatus.SHIPPING) {
      throw new BadRequestException('ออเดอร์ต้องอยู่ในสถานะ SHIPPING ก่อนจะสำเร็จได้');
    }

    const completedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.DELIVERED },
    });
    await this.createTrackingLog(orderId, 'DELIVERED', 'พัสดุถูกจัดส่งถึงมือผู้รับเรียบร้อยแล้ว');
    return completedOrder;
  }
}