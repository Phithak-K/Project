import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { uploadBase64ToStorage } from '../utils/firebase-storage';

@WebSocketGateway({
  cors: {
    origin: [
      'http://localhost:3000',
      'http://app.localhost:3000',
      'http://store.localhost:3000',
      'http://fleet.localhost:3000',
      'https://app.swiftpath.com',
      'https://store.swiftpath.com',
      'https://fleet.swiftpath.com',
    ],
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  /**
   * handleConnection — รองรับ 2 ประเภทการเชื่อมต่อ:
   * 1. Authenticated: ต้องส่ง JWT token มาใน handshake.auth.token (Driver/Merchant/Customer)
   * 2. Public: ไม่มี token — จะได้รับสถานะ isPublic=true (ดูพิกัดได้อย่างเดียว ส่งข้อมูลไม่ได้)
   */
  handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth?.token as string) ||
        (client.handshake.query?.token as string) ||
        '';

      if (!token) {
        // [REALTIME-FIX] อนุญาตให้ Public Client (หน้า Tracking) เชื่อมต่อได้โดยไม่ต้อง Auth
        (client as any).isPublic = true;
        (client as any).user = null;
        this.logger.log(
          `Public client ${client.id} connected (tracking-only access)`,
        );
        return;
      }

      const cleanToken = token.replace('Bearer ', '');
      const payload = this.jwtService.verify(cleanToken);
      (client as any).user = payload;
      (client as any).isPublic = false;
      this.logger.log(
        `Client ${client.id} connected (userId: ${payload.sub}, role: ${payload.role})`,
      );

      // [P0 FIX] Drivers join their merchant's specific room to receive only relevant new_available_order broadcasts
      if (payload.role === 'Driver') {
        this.prisma.driver
          .findUnique({ where: { id: payload.sub } })
          .then((driver) => {
            if (driver?.merchantId) {
              client.join(`merchant_${driver.merchantId}_drivers`);
            }
          })
          .catch((err) =>
            this.logger.error('Failed to fetch driver for room join', err),
          );
      }
    } catch (error) {
      this.logger.warn(`Client ${client.id} disconnected: invalid token`);
      client.emit('error', {
        message: 'Authentication failed: Token ไม่ถูกต้องหรือหมดอายุ',
      });
      client.disconnect();
    }
  }

  /**
   * Re-verify JWT Signature ทุก Event (Zero-Trust)
   * ใช้เฉพาะ Event ที่ต้องการ Auth เท่านั้น
   */
  private verifyAndGetUser(client: Socket): any | null {
    try {
      const raw =
        (client.handshake.auth?.token as string) ||
        (client.handshake.query?.token as string) ||
        '';
      const cleanToken = raw.replace('Bearer ', '');
      if (!cleanToken) throw new Error('No token');
      return this.jwtService.verify(cleanToken);
    } catch {
      client.emit('error', { message: 'Session expired. Please reconnect.' });
      client.disconnect();
      return null;
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client ${client.id} disconnected`);
  }

  // ─── Public Event: หน้า Tracking Subscribe รับพิกัดสดโดยไม่ต้อง Auth ─────────
  // ใครก็ตามที่มีหมายเลข Tracking สามารถดูพิกัดรถแบบ Real-time ได้
  @SubscribeMessage('subscribe_tracking')
  async handleSubscribeTracking(
    @MessageBody() data: { trackingNumber: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (!data.trackingNumber) {
      client.emit('error', { message: 'trackingNumber is required' });
      return;
    }
    // ตรวจว่า Tracking Number นี้มีจริงในระบบก่อน Subscribe
    const order = await this.prisma.order.findFirst({
      where: { trackingNumber: data.trackingNumber },
    });
    if (!order) {
      client.emit('error', { message: 'Tracking number not found' });
      return;
    }
    const room = `tracking_${data.trackingNumber}`;
    client.join(room);
    this.logger.log(
      `Client ${client.id} subscribed to public tracking room: ${room}`,
    );
    return { event: 'subscribed', room };
  }

  // ─── Authenticated Event: ส่งข้อความแชทในออเดอร์ ─────────────────────────────
  @SubscribeMessage('send_message')
  async handleMessage(
    @MessageBody()
    data: {
      orderId: number;
      receiverId: number;
      receiverRole: string;
      content: string;
      imageUrl?: string;
      audioUrl?: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    const user = this.verifyAndGetUser(client);
    if (!user) return;

    const order = await this.prisma.order.findUnique({
      where: { id: data.orderId },
    });
    if (!order) {
      client.emit('error', { message: 'Order not found' });
      return;
    }
    const isInvolved =
      (user.role === 'Merchant' && order.merchantId === user.sub) ||
      (user.role === 'Driver' && order.driverId === user.sub) ||
      (user.role === 'Customer' && order.customerId === user.sub);
    if (!isInvolved) {
      client.emit('error', { message: 'You are not part of this order' });
      return;
    }

    const firestore = admin.firestore();
    const chatRef = firestore
      .collection('chats')
      .doc(`order_${data.orderId}`)
      .collection('messages');

    let uploadedImageUrl: string | null = null;
    let uploadedAudioUrl: string | null = null;

    try {
      if (data.imageUrl) {
        uploadedImageUrl = await uploadBase64ToStorage(
          data.imageUrl,
          `chats/order_${data.orderId}/images`,
        );
      }
      if (data.audioUrl) {
        uploadedAudioUrl = await uploadBase64ToStorage(
          data.audioUrl,
          `chats/order_${data.orderId}/audio`,
        );
      }
    } catch (e: any) {
      this.logger.error('Failed to upload chat media', e);
    }

    const messageDoc = {
      orderId: data.orderId,
      senderId: user.sub,
      senderRole: user.role,
      receiverId: data.receiverId,
      receiverRole: data.receiverRole,
      content: data.content,
      imageUrl: uploadedImageUrl,
      audioUrl: uploadedAudioUrl,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await chatRef.add(messageDoc);
    const newMessage = { id: docRef.id, ...messageDoc, createdAt: new Date() };

    this.server.to(`order_${data.orderId}`).emit('receive_message', newMessage);
    return newMessage;
  }

  // ─── Authenticated Event: เข้าห้องออเดอร์ (Merchant/Driver/Customer) ────────
  @SubscribeMessage('join_order')
  async handleJoinOrder(
    @MessageBody() data: { orderId: number },
    @ConnectedSocket() client: Socket,
  ) {
    const user = this.verifyAndGetUser(client);
    if (!user) return;

    const order = await this.prisma.order.findUnique({
      where: { id: data.orderId },
    });
    if (!order) {
      client.emit('error', { message: 'Order not found' });
      return;
    }
    const isInvolved =
      (user.role === 'Merchant' && order.merchantId === user.sub) ||
      (user.role === 'Driver' && order.driverId === user.sub) ||
      (user.role === 'Customer' && order.customerId === user.sub);

    if (!isInvolved) {
      this.logger.warn(
        `User ${user.sub} (${user.role}) tried to join order_${data.orderId} without permission`,
      );
      client.emit('error', {
        message: 'Forbidden: คุณไม่มีสิทธิ์เข้าถึงข้อความในออเดอร์นี้',
      });
      return;
    }

    client.join(`order_${data.orderId}`);
    return { event: 'joined', room: `order_${data.orderId}` };
  }

  // ─── Authenticated Event: Driver ส่งพิกัด GPS Real-time ─────────────────────
  @SubscribeMessage('update_location')
  async handleUpdateLocation(
    @MessageBody()
    data: { orderId: number; lat: number; lng: number; heading?: number },
    @ConnectedSocket() client: Socket,
  ) {
    const user = this.verifyAndGetUser(client);
    if (!user) return;

    if (user.role !== 'Driver') {
      client.emit('error', {
        message: 'Unauthorized: Only drivers can update location',
      });
      return;
    }

    // ตรวจสอบกรอบค่าพิกัดเพื่อป้องกัน GPS Spoofing
    if (data.lat < -90 || data.lat > 90 || data.lng < -180 || data.lng > 180) {
      this.logger.warn(
        `Potential GPS Spoofing: driver ${user.sub} sent lat:${data.lat}, lng:${data.lng}`,
      );
      client.emit('error', { message: 'Invalid GPS coordinates' });
      return;
    }

    // ตรวจสอบสิทธิ์ความเป็นเจ้าของงาน
    const order = await this.prisma.order.findUnique({
      where: { id: data.orderId },
    });
    if (!order || order.driverId !== user.sub) {
      this.logger.warn(
        `Driver ${user.sub} tried to spoof location for order ${data.orderId}`,
      );
      client.emit('error', {
        message: 'Forbidden: คุณไม่ใช่คนขับที่รับผิดชอบออเดอร์นี้',
      });
      return;
    }

    const locationPayload = {
      lat: data.lat,
      lng: data.lng,
      heading: data.heading,
      timestamp: new Date().toISOString(),
      driverId: user.sub,
    };

    const fuzzyLocationPayload = {
      ...locationPayload,
      lat: Math.round(data.lat * 100) / 100,
      lng: Math.round(data.lng * 100) / 100,
    };

    // [REALTIME-FIX] Broadcast พิกัดไปทั้ง 2 ห้องพร้อมกัน:
    // - order_<id>              → Merchant/Customer ที่ล็อกอินอยู่ในหน้าออเดอร์
    // - tracking_<trackingNo>  → Public Tracking Page (ไม่ต้อง Auth)
    this.server
      .to(`order_${data.orderId}`)
      .emit('location_updated', locationPayload);
    this.server
      .to(`tracking_${order.trackingNumber}`)
      .emit('location_updated', fuzzyLocationPayload);
  }
}
