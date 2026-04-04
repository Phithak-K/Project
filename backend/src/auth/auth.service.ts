import { Injectable, BadRequestException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailerService } from '@nestjs-modules/mailer';
import { JwtService } from '@nestjs/jwt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import { OAuth2Client } from 'google-auth-library';
import * as admin from 'firebase-admin';

// สร้าง Google Client
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

@Injectable()
export class AuthService implements OnModuleInit {
  constructor(
    private prisma: PrismaService,
    private mailerService: MailerService,
    private jwtService: JwtService,
  ) {}

  // 🆕 ตั้งค่า Firebase Admin เมื่อ Module เริ่มทำงาน
  onModuleInit() {
    if (admin.apps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.cert('./firebase-adminsdk.json'),
      });
    }
  }

  // 1. สมัครสมาชิกแบบปกติ (Email/Password)
  async register(dto: RegisterDto) {
  // 1. ตรวจสอบว่าอีเมลซ้ำไหม
  const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
  if (exists) throw new BadRequestException('อีเมลนี้ถูกใช้งานแล้ว');

  // 🛡️ 2. ตรวจสอบสิทธิ์การสมัคร (Role Validation)
  // ป้องกันไม่ให้ใครมาสมัครเป็น Admin เองได้เด็ดขาด
  if (dto.role === Role.Admin) {
    throw new BadRequestException('ไม่สามารถสมัครบัญชีผู้ดูแลระบบได้ด้วยตนเอง');
  }

  // ตัวอย่าง: ถ้าสมัครเป็น Merchant (store.swiftpath.com) ต้องระบุชื่อร้านค้า/บริษัท
  if (dto.role === Role.Merchant && !dto.name) {
    throw new BadRequestException('กรุณาระบุชื่อร้านค้าหรือบริษัทสำหรับการสมัครบัญชี Merchant');
  }

  // 3. เตรียมข้อมูล OTP และ Hash Password
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + 10);

  const hashedPassword = await bcrypt.hash(dto.password, 10);

  // 4. บันทึกข้อมูลลงฐานข้อมูล
  const user = await this.prisma.user.create({
    data: {
      email: dto.email,
      password: hashedPassword,
      name: dto.name,
      role: dto.role, // รับ Role ตามที่ส่งมาจาก Frontend แต่ละ Subdomain
      otpCode: otp,
      otpExpires: expiry,
      // หากเป็น Driver หรือ Merchant อาจจะตั้งค่าเริ่มต้นให้รอการยืนยันจาก Admin ก่อน (Optional)
      isVerified: false, 
    },
  });

  // 5. ส่งอีเมลยืนยัน (ตามปกติ)
  await this.mailerService.sendMail({
    to: user.email,
    subject: `รหัสยืนยันตัวตนสำหรับ SwiftPath - [${dto.role}]`,
    html: `
      <div style="font-family: sans-serif; padding: 20px;">
        <h2>ยืนยันตัวตนสำหรับบัญชี ${dto.role}</h2>
        <p>รหัส OTP ของคุณคือ: <strong style="color: #007bff; font-size: 24px;">${otp}</strong></p>
        <p>รหัสนี้จะหมดอายุภายใน 10 นาที</p>
      </div>
    `,
  });

  return { 
    message: `สมัครสมาชิกในฐานะ ${dto.role} สำเร็จ! กรุณาตรวจสอบ OTP ในอีเมล`,
    role: dto.role 
  };
}

  // 2. ยืนยัน OTP จากอีเมล
  async verifyOtp(email: string, otp: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || user.otpCode !== otp) throw new BadRequestException('รหัส OTP ไม่ถูกต้อง');
    if (!user.otpExpires || new Date() > user.otpExpires) throw new BadRequestException('รหัส OTP หมดอายุแล้ว');

    await this.prisma.user.update({
      where: { email },
      data: { isVerified: true, otpCode: null, otpExpires: null },
    });

    return { message: 'ยืนยันอีเมลสำเร็จแล้ว!' };
  }
// 3. เข้าสู่ระบบแบบปกติ
  async login(loginDto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: loginDto.email } });
    if (!user) throw new BadRequestException('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    if (!user.password) throw new BadRequestException('บัญชีนี้สมัครใช้งานผ่าน Google โปรดเข้าสู่ระบบด้วย Google');
    if (!user.isVerified) throw new BadRequestException('บัญชีนี้ยังไม่ได้ยืนยันอีเมล');

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
    if (!isPasswordValid) throw new BadRequestException('อีเมลหรือรหัสผ่านไม่ถูกต้อง');

    return this.generateToken(user);
  }

  // 4. เข้าสู่ระบบด้วย Google
  async googleLogin(token: string) {
    try {
      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      if (!payload) throw new BadRequestException('Google Token ไม่ถูกต้อง');

      const { email, name, sub: googleId } = payload;

      let user = await this.prisma.user.findFirst({
        where: { OR: [{ googleId }, { email: email! }] }
      });

      if (!user) {
        user = await this.prisma.user.create({
          data: {
            email: email!,
            name: name!,
            googleId,
            role: Role.Customer,
            isVerified: true,
          },
        });
      } else if (!user.googleId) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { googleId, isVerified: true }
        });
      }

      return this.generateToken(user);
    } catch (error) {
      throw new BadRequestException('การยืนยันตัวตนกับ Google ล้มเหลว');
    }
  }

  // 5. ยืนยันรหัส OTP จากโทรศัพท์ (Firebase)
  async verifyFirebasePhone(idToken: string) {
    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const phoneNumber = decodedToken.phone_number;
      if (!phoneNumber) throw new BadRequestException('ไม่พบเบอร์โทรศัพท์ใน Token');

      let user = await this.prisma.user.findUnique({ where: { phone: phoneNumber } });

      if (!user) {
        user = await this.prisma.user.create({
          data: {
            email: `${phoneNumber}@swiftpath.tmp`,
            phone: phoneNumber,
            name: `User ${phoneNumber.slice(-4)}`,
            role: Role.Customer,
            isVerified: true
          }
        });
      }

      return this.generateToken(user);
    } catch (error) {
      throw new BadRequestException('การยืนยัน OTP โทรศัพท์ล้มเหลว');
    }
  }

  // 6. ฟังก์ชันออก Token และส่งข้อมูลผู้ใช้กลับไปให้หน้าบ้าน
  private generateToken(user: any) {
    const payload = { sub: user.id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone
      }
    };
  }
}