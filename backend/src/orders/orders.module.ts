import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersExportService } from './orders-export.service';
import { OrdersAnalyticsService } from './orders-analytics.service';
import { OrdersController } from './orders.controller';
import { WeatherModule } from '../weather/weather.module';

@Module({
  imports: [WeatherModule],
  providers: [OrdersService, OrdersExportService, OrdersAnalyticsService],
  controllers: [OrdersController],
  exports: [OrdersService, OrdersExportService, OrdersAnalyticsService],
})
export class OrdersModule {}

