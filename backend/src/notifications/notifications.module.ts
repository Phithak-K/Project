import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { OrderNotificationsListener } from './listeners/order-notifications.listener';

@Module({
  providers: [NotificationsService, OrderNotificationsListener],
  exports: [NotificationsService],
})
export class NotificationsModule {}

