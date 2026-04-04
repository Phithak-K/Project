import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1. ตั้งค่า Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // 2. ตั้งค่า CORS อย่างปลอดภัย
  // origin: true จะสะท้อน Origin ที่เรียกมาอัตโนมัติ (ปลอดภัยกว่า '*' เมื่อใช้กับ credentials)
  // ใน main.ts
app.enableCors({
  origin: [
    'http://localhost:3000', // สำหรับ Development
    'http://localhost:3001',
    /\.swiftpath\.com$/,    // 🆕 อนุญาตทุกอย่างที่ลงท้ายด้วย .swiftpath.com (Production)
  ],
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
});

  // 3. เริ่มรัน Server
  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  console.log(`🚀 SwiftPath Backend is running on: ${await app.getUrl()}`);
}
bootstrap();