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

function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

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
      try {
        admin.initializeApp({
          credential: admin.credential.cert('./firebase-adminsdk.json'),
        });
        console.log('🔥 Firebase Admin Initialized');
      } catch (error) {
        console.error('❌ Firebase Admin Init Error:', error.message);
      }
    }
  }

  // 1. สมัครสมาชิกแบบปกติ (Email/Password)
  async register(dto: RegisterDto) {
    // 1. ตรวจสอบว่าอีเมลซ้ำไหม
    const emailExists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (emailExists) throw new BadRequestException('อีเมลนี้ถูกใช้งานแล้ว');

    // 2. ตรวจสอบว่าเบอร์โทรซ้ำไหม (สำคัญมากสำหรับระบบ Logistics)
    const phoneExists = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
    if (phoneExists) throw new BadRequestException('เบอร์โทรศัพท์นี้ถูกใช้งานแล้ว');

    // 🛡️ 3. ตรวจสอบสิทธิ์การสมัคร (Role Validation)
    if (dto.role === 'Admin' || dto.role === Role.Admin) {
      throw new BadRequestException('ไม่สามารถสมัครบัญชีผู้ดูแลระบบได้ด้วยตนเอง');
    }

    // ตรวจสอบชื่อร้านค้าถ้าเป็น Merchant
    if (dto.role === Role.Merchant && !dto.name) {
      throw new BadRequestException('กรุณาระบุชื่อร้านค้าสำหรับการสมัคร Merchant');
    }

    // 4. เตรียมข้อมูล OTP และ Hash Password
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + 10);

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // 5. บันทึกข้อมูลลงฐานข้อมูล
    let user;
    try {
      user = await this.prisma.user.create({
        data: {
          email: dto.email,
          password: hashedPassword,
          name: dto.name,
          phone: dto.phone,
          role: dto.role as Role,
          otpCode: otp,
          otpExpires: expiry,
          isVerified: false,
        },
      });
    } catch (error) {
      throw new BadRequestException('เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' + error.message);
    }

    // 6. ส่งอีเมลยืนยัน (แยก try/catch ไว้เพื่อไม่ให้ user creation พัง)
    try {
      await this.mailerService.sendMail({
        to: user.email,
        subject: `รหัสยืนยันสำหรับ SwiftPath - [${user.role}]`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #333;">ยืนยันตัวตนสำหรับบัญชี ${escapeHtml(user.role)}</h2>
            <p>สวัสดีคุณ ${escapeHtml(user.name || 'ลูกค้า')},</p>
            <p>รหัส OTP ของคุณคือ:</p>
            <div style="background: #f4f4f4; padding: 15px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #007bff;">
              ${otp}
            </div>
            <p>รหัสนี้จะหมดอายุภายใน 10 นาที</p>
            <hr />
            <p style="font-size: 12px; color: #999;">หากคุณไม่ได้สมัครสมาชิก SwiftPath โปรดเพิกเฉยต่ออีเมลฉบับนี้</p>
          </div>
        `,
      });

      return {
        message: `สมัครสมาชิกในฐานะ ${user.role} สำเร็จ! กรุณาตรวจสอบ OTP ในอีเมล`,
        emailSent: true,
        role: user.role,
      };
    } catch (error) {
      console.error('Mail Error:', error.message);
      return {
        message: `สมัครสมาชิกสำเร็จ แต่ระบบไม่สามารถส่งอีเมล OTP ได้ กรุณากดขอรหัสใหม่`,
        emailSent: false,
        role: user.role,
      };
    }
  }

  async resendOtp(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new BadRequestException('ไม่พบบัญชีผู้ใช้นี้');
    if (user.isVerified) throw new BadRequestException('บัญชีนี้ยืนยันตัวตนแล้วสามารถเข้าสู่ระบบได้เลย');

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + 10);

    await this.prisma.user.update({
      where: { email },
      data: { otpCode: otp, otpExpires: expiry },
    });

    try {
      await this.mailerService.sendMail({
        to: user.email,
        subject: `รหัสยืนยันใหม่สำหรับ SwiftPath - [${user.role}]`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #333;">ยืนยันตัวตนสำหรับบัญชี ${escapeHtml(user.role)}</h2>
            <p>สวัสดีคุณ ${escapeHtml(user.name || 'ลูกค้า')},</p>
            <p>รหัส OTP ใหม่ของคุณคือ:</p>
            <div style="background: #f4f4f4; padding: 15px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #007bff;">
              ${otp}
            </div>
            <p>รหัสนี้จะหมดอายุภายใน 10 นาที</p>
          </div>
        `,
      });
      return { message: 'ส่งรหัส OTP ใหม่ไปยังอีเมลของคุณแล้ว' };
    } catch (error) {
      throw new BadRequestException('ไม่สามารถส่งอีเมลได้ในขณะนี้');
    }
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
    if (!user.password) throw new BadRequestException('บัญชีนี้สมัครใช้งานผ่านช่องทางอื่น โปรดเข้าสู่ระบบด้วย Google หรือ Phone');
    if (!user.isVerified) throw new BadRequestException('บัญชีนี้ยังไม่ได้ยืนยันตัวตน');

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

  // 6. ฟังก์ชันออก Token
  private generateToken(user: any) {
    const payload = { sub: user.id, role: user.role, email: user.email };
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