import {
  IsString,
  IsNumber,
  IsOptional,
  Min,
  IsNotEmpty,
} from 'class-validator';

export class CreateOrderItemDto {
  @IsString()
  @IsNotEmpty({ message: 'ต้องระบุชื่อสินค้า' })
  productName: string;

  @IsNumber()
  @Min(1, { message: 'จำนวนต้องอย่างน้อย 1' })
  quantity: number;

  @IsNumber()
  @Min(0, { message: 'ราคาต่อหน่วยต้องไม่ติดลบ' })
  unitPrice: number;

  @IsString()
  @IsOptional()
  note?: string;

  @IsNumber()
  @IsOptional()
  productId?: number; // เชื่อมกับ Product Catalog (optional)
}
