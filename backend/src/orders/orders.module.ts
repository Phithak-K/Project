import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersExportService } from './orders-export.service';
import { OrdersController } from './orders.controller';
import { WeatherModule } from '../weather/weather.module';

@Module({
  imports: [WeatherModule],
  providers: [OrdersService, OrdersExportService],
  controllers: [OrdersController],
  exports: [OrdersService, OrdersExportService],
})
export class OrdersModule {}

