import { Controller, Post, Get, Body, Req, UseGuards, Patch, Param } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CreateOrderDto } from './dto/create-order.dto'; // 1. อย่าลืม Import DTO ที่เรากำลังจะสร้าง

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // 2. ใช้ฟังก์ชันสร้างออเดอร์ที่ผ่านการ Validate แล้ว
  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Req() req: any, @Body() createOrderDto: CreateOrderDto) {
    // merchantId ดึงมาจาก Token เช่นเดิม แต่ข้อมูลใน Body จะถูกตรวจด้วย DTO ก่อนเข้า Service
    return this.ordersService.createOrder(req.user.userId, createOrderDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  getMyOrders(@Req() req: any) {
    const merchantId = req.user.userId;
    return this.ordersService.getMyOrders(merchantId);
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
  @Patch(':id/accept')
  acceptOrder(@Param('id') id: string, @Req() req: any) {
    const driverId = req.user.userId;
    return this.ordersService.acceptOrder(Number(id), driverId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Driver)
  @Patch(':id/complete')
  completeOrder(@Param('id') id: string, @Req() req: any) {
    const driverId = req.user.userId;
    return this.ordersService.completeOrder(Number(id), driverId);
  }
}