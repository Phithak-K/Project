import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // 1. สมัครสมาชิกแบบปกติ (Email/Password)
  @Post('register')
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  // 2. ยืนยันรหัส OTP จากอีเมล
  @Post('verify')
  verify(@Body() body: { email: string; otp: string }) {
    return this.authService.verifyOtp(body.email, body.otp);
  }

  // 3. เข้าสู่ระบบแบบปกติ
  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  // --- 🆕 ส่วนที่เพิ่มใหม่สำหรับ Social Login & Firebase ---

  // 4. เข้าสู่ระบบด้วย Google (รับ Token จากหน้าบ้าน)
  @Post('google-login')
  async googleLogin(@Body() body: { token: string }) {
    return this.authService.googleLogin(body.token);
  }

  // 5. ยืนยัน OTP จากโทรศัพท์ผ่าน Firebase (รับ idToken จากหน้าบ้าน)
  @Post('verify-phone-otp')
  async verifyPhoneOtp(@Body() body: { token: string }) {
    // 🚩 เรียกใช้ verifyFirebasePhone ตามที่เราแก้ใน Service ล่าสุด
    return this.authService.verifyFirebasePhone(body.token);
  }

  // หมายเหตุ: ส่วนการส่ง SMS (Request OTP) เราจะทำที่หน้าบ้าน (Frontend) 
  // โดยใช้ Firebase SDK โดยตรง ไม่ต้องผ่านหลังบ้านครับ
}