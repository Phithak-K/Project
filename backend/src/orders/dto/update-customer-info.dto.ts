import { IsOptional, IsString } from 'class-validator';

export class UpdateCustomerInfoDto {
  @IsOptional()
  @IsString()
  receiverName?: string;

  @IsOptional()
  @IsString()
  receiverPhone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  productDetail?: string;
}
