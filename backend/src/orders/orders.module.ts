import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersExportService } from './orders-export.service';
import { OrdersAnalyticsService } from './orders-analytics.service';
import { OrdersDeliveryService } from './orders-delivery.service';
import { OrdersController } from './orders.controller';
import { WeatherModule } from '../weather/weather.module';

@Module({
  imports: [WeatherModule],
  providers: [
    OrdersService,
    OrdersExportService,
    OrdersAnalyticsService,
    OrdersDeliveryService,
  ],
  controllers: [OrdersController],
  exports: [
    OrdersService,
    OrdersExportService,
    OrdersAnalyticsService,
    OrdersDeliveryService,
  ],
})
export class OrdersModule {}
