import { IsNotEmpty, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsNotEmpty({ message: 'กรุณาระบุรหัสผ่านเดิม' })
  oldPassword: string;

  @IsNotEmpty({ message: 'กรุณาระบุรหัสผ่านใหม่' })
  @MinLength(6, { message: 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร' })
  newPassword: string;
}
