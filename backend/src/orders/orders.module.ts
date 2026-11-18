import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersExportService } from './orders-export.service';
import { OrdersAnalyticsService } from './orders-analytics.service';
import { OrdersDeliveryService } from './orders-delivery.service';
import { OrdersMerchantService } from './orders-merchant.service';
import { OrdersCustomerService } from './orders-customer.service';
import { OrdersController } from './orders.controller';
import { WeatherModule } from '../weather/weather.module';

@Module({
  imports: [WeatherModule],
  providers: [
    OrdersService,
    OrdersExportService,
    OrdersAnalyticsService,
    OrdersDeliveryService,
    OrdersMerchantService,
    OrdersCustomerService,
  ],
  controllers: [OrdersController],
  exports: [
    OrdersService,
    OrdersExportService,
    OrdersAnalyticsService,
    OrdersDeliveryService,
    OrdersMerchantService,
    OrdersCustomerService,
  ],
})
export class OrdersModule {}
