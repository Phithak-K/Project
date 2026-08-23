import { Role } from '../../auth/roles.enum';

export class CreateUserDto {
  email: string;
  password: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  storeName?: string;
  storeAddress?: string;
  vehiclePlate?: string;
  vehicleType?: string;
  nationalId?: string;
  role?: Role; // ใส่ Role ตามที่เราตั้งไว้ใน Prisma
}
