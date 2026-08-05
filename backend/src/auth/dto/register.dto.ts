import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsOptional,
  Matches,
} from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(13)
  nationalId!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @Matches(/^[a-zA-Z0-9_]+$/, { message: 'username ใช้ได้เฉพาะตัวอักษร ตัวเลข และ _ เท่านั้น' })
  username!: string;

  @IsString()
  @IsOptional()
  storeName?: string;

  @IsString()
  @IsOptional()
  storeAddress?: string;

  @IsString()
  @IsOptional()
  driverLicense?: string;

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
  role?: string;

  @IsString()
  @IsOptional()
  vehiclePlate?: string;

  @IsString()
  @IsOptional()
  vehicleType?: string; // อันนี้มี ? อยู่แล้วไม่ต้องแก้ครับ
}
