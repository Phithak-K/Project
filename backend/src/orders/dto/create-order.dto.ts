import { IsString, IsNumber, IsOptional, IsBoolean, Min, Length, IsNotEmpty } from 'class-validator';

export class CreateOrderDto {
  @IsString()
  @IsNotEmpty({ message: 'ต้องระบุชื่อสินค้า' })
  productName: string;

  @IsString()
  @IsOptional()
  productDetail?: string;

  @IsNumber()
  @Min(1, { message: 'จำนวนสินค้าต้องอย่างน้อย 1 ชิ้น' })
  quantity: number;

  @IsNumber()
  @Min(0, { message: 'ราคาสินค้าต้องไม่ติดลบ' })
  price: number;

  @IsString()
  @IsNotEmpty({ message: 'ต้องระบุชื่อผู้รับ' })
  receiverName: string;

  @IsString()
  @Length(10, 10, { message: 'เบอร์โทรต้องมี 10 หลัก' })
  receiverPhone: string;

  @IsString()
  @IsNotEmpty({ message: 'ต้องระบุที่อยู่จัดส่ง' })
  address: string;

  @IsNumber()
  @IsOptional()
  lat?: number;

  @IsNumber()
  @IsOptional()
  lng?: number;

  @IsBoolean()
  @IsOptional()
  hasInsurance?: boolean;
}