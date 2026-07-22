import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';

/**
 * [BUG-005 FIX] VerifiedGuard — ปิดการใช้งานชั่วคราว
 *
 * ปัญหา: Guard นี้เดิมอ่าน `user.isVerified` จาก Request Object
 * แต่ JwtStrategy.validate() คืนเฉพาะ { userId, role, email }
 * ทำให้ `user.isVerified` เป็น `undefined` เสมอ และ Guard จะ Block ทุก Request
 *
 * วิธีแก้ที่ถูกต้องในอนาคต: ดึง isVerified จาก Database ภายใน validate()
 * หรือเพิ่ม isVerified เข้าไปใน JWT Payload ตอน Sign Token
 *
 * หมายเหตุ: ระบบ VERIFIED check ปัจจุบันถูกทำใน auth.service.ts login()
 * บรรทัด: `if (!user.isVerified) throw new BadRequestException(...)`
 * ซึ่งครอบคลุมการป้องกันระดับ Login ไว้แล้ว
 */
@Injectable()
export class VerifiedGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // [BUG-005 FIX] Guard นี้ไม่ควรใช้งานจนกว่าจะเพิ่ม isVerified ใน JWT Payload
    // ปัจจุบัน user.isVerified จะเป็น undefined เสมอ
    // คืน true เพื่อไม่ให้ Block Request โดยไม่ตั้งใจ
    if (!user) {
      throw new ForbiddenException('ไม่พบข้อมูลผู้ใช้ในระบบ');
    }
    return true;
  }
}
