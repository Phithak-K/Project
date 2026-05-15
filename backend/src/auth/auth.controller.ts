import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards, Req } from '@nestjs/common';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RolesGuard } from './guards/roles.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // 1. สมัครสมาชิกแบบปกติ (Email/Password)
  // [H-03] FIX: เพิ่ม Rate Limit ป้องกัน spam สมัครบัญชี
  @UseGuards(ThrottlerGuard)
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

  // ✅ HIGH-03 FIX: เพิ่ม Rate Limit บน Social Login — ป้องกัน Account Enumeration
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post('google-login')
  @HttpCode(HttpStatus.OK)
  async googleLogin(@Body() body: { token: string }) {
    return this.authService.googleLogin(body.token);
  }

  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post('facebook-login')
  @HttpCode(HttpStatus.OK)
  async facebookLogin(@Body() body: { token: string }) {
    return this.authService.facebookLogin(body.token);
  }

  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post('line-login')
  @HttpCode(HttpStatus.OK)
  async lineLogin(@Body() body: { token: string }) {
    return this.authService.lineLogin(body.token);
  }

  // 5. ยืนยัน OTP จากโทรศัพท์ผ่าน Firebase
  @Post('verify-phone-otp')
  @HttpCode(HttpStatus.OK)
  async verifyPhoneOtp(@Body() body: { token: string }) {
    return this.authService.verifyFirebasePhone(body.token);
  }

  // 6. บันทึก FCM Token ของอุปกรณ์
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('fcm-token')
  @HttpCode(HttpStatus.OK)
  async updateFcmToken(@Req() req: any, @Body() body: { fcmToken: string }) {
    return this.authService.updateFcmToken(req.user.sub, req.user.role, body.fcmToken);
  }
}