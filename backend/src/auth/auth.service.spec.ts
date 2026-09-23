// auth.service.spec.ts — Unit Tests สำหรับ AuthService
// ครอบคลุม login(), verifyOtp(), register(), changePassword()
// ใช้ Jest Mock แทน dependency จริงทั้งหมด (ไม่ต้องต่อ DB จริง)

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { MailerService } from '@nestjs-modules/mailer';
import { HttpService } from '@nestjs/axios';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

// Mock bcrypt ทั้ง module — วิธีที่ถูกต้องสำหรับ CommonJS modules
jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

// ─── ฟังก์ชันช่วย: Hash OTP แบบเดียวกับ auth.service.ts ───────────────────
function hashOtp(otp: string): string {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

// ─── Mock Dependencies ─────────────────────────────────────────────────────
const mockCustomerModel = {
  findFirst: jest.fn(),
  findUnique: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

const mockMerchantModel = {
  findFirst: jest.fn(),
  findUnique: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

const mockDriverModel = {
  findFirst: jest.fn(),
  findUnique: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

const mockPrisma = {
  customer: mockCustomerModel,
  merchant: mockMerchantModel,
  driver: mockDriverModel,
};

const mockJwt = {
  sign: jest.fn().mockReturnValue('mock-jwt-token'),
};

const mockMailer = {
  sendMail: jest.fn().mockResolvedValue(true),
};

const mockHttp = {
  get: jest.fn(),
};

// ─── Test Suite ────────────────────────────────────────────────────────────
describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: MailerService, useValue: mockMailer },
        { provide: HttpService, useValue: mockHttp },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // SECTION 1: Service Instantiation
  // ──────────────────────────────────────────────────────────────────────────
  describe('Service Instantiation', () => {
    it('ควรสร้าง AuthService ได้สำเร็จ', () => {
      expect(service).toBeDefined();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // SECTION 2: login()
  // ──────────────────────────────────────────────────────────────────────────
  describe('login()', () => {
    const validHashedPassword = '$2b$10$hashedpassword';

    it('[TC-L01] ควร return access_token เมื่อล็อกอินสำเร็จด้วย email', async () => {
      mockCustomerModel.findFirst.mockResolvedValue({
        id: 1,
        email: 'test@gmail.com',
        name: 'Test User',
        phone: '0812345678',
        password: validHashedPassword,
        isVerified: true,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login({
        email: 'test@gmail.com',
        password: 'correctpassword',
        role: 'Customer',
      });

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('user');
      expect(result.user.email).toBe('test@gmail.com');
    });

    it('[TC-L02] ควร throw BadRequestException เมื่อรหัสผ่านผิด', async () => {
      mockCustomerModel.findFirst.mockResolvedValue({
        id: 1,
        email: 'test@gmail.com',
        password: validHashedPassword,
        isVerified: true,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ email: 'test@gmail.com', password: 'wrongpassword', role: 'Customer' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('[TC-L03] ควร throw BadRequestException เมื่อไม่พบ User ในระบบ', async () => {
      mockCustomerModel.findFirst.mockResolvedValue(null);

      await expect(
        service.login({ email: 'notfound@gmail.com', password: 'anypassword', role: 'Customer' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('[TC-L04] ควร throw เมื่อบัญชียังไม่ได้ยืนยัน OTP', async () => {
      mockCustomerModel.findFirst.mockResolvedValue({
        id: 1,
        email: 'unverified@gmail.com',
        password: validHashedPassword,
        isVerified: false,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(
        service.login({ email: 'unverified@gmail.com', password: 'correctpassword', role: 'Customer' }),
      ).rejects.toThrow('บัญชีนี้ยังไม่ได้ยืนยันตัวตน');
    });

    it('[TC-L05] ควร throw เมื่อบัญชีสมัครผ่าน Social Login (ไม่มีรหัสผ่าน)', async () => {
      mockCustomerModel.findFirst.mockResolvedValue({
        id: 1,
        email: 'google-user@gmail.com',
        password: null,
        isVerified: true,
      });

      await expect(
        service.login({ email: 'google-user@gmail.com', password: 'anypassword', role: 'Customer' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('[TC-L06] ควร throw เมื่อไม่ระบุ email และ username', async () => {
      await expect(
        service.login({ password: 'anypassword', role: 'Customer' }),
      ).rejects.toThrow('กรุณาระบุอีเมล หรือ Username');
    });

    it('[TC-L07] ควรล็อกอินด้วย username ได้', async () => {
      mockCustomerModel.findFirst.mockResolvedValue({
        id: 1,
        email: 'test@gmail.com',
        name: 'Test User',
        phone: '0812345678',
        password: validHashedPassword,
        isVerified: true,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login({
        username: 'testuser99',
        password: 'correctpassword',
        role: 'Customer',
      });

      expect(result).toHaveProperty('access_token');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // SECTION 3: verifyOtp()
  // ──────────────────────────────────────────────────────────────────────────
  describe('verifyOtp()', () => {
    const rawOtp = '123456';
    const hashedOtp = hashOtp(rawOtp);
    const futureDate = new Date(Date.now() + 10 * 60 * 1000);
    const pastDate = new Date(Date.now() - 1 * 60 * 1000);

    it('[TC-O01] ควร return access_token เมื่อ OTP ถูกต้องและยังไม่หมดอายุ', async () => {
      mockCustomerModel.findUnique.mockResolvedValue({
        id: 1,
        email: 'test@gmail.com',
        name: 'Test User',
        phone: '0812345678',
        otpCode: hashedOtp,
        otpExpires: futureDate,
        isVerified: false,
      });
      mockCustomerModel.update.mockResolvedValue({
        id: 1,
        email: 'test@gmail.com',
        name: 'Test User',
        phone: '0812345678',
        role: 'Customer',
      });

      const result = await service.verifyOtp('test@gmail.com', rawOtp);

      expect(result).toHaveProperty('access_token');
      expect(mockCustomerModel.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isVerified: true }),
        }),
      );
    });

    it('[TC-O02] ควร throw เมื่อ OTP ผิด', async () => {
      mockCustomerModel.findUnique.mockResolvedValue({
        id: 1,
        email: 'test@gmail.com',
        otpCode: hashedOtp,
        otpExpires: futureDate,
        isVerified: false,
      });

      await expect(
        service.verifyOtp('test@gmail.com', '999999'),
      ).rejects.toThrow('รหัส OTP ไม่ถูกต้อง');
    });

    it('[TC-O03] ควร throw เมื่อ OTP หมดอายุ', async () => {
      mockCustomerModel.findUnique.mockResolvedValue({
        id: 1,
        email: 'test@gmail.com',
        otpCode: hashedOtp,
        otpExpires: pastDate,
        isVerified: false,
      });

      await expect(
        service.verifyOtp('test@gmail.com', rawOtp),
      ).rejects.toThrow('รหัส OTP หมดอายุแล้ว');
    });

    it('[TC-O04] ควร throw เมื่อไม่พบ Email', async () => {
      mockCustomerModel.findUnique.mockResolvedValue(null);
      mockMerchantModel.findUnique.mockResolvedValue(null);
      mockDriverModel.findUnique.mockResolvedValue(null);

      await expect(
        service.verifyOtp('notfound@gmail.com', rawOtp),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // SECTION 4: register()
  // ──────────────────────────────────────────────────────────────────────────
  describe('register()', () => {
    const validDto = {
      email: 'new@gmail.com',
      password: 'password123',
      firstName: 'สมชาย',
      lastName: 'ใจดี',
      nationalId: '1234567890123',
      username: 'somchai99',
      phone: '0812345678',
      role: 'Customer',
    };

    it('[TC-R01] ควร throw เมื่อพยายามสมัครเป็น Admin', async () => {
      await expect(
        service.register({ ...validDto, role: 'Admin' }),
      ).rejects.toThrow('ไม่สามารถสมัครบัญชีผู้ดูแลระบบได้ด้วยตนเอง');
    });

    it('[TC-R02] ควร throw เมื่ออีเมลซ้ำและบัญชียืนยันแล้ว', async () => {
      mockCustomerModel.findUnique.mockResolvedValueOnce({
        id: 1,
        email: 'new@gmail.com',
        isVerified: true,
      });

      await expect(service.register(validDto)).rejects.toThrow(
        'อีเมลนี้ถูกใช้งานแล้วในระบบ Customer',
      );
    });

    it('[TC-R03] ควรสมัครสำเร็จและส่ง OTP ทางอีเมล', async () => {
      mockCustomerModel.findUnique.mockResolvedValue(null);
      mockCustomerModel.create.mockResolvedValue({
        id: 1,
        email: 'new@gmail.com',
        name: 'สมชาย ใจดี',
        role: 'Customer',
      });

      const result = await service.register(validDto);

      expect(result).toHaveProperty('message');
      expect(mockMailer.sendMail).toHaveBeenCalledTimes(1);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // SECTION 5: changePassword()
  // ──────────────────────────────────────────────────────────────────────────
  describe('changePassword()', () => {
    it('[TC-CP01] ควร throw เมื่อไม่ส่งรหัสผ่านมา', async () => {
      await expect(
        service.changePassword(1, 'Customer', undefined, undefined),
      ).rejects.toThrow('กรุณาระบุรหัสผ่านเดิมและรหัสผ่านใหม่');
    });

    it('[TC-CP02] ควร throw เมื่อรหัสผ่านเดิมผิด', async () => {
      mockCustomerModel.findUnique.mockResolvedValue({
        id: 1,
        password: '$2b$10$hashedpassword',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.changePassword(1, 'Customer', 'wrongold', 'newpass123'),
      ).rejects.toThrow('รหัสผ่านเดิมไม่ถูกต้อง');
    });

    it('[TC-CP03] ควรเปลี่ยนรหัสผ่านสำเร็จเมื่อรหัสผ่านเดิมถูกต้อง', async () => {
      mockCustomerModel.findUnique.mockResolvedValue({
        id: 1,
        password: '$2b$10$hashedpassword',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('$2b$10$newhashed');
      mockCustomerModel.update.mockResolvedValue({ id: 1 });

      const result = await service.changePassword(1, 'Customer', 'correctold', 'newpass123');

      expect(result).toHaveProperty('message', 'เปลี่ยนรหัสผ่านสำเร็จ');
      expect(mockCustomerModel.update).toHaveBeenCalledTimes(1);
    });
  });
});

