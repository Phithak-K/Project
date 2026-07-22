import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');
  const passwordHash = await bcrypt.hash('password123', 10);

  // 1. Create Customer
  const customer = await prisma.customer.upsert({
    where: { email: 'customer@demo.com' },
    update: {},
    create: {
      email: 'customer@demo.com',
      name: 'Demo Customer',
      password: passwordHash,
      phone: '0811111111',
      isVerified: true,
      balance: 1000,
    },
  });

  // 2. Create Merchant
  const merchant = await prisma.merchant.upsert({
    where: { email: 'merchant@demo.com' },
    update: {},
    create: {
      email: 'merchant@demo.com',
      name: 'Demo Merchant',
      storeName: 'SME Logistics Shop',
      password: passwordHash,
      phone: '0822222222',
      isVerified: true,
      balance: 0,
      lat: 13.7563,
      lng: 100.5018,
    },
  });

  // 3. Create Driver
  const driver = await prisma.driver.upsert({
    where: { email: 'driver@demo.com' },
    update: {},
    create: {
      email: 'driver@demo.com',
      name: 'Demo Driver',
      vehiclePlate: 'กข 1234',
      vehicleType: 'Motorcycle',
      password: passwordHash,
      phone: '0833333333',
      isVerified: true,
      balance: 500,
      merchantId: merchant.id, // In-house driver
    },
  });

  console.log('Seed completed successfully!');
  console.log({ customer, merchant, driver });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
