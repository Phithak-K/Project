import { Controller, Post, Get, Body, Req, UseGuards, Patch, Param } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/roles.enum';
import { CreateOrderDto } from './dto/create-order.dto';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler'; // ✅ Per-Route Rate Limiting

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // 2. ใช้ฟังก์ชันสร้างออเดอร์ที่ผ่านการ Validate แล้ว
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Merchant)  // ✅ SEC-05: เฉพาะ Merchant เท่านั้นที่สร้าง Order ได้
  @Post()
  create(@Req() req: any, @Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.createOrder(req.user.sub, createOrderDto);
  }

  // ==== 🆕 New Merchant Features ====
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Merchant)
  @Get('stats')
  getOrderStats(@Req() req: any) {
    return this.ordersService.getOrderStats(req.user.sub);
  }

  // ==== Driver Routes ====
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
    return this.ordersService.getDriverStats(req.user.sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Merchant)
  @Get('my-orders')
  getMyOrders(@Req() req: any) {
    return this.ordersService.getMyOrders(req.user.sub);
  }

  // ✅ SEC: Public Tracking — Rate Limited 10 ครั้ง/นาที/IP เพื่อป้องกัน Brute-force Tracking ID
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Get('track/:trackingNumber')
  getPublicOrderTracking(@Param('trackingNumber') trackingNumber: string) {
    return this.ordersService.getPublicOrderTracking(trackingNumber);
  }

  @UseGuards(JwtAuthGuard) // Any role can access it, access control is handled in service
  @Get(':id')
  getOrderById(@Param('id') id: string, @Req() req: any) {
    return this.ordersService.getOrderById(Number(id), req.user.sub, req.user.role);
  }

  @UseGuards(JwtAuthGuard) 
  @Get(':id/messages')
  getOrderMessages(@Param('id') id: string, @Req() req: any) {
    return this.ordersService.getOrderMessages(Number(id), req.user.sub, req.user.role);
  }



  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Merchant)
  @Patch(':id/cancel')
  cancelOrder(@Param('id') id: string, @Req() req: any) {
    return this.ordersService.cancelOrderByMerchant(Number(id), req.user.sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Merchant)
  @Patch(':id/preparation-time')
  updatePreparationTime(@Param('id') id: string, @Body() body: { estimatedReadyAt: string }, @Req() req: any) {
    return this.ordersService.updatePreparationTime(Number(id), req.user.sub, body.estimatedReadyAt);
  }



  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Driver)
  @Patch(':id/accept')
  acceptOrder(@Param('id') id: string, @Req() req: any) {
    const driverId = req.user.sub;
    return this.ordersService.acceptOrder(Number(id), driverId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Driver)
  @Patch(':id/pickup')
  pickupOrder(@Param('id') id: string, @Req() req: any) {
    const driverId = req.user.sub;
    return this.ordersService.pickupOrder(Number(id), driverId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Driver)
  @Patch(':id/ship')
  startShippingOrder(@Param('id') id: string, @Req() req: any) {
    const driverId = req.user.sub;
    return this.ordersService.startShippingOrder(Number(id), driverId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Driver)
  @Patch(':id/complete')
  completeOrder(@Param('id') id: string, @Body() body: { proofOfDelivery?: string }, @Req() req: any) {
    const driverId = req.user.sub;
    return this.ordersService.completeOrder(Number(id), driverId, body.proofOfDelivery);
  }

  // ==== 💰 Enterprise Features ====
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Driver)
  @Patch(':id/pay')
  payOrder(@Param('id') id: string, @Req() req: any) {
    const driverId = req.user.sub;
    return this.ordersService.payOrder(Number(id), driverId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Customer, Role.Merchant)
  @Post(':id/rate')
  rateOrder(@Param('id') id: string, @Body() body: { score: number, comment?: string }, @Req() req: any) {
    return this.ordersService.rateOrder(Number(id), req.user.sub, req.user.role, body.score, body.comment);
  }

  // 🆕 Endpoint สำหรับ Dashboard Analytics สถิติขั้นสูง
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Merchant)
  @Get('analytics')
  async getAnalytics(@Req() req: any) {
    return this.ordersService.getMerchantAnalytics(req.user.sub);
  }

  // Admin: สถิติภาพรวมทั้งระบบ
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Get('admin/stats')
  async getAdminStats() {
    return this.ordersService.getAdminStats();
  }
}