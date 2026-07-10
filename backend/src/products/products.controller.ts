import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/roles.enum';

@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Merchant)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // GET /products/my — สินค้าทั้งหมดที่ Active (สำหรับ Dropdown ตอนสร้างออเดอร์)
  @Get('my')
  getMyProducts(@Req() req: any) {
    return this.productsService.getMyProducts(req.user.userId);
  }

  // GET /products/my/all — สินค้าทั้งหมดรวมที่ปิดใช้งาน (สำหรับหน้าจัดการ Catalog)
  @Get('my/all')
  getMyProductsAll(@Req() req: any) {
    return this.productsService.getMyProductsAll(req.user.userId);
  }

  // POST /products — เพิ่มสินค้าใหม่
  @Post()
  createProduct(@Req() req: any, @Body() dto: CreateProductDto) {
    return this.productsService.createProduct(req.user.userId, dto);
  }

  // PATCH /products/:id — แก้ไขสินค้า
  @Patch(':id')
  updateProduct(
    @Param('id') id: string,
    @Req() req: any,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.updateProduct(Number(id), req.user.userId, dto);
  }

  // DELETE /products/:id — ลบสินค้า (Smart: Soft Delete ถ้ามีประวัติการสั่ง)
  @Delete(':id')
  deleteProduct(@Param('id') id: string, @Req() req: any) {
    return this.productsService.deleteProduct(Number(id), req.user.userId);
  }
}
