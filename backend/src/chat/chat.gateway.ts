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

@WebSocketGateway({
  cors: { origin: true },
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
      // รับ token จาก auth header หรือ query parameter
      const token =
        (client.handshake.auth?.token as string) ||
        (client.handshake.query?.token as string) ||
        '';

      // ตัด "Bearer " ออกถ้ามี
      const cleanToken = token.replace('Bearer ', '');

      if (!cleanToken) {
        this.logger.warn(`Client ${client.id} ถูกตัดการเชื่อมต่อ: ไม่มี Token`);
        client.emit('error', { message: 'Authentication required: กรุณาแนบ JWT Token' });
        client.disconnect();
        return;
      }

      // ตรวจสอบ JWT
      const payload = this.jwtService.verify(cleanToken);
      // เก็บข้อมูล user ไว้ใน client data เพื่อใช้ภายหลัง
      (client as any).user = payload;

      this.logger.log(`Client ${client.id} เชื่อมต่อสำเร็จ (userId: ${payload.sub})`);
    } catch (error) {
      this.logger.warn(`Client ${client.id} ถูกตัดการเชื่อมต่อ: Token ไม่ถูกต้องหรือหมดอายุ`);
      client.emit('error', { message: 'Authentication failed: Token ไม่ถูกต้องหรือหมดอายุ' });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client ${client.id} ตัดการเชื่อมต่อ`);
  }

  // เมื่อมีข้อความส่งมาจากหน้าบ้าน (Event: send_message)
  @SubscribeMessage('send_message')
  async handleMessage(
    @MessageBody() data: { orderId: number; receiverId: number; receiverRole: string; content: string },
    @ConnectedSocket() client: Socket,
  ) {
    // ใช้ senderId จาก JWT Token ที่ตรวจสอบแล้ว (ไม่ใช่จาก client)
    const user = (client as any).user;
    if (!user) {
      client.emit('error', { message: 'Unauthorized' });
      return;
    }

    // 1. บันทึกลง Database
    const newMessage = await this.prisma.message.create({
      data: {
        orderId: data.orderId,
        senderId: user.sub, // ดึงจาก sub ใน JWT
        senderRole: user.role,
        receiverId: data.receiverId,
        receiverRole: data.receiverRole,
        content: data.content,
      },
    });

    // 2. ยิงข้อความออกไปให้คนที่กำลังรอรับ (Real-time)
    this.server.to(`order_${data.orderId}`).emit('receive_message', newMessage);

    return newMessage;
  }

  // ระบบเข้าห้อง (Join Room) เพื่อให้คุยกันเฉพาะในออเดอร์นั้นๆ
  @SubscribeMessage('join_order')
  handleJoinOrder(
    @MessageBody() data: { orderId: number },
    @ConnectedSocket() client: Socket,
  ) {
    const user = (client as any).user;
    if (!user) {
      client.emit('error', { message: 'Unauthorized' });
      return;
    }

    client.join(`order_${data.orderId}`);
    return { event: 'joined', room: `order_${data.orderId}` };
  }
}