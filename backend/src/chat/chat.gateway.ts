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
   * ตรวจสอบ JWT Token ตอนเชื่อมต่อ WebSocket
   * Client ต้องส่ง token มาใน handshake auth หรือ query parameter
   * เช่น: io('http://localhost:3000', { auth: { token: 'Bearer xxx' } })
   */
  handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth?.token as string) ||
        (client.handshake.query?.token as string) ||
        '';
      const cleanToken = token.replace('Bearer ', '');
      if (!cleanToken) {
        this.logger.warn(`Client ${client.id} ถูกตัดการเชื่อมต่อ: ไม่มี Token`);
        client.emit('error', { message: 'Authentication required: กรุณาแนบ JWT Token' });
        client.disconnect();
        return;
      }
      const payload = this.jwtService.verify(cleanToken);
      (client as any).user = payload;
      this.logger.log(`Client ${client.id} เชื่อมต่อสำเร็จ (userId: ${payload.sub})`);
    } catch (error) {
      this.logger.warn(`Client ${client.id} ถูกตัดการเชื่อมต่อ: Token ไม่ถูกต้องหรือหมดอายุ`);
      client.emit('error', { message: 'Authentication failed: Token ไม่ถูกต้องหรือหมดอายุ' });
      client.disconnect();
    }
  }

  /**
   * ✅ HIGH-02 FIX: Re-verify JWT Signature ทุก Event (Zero-Trust)
   * ไม่ใช้ค่า exp ที่ cache ไว้ตอน connect —
   * re-verify จริงทุกครั้ง ทำให้ token revocation และ secret rotation มีผลทันที
   */
  private verifyAndGetUser(client: Socket): any | null {
    try {
      const raw =
        (client.handshake.auth?.token as string) ||
        (client.handshake.query?.token as string) ||
        '';
      const cleanToken = raw.replace('Bearer ', '');
      if (!cleanToken) throw new Error('No token');
      return this.jwtService.verify(cleanToken); // re-verifies signature + expiry
    } catch {
      client.emit('error', { message: 'Session expired. Please reconnect.' });
      client.disconnect();
      return null;
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client ${client.id} ตัดการเชื่อมต่อ`);
  }

  // เมื่อมีข้อความส่งมาจากหน้าบ้าน (Event: send_message)
  @SubscribeMessage('send_message')
  async handleMessage(
    @MessageBody() data: { orderId: number; receiverId: number; receiverRole: string; content: string; imageUrl?: string; audioUrl?: string },
    @ConnectedSocket() client: Socket,
  ) {
    // ✅ HIGH-02: Re-verify JWT signature ทุก event (Zero-Trust)
    const user = this.verifyAndGetUser(client);
    if (!user) return;

    // 1. Verify sender is part of this order [H-01 FIX]
    const order = await this.prisma.order.findUnique({ where: { id: data.orderId } });
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

    // 2. บันทึกลง Firebase Firestore (NoSQL)
    const firestore = admin.firestore();
    const chatRef = firestore.collection('chats').doc(`order_${data.orderId}`).collection('messages');
    
    let uploadedImageUrl: string | null = null;
    let uploadedAudioUrl: string | null = null;

    try {
      if (data.imageUrl) {
        uploadedImageUrl = await uploadBase64ToStorage(data.imageUrl, `chats/order_${data.orderId}/images`);
      }
      if (data.audioUrl) {
        uploadedAudioUrl = await uploadBase64ToStorage(data.audioUrl, `chats/order_${data.orderId}/audio`);
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

    // 3. ยิงข้อความออกไปให้คนที่กำลังรอรับ (Real-time WebSocket)
    this.server.to(`order_${data.orderId}`).emit('receive_message', newMessage);

    return newMessage;
  }

  // ระบบเข้าห้อง (Join Room) เพื่อให้คุยกันเฉพาะในออเดอร์นั้นๆ
  @SubscribeMessage('join_order')
  async handleJoinOrder(
    @MessageBody() data: { orderId: number },
    @ConnectedSocket() client: Socket,
  ) {
    // ✅ HIGH-02: Re-verify JWT signature ทุก event (Zero-Trust)
    const user = this.verifyAndGetUser(client);
    if (!user) return;

    // [CRITICAL SECURITY FIX] ตรวจสอบสิทธิ์การเข้าห้อง
    const order = await this.prisma.order.findUnique({ where: { id: data.orderId } });
    if (!order) {
      client.emit('error', { message: 'Order not found' });
      return;
    }
    const isInvolved =
      (user.role === 'Merchant' && order.merchantId === user.sub) ||
      (user.role === 'Driver' && order.driverId === user.sub) ||
      (user.role === 'Customer' && order.customerId === user.sub);
    
    if (!isInvolved) {
      this.logger.warn(`User ${user.sub} (${user.role}) พยายามเข้าถึงห้อง order_${data.orderId} โดยไม่มีสิทธิ์`);
      client.emit('error', { message: 'Forbidden: คุณไม่มีสิทธิ์เข้าถึงข้อความในออเดอร์นี้' });
      return;
    }

    client.join(`order_${data.orderId}`);
    return { event: 'joined', room: `order_${data.orderId}` };
  }

  // --- 🆕 Tracking Gateway (Real-time GPS Update) ---
  @SubscribeMessage('update_location')
  async handleUpdateLocation(
    @MessageBody() data: { orderId: number; lat: number; lng: number; heading?: number },
    @ConnectedSocket() client: Socket,
  ) {
    // ✅ HIGH-02: Re-verify JWT signature ทุก event (Zero-Trust)
    const user = this.verifyAndGetUser(client);
    if (!user) return;

    if (user.role !== 'Driver') {
      client.emit('error', { message: 'Unauthorized: Only drivers can update location' });
      return;
    }

    // [APP SEC] ตรวจสอบกรอบค่าละติจูดและลองจิจูด เพื่อป้องกัน GPS Spoofing
    if (data.lat < -90 || data.lat > 90 || data.lng < -180 || data.lng > 180) {
      this.logger.warn(`Potential GPS Spoofing Detected: ${user.sub} ส่งค่า lat: ${data.lat}, lng: ${data.lng}`);
      client.emit('error', { message: 'Invalid GPS coordinates' });
      return;
    }

    // [CRITICAL SECURITY FIX] ตรวจสอบสิทธิ์ความเป็นเจ้าของงานก่อนจะรับพิกัด
    const order = await this.prisma.order.findUnique({ where: { id: data.orderId } });
    if (!order || order.driverId !== user.sub) {
      this.logger.warn(`Driver ${user.sub} พยายามจำลองพิกัดในออเดอร์ ${data.orderId} ที่ไม่ได้เป็นเจ้าของ`);
      client.emit('error', { message: 'Forbidden: คุณไม่ใช่คนขับที่รับผิดชอบออเดอร์นี้' });
      return;
    }

    const room = `order_${data.orderId}`;
    // Broadcast ตำแหน่งแบบสดๆ ให้ลูกค้าและร้านค้าในห้อง (ไม่เซฟลง Database ทุกรอบเพื่อประหยัดทรัพยากร)
    this.server.to(room).emit('location_updated', {
      lat: data.lat,
      lng: data.lng,
      heading: data.heading,
      timestamp: new Date().toISOString(),
      driverId: user.sub
    });
  }
}