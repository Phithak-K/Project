import { IsString, IsNumber, IsOptional, Min, IsBoolean } from 'class-validator';

export class UpdateProductDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  unit?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  defaultPrice?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean; // ปิด/เปิดสินค้าได้โดยไม่ต้องลบ
}
