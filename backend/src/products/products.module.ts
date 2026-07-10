import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';

@Module({
  providers: [ProductsService],
  controllers: [ProductsController],
  exports: [ProductsService], // Export ให้ OrdersModule เรียกใช้ได้ถ้าต้องการ
})
export class ProductsModule {}
