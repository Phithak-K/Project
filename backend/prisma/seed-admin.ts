import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

/**
 * Admin Seeder — สร้างบัญชีผู้ดูแลระบบ SwiftPath
 * รัน: npx ts-node prisma/seed-admin.ts
 */
async function main() {
  const email = 'admin@swiftpath.com';
  const password = 'SwiftAdmin@2025!';

  // ตรวจสอบว่ามี Admin อยู่แล้วหรือยัง (กัน duplicate)
  const existingCustomer = await prisma.customer.findUnique({ where: { email } });
  if (existingCustomer) {
    console.log(`[Seeder] Admin account already exists: ${email}`);
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  // สร้าง Admin โดยฝากไว้ใน Customer table พร้อม role override ใน JWT
  // หมายเหตุ: ระบบ RBAC ทำงานผ่าน JWT Payload (role: 'Admin')
  // ดังนั้น Admin ต้องถูกสร้างใน Database ด้วย field พิเศษ
  // *** ต้องเพิ่ม field `isAdmin` ใน Prisma schema หรือใช้ตาราง Customer พร้อม flag ***

  // วิธีที่เร็วที่สุด: สร้างใน Customer table แล้วแก้ Role ใน JWT manually
  // โดยสร้าง Endpoint พิเศษสำหรับ Admin Login ที่ตรวจสอบ email เฉพาะ
  const admin = await prisma.customer.create({
    data: {
      email,
      password: hashedPassword,
      name: 'SwiftPath Administrator',
      phone: '0000000000',
      isVerified: true,
      // Admin role จะถูก override ใน auth.service.ts ผ่าน adminEmails list
    },
  });

  console.log(`[Seeder] Admin account created successfully!`);
  console.log(`  Email   : ${email}`);
  console.log(`  Password: ${password}`);
  console.log(`  ID      : ${admin.id}`);
  console.log('');
  console.log('[Seeder] Login at: http://localhost:3000/admin/login');
}

main()
  .catch((e) => {
    console.error('[Seeder] Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
