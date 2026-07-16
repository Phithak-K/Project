import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt'; // [BUG-006 FIX] ป้องกัน Plain-text Password

@Injectable()
export class UsersService {
  // 1. ฉีด PrismaService เข้ามาใน Constructor
  constructor(private prisma: PrismaService) {}

  // Helper function เพื่อเลือก Table ตาม Role
  private getDelegate(role: string): any {
    switch (role?.toLowerCase()) {
      case 'merchant': return this.prisma.merchant;
      case 'driver': return this.prisma.driver;
      case 'customer': return this.prisma.customer;
      default: throw new BadRequestException(`Invalid role: ${role}`);
    }
  }

  // Helper function กำจัดข้อมูลหลอน (Orphaned Data)
  private async cleanupUserRelatedData(id: number, role: string) {
    const roleCapitalized = role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
    
    // 1. ลบ Message ทั้งหมดที่ User คนนี้เป็นผู้ส่งหรือผู้รับ
    await this.prisma.message.deleteMany({
      where: {
        OR: [
          { senderId: id, senderRole: roleCapitalized },
          { receiverId: id, receiverRole: roleCapitalized }
        ]
      }
    });

    // 2. ปล่อย Order ไว้เป็นประวัติการเงิน แต่ชี้ Foreign Key เป็น null (Anonymize)
    if (roleCapitalized === 'Customer') {
      await this.prisma.order.updateMany({
        where: { customerId: id },
        data: { customerId: null }
      });
    } else if (roleCapitalized === 'Driver') {
      await this.prisma.order.updateMany({
        where: { driverId: id },
        data: { driverId: null }
      });
    } else if (roleCapitalized === 'Merchant') {
      await this.prisma.order.updateMany({
        where: { merchantId: id },
        data: { merchantId: null }
      });
    }
  }

  async create(createUserDto: CreateUserDto, role: string) {
    const delegate = this.getDelegate(role);
    // [BUG-006 FIX] Hash รหัสผ่านก่อนบันทึกลง Database ป้องกัน Plain-text Password
    const hashedPassword = createUserDto.password
      ? await bcrypt.hash(createUserDto.password, 10)
      : undefined;
    return delegate.create({
      data: {
        email: createUserDto.email,
        password: hashedPassword,
        name: createUserDto.name,
        phone: createUserDto.phone,
      },
      select: { id: true, email: true, name: true, phone: true, balance: true }
    });
  }

  async findAll(role: string) {
    const delegate = this.getDelegate(role);
    return delegate.findMany({
      select: { id: true, email: true, name: true, phone: true, balance: true, isVerified: true },
      orderBy: { id: 'desc' },
    });
  }

