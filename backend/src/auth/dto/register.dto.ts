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

  // ✅ Username สำหรับล็อกอิน (a-z, 0-9, _ ยาว 4-20 ตัว)
  @IsString()
  @IsNotEmpty({ message: 'กรุณาตั้ง Username' })
  @Matches(/^[a-zA-Z0-9_]{4,20}$/, {
    message: 'Username ต้องเป็น a-z, 0-9 หรือ _ ยาว 4-20 ตัว',
  })
  username!: string;

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
