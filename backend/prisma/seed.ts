import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Seed Data for SwiftPath Demo...');

  // 1. สร้าง Merchant (ร้านค้า: เจ๊พร วัสดุก่อสร้างและฮาร์ดแวร์)
  const hashedPassword = await bcrypt.hash('password123', 10);
  
  const merchant = await prisma.merchant.upsert({
    where: { email: 'jaeporn@swiftpath.demo' },
    update: {},
    create: {
      email: 'jaeporn@swiftpath.demo',
      username: 'jaeporn_store',
      password: hashedPassword,
      name: 'เจ๊พร วัสดุก่อสร้างและฮาร์ดแวร์',
      storeName: 'เจ๊พร วัสดุก่อสร้างและฮาร์ดแวร์',
      phone: '0812345678',
      storeAddress: '123 ถ.รามอินทรา แขวงอนุสาวรีย์ เขตบางเขน กรุงเทพฯ 10220',
      lat: 13.8653,
      lng: 100.6052,
      isActive: true,
      isVerified: true
    }
  });
  console.log('✅ Merchant Created:', merchant.storeName);

  // 2. สร้าง Driver (คนขับรถ: สมชาย ขับกระบะส่งของ)
  const driver = await prisma.driver.upsert({
    where: { email: 'somchai@swiftpath.demo' },
    update: {},
    create: {
      email: 'somchai@swiftpath.demo',
      username: 'somchai_driver',
      password: hashedPassword,
      name: 'สมชาย ขับกระบะส่งของ',
      phone: '0898765432',
      vehiclePlate: '1ฒฒ-4589 กทม.',
      vehicleType: 'Pickup Truck',
      merchantId: merchant.id, // สังกัดร้านเจ๊พร
      isActive: true,
      isVerified: true
    }
  });
  console.log('✅ Driver Created:', driver.name);

  // 2.5 สร้าง Customers สำหรับ Demo ล็อกอิน
  const customer1 = await prisma.customer.upsert({
    where: { email: 'somkiat@swiftpath.demo' },
    update: {},
    create: {
      email: 'somkiat@swiftpath.demo',
      username: 'somkiat_customer',
      password: hashedPassword,
      name: 'คุณสมเกียรติ รับเหมาสร้างบ้าน',
      phone: '0881112222',
      balance: 15000,
      isActive: true,
      isVerified: true
    }
  });
  console.log('✅ Customer 1 Created:', customer1.name);

  const customer2 = await prisma.customer.upsert({
    where: { email: 'nida@swiftpath.demo' },
    update: {},
    create: {
      email: 'nida@swiftpath.demo',
      username: 'nida_customer',
      password: hashedPassword,
      name: 'คุณนิดา ตกแต่งภายใน',
      phone: '0883334444',
      balance: 8000,
      isActive: true,
      isVerified: true
    }
  });
  console.log('✅ Customer 2 Created:', customer2.name);

  const customer3 = await prisma.customer.upsert({
    where: { email: 'wichai@swiftpath.demo' },
    update: {},
    create: {
      email: 'wichai@swiftpath.demo',
      username: 'wichai_customer',
      password: hashedPassword,
      name: 'คุณวิชัย ผู้รับของ',
      phone: '0891234567',
      balance: 5000,
      isActive: true,
      isVerified: true
    }
  });
  console.log('✅ Customer 3 Created:', customer3.name);

  // 3. สร้าง Products (แคตตาล็อกสินค้า 5-6 รายการ)
  const productsData = [
    { name: 'ปูนซีเมนต์ปอร์ตแลนด์', unit: 'ถุง 50 กก.', defaultPrice: 150 },
    { name: 'ท่อ PVC 2 นิ้ว ชั้น 8.5', unit: 'เส้น', defaultPrice: 85 },
    { name: 'กระเบื้องปูพื้น 60x60', unit: 'กล่อง', defaultPrice: 220 },
    { name: 'สีทาภายนอก', unit: 'ถัง 5 แกลลอน', defaultPrice: 1200 },
    { name: 'ทรายหยาบ', unit: 'คิว', defaultPrice: 450 },
    { name: 'เหล็กเส้นกลม SR24', unit: 'เส้น', defaultPrice: 135 }
  ];

  const products: { id: number; name: string; unit: string | null; defaultPrice: any; merchantId: number; isActive: boolean; createdAt: Date; updatedAt: Date; }[] = [];
  for (const p of productsData) {
    let product = await prisma.product.findFirst({
      where: { merchantId: merchant.id, name: p.name }
    });
    if (!product) {
      product = await prisma.product.create({
        data: {
          merchantId: merchant.id,
          name: p.name,
          unit: p.unit,
          defaultPrice: p.defaultPrice,
          isActive: true
        }
      });
    }
    products.push(product);
  }
  console.log(`✅ Products Created: ${products.length} items`);

  // 4. สร้างออเดอร์จำลอง (Sample Orders)
  // ออเดอร์ 1: IN_TRANSIT (SHIPPING)
  const order1 = await prisma.order.upsert({
    where: { trackingNumber: 'SP-DEMO-001' },
    update: {},
    create: {
      trackingNumber: 'SP-DEMO-001',
      merchantId: merchant.id,
      driverId: driver.id,
      customerId: customer1.id, // ผูกกับบัญชีลูกค้า สมเกียรติ
      receiverName: 'คุณสมเกียรติ รับเหมาสร้างบ้าน',
      receiverPhone: '0881112222',
      address: 'ไซต์งานก่อสร้าง หมู่บ้านฟ้าใส ซอย 5 จ.ปทุมธานี',
      lat: 13.9808,
      lng: 100.5954,
      status: 'SHIPPING', // กำลังเดินทาง
      paymentStatus: 'Unpaid',
      price: 150 * 20 + 85 * 10,
      totalPrice: 150 * 20 + 85 * 10,
      items: {
        create: [
          {
            productName: products[0].name,
            productId: products[0].id,
            quantity: 20,
            unitPrice: products[0].defaultPrice,
            totalPrice: Number(products[0].defaultPrice) * 20
          },
          {
            productName: products[1].name,
            productId: products[1].id,
            quantity: 10,
            unitPrice: products[1].defaultPrice,
            totalPrice: Number(products[1].defaultPrice) * 10
          }
        ]
      }
    }
  });
  console.log('✅ Order 1 Created (SHIPPING):', order1.trackingNumber);

  const existingLog1 = await prisma.trackingLog.findFirst({ where: { orderId: order1.id }});
  if (!existingLog1) {
    await prisma.trackingLog.createMany({
      data: [
        { orderId: order1.id, status: 'ACCEPTED', location: 'เจ๊พร วัสดุก่อสร้างและฮาร์ดแวร์', note: '✅ คนขับรับงานแล้ว' },
        { orderId: order1.id, status: 'PICKED_UP', location: 'เจ๊พร วัสดุก่อสร้างและฮาร์ดแวร์', note: '📦 รับพัสดุเข้าระบบแล้ว' },
        { orderId: order1.id, status: 'SHIPPING', location: 'กำลังออกเดินทางไปส่งพัสดุ', note: '🚛 กำลังจัดส่งไปยังปลายทาง ปทุมธานี' }
      ]
    });
  }

  // ออเดอร์ 2: DELIVERED
  const order2 = await prisma.order.upsert({
    where: { trackingNumber: 'SP-DEMO-002' },
    update: {},
    create: {
      trackingNumber: 'SP-DEMO-002',
      merchantId: merchant.id,
      driverId: driver.id,
      customerId: customer2.id, // ผูกกับบัญชีลูกค้า นิดา
      receiverName: 'คุณนิดา ตกแต่งภายใน',
      receiverPhone: '0883334444',
      address: 'คอนโด LPN รังสิต',
      lat: 13.9855,
      lng: 100.6122,
      status: 'DELIVERED', 
      paymentStatus: 'Paid',
      price: 220 * 15 + 1200 * 2,
      totalPrice: 220 * 15 + 1200 * 2,
      paymentMethod: 'PromptPay',
      items: {
        create: [
          {
            productName: products[2].name,
            productId: products[2].id,
            quantity: 15,
            unitPrice: products[2].defaultPrice,
            totalPrice: Number(products[2].defaultPrice) * 15
          },
          {
            productName: products[3].name,
            productId: products[3].id,
            quantity: 2,
            unitPrice: products[3].defaultPrice,
            totalPrice: Number(products[3].defaultPrice) * 2
          }
        ]
      }
    }
  });
  console.log('✅ Order 2 Created (DELIVERED):', order2.trackingNumber);

  const existingLog2 = await prisma.trackingLog.findFirst({ where: { orderId: order2.id }});
  if (!existingLog2) {
    await prisma.trackingLog.createMany({
      data: [
        { orderId: order2.id, status: 'ACCEPTED', location: 'เจ๊พร วัสดุก่อสร้างและฮาร์ดแวร์', note: '✅ คนขับรับงานแล้ว' },
        { orderId: order2.id, status: 'PICKED_UP', location: 'เจ๊พร วัสดุก่อสร้างและฮาร์ดแวร์', note: '📦 รับพัสดุเข้าระบบแล้ว' },
        { orderId: order2.id, status: 'SHIPPING', location: 'รังสิต ปทุมธานี', note: '🚛 กำลังจัดส่งสินค้า' },
        { orderId: order2.id, status: 'DELIVERED', location: 'คอนโด LPN รังสิต (สำเร็จ)', note: '🎉 จัดส่งสำเร็จ ลูกค้าได้รับพัสดุแล้ว' }
      ]
    });
  }

  // ออเดอร์ 3: PENDING — สำหรับ Demo ขั้นตอน Driver กดยืนยันรับงานบนหน้า Radar
  const order3 = await prisma.order.upsert({
    where: { trackingNumber: 'SP-DEMO-003' },
    update: {},
    create: {
      trackingNumber: 'SP-DEMO-003',
      merchantId: merchant.id,
      customerId: customer3.id, // ผูกกับบัญชีลูกค้า วิชัย
      receiverName: 'คุณวิชัย ผู้รับของ',
      receiverPhone: '0891234567',
      address: '99/5 ถ.ลาดพร้าว แขวงลาดพร้าว เขตลาดพร้าว กรุงเทพฯ 10230',
      lat: 13.8100,
      lng: 100.5700,
      status: 'PENDING',
      paymentStatus: 'Unpaid',
      price: 135 * 10 + 450 * 2,
      totalPrice: 135 * 10 + 450 * 2,
      estimatedMinutes: 35,
      productName: 'สินค้า 2 รายการ',
      items: {
        create: [
          {
            productName: products[5].name,   // เหล็กเส้นกลม SR24
            productId: products[5].id,
            quantity: 10,
            unitPrice: products[5].defaultPrice,
            totalPrice: Number(products[5].defaultPrice) * 10
          },
          {
            productName: products[4].name,   // ทรายหยาบ
            productId: products[4].id,
            quantity: 2,
            unitPrice: products[4].defaultPrice,
            totalPrice: Number(products[4].defaultPrice) * 2
          }
        ]
      }
    }
  });
  console.log('✅ Order 3 Created (PENDING — for Driver Radar Demo):', order3.trackingNumber);

  const existingLog3 = await prisma.trackingLog.findFirst({ where: { orderId: order3.id }});
  if (!existingLog3) {
    await prisma.trackingLog.create({
      data: {
        orderId: order3.id,
        status: 'PENDING',
        location: 'เจ๊พร วัสดุก่อสร้างและฮาร์ดแวร์',
        note: '🆕 ร้านค้าสร้างออเดอร์สำเร็จ (ETA: 35 นาที) — รอคนขับรับงาน',
      }
    });
  }

  console.log('🎉 Seeding finished successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
