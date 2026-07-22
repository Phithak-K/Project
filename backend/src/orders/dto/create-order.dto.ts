import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  Min,
  IsNotEmpty,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateOrderItemDto } from './create-order-item.dto';

export class CreateOrderDto {
  // ── Legacy single-item fields (still supported for backward compat) ──
  @IsString()
  @IsOptional()
  productName?: string;

  @IsString()
  @IsOptional()
  productDetail?: string;

  @IsNumber()
  @IsOptional()
  @Min(1, { message: 'จำนวนสินค้าต้องอย่างน้อย 1 ชิ้น' })
  quantity?: number;

  @IsNumber()
  @IsOptional()
  @Min(0, { message: 'ราคาสินค้าต้องไม่ติดลบ' })
  price?: number;

  // ── ✅ SME Feature: Multi-item Invoice ──
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items?: CreateOrderItemDto[];

  // ── Receiver info ──
  @IsString()
  @IsNotEmpty({ message: 'ต้องระบุชื่อผู้รับ' })
  receiverName: string;

  @IsString()
  @IsNotEmpty({ message: 'ต้องระบุเบอร์โทร' })
  receiverPhone: string;

  @IsString()
  @IsNotEmpty({ message: 'ต้องระบุที่อยู่จัดส่ง' })
  address: string;

  @IsString()
  @IsNotEmpty({ message: 'ต้องระบุเมือง/จังหวัด' })
  city: string;

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
