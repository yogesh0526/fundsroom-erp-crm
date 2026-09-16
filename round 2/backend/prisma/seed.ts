import { PrismaClient, Role, EnquiryStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // 1. Clean existing records in reverse dependency order
  await prisma.dispatchItem.deleteMany();
  await prisma.dispatch.deleteMany();
  await prisma.salesOrderItem.deleteMany();
  await prisma.salesOrder.deleteMany();
  await prisma.quotationItem.deleteMany();
  await prisma.quotation.deleteMany();
  await prisma.enquiryItem.deleteMany();
  await prisma.enquiry.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.product.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.user.deleteMany();

  // 2. Seed Users with hashed passwords
  const passwordHash = await bcrypt.hash('admin123', 10);
  const salesPasswordHash = await bcrypt.hash('sales123', 10);

  const admin = await prisma.user.create({
    data: {
      name: 'Operations Admin',
      email: 'admin@erp.com',
      password: passwordHash,
      role: Role.ADMIN,
    },
  });

  const salesUser = await prisma.user.create({
    data: {
      name: 'Rohan Mehta (Sales)',
      email: 'sales@erp.com',
      password: salesPasswordHash,
      role: Role.SALES,
    },
  });

  console.log(`✅ Users created: Admin (${admin.email}), Sales (${salesUser.email})`);

  // 3. Seed 6 Industrial Products with Inventory
  const productsData = [
    {
      productCode: 'PRD-001',
      productName: 'Heavy Duty Hydraulic Pump 500 Bar',
      category: 'Hydraulics',
      unit: 'PCS',
      basePrice: 18500.0,
      stock: 100,
    },
    {
      productCode: 'PRD-002',
      productName: 'Industrial Electric Motor 5HP 3-Phase',
      category: 'Electrical Machinery',
      unit: 'NOS',
      basePrice: 12800.0,
      stock: 150,
    },
    {
      productCode: 'PRD-003',
      productName: 'Stainless Steel Ball Valve 2-inch ANSI 150',
      category: 'Piping & Valves',
      unit: 'PCS',
      basePrice: 2450.0,
      stock: 300,
    },
    {
      productCode: 'PRD-004',
      productName: 'Pneumatic Air Cylinder 50mm Bore 200mm Stroke',
      category: 'Pneumatics',
      unit: 'PCS',
      basePrice: 4200.0,
      stock: 80,
    },
    {
      productCode: 'PRD-005',
      productName: 'High Pressure Reinforced Hydraulic Hose 10m',
      category: 'Hoses & Fittings',
      unit: 'MTR',
      basePrice: 1650.0,
      stock: 250,
    },
    {
      productCode: 'PRD-006',
      productName: 'Precision Helical Gearbox 20:1 Ratio',
      category: 'Mechanical Power',
      unit: 'NOS',
      basePrice: 24000.0,
      stock: 50,
    },
  ];

  const createdProducts: any[] = [];
  for (const item of productsData) {
    const product = await prisma.product.create({
      data: {
        productCode: item.productCode,
        productName: item.productName,
        category: item.category,
        unit: item.unit,
        basePrice: item.basePrice,
        inventory: {
          create: {
            physicalQuantity: item.stock,
            reservedQuantity: 0,
            damagedQuantity: 0,
          },
        },
      },
    });
    createdProducts.push(product);
  }

  console.log(`✅ Seeded ${createdProducts.length} industrial products with inventory.`);

  // 4. Seed Customers
  const customerA = await prisma.customer.create({
    data: {
      companyName: 'ABC Engineering Pvt. Ltd.',
      contactPerson: 'Rajesh Sharma',
      mobile: '9876543210',
      email: 'rajesh@abcengineering.com',
      city: 'Pune',
    },
  });

  const customerB = await prisma.customer.create({
    data: {
      companyName: 'Apex Industrial Solutions',
      contactPerson: 'Priya Verma',
      mobile: '9812345678',
      email: 'priya@apexindustries.com',
      city: 'Ahmedabad',
    },
  });

  const customerC = await prisma.customer.create({
    data: {
      companyName: 'Precision Automations LLP',
      contactPerson: 'Vikram Patel',
      mobile: '9923456789',
      email: 'vikram@precisionauto.in',
      city: 'Vadodara',
    },
  });

  console.log(`✅ Seeded 3 business customers.`);

  // 5. Seed an Initial Sample Enquiry
  const today = new Date();
  const requiredDate = new Date();
  requiredDate.setDate(today.getDate() + 15);

  const enquiry1 = await prisma.enquiry.create({
    data: {
      enquiryNumber: 'ENQ-2026-001',
      customerId: customerA.id,
      enquiryDate: today,
      requiredDate: requiredDate,
      notes: 'Urgent requirement for plant expansion project in Chakan industrial area.',
      status: EnquiryStatus.NEW,
      createdById: salesUser.id,
      items: {
        create: [
          {
            productId: createdProducts[0].id,
            quantity: 10,
            notes: 'High pressure specification required',
          },
          {
            productId: createdProducts[2].id,
            quantity: 25,
            notes: 'SS316 material grade',
          },
        ],
      },
    },
  });

  console.log(`✅ Seeded sample enquiry: ${enquiry1.enquiryNumber}`);
  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
