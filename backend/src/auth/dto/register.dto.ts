import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional, IsEnum } from 'class-validator';
import { Role } from '@prisma/client';

export class RegisterDto {
  @IsEmail({}, { message: 'กรุณากรอกอีเมลให้ถูกต้อง' })
  @IsNotEmpty({ message: 'ต้องระบุอีเมล' })
  email: string;

  @IsString()
  @MinLength(6, { message: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' })
  @IsNotEmpty({ message: 'ต้องระบุรหัสผ่าน' })
  password: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(Role, { message: 'Role ต้องเป็น Admin, Merchant, Driver หรือ Customer เท่านั้น' })
  @IsOptional()
  role?: Role;
}
