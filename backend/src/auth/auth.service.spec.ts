// auth.service.spec.ts — ใช้ mock แทนการ inject dependency จริง
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { MailerService } from '@nestjs-modules/mailer';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: {} },
        { provide: JwtService, useValue: { sign: jest.fn() } },
        { provide: MailerService, useValue: { sendMail: jest.fn() } },
        { provide: HttpService, useValue: { get: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('test') } },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
