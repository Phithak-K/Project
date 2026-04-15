import { Injectable, BadRequestException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WeatherService } from '../weather/weather.service';
import { MailerService } from '@nestjs-modules/mailer';
import { ChatGateway } from '../chat/chat.gateway';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderStatus } from '@prisma/client';
import { randomUUID } from 'crypto';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private weatherService: WeatherService,
    private mailerService: MailerService,
    @Inject(forwardRef(() => ChatGateway))
    private chatGateway: ChatGateway,
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
      
      let finalTotalPrice = Number(data.price);
      let weatherWarning: string | null = null;
      let weatherLogMessage: string | null = null;
      let estimatedMinutes = 30; // Default: 30 mins
      let isRaining = false;

      // 1. Fetch Merchant for location
      const merchant = await this.prisma.merchant.findUnique({ where: { id: merchantId } });
      const merchantLat = merchant?.lat || 13.7563; // Default: Bangkok
      const merchantLng = merchant?.lng || 100.5018;

      // 2. Check Weather for Surge Pricing and ETA Penalty
      if (data.address) {
        const addressParts = data.address.trim().split(/\s+/);
        // Find a word that looks like a city (Thai provinces/cities are usually last or near last)
        const city = addressParts.find(p => ['Bangkok', 'Chiang', 'Phuket', 'Pattaya', 'Nonthaburi'].some(c => p.includes(c))) || addressParts[addressParts.length - 1];

        if (city) {
          const weatherData = await this.weatherService.getWeather(city);
          if (weatherData && weatherData.weather && weatherData.weather.length > 0) {
            const mainWeather = weatherData.weather[0].main;

            if (mainWeather === 'Rain' || mainWeather === 'Thunderstorm' || mainWeather === 'Drizzle') {
              isRaining = true;
              // เพิ่มค่าบริการ 20% (Surge +20%)
              finalTotalPrice = finalTotalPrice * 1.20;
              weatherWarning = `⚠️ คำเตือน: ตรวจพบฝนใน ${city} (เพิ่มค่าบริการ 20%, เวลาจัดส่งเพิ่มขึ้น)`;
              weatherLogMessage = `ตรวจพบสภาพอากาศ: ${mainWeather} ในพื้นที่ปลายทาง (ปรับราคาส่วนต่าง +20% & ETA +15 นาที)`;
            }
          }
        }
      }

      // 3. Calculate ETA (Distance + Weather)
      if (data.lat && data.lng) {
        const distance = this.calculateDistance(merchantLat, merchantLng, data.lat, data.lng);
        // Average speed 30km/h -> 2 mins per km
        estimatedMinutes = Math.ceil(distance * 2) + 10; // +10 mins for pickup
        if (isRaining) estimatedMinutes += 15; // +15 mins if raining
      }

      // 4. Insurance System
      const insuranceFee = data.hasInsurance ? 50 : 0;
      finalTotalPrice += insuranceFee;

      // 5. Create Order in Database
      const newOrder = await this.prisma.order.create({
        data: {
          merchantId: Number(merchantId),
          trackingNumber,
          productName: data.productName,
          productDetail: data.productDetail || null,
          quantity: data.quantity,
          price: Number(data.price),        // ราคาฐาน
          totalPrice: finalTotalPrice,      // ราคาหลังบวก Surge + Insurance
          weatherWarning: weatherWarning,
          estimatedMinutes: estimatedMinutes,
          hasInsurance: !!data.hasInsurance,
          insuranceFee: insuranceFee,
          receiverName: data.receiverName,
          receiverPhone: data.receiverPhone,
          address: data.address,
          lat: data.lat,
          lng: data.lng,
          status: OrderStatus.PENDING,
        },
      });

      // 6. Create Tracking Logs
      await this.createTrackingLog(newOrder.id, 'PENDING', `ร้านค้าสร้างออเดอร์สำเร็จ (ETA: ${estimatedMinutes} นาที)`);
      if (weatherLogMessage) {
        await this.createTrackingLog(newOrder.id, 'PENDING', weatherLogMessage);
      }
      if (data.hasInsurance) {
        await this.createTrackingLog(newOrder.id, 'PENDING', 'มีการเปิดความคุ้มครองประกันภัยสินค้า SwiftPath Insurance');
      }

      this.notifyDrivers(newOrder);

      // 📡 Push Notification via WebSocket (Driver Radar)
      if (this.chatGateway && this.chatGateway.server) {
        this.chatGateway.server.emit('new_available_order', {
          ...newOrder,
          message: '🚨 มีออเดอร์ความต้องการสูงเข้ามาในพื้นที่!',
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

  async getOrderById(orderId: number, userId: number, role: string) {
    if (isNaN(orderId)) throw new BadRequestException('Invalid order ID');
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        trackingLogs: { orderBy: { createdAt: 'desc' } },
        merchant: { select: { storeName: true, phone: true } },
        driver: { select: { name: true, phone: true, vehiclePlate: true } },
        customer: { select: { name: true } },
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
    if (isNaN(orderId)) throw new BadRequestException('Invalid order ID');
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new BadRequestException('ไม่พบออเดอร์นี้');
    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(`ออเดอร์ถูกรับไปแล้ว (สถานะ: ${order.status})`);
    }
    if (order.driverId !== null) throw new BadRequestException('ออเดอร์นี้มีคนขับรับไปแล้ว');

    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: { driverId, status: OrderStatus.ACCEPTED },
    });
    
    await this.createTrackingLog(orderId, 'ACCEPTED', 'คนขับกดรับงานแล้ว กำลังเดินทางไปรับพัสดุที่ร้านค้า');
    
    if (this.chatGateway?.server) {
      this.chatGateway.server.to(`order_${orderId}`).emit('order_status_update', updatedOrder);
      this.chatGateway.server.emit('order_taken', { orderId }); // ลบออกจาก Radar
    }
    
    return updatedOrder;
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
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new BadRequestException('ไม่พบออเดอร์นี้');
    if (order.driverId !== driverId) throw new ForbiddenException('คุณไม่ใช่คนขับที่รับออเดอร์นี้');
    if (order.status !== OrderStatus.SHIPPING) throw new BadRequestException('ต้องเริ่มการจัดส่งก่อน (SHIPPING)');

    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: { 
        status: OrderStatus.DELIVERED,
        proofOfDelivery: proofOfDeliveryBase64 || null
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
    if (order.paymentStatus === 'Paid') throw new BadRequestException('ออเดอร์นี้ชำระเงินแล้ว');

    const amountToPay = order.totalPrice || order.price;
    const driverCut = amountToPay * 0.2; // 20%
    const merchantCut = order.price; 

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

      // 1. [H-02] FIX: Check sufficient balance BEFORE decrement
      if (order.customerId) {
        const customer = await tx.customer.findUnique({ where: { id: order.customerId } });
        if (!customer || customer.balance < amountToPay) {
          throw new BadRequestException(`ยอดเงินไม่เพียงพอ ต้องการ ฿${amountToPay.toFixed(2)} แต่มีเพียง ฿${(customer?.balance || 0).toFixed(2)}`);
        }
        await tx.customer.update({
          where: { id: order.customerId },
          data: { balance: { decrement: amountToPay } }
        });
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
      if (order.hasInsurance && order.insuranceFee > 0) {
        // ในระบบจริง เราอาจจะโอนให้ SwiftPath Insurance Wallet
        await tx.transaction.create({
          data: { amount: order.insuranceFee, type: 'DEBIT', note: `ค่าเบี้ยประกันสินค้า #${order.trackingNumber}`, userId: order.customerId || 0, userRole: 'Platform', orderId: order.id }
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

    const totalIncome = todayEarnings._sum.totalPrice || 0;
    const baseIncome = todayEarnings._sum.price || 0;
    const weatherBonus = totalIncome - baseIncome; // ส่วนต่างของ Surge

    return {
      activeOrders: activeOrdersCount,
      completedTrips: deliveredOrdersCount,
      totalIncome: totalIncome,
      weatherBonus: weatherBonus, // โชว์โบนัสให้คนขับเห็นชัดๆ
    };
  }
}