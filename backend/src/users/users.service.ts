import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; // ดึงท่อต่อ DB มา
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  // 1. ฉีด PrismaService เข้ามาใน Constructor
  constructor(private prisma: PrismaService) {}

  // 2. ฟังก์ชันสร้าง User (ชั่วคราวชี้ไปที่ Customer)
  async create(createUserDto: CreateUserDto) {
    return this.prisma.customer.create({
      data: {
        email: createUserDto.email,
        password: createUserDto.password,
        name: createUserDto.name,
        phone: createUserDto.phone,
      },
      select: { id: true, email: true, name: true, phone: true }
    });
  }

  // 3. ฟังก์ชันดึง User ทั้งหมด
  async findAll() {
    return this.prisma.customer.findMany({
      select: { id: true, email: true, name: true, phone: true }
    });
  }

  // 4. ฟังก์ชันดึง User รายบุคคลตาม ID
  async findOne(id: number) {
    return this.prisma.customer.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, phone: true }
    });
  }

  // 5. ฟังก์ชันแก้ไขข้อมูล User
  async update(id: number, updateUserDto: UpdateUserDto) {
    return this.prisma.customer.update({
      where: { id },
      data: updateUserDto,
      select: { id: true, email: true, name: true, phone: true }
    });
  }

  // 6. ฟังก์ชันลบ User
  async remove(id: number) {
    return this.prisma.customer.delete({
      where: { id },
      select: { id: true, email: true }
    });
  }
}