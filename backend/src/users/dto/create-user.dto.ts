import { Role } from '@prisma/client';

export class CreateUserDto {
  email: string;
  password  : string;
  name?: string;
  phone?: string;
  role?: Role; // ใส่ Role ตามที่เราตั้งไว้ใน Prisma
}