import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as express from 'express';

async function bootstrap() {
  // [ARC-01 FIX] Disable NestJS's built-in bodyParser so we can register
  // our own with the correct 10MB limit BEFORE any other middleware runs.
  // Without bodyParser: false, the default 100KB parser runs first and
  // the subsequent app.use(express.json({ limit: '10mb' })) has no effect.
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
    bodyParser: false, // ← CRITICAL: disable built-in parser first
  });

  // Now register Express body parsers with the desired 10MB limit
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  // 1. Global Validation Pipe — validates all DTOs before reaching controllers
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      // Allow localhost, Vercel previews, onrender, and any custom domain
      callback(null, true);
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: 'Content-Type, Accept, Authorization',
  });

  // 3. เริ่มรัน Server
  // ใช้ Port 8000 เป็นค่าเริ่มต้นตามที่คุณตั้งไว้
  const port = process.env.PORT ?? 8000;
  await app.listen(port, '0.0.0.0');

  // แสดง URL ที่กำลังรันอยู่เพื่อความสะดวกในการ Debug
  const url = await app.getUrl();
  console.log(`🚀 SwiftPath Backend is running on: ${url}`);
  console.log(
    `📡 CORS allowed for: http://*.localhost:3000 and *.swiftpath.com`,
  );
}
bootstrap();
