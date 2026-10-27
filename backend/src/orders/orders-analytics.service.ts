import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus } from '@prisma/client';

const CHART_DAYS = 90;
const CHART_TZ = 'Asia/Bangkok';
const DAY_MS = 24 * 60 * 60 * 1000;

/** แปลงเวลาเป็นวันที่ YYYY-MM-DD ตามเวลาไทย */
function toBangkokDateKey(d: Date): string {
  return d.toLocaleDateString('sv-SE', { timeZone: CHART_TZ });
}

/** คืนค่า Date ของเวลา 00:00:00.000 ของวันนี้ตามเวลาไทย (UTC+7) */
function getBangkokStartOfDay(date: Date = new Date()): Date {
  const bkkDateStr = toBangkokDateKey(date);
  return new Date(`${bkkDateStr}T00:00:00.000+07:00`);
}

/** สร้าง bucket รายวันย้อนหลัง `days` วัน (เก่า -> ใหม่) นับรวมวันนี้ */
function buildDayKeys(days: number): string[] {
  const now = Date.now();
  return Array.from({ length: days }, (_, i) =>
    toBangkokDateKey(new Date(now - (days - 1 - i) * DAY_MS)),
  );
}

@Injectable()
export class OrdersAnalyticsService {
  constructor(private prisma: PrismaService) {}

  // ==== 📊 Merchant Order Stats ====
  async getOrderStats(merchantId: number) {
    const startOfDay = getBangkokStartOfDay();

    const [pendingCount, shippingCount, deliveredCount, todaySales] =
      await Promise.all([
        this.prisma.order.count({
          where: {
            merchantId: Number(merchantId),
            status: OrderStatus.PENDING,
          },
        }),
        this.prisma.order.count({
          where: {
            merchantId: Number(merchantId),
            status: OrderStatus.SHIPPING,
          },
        }),
        this.prisma.order.count({
          where: {
            merchantId: Number(merchantId),
            status: OrderStatus.DELIVERED,
          },
        }),
        this.prisma.order.aggregate({
          where: {
            merchantId: Number(merchantId),
            status: OrderStatus.DELIVERED,
            createdAt: { gte: startOfDay },
          },
          _sum: { totalPrice: true },
        }),
      ]);

    return {
      pendingOrders: pendingCount,
      shippingOrders: shippingCount,
      deliveredOrders: deliveredCount,
      todaySales: todaySales._sum.totalPrice || 0,
    };
  }

  // ==== 📊 Merchant Analytics Dashboard ====
  async getMerchantAnalytics(merchantId: number) {
    const [statusGroups, revenueResult, recentOrders] = await Promise.all([
      // 1. Status distribution — DB does the counting
      this.prisma.order.groupBy({
        by: ['status'],
        where: { merchantId: Number(merchantId) },
        _count: { _all: true },
      }),
      // 2. Total revenue — DB aggregates
      this.prisma.order.aggregate({
        where: {
          merchantId: Number(merchantId),
          status: OrderStatus.DELIVERED,
        },
        _sum: { totalPrice: true },
        _count: { _all: true },
      }),
      // 3. Revenue chart — ออเดอร์ที่ส่งสำเร็จในช่วง CHART_DAYS วัน (ใช้ updatedAt = เวลาที่ส่งสำเร็จ)
      this.prisma.order.findMany({
        where: {
          merchantId: Number(merchantId),
          status: OrderStatus.DELIVERED,
          updatedAt: { gte: new Date(Date.now() - CHART_DAYS * DAY_MS) },
        },
        select: { totalPrice: true, updatedAt: true },
      }),
    ]);

    // Map groupBy results into the expected shape
    const statusDistribution: Record<string, number> = {
      PENDING: 0,
      ACCEPTED: 0,
      PICKED_UP: 0,
      SHIPPING: 0,
      DELIVERED: 0,
      CANCELLED: 0,
    };
    let totalOrderCount = 0;
    statusGroups.forEach((g) => {
      statusDistribution[g.status] = g._count._all;
      totalOrderCount += g._count._all;
    });

    // Revenue chart (ตามวันที่ส่งสำเร็จ, เวลาไทย)
    const revenue7Days = buildDayKeys(CHART_DAYS).map((date) => ({
      date,
      revenue: 0,
    }));
    recentOrders.forEach((o) => {
      const dateStr = toBangkokDateKey(o.updatedAt);
      const day = revenue7Days.find((r) => r.date === dateStr);
      if (day) day.revenue += Number(o.totalPrice || 0);
    });

    const totalRevenue = Number(revenueResult._sum.totalPrice) || 0;
    const deliveredCount = statusDistribution.DELIVERED;

    return {
      totalOrders: totalOrderCount,
      totalRevenue,
      statusDistribution,
      revenueChart: revenue7Days,
      successRate: totalOrderCount
        ? ((deliveredCount / totalOrderCount) * 100).toFixed(1)
        : 0,
    };
  }

