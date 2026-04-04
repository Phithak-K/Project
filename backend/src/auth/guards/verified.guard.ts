import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class VerifiedGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    // หมายเหตุ: user จะมีค่าได้ก็ต่อเมื่อเราใช้ร่วมกับ JwtAuthGuard
    const user = request.user; 

    if (!user || !user.isVerified) {
      throw new ForbiddenException('บัญชีนี้ยังไม่ได้ยืนยันอีเมล กรุณายืนยันรหัส OTP ก่อน');
    }
    return true;
  }
}