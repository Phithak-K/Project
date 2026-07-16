import { Controller, Post, Get, Body, Req, UseGuards, Patch, Param, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/roles.enum';
import { CreateOrderDto } from './dto/create-order.dto';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // 2. ใช้ฟังก์ชันสร้างออเดอร์ที่ผ่านการ Validate แล้ว
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Merchant)  // ✅ SEC-05: เฉพาะ Merchant เท่านั้นที่สร้าง Order ได้
  @Post()
  create(@Req() req: any, @Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.createOrder(Number(req.user.userId), createOrderDto);
  }

  // ==== 🆕 New Merchant Features ====
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Merchant)
  @Get('stats')
  getOrderStats(@Req() req: any) {
    return this.ordersService.getOrderStats(Number(req.user.userId));
  }

  // ==== Driver Routes ====
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Driver)
  @Get('driver/my-jobs')
  getDriverActiveJobs(@Req() req: any) {
    return this.ordersService.getDriverActiveJobs(Number(req.user.userId));
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Driver)
  @Get('available')
  findAllAvailable() {
    return this.ordersService.findAllAvailable();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Driver)
  @Get('stats/driver')
  getDriverStats(@Req() req: any) {
    return this.ordersService.getDriverStats(Number(req.user.userId));
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Merchant)
  @Get('my-orders')
  getMyOrders(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.ordersService.getMyOrders(
      Number(req.user.userId),
      page ? Number(page) : 1,
      limit ? Number(limit) : 10
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Customer)
  @Get('customer/my-orders')
  getCustomerOrders(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.ordersService.getCustomerOrders(
      Number(req.user.userId),
      page ? Number(page) : 1,
      limit ? Number(limit) : 10
    );
  }

  // ✅ SEC: Public Tracking — Rate Limited 10 ครั้ง/นาที/IP เพื่อป้องกัน Brute-force Tracking ID
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Get('track/:trackingNumber')
  getPublicOrderTracking(@Param('trackingNumber') trackingNumber: string) {
    return this.ordersService.getPublicOrderTracking(trackingNumber);
  }

  // 🆕 Endpoint สำหรับ Dashboard Analytics สถิติขั้นสูง
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Merchant)
  @Get('analytics')
  async getAnalytics(@Req() req: any) {
    return this.ordersService.getMerchantAnalytics(Number(req.user.userId));
  }

  // Admin: สถิติภาพรวมทั้งระบบ
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Get('admin/stats')
  async getAdminStats() {
    return this.ordersService.getAdminStats();
  }

  @UseGuards(JwtAuthGuard) // Any role can access it, access control is handled in service
  @Get(':id')
  getOrderById(@Param('id') id: string, @Req() req: any) {
    return this.ordersService.getOrderById(Number(id), Number(req.user.userId), req.user.role);
  }

  @UseGuards(JwtAuthGuard) 
  @Get(':id/messages')
  getOrderMessages(@Param('id') id: string, @Req() req: any) {
    return this.ordersService.getOrderMessages(Number(id), Number(req.user.userId), req.user.role);
  }



  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Merchant)
  @Patch(':id/cancel')
  cancelOrder(@Param('id') id: string, @Req() req: any) {
    return this.ordersService.cancelOrderByMerchant(Number(id), Number(req.user.userId));
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Merchant)
  @Patch(':id/preparation-time')
  updatePreparationTime(@Param('id') id: string, @Body() body: { estimatedReadyAt: string }, @Req() req: any) {
    return this.ordersService.updatePreparationTime(Number(id), Number(req.user.userId), body.estimatedReadyAt);
  }



  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Driver)
  @Patch(':id/accept')
  acceptOrder(@Param('id') id: string, @Req() req: any) {
    const driverId = Number(req.user.userId);
    return this.ordersService.acceptOrder(Number(id), driverId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Driver)
  @Patch(':id/pickup')
  pickupOrder(@Param('id') id: string, @Req() req: any) {
    const driverId = Number(req.user.userId);
    return this.ordersService.pickupOrder(Number(id), driverId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Driver)
  @Patch(':id/ship')
  startShippingOrder(@Param('id') id: string, @Req() req: any) {
    const driverId = Number(req.user.userId);
    return this.ordersService.startShippingOrder(Number(id), driverId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Driver)
  @Patch(':id/complete')
  completeOrder(@Param('id') id: string, @Body() body: { proofOfDelivery?: string }, @Req() req: any) {
    const driverId = Number(req.user.userId);
    return this.ordersService.completeOrder(Number(id), driverId, body.proofOfDelivery);
  }

  // ==== 💰 Enterprise Features ====
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Driver)
  @Patch(':id/pay')
  payOrder(@Param('id') id: string, @Req() req: any) {
    const driverId = Number(req.user.userId);
    return this.ordersService.payOrder(Number(id), driverId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Customer, Role.Merchant)
  @Post(':id/rate')
  rateOrder(@Param('id') id: string, @Body() body: { score: number, comment?: string }, @Req() req: any) {
    return this.ordersService.rateOrder(Number(id), Number(req.user.userId), req.user.role, body.score, body.comment);
  }



  // ✅ SME Feature: Merchant มอบหมายคนขับให้ออเดอร์
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Merchant)
  @Patch(':id/assign')
  assignDriver(
    @Param('id') id: string,
    @Body() body: { driverId: number },
    @Req() req: any,
  ) {
    return this.ordersService.assignDriver(Number(id), Number(req.user.userId), body.driverId);
  }

  // ✅ SME Feature: ค้นหาประวัติออเดอร์ด้วยเบอร์โทรผู้รับ (Public, Rate-limited)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Get('track-by-phone/:phone')
  getOrdersByPhone(@Param('phone') phone: string) {
    return this.ordersService.getOrdersByPhone(phone);
  }

  // ✅ SME Feature: Export ออเดอร์เป็น CSV (Merchant only)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Merchant)
  @Get('export/csv')
  async exportCsv(
    @Req() req: any,
    @Res() res: Response,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const csv = await this.ordersService.exportOrdersCsv(Number(req.user.userId), dateFrom, dateTo);
    const dateStr = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="swiftpath-orders-${dateStr}.csv"`);
    // BOM for Excel Thai character support
    res.send('\uFEFF' + csv);
  }
}
