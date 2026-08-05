import {
  IsNotEmpty,
  IsString,
  MinLength,
  IsOptional,
} from 'class-validator';

export class LoginDto {
  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  username?: string;

  @IsString()
  @MinLength(6, { message: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' })
  @IsNotEmpty({ message: 'ต้องระบุรหัสผ่าน' })
  password: string;

  @IsString()
  @IsOptional()
  role?: string;
}