  async findOne(id: number, role: string) {
    const delegate = this.getDelegate(role);
    const user = await delegate.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, phone: true, balance: true, isVerified: true }
    });
    if (!user) throw new NotFoundException(`User with ID ${id} not found in ${role}`);
    return user;
  }

  async updateProfile(id: number, role: string, updateDto: UpdateUserDto) {
    const delegate = this.getDelegate(role);
    
    // Prevent updating sensitive fields
    const safeUpdateDto = { ...updateDto };
    delete (safeUpdateDto as any).email;
    delete (safeUpdateDto as any).password;
    delete (safeUpdateDto as any).balance;
    delete (safeUpdateDto as any).isVerified;
    delete (safeUpdateDto as any).role;
    
    return delegate.update({
      where: { id },
      data: safeUpdateDto,
      select: { id: true, email: true, name: true, phone: true }
    });
  }

  async update(id: number, updateUserDto: UpdateUserDto, role: string) {
    const delegate = this.getDelegate(role);
    return delegate.update({
      where: { id },
      data: updateUserDto,
      select: { id: true, email: true, name: true, phone: true, balance: true }
    });
  }

  async remove(id: number, role: string) {
    const delegate = this.getDelegate(role);
    
    // ตรวจสอบว่ามีบัญชีนี้อยู่จริง
    const user = await this.findOne(id, role);
    
    const roleCapitalized = role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();

    // Option A: Prevent hard deletion if financial or order records exist
    const txCount = await this.prisma.transaction.count({
      where: { userId: id, userRole: roleCapitalized }
    });
    if (txCount > 0) throw new BadRequestException('ไม่สามารถลบบัญชีนี้ได้ เนื่องจากมีประวัติธุรกรรมการเงิน');

    const orderCount = await this.prisma.order.count({
      where: roleCapitalized === 'Customer' ? { customerId: id } : 
             roleCapitalized === 'Driver' ? { driverId: id } : 
             { merchantId: id }
    });
    if (orderCount > 0) throw new BadRequestException('ไม่สามารถลบบัญชีนี้ได้ เนื่องจากมีประวัติออเดอร์');

    const ratingCount = await this.prisma.rating.count({
      where: {
        OR: [
          { raterId: id, raterRole: roleCapitalized },
          { driverId: roleCapitalized === 'Driver' ? id : -1 }
        ]
      }
    });
    if (ratingCount > 0) throw new BadRequestException('ไม่สามารถลบบัญชีนี้ได้ เนื่องจากมีประวัติการให้คะแนนรีวิว');

    // 1. เคลียร์ข้อมูลหลอนที่ผูกกับตารางนี้ (Messages)
    await this.cleanupUserRelatedData(id, role);

    // 2. ลบผู้ใช้ทิ้งอย่างปลอดภัย
    return delegate.delete({
      where: { id },
      select: { id: true, email: true }
    });
  }

  /**
   * ✅ HIGH-01: Optimistic Locking สำหรับ Balance Update
   * ป้องกัน Race Condition เมื่อมีธุรกรรมหลายรายการพร้อมกัน
   * @param id - User ID
   * @param role - 'customer' | 'merchant' | 'driver'
   * @param amount - จำนวนเงิน (บวก=เพิ่ม, ลบ=หัก)
   * @param expectedVersion - version ที่ client รู้จัก (ต้องตรงกับ DB)
   * @throws ConflictException ถ้า version ไม่ตรง (มีการแก้ไขซ้อนกัน)
   */
  async updateBalanceAtomic(
    id: number,
    role: string,
    amount: number,
    expectedVersion: number,
  ) {
    const delegate = this.getDelegate(role);

    // Atomic: update เฉพาะเมื่อ version ตรงกับที่รู้จัก
    // ถ้ามี Request อื่น update ก่อน → version จะเปลี่ยน → count = 0 → ConflictException
    const result = await delegate.updateMany({
      where: {
        id,
        version: expectedVersion,
        ...(amount < 0 ? { balance: { gte: Math.abs(amount) } } : {}), // ป้องกัน balance ติดลบ
      },
      data: {
        balance: amount >= 0 ? { increment: amount } : { decrement: Math.abs(amount) },
        version: { increment: 1 }, // เพิ่ม version ทุกครั้งที่ update สำเร็จ
      },
    });

    if (result.count === 0) {
      const { ConflictException } = await import('@nestjs/common');
      throw new ConflictException(
        'Concurrent update conflict: ยอดเงินถูกแก้ไขพร้อมกันจากอุปกรณ์อื่น กรุณาลองใหม่อีกครั้ง',
      );
    }

    return { success: true, newVersion: expectedVersion + 1 };
  }

  // ==== ✅ SME Feature: Driver Management for Merchants ====

  /** คืน list คนขับทั้งหมดที่สังกัดร้านค้านี้ */
  async getMyDrivers(merchantId: number) {
    return this.prisma.driver.findMany({
      where: { merchantId },
      select: {
        id: true,
        name: true,
        phone: true,
        vehiclePlate: true,
        vehicleType: true,
        isActive: true,
        isVerified: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  /** ผูก Driver เข้ากับร้านค้า (Driver ต้องยืนยันตัวตนแล้ว) */
  async linkDriverToMerchant(driverId: number, merchantId: number) {
    const driver = await this.prisma.driver.findUnique({ where: { id: driverId } });
    if (!driver) throw new NotFoundException('ไม่พบข้อมูลคนขับ');
    if (!driver.isVerified) throw new BadRequestException('คนขับต้องยืนยันตัวตนก่อนจึงจะผูกกับร้านได้');
    if (driver.merchantId && driver.merchantId !== merchantId) {
      throw new BadRequestException('คนขับคนนี้สังกัดร้านอื่นอยู่แล้ว กรุณาให้ร้านเดิมยกเลิกก่อน');
    }

    return this.prisma.driver.update({
      where: { id: driverId },
      data: { merchantId },
      select: { id: true, name: true, phone: true, vehiclePlate: true, merchantId: true },
    });
  }

  /** ยกเลิกความสัมพันธ์คนขับกับร้านค้า (คนขับกลายเป็น Freelance) */
  async unlinkDriverFromMerchant(driverId: number, merchantId: number) {
    const driver = await this.prisma.driver.findUnique({ where: { id: driverId } });
    if (!driver) throw new NotFoundException('ไม่พบข้อมูลคนขับ');
    if (driver.merchantId !== merchantId) {
      throw new BadRequestException('คนขับคนนี้ไม่ได้สังกัดร้านของคุณ');
    }

    return this.prisma.driver.update({
      where: { id: driverId },
      data: { merchantId: null },
      select: { id: true, name: true, merchantId: true },
    });
  }

  /** ค้นหา Driver ด้วย email หรือ phone สำหรับการผูก */
  async findDriverByContact(contact: string) {
    const driver = await this.prisma.driver.findFirst({
      where: {
        OR: [
          { email: contact },
          { phone: contact },
        ],
      },
      select: {
        id: true,
        name: true,
        phone: true,
        vehiclePlate: true,
        vehicleType: true,
        isVerified: true,
        merchantId: true,
      },
    });
    if (!driver) throw new NotFoundException('ไม่พบคนขับจากข้อมูลที่ระบุ');
    return driver;
  }
}