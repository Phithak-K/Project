import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'กรุณากรอกอีเมลให้ถูกต้อง' })
  @IsNotEmpty({ message: 'ต้องระบุอีเมล' })
  email: string;

  @IsString()
  @MinLength(6, { message: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' })
  @IsNotEmpty({ message: 'ต้องระบุรหัสผ่าน' })
  password: string;

  @IsString()
  @IsOptional()
  role?: string;
}
