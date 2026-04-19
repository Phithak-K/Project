import { Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  async sendPushNotification(fcmToken: string, title: string, body: string, data?: any) {
    if (!fcmToken) return;

    const message: admin.messaging.Message = {
      token: fcmToken,
      notification: {
        title,
        body,
      },
      data: data || {},
    };

    try {
      const response = await admin.messaging().send(message);
      this.logger.log(`Successfully sent message: ${response}`);
    } catch (error) {
      this.logger.error(`Error sending message to token ${fcmToken}:`, error);
    }
  }

  // Helper method for standardizing order updates
  async sendOrderStatusUpdate(fcmToken: string, orderTrackingNumber: string, statusText: string) {
    await this.sendPushNotification(
      fcmToken,
      'อัปเดตสถานะการจัดส่ง - SwiftPath',
      `พัสดุหมายเลข ${orderTrackingNumber} ของคุณสถานะเปลี่ยนเป็น "${statusText}" แล้ว`,
      { type: 'ORDER_UPDATE', trackingNumber: orderTrackingNumber }
    );
  }
}