  // ==== 📊 Driver Stats ====
  async getDriverStats(driverId: number) {
    const startOfDay = getBangkokStartOfDay();

    const activeOrdersCount = await this.prisma.order.count({
      where: {
        driverId,
        status: {
          in: [
            OrderStatus.ACCEPTED,
            OrderStatus.PICKED_UP,
            OrderStatus.SHIPPING,
          ],
        },
      },
    });

    const deliveredOrdersCount = await this.prisma.order.count({
      where: {
        driverId,
        status: OrderStatus.DELIVERED,
        updatedAt: { gte: startOfDay },
      },
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

  // ==== 📊 Admin Stats ====
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

    // Revenue chart — จัดกลุ่มตามวันที่ส่งสำเร็จ (updatedAt) เวลาไทย
    const dayKeys = buildDayKeys(CHART_DAYS);
    const windowStart = new Date(Date.now() - CHART_DAYS * DAY_MS);
    const days = dayKeys.map((date) => ({ date, revenue: 0 }));
    const deliveredInWindow = await this.prisma.order.findMany({
      where: {
        status: OrderStatus.DELIVERED,
        updatedAt: { gte: windowStart },
      },
      select: { totalPrice: true, updatedAt: true },
    });
    deliveredInWindow.forEach((o) => {
      const day = days.find((d) => d.date === toBangkokDateKey(o.updatedAt));
      if (day) day.revenue += Number(o.totalPrice || 0);
    });

    // Order volume — จำนวนออเดอร์ที่สร้างในแต่ละวัน (createdAt) เวลาไทย
    const orderVolume = dayKeys.map((date) => ({ date, orders: 0 }));
    const createdInWindow = await this.prisma.order.findMany({
      where: { createdAt: { gte: windowStart } },
      select: { createdAt: true },
    });
    createdInWindow.forEach((o) => {
      const day = orderVolume.find(
        (d) => d.date === toBangkokDateKey(o.createdAt),
      );
      if (day) day.orders += 1;
    });

    // Status distribution — สัดส่วนสถานะการจัดส่งทั้งระบบ (DB นับให้)
    const statusGroups = await this.prisma.order.groupBy({
      by: ['status'],
      _count: { _all: true },
    });
    const statusDistribution: Record<string, number> = {
      PENDING: 0,
      ACCEPTED: 0,
      PICKED_UP: 0,
      SHIPPING: 0,
      DELIVERED: 0,
      CANCELLED: 0,
    };
    statusGroups.forEach((g) => {
      statusDistribution[g.status] = g._count._all;
    });

    // User growth — จำนวนผู้ใช้ที่ยืนยันแล้วสะสม ตามวันที่สมัครจริง (createdAt)
    const [custDates, merDates, drvDates] = await Promise.all([
      this.prisma.customer.findMany({
        where: { isVerified: true },
        select: { createdAt: true },
      }),
      this.prisma.merchant.findMany({
        where: { isVerified: true },
        select: { createdAt: true },
      }),
      this.prisma.driver.findMany({
        where: { isVerified: true },
        select: { createdAt: true },
      }),
    ]);
    const signupKeys = [...custDates, ...merDates, ...drvDates].map((u) =>
      toBangkokDateKey(u.createdAt),
    );
    let cumulative = signupKeys.filter((k) => k < dayKeys[0]).length;
    const userGrowth = dayKeys.map((date) => {
      cumulative += signupKeys.filter((k) => k === date).length;
      return { date, users: cumulative };
    });

    return {
      totalOrders,
      deliveredOrders,
      pendingOrders,
      cancelledOrders,
      totalRevenue: Number(revenueResult._sum.totalPrice) || 0,
      successRate: totalOrders
        ? ((deliveredOrders / totalOrders) * 100).toFixed(1)
        : '0',
      activeUsers: {
        customers: totalCustomers,
        merchants: totalMerchants,
        drivers: totalDrivers,
        total: totalCustomers + totalMerchants + totalDrivers,
      },
      revenueChart: days,
      orderVolume,
      statusDistribution,
      userGrowth,
    };
  }
}
