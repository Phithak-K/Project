import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaModule } from '../prisma/prisma.module'; // เพิ่มบรรทัดนี้

@Module({
  imports: [PrismaModule], // เพิ่ม PrismaModule เข้ามาที่นี่
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}