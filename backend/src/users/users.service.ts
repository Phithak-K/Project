import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; // ดึงท่อต่อ DB มา
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  // 1. ฉีด PrismaService เข้ามาใน Constructor
  constructor(private prisma: PrismaService) {}

  // 2. ฟังก์ชันสร้าง User (สมัครสมาชิก)
  async create(createUserDto: CreateUserDto) {
    return this.prisma.user.create({
      data: createUserDto,
    });
  }

  // 3. ฟังก์ชันดึง User ทั้งหมด
  async findAll() {
    return this.prisma.user.findMany();
  }

  // 4. ฟังก์ชันดึง User รายบุคคลตาม ID
  async findOne(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  // 5. ฟังก์ชันแก้ไขข้อมูล User
  async update(id: number, updateUserDto: UpdateUserDto) {
    return this.prisma.user.update({
      where: { id },
      data: updateUserDto,
    });
  }

  // 6. ฟังก์ชันลบ User
  async remove(id: number) {
    return this.prisma.user.delete({
      where: { id },
    });
  }
}