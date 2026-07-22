import {
  IsString,
  IsNumber,
  IsOptional,
  Min,
  IsNotEmpty,
  IsBoolean,
} from 'class-validator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty({ message: 'ต้องระบุชื่อสินค้า' })
  name: string;

  @IsString()
  @IsOptional()
  unit?: string; // เช่น "ถุง", "เส้น", "กก.", "กล่อง"

  @IsNumber()
  @IsOptional()
  @Min(0, { message: 'ราคาต้องไม่ติดลบ' })
  defaultPrice?: number;
}
