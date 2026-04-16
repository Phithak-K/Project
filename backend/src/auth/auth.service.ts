import { Injectable, BadRequestException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailerService } from '@nestjs-modules/mailer';
import { JwtService } from '@nestjs/jwt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { OAuth2Client } from 'google-auth-library';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';
import * as path from 'path';

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

  onModuleInit() {
    if (admin.apps.length === 0) {
      try {
        admin.initializeApp({
          credential: admin.credential.cert(path.join(__dirname, '..', '..', 'firebase-adminsdk.json')),
        });
        console.log('🔥 Firebase Admin Initialized');
      } catch (error: any) {
        console.error('❌ Firebase Admin Init Error:', error.message);
      }
    }
  }

  // ตัวช่วยค้นหาตาม Role แบบ Dynamic
  private getModel(role: string) {
    if (role === 'Merchant') return this.prisma.merchant;
    if (role === 'Driver') return this.prisma.driver;
    return this.prisma.customer;
  }

  // ตัวช่วยค้นหาอีเมลข้ามตารางสำหรับ OTP (เผื่อ Frontend ลืมส่ง Role มาให้)
  private async findUserByEmailAcrossRoles(email: string) {
    let user = await this.prisma.customer.findUnique({ where: { email } });
    if (user) return { user, model: this.prisma.customer, role: 'Customer' };
    
    user = await this.prisma.merchant.findUnique({ where: { email } }) as any;
    if (user) return { user, model: this.prisma.merchant, role: 'Merchant' };

    user = await this.prisma.driver.findUnique({ where: { email } }) as any;
    if (user) return { user, model: this.prisma.driver, role: 'Driver' };

    return null;
  }

  // 1. สมัครสมาชิกแบบปกติ
  async register(dto: RegisterDto) {
    const roleStr = dto.role || 'Customer';
    if (roleStr === 'Admin') throw new BadRequestException('ไม่สามารถสมัครบัญชีผู้ดูแลระบบได้ด้วยตนเอง');

    const model = this.getModel(roleStr);

    const emailExists = await (model as any).findUnique({ where: { email: dto.email } });
    if (emailExists) throw new BadRequestException(`อีเมลนี้ถูกใช้งานแล้วในระบบ ${roleStr}`);

    const phoneExists = await (model as any).findUnique({ where: { phone: dto.phone } });
    if (phoneExists) throw new BadRequestException(`เบอร์โทรศัพท์นี้ถูกใช้งานแล้วในระบบ ${roleStr}`);

    if (roleStr === 'Merchant' && !dto.name) {
      throw new BadRequestException('กรุณาระบุชื่อร้านค้าสำหรับการสมัคร Merchant');
    }

    const otp = crypto.randomInt(100000, 1000000).toString();
    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + 10);
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    let user;
    try {
      user = await (model as any).create({
        data: {
          email: dto.email,
          password: hashedPassword,
          name: dto.name,
          phone: dto.phone,
          otpCode: otp,
          otpExpires: expiry,
          isVerified: false,
          ...(roleStr === 'Driver' && { 
             vehiclePlate: dto.vehiclePlate, 
             vehicleType: dto.vehicleType 
          })
        },
      });
      user.role = roleStr;
    } catch (error: any) {
      throw new BadRequestException('เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' + error.message);
    }

    try {
      await this.mailerService.sendMail({
        to: user.email,
        subject: `รหัสยืนยันสำหรับ SwiftPath - [${roleStr}]`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #333;">ยืนยันตัวตนสำหรับบัญชี ${escapeHtml(roleStr)}</h2>
            <p>สวัสดีคุณ ${escapeHtml(user.name || 'ลูกค้า')},</p>
            <p>รหัส OTP ของคุณคือ:</p>
            <div style="background: #f4f4f4; padding: 15px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #007bff;">
              ${otp}
            </div>
            <p>รหัสนี้จะหมดอายุภายใน 10 นาที</p>
          </div>
        `,
      });

      return {
        message: `สมัครสมาชิกในฐานะ ${roleStr} สำเร็จ! กรุณาตรวจสอบ OTP ในอีเมล`,
        emailSent: true,
        role: roleStr,
      };
    } catch (error: any) {
      console.error('Mail Error:', error.message);
      return {
        message: `สมัครสมาชิกสำเร็จ แต่ระบบอีเมลมึปัญหาชั่วคราว`,
        emailSent: false,
        role: roleStr,
      };
    }
  }

  async resendOtp(email: string) {
    const result = await this.findUserByEmailAcrossRoles(email);
    if (!result) throw new BadRequestException('ไม่พบบัญชีผู้ใช้นี้ในระบบใดเลย');
    
    const { user, model, role } = result;
    if (user.isVerified) throw new BadRequestException('บัญชีนี้ยืนยันตัวตนแล้วเข้าสู่ระบบได้เลย');

    const otp = crypto.randomInt(100000, 1000000).toString();
    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + 10);

    await (model as any).update({
      where: { email },
      data: { otpCode: otp, otpExpires: expiry },
    });

    try {
      await this.mailerService.sendMail({
        to: user.email,
        subject: `รหัสยืนยันใหม่สำหรับ SwiftPath - [${role}]`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <p>รหัส OTP ใหม่ของคุณคือ:</p>
            <div style="background: #f4f4f4; padding: 15px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #007bff;">
              ${otp}
            </div>
          </div>
        `,
      });
      return { message: 'ส่งรหัส OTP ใหม่ไปยังอีเมลของคุณแล้ว' };
    } catch (error) {
      throw new BadRequestException('ไม่สามารถส่งอีเมลได้ในขณะนี้');
    }
  }

  // 2. ยืนยัน OTP
  async verifyOtp(email: string, otp: string) {
    const result = await this.findUserByEmailAcrossRoles(email);
    if (!result) throw new BadRequestException('รหัส OTP ไม่ถูกต้อง หรือไม่พบบัญชี');
    
    const { user, model, role } = result;

    if (user.otpCode !== otp) throw new BadRequestException('รหัส OTP ไม่ถูกต้อง');
    if (!user.otpExpires || new Date() > user.otpExpires) throw new BadRequestException('รหัส OTP หมดอายุแล้ว');

    const updatedUser = await (model as any).update({
      where: { email },
      data: { isVerified: true, otpCode: null, otpExpires: null },
    });

    updatedUser.role = role;
    return {
      message: 'ยืนยันอีเมลสำเร็จแล้ว!',
      ...this.generateToken(updatedUser),
    };
  }

  // 3. เข้าสู่ระบบแบบเฉพาะเจาะจงตาราง (Strict Isolation)
  async login(loginDto: LoginDto) {
    const roleStr = loginDto.role || 'Customer'; // บังคับให้เป็น Customer ถ้าระบุไม่ชัดเจน
    const model = this.getModel(roleStr);

    const user = await (model as any).findUnique({ where: { email: loginDto.email } });
    if (!user) throw new BadRequestException(`ไม่พบบัญชีนี้ในระบบ ${roleStr} (คุณอาจสมัครไว้ในระบบอื่น)`);
    if (!user.password) throw new BadRequestException('บัญชีนี้สมัครใช้งานผ่านช่องทางอื่น โปรดเข้าสู่ระบบด้วย Google หรือ Phone');
    if (!user.isVerified) throw new BadRequestException('บัญชีนี้ยังไม่ได้ยืนยันตัวตน');

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
    if (!isPasswordValid) throw new BadRequestException('อีเมลหรือรหัสผ่านไม่ถูกต้อง');

    user.role = roleStr;
    return this.generateToken(user);
  }

  // 4. เข้าสู่ระบบด้วย Google -> บังคับลง Customer โดย Default
  async googleLogin(token: string) {
    try {
      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      if (!payload) throw new BadRequestException('Google Token ไม่ถูกต้อง');

      const { email, name, sub: googleId } = payload;

      let user = await this.prisma.customer.findFirst({
        where: { OR: [{ googleId }, { email: email! }] }
      });

      if (!user) {
        user = await this.prisma.customer.create({
          data: {
            email: email!,
            name: name!,
            googleId,
            isVerified: true,
          },
        });
      } else if (!user.googleId) {
        user = await this.prisma.customer.update({
          where: { id: user.id },
          data: { googleId, isVerified: true }
        });
      }

      (user as any).role = 'Customer';
      return this.generateToken(user);
    } catch (error) {
      throw new BadRequestException('การยืนยันตัวตนกับ Google ล้มเหลว');
    }
  }

  // 5. Firebase Phone -> បังคับลง Customer โดย Default
  async verifyFirebasePhone(idToken: string) {
    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const phoneNumber = decodedToken.phone_number;
      if (!phoneNumber) throw new BadRequestException('ไม่พบเบอร์โทรศัพท์ใน Token');

      let user = await this.prisma.customer.findUnique({ where: { phone: phoneNumber } });

      if (!user) {
        user = await this.prisma.customer.create({
          data: {
            email: `${phoneNumber}@swiftpath.tmp`,
            phone: phoneNumber,
            name: `User ${phoneNumber.slice(-4)}`,
            isVerified: true
          }
        });
      }

      (user as any).role = 'Customer';
      return this.generateToken(user);
    } catch (error) {
      throw new BadRequestException('การยืนยัน OTP โทรศัพท์ล้มเหลว');
    }
  }

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