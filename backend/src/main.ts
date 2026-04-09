import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1. ตั้งค่า Global Validation Pipe
  // ช่วยตรวจสอบ Data Transfer Object (DTO) ให้ถูกต้องก่อนเข้า Controller
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: [
      'https://store.localhost:3000',
      'https://fleet.localhost:3000',
      'https://app.localhost:3000',
      'https://localhost:3000'
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: 'Content-Type, Accept, Authorization',
  });

  // 3. เริ่มรัน Server
  // ใช้ Port 8000 เป็นค่าเริ่มต้นตามที่คุณตั้งไว้
  const port = process.env.PORT ?? 8000;
  await app.listen(port);

  // แสดง URL ที่กำลังรันอยู่เพื่อความสะดวกในการ Debug
  const url = await app.getUrl();
  console.log(`🚀 SwiftPath Backend is running on: ${url}`);
  console.log(`📡 CORS allowed for: http://*.localhost:3000 and *.swiftpath.com`);
}
bootstrap();