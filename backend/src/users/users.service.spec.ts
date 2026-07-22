import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrismaService = {
  customer: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    updateMany: jest.fn(),
  },
  merchant: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    updateMany: jest.fn(),
  },
  driver: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    updateMany: jest.fn(),
  },
  message: { deleteMany: jest.fn() },
  order: { updateMany: jest.fn(), count: jest.fn() },
  transaction: { count: jest.fn() },
  rating: { count: jest.fn() },
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ===== create() Tests (BUG-006 FIX) =====
  describe('create()', () => {
    it('[BUG-006] ควร hash รหัสผ่านก่อนบันทึกลง Database (ไม่ใช่ Plain Text)', async () => {
      const createDto = {
        email: 'test@example.com',
        password: 'plainpassword123',
        name: 'Test User',
        phone: '0812345678',
      };

      mockPrismaService.customer.create.mockResolvedValue({
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        phone: '0812345678',
        balance: 0,
      });

      await service.create(createDto, 'customer');

      // ตรวจสอบว่า password ที่ส่งเข้า prisma.create ไม่ใช่ plain text เดิม
      const callArg = mockPrismaService.customer.create.mock.calls[0][0];
      expect(callArg.data.password).toBeDefined();
      expect(callArg.data.password).not.toBe('plainpassword123'); // ต้องไม่ใช่ plain text
      // bcrypt hash ขึ้นต้นด้วย $2b$
      expect(callArg.data.password).toMatch(/^\$2[ab]\$\d{2}\$/);
    });

    it('[BUG-006] ควรสร้าง merchant ได้ด้วย hashed password', async () => {
      const createDto = {
        email: 'merchant@example.com',
        password: 'mypassword',
        name: 'My Shop',
        phone: '0890001111',
      };

      mockPrismaService.merchant.create.mockResolvedValue({
        id: 1,
        email: 'merchant@example.com',
        name: 'My Shop',
        phone: '0890001111',
        balance: 0,
      });

      await service.create(createDto, 'merchant');

      const callArg = mockPrismaService.merchant.create.mock.calls[0][0];
      expect(callArg.data.password).toMatch(/^\$2[ab]\$\d{2}\$/);
    });

    it('ควร throw BadRequestException ถ้า role ไม่ถูกต้อง', async () => {
      const createDto = {
        email: 'x@example.com',
        password: '123',
        name: 'X',
        phone: '0800000000',
      };

      await expect(service.create(createDto, 'admin')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ===== findAll() Tests =====
  describe('findAll()', () => {
    it('ควร throw BadRequestException ถ้า role ไม่ถูกต้อง', async () => {
      await expect(service.findAll('unknown')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('ควรเรียก prisma.customer.findMany ถ้า role เป็น customer', async () => {
      mockPrismaService.customer.findMany.mockResolvedValue([]);
      await service.findAll('customer');
      expect(mockPrismaService.customer.findMany).toHaveBeenCalledTimes(1);
    });
  });

  // ===== updateBalanceAtomic() Tests =====
  describe('updateBalanceAtomic()', () => {
    it('ควรอัปเดต balance สำเร็จถ้า version ตรงกัน', async () => {
      mockPrismaService.customer.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.updateBalanceAtomic(1, 'customer', 100, 0);
      expect(result).toEqual({ success: true, newVersion: 1 });
    });

    it('[OCC] ควร throw error ถ้า version ไม่ตรง (มีการแก้ไขซ้อนกัน)', async () => {
      // count = 0 หมายความว่า version ไม่ตรง — ถูก update โดย request อื่นก่อน
      mockPrismaService.customer.updateMany.mockResolvedValue({ count: 0 });

      // ตรวจสอบว่า throw error (dynamic import ในโค้ด production ไม่ support ใน jest โดยตรง)
      await expect(
        service.updateBalanceAtomic(1, 'customer', 100, 0),
      ).rejects.toThrow();
    });

    it('[OCC] ควรป้องกัน balance ติดลบ (amount เป็นลบ แต่ balance ไม่พอ)', async () => {
      // count = 0 — เงื่อนไข balance: { gte: amount } ไม่ผ่าน
      mockPrismaService.customer.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.updateBalanceAtomic(1, 'customer', -500, 0),
      ).rejects.toThrow();
    });
  });
});
