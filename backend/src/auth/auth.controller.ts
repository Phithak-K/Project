import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // 1. สมัครสมาชิกแบบปกติ (Email/Password)
  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  // 2. ยืนยันรหัส OTP จากอีเมล (แก้ไข Path ให้ตรงกับ Frontend)
  @UseGuards(ThrottlerGuard) // ✅ ป้องกัน Brute Force แบบถี่ๆ
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(@Body() body: { email: string; otp: string }) {
    return this.authService.verifyOtp(body.email, body.otp);
  }

  // 🆕 ส่ง OTP ใหม่
  @UseGuards(ThrottlerGuard)
  @Post('resend-otp')
  @HttpCode(HttpStatus.OK)
  async resendOtp(@Body() body: { email: string }) {
    return this.authService.resendOtp(body.email);
  }

  // 3. เข้าสู่ระบบแบบปกติ
  @UseGuards(ThrottlerGuard) // [L-03] FIX: Rate limit to prevent brute force
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  // --- 🆕 ส่วนสำหรับ Social Login & Firebase ---

  // 4. เข้าสู่ระบบด้วย Google
  @Post('google-login')
  @HttpCode(HttpStatus.OK)
  async googleLogin(@Body() body: { token: string }) {
    return this.authService.googleLogin(body.token);
  }

  // 5. ยืนยัน OTP จากโทรศัพท์ผ่าน Firebase
  @Post('verify-phone-otp')
  @HttpCode(HttpStatus.OK)
  async verifyPhoneOtp(@Body() body: { token: string }) {
    return this.authService.verifyFirebasePhone(body.token);
  }
}