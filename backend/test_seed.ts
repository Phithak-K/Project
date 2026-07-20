import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function seed() {
  const passwordHash = await bcrypt.hash('password123', 10);

  // 1. Create Merchant
  const merchant = await prisma.merchant.upsert({
    where: { email: 'store_final@test.com' },
    update: {},
    create: {
      email: 'store_final@test.com',
      password: passwordHash,
      name: 'Test Store Final',
      phone: '0819999991',
      isVerified: true
    },
  });

  // 2. Create Driver
  const driver = await prisma.driver.upsert({
    where: { email: 'driver_final@test.com' },
    update: {},
    create: {
      email: 'driver_final@test.com',
      password: passwordHash,
      name: 'Test Driver Final',
      phone: '0819999992',
      isVerified: true,
      vehiclePlate: 'กก 9999',
      vehicleType: 'TRUCK'
    },
  });

  // 3. Create Customer
  const customer = await prisma.customer.upsert({
    where: { email: 'cust_final@test.com' },
    update: {},
    create: {
      email: 'cust_final@test.com',
      password: passwordHash,
      name: 'Test Cust Final',
      phone: '0819999993',
      isVerified: true
    },
  });

  // 4. Create an Order
  const trackingNumber = 'SP-' + Math.floor(100000 + Math.random() * 900000).toString();
  const order = await prisma.order.create({
    data: {
      trackingNumber,
      merchantId: merchant.id,
      driverId: driver.id,
      customerId: customer.id,
      receiverName: 'Test Receiver',
      receiverPhone: '0819999993',
      address: 'BKK',
      productName: 'GPS Test Box',
      price: 1500,
      status: 'SHIPPING',
      lat: 13.7563,
      lng: 100.5018,
    },
  });

  console.log('--- SEED COMPLETE ---');
  console.log(`Tracking Number: ${order.trackingNumber}`);
  console.log(`Merchant: store_final@test.com / password123`);
  console.log(`Driver: driver_final@test.com / password123`);
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
