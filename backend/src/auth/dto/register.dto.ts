import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional } from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  name!: string; // ใส่ ! เข้าไปแบบนี้ครับ

  @IsString()
  @IsNotEmpty()
  phone!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsString()
  @IsOptional()
  role?: string; // อันนี้มี ? อยู่แล้วไม่ต้องแก้ครับ
}