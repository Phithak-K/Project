import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

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
    return delegate.create({
      data: {
        email: createUserDto.email,
        password: createUserDto.password,
        name: createUserDto.name,
        phone: createUserDto.phone,
      },
      select: { id: true, email: true, name: true, phone: true, balance: true }
    });
  }

  async findAll(role: string) {
    const delegate = this.getDelegate(role);
    return delegate.findMany({
      select: { id: true, email: true, name: true, phone: true, balance: true }
    });
  }

  async findOne(id: number, role: string) {
    const delegate = this.getDelegate(role);
    const user = await delegate.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, phone: true, balance: true }
    });
    if (!user) throw new NotFoundException(`User with ID ${id} not found in ${role}`);
    return user;
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
}