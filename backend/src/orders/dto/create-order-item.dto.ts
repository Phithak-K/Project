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

  @IsNumber({ allowInfinity: false, allowNaN: false })
  @Min(0.01, { message: 'จำนวนต้องมากกว่า 0 (รองรับทศนิยม เช่น 0.5 กก.)' })
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
