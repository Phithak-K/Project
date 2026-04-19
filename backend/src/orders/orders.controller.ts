import { Controller, Post, Get, Body, Req, UseGuards, Patch, Param } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/roles.enum';
import { CreateOrderDto } from './dto/create-order.dto';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // 2. ใช้ฟังก์ชันสร้างออเดอร์ที่ผ่านการ Validate แล้ว
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Merchant)  // ✅ SEC-05: เฉพาะ Merchant เท่านั้นที่สร้าง Order ได้
  @Post()
  create(@Req() req: any, @Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.createOrder(req.user.userId, createOrderDto);
  }

  // ==== 🆕 New Merchant Features ====
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Merchant)
  @Get('stats')
  getOrderStats(@Req() req: any) {
    return this.ordersService.getOrderStats(req.user.userId);
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
    return this.ordersService.getDriverStats(req.user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Merchant)
  @Get('my-orders')
  getMyOrders(@Req() req: any) {
    return this.ordersService.getMyOrders(req.user.userId);
  }

  @UseGuards(JwtAuthGuard) // Any role can access it, access control is handled in service
  @Get(':id')
  getOrderById(@Param('id') id: string, @Req() req: any) {
    return this.ordersService.getOrderById(Number(id), req.user.userId, req.user.role);
  }

  @UseGuards(JwtAuthGuard) 
  @Get(':id/messages')
  getOrderMessages(@Param('id') id: string, @Req() req: any) {
    return this.ordersService.getOrderMessages(Number(id), req.user.userId, req.user.role);
  }



  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Merchant)
  @Patch(':id/cancel')
  cancelOrder(@Param('id') id: string, @Req() req: any) {
    return this.ordersService.cancelOrderByMerchant(Number(id), req.user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Merchant)
  @Patch(':id/preparation-time')
  updatePreparationTime(@Param('id') id: string, @Body() body: { estimatedReadyAt: string }, @Req() req: any) {
    return this.ordersService.updatePreparationTime(Number(id), req.user.userId, body.estimatedReadyAt);
  }



  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Driver)
  @Patch(':id/accept')
  acceptOrder(@Param('id') id: string, @Req() req: any) {
    const driverId = req.user.userId;
    return this.ordersService.acceptOrder(Number(id), driverId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Driver)
  @Patch(':id/pickup')
  pickupOrder(@Param('id') id: string, @Req() req: any) {
    const driverId = req.user.userId;
    return this.ordersService.pickupOrder(Number(id), driverId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Driver)
  @Patch(':id/ship')
  startShippingOrder(@Param('id') id: string, @Req() req: any) {
    const driverId = req.user.userId;
    return this.ordersService.startShippingOrder(Number(id), driverId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Driver)
  @Patch(':id/complete')
  completeOrder(@Param('id') id: string, @Body() body: { proofOfDelivery?: string }, @Req() req: any) {
    const driverId = req.user.userId;
    return this.ordersService.completeOrder(Number(id), driverId, body.proofOfDelivery);
  }

  // ==== 💰 Enterprise Features ====
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Driver)
  @Patch(':id/pay')
  payOrder(@Param('id') id: string, @Req() req: any) {
    const driverId = req.user.userId;
    return this.ordersService.payOrder(Number(id), driverId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Customer, Role.Merchant)
  @Post(':id/rate')
  rateOrder(@Param('id') id: string, @Body() body: { score: number, comment?: string }, @Req() req: any) {
    return this.ordersService.rateOrder(Number(id), req.user.userId, req.user.role, body.score, body.comment);
  }

  // 🆕 Endpoint สำหรับ Dashboard Analytics สถิติขั้นสูง
  @UseGuards(RolesGuard)
  @Roles(Role.Merchant)
  @Get('analytics')
  async getAnalytics(@Req() req: any) {
    return this.ordersService.getMerchantAnalytics(req.user.sub);
  }
}