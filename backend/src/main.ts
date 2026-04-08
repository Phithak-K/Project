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

  // 2. ตั้งค่า CORS ให้รองรับ Multi-subdomain (สำคัญมาก!)
  // เราต้องระบุ Origin ของทุก Subdomain ที่เราใช้งานใน localhost
 app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://app.localhost:3000',
      'http://store.localhost:3000',
      'http://fleet.localhost:3000',
      'http://app.swiftpath.com:3000',
      'http://store.swiftpath.com:3000',
      'http://fleet.swiftpath.com:3000',
      // ✅ ปรับ Regex ให้รองรับทั้งแบบมี Port และไม่มี Port
      /https?:\/\/(.+\.)?swiftpath\.com(:\d+)?$/, 
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
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