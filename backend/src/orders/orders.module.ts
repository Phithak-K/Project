import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { WeatherModule } from '../weather/weather.module';
import { ChatModule } from '../chat/chat.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [WeatherModule, ChatModule, NotificationsModule],
  providers: [OrdersService],
  controllers: [OrdersController]
})
export class OrdersModule {}
