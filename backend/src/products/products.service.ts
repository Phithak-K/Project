import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  // ── ดึงสินค้าทั้งหมดของร้านนี้ (เรียงตามชื่อ) ──
  async getMyProducts(merchantId: number) {
    return this.prisma.product.findMany({
      where: { merchantId, isActive: true },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        unit: true,
        defaultPrice: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  // ── ดึงสินค้าทั้งหมด รวมถึงที่ปิดใช้งาน (สำหรับหน้าจัดการ) ──
  async getMyProductsAll(merchantId: number) {
    return this.prisma.product.findMany({
      where: { merchantId },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        unit: true,
        defaultPrice: true,
        isActive: true,
        createdAt: true,
        _count: { select: { orderItems: true } }, // กี่ครั้งที่เคยสั่ง
      },
    });
  }

  // ── สร้างสินค้าใหม่ใน Catalog ──
  async createProduct(merchantId: number, dto: CreateProductDto) {
    // เช็คไม่ให้ชื่อสินค้าซ้ำในร้านเดียวกัน
    const existing = await this.prisma.product.findFirst({
      where: { merchantId, name: dto.name.trim() },
    });
    if (existing) {
      throw new BadRequestException(
        `มีสินค้าชื่อ "${dto.name}" ในร้านของคุณอยู่แล้ว`,
      );
    }

    return this.prisma.product.create({
      data: {
        merchantId,
        name: dto.name.trim(),
        unit: dto.unit?.trim() || null,
        defaultPrice: dto.defaultPrice ?? 0,
        isActive: true,
      },
    });
  }

  // ── อัปเดตสินค้า ──
  async updateProduct(
    productId: number,
    merchantId: number,
    dto: UpdateProductDto,
  ) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) throw new NotFoundException('ไม่พบสินค้านี้');
    if (product.merchantId !== merchantId)
      throw new ForbiddenException('คุณไม่มีสิทธิ์แก้ไขสินค้านี้');

    return this.prisma.product.update({
      where: { id: productId },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.unit !== undefined && { unit: dto.unit?.trim() || null }),
        ...(dto.defaultPrice !== undefined && { defaultPrice: dto.defaultPrice }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  // ── ลบสินค้า (Soft Delete — แค่ปิดใช้งาน ถ้ามีประวัติการสั่ง) ──
  async deleteProduct(productId: number, merchantId: number) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { _count: { select: { orderItems: true } } },
    });

    if (!product) throw new NotFoundException('ไม่พบสินค้านี้');
    if (product.merchantId !== merchantId)
      throw new ForbiddenException('คุณไม่มีสิทธิ์ลบสินค้านี้');

    // ถ้ามีประวัติการสั่งซื้อ → Soft Delete (ปิดไว้แทน เพื่อรักษาข้อมูลบัญชี)
    if (product._count.orderItems > 0) {
      await this.prisma.product.update({
        where: { id: productId },
        data: { isActive: false },
      });
      return {
        deleted: false,
        message: `สินค้า "${product.name}" มีประวัติการสั่งซื้อ ${product._count.orderItems} ครั้ง — ปิดใช้งานแทนการลบเพื่อรักษาข้อมูล`,
      };
    }

    // ถ้ายังไม่เคยถูกสั่ง → ลบออกจริงๆ
    await this.prisma.product.delete({ where: { id: productId } });
    return { deleted: true, message: `ลบสินค้า "${product.name}" เรียบร้อย` };
  }
}
