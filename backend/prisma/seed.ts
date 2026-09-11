import { PrismaClient, Role, CustomerType, CustomerStatus, MovementType, ChallanStatus, InvoiceStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // 1. Clean existing data in reverse order of foreign keys
  await prisma.invoice.deleteMany();
  await prisma.challanItem.deleteMany();
  await prisma.challan.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.customerFollowUp.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();

  console.log('🧹 Existing data cleaned.');

  // 2. Hash default password
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('Admin@123', salt);
  const salesPasswordHash = await bcrypt.hash('Sales@123', salt);
  const warehousePasswordHash = await bcrypt.hash('Warehouse@123', salt);
  const accountsPasswordHash = await bcrypt.hash('Accounts@123', salt);

  // 3. Seed Users
  const adminUser = await prisma.user.create({
    data: {
      name: 'Operations Admin',
      email: 'admin@erp.com',
      password: passwordHash,
      role: Role.ADMIN,
    },
  });

  const salesUser = await prisma.user.create({
    data: {
      name: 'Rohan Sharma (Sales)',
      email: 'sales@erp.com',
      password: salesPasswordHash,
      role: Role.SALES,
    },
  });

  const warehouseUser = await prisma.user.create({
    data: {
      name: 'Vikram Singh (Warehouse)',
      email: 'warehouse@erp.com',
      password: warehousePasswordHash,
      role: Role.WAREHOUSE,
    },
  });

  const accountsUser = await prisma.user.create({
    data: {
      name: 'Pooja Mehta (Accounts)',
      email: 'accounts@erp.com',
      password: accountsPasswordHash,
      role: Role.ACCOUNTS,
    },
  });

  console.log('✅ 4 Role Users seeded (admin, sales, warehouse, accounts)');

  // 4. Seed Customers
  const customer1 = await prisma.customer.create({
    data: {
      name: 'Apex Industrial Supplies Ltd',
      mobile: '+91 98231 44556',
      email: 'procurement@apexind.com',
      businessName: 'Apex Industrial Supplies Pvt Ltd',
      gstNumber: '27AABCA1234F1Z5',
      customerType: CustomerType.DISTRIBUTOR,
      address: 'Plot 45, MIDC Bhosari, Pune, Maharashtra 411026',
      status: CustomerStatus.ACTIVE,
      followUpDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      notes: 'Key distributor for Western Region. 30-day payment term contract in place.',
    },
  });

  const customer2 = await prisma.customer.create({
    data: {
      name: 'Metro Mart Wholesale',
      mobile: '+91 98450 11223',
      email: 'orders@metromart.in',
      businessName: 'Metro Mart Commercial Corp',
      gstNumber: '29AABCB5678G2Z4',
      customerType: CustomerType.WHOLESALE,
      address: 'Outer Ring Road, Marathahalli, Bengaluru, Karnataka 560037',
      status: CustomerStatus.ACTIVE,
      followUpDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      notes: 'High volume orders monthly. Interested in expanding electrical range.',
    },
  });

  const customer3 = await prisma.customer.create({
    data: {
      name: 'Vanguard Electronics',
      mobile: '+91 98110 88776',
      email: 'vanguard.sales@gmail.com',
      businessName: 'Vanguard Electricals & Hardware',
      gstNumber: '07AABCV9988D1Z9',
      customerType: CustomerType.WHOLESALE,
      address: 'Okhla Industrial Area Phase III, New Delhi 110020',
      status: CustomerStatus.LEAD,
      followUpDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      notes: 'Requested product catalog and bulk discounting terms for Q3.',
    },
  });

  const customer4 = await prisma.customer.create({
    data: {
      name: 'Sunrise Hardware Store',
      mobile: '+91 98790 33445',
      email: 'contact@sunrisehardware.com',
      businessName: 'Sunrise Hardware & Tooling',
      gstNumber: '24AABCS7766K1Z1',
      customerType: CustomerType.RETAIL,
      address: 'GIDC Estate, Vatva, Ahmedabad, Gujarat 382445',
      status: CustomerStatus.ACTIVE,
      followUpDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      notes: 'Regular retail buyer for machinery and safety gear.',
    },
  });

  const customer5 = await prisma.customer.create({
    data: {
      name: 'Zenith Construction Supplies',
      mobile: '+91 94440 55667',
      email: 'info@zenithbuilders.org',
      businessName: 'Zenith Infrastructure & Supply',
      gstNumber: '33AABCZ4433H1Z2',
      customerType: CustomerType.DISTRIBUTOR,
      address: 'Anna Salai, Guindy, Chennai, Tamil Nadu 600032',
      status: CustomerStatus.INACTIVE,
      followUpDate: null,
      notes: 'Account on hold pending payment reconciliation from last quarter.',
    },
  });

  // Seed Follow-up Notes
  await prisma.customerFollowUp.createMany({
    data: [
      {
        customerId: customer1.id,
        note: 'Quarterly review call completed. Client requested delivery schedule for power tools.',
        nextFollowUpDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        createdById: salesUser.id,
      },
      {
        customerId: customer3.id,
        note: 'Sent revised quotation with 8% wholesale volume slab discount.',
        nextFollowUpDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
        createdById: salesUser.id,
      },
    ],
  });

  console.log('✅ 5 Customers & Follow-ups seeded');

  // 5. Seed Products
  const prod1 = await prisma.product.create({
    data: {
      name: 'Industrial Power Drill 750W',
      sku: 'TL-DRL-750',
      category: 'Power Tools',
      unitPrice: 4200.0,
      currentStock: 45,
      minStockAlert: 10,
      location: 'Warehouse A - Bay 3',
    },
  });

  const prod2 = await prisma.product.create({
    data: {
      name: 'Heavy Duty Angle Grinder 850W',
      sku: 'TL-AG-850',
      category: 'Power Tools',
      unitPrice: 2950.0,
      currentStock: 8, // Below min stock (15) -> Low Stock Alert!
      minStockAlert: 15,
      location: 'Warehouse A - Bay 4',
    },
  });

  const prod3 = await prisma.product.create({
    data: {
      name: 'Cat6 Shielded Cable 305m Drum',
      sku: 'EL-CAT6-305',
      category: 'Electrical & Cables',
      unitPrice: 6800.0,
      currentStock: 35,
      minStockAlert: 10,
      location: 'Warehouse B - Shelf 1',
    },
  });

  const prod4 = await prisma.product.create({
    data: {
      name: 'Modular Switch 16A (Pack of 20)',
      sku: 'EL-MSW-16A',
      category: 'Electrical & Cables',
      unitPrice: 1450.0,
      currentStock: 120,
      minStockAlert: 25,
      location: 'Warehouse B - Shelf 2',
    },
  });

  const prod5 = await prisma.product.create({
    data: {
      name: 'Hydraulic Pallet Jack 2.5 Ton',
      sku: 'WH-HPJ-2500',
      category: 'Warehouse Equipment',
      unitPrice: 18500.0,
      currentStock: 3, // Below min stock (5) -> Low Stock Alert!
      minStockAlert: 5,
      location: 'Warehouse Main - Zone 1',
    },
  });

  const prod6 = await prisma.product.create({
    data: {
      name: 'Steel Toe Safety Boots (Size 9)',
      sku: 'SF-BST-09',
      category: 'Safety & PPE',
      unitPrice: 1890.0,
      currentStock: 65,
      minStockAlert: 20,
      location: 'Warehouse C - Bin 12',
    },
  });

  const prod7 = await prisma.product.create({
    data: {
      name: 'Digital Vernier Caliper 150mm',
      sku: 'TL-DVC-150',
      category: 'Precision Tools',
      unitPrice: 1250.0,
      currentStock: 2, // Critical Low Stock!
      minStockAlert: 8,
      location: 'Warehouse A - Vault 2',
    },
  });

  console.log('✅ 7 Products seeded (including 3 with Low Stock Alerts)');

  // 6. Seed Initial Stock Movements
  await prisma.stockMovement.createMany({
    data: [
      {
        productId: prod1.id,
        quantity: 50,
        movementType: MovementType.IN,
        reason: 'Initial Inward PO-2026-001',
        referenceId: 'PO-2026-001',
        createdById: warehouseUser.id,
      },
      {
        productId: prod2.id,
        quantity: 20,
        movementType: MovementType.IN,
        reason: 'Initial Inward PO-2026-002',
        referenceId: 'PO-2026-002',
        createdById: warehouseUser.id,
      },
      {
        productId: prod3.id,
        quantity: 40,
        movementType: MovementType.IN,
        reason: 'Initial Inward PO-2026-003',
        referenceId: 'PO-2026-003',
        createdById: warehouseUser.id,
      },
      {
        productId: prod4.id,
        quantity: 150,
        movementType: MovementType.IN,
        reason: 'Initial Inward PO-2026-004',
        referenceId: 'PO-2026-004',
        createdById: warehouseUser.id,
      },
      {
        productId: prod5.id,
        quantity: 5,
        movementType: MovementType.IN,
        reason: 'Initial Inward PO-2026-005',
        referenceId: 'PO-2026-005',
        createdById: warehouseUser.id,
      },
      {
        productId: prod6.id,
        quantity: 80,
        movementType: MovementType.IN,
        reason: 'Initial Inward PO-2026-006',
        referenceId: 'PO-2026-006',
        createdById: warehouseUser.id,
      },
      {
        productId: prod7.id,
        quantity: 10,
        movementType: MovementType.IN,
        reason: 'Initial Inward PO-2026-007',
        referenceId: 'PO-2026-007',
        createdById: warehouseUser.id,
      },
    ],
  });

  console.log('✅ Stock Movements ledger seeded');

  // 7. Seed A Confirmed Challan with items & Stock Out log
  const confirmedChallan = await prisma.challan.create({
    data: {
      challanNumber: 'SCH-202609-0001',
      customerId: customer1.id,
      customerSnapshot: {
        name: customer1.name,
        businessName: customer1.businessName,
        gstNumber: customer1.gstNumber,
        address: customer1.address,
        mobile: customer1.mobile,
      },
      totalQuantity: 17,
      totalAmount: 51200.0,
      status: ChallanStatus.CONFIRMED,
      notes: 'Priority dispatch for Apex Bhosari plant. Handed over to BlueDart logistics.',
      createdById: salesUser.id,
      items: {
        create: [
          {
            productId: prod1.id,
            productName: prod1.name,
            sku: prod1.sku,
            unitPrice: prod1.unitPrice,
            quantity: 5,
            totalPrice: 5 * prod1.unitPrice,
          },
          {
            productId: prod2.id,
            productName: prod2.name,
            sku: prod2.sku,
            unitPrice: prod2.unitPrice,
            quantity: 12,
            totalPrice: 12 * prod2.unitPrice,
          },
        ],
      },
    },
  });

  // Log stock movements for the confirmed challan
  await prisma.stockMovement.createMany({
    data: [
      {
        productId: prod1.id,
        quantity: 5,
        movementType: MovementType.OUT,
        reason: 'CHALLAN_DISPATCH',
        referenceId: confirmedChallan.challanNumber,
        createdById: salesUser.id,
      },
      {
        productId: prod2.id,
        quantity: 12,
        movementType: MovementType.OUT,
        reason: 'CHALLAN_DISPATCH',
        referenceId: confirmedChallan.challanNumber,
        createdById: salesUser.id,
      },
    ],
  });

  // 8. Seed an Invoice for the Confirmed Challan
  const subtotal = confirmedChallan.totalAmount;
  const taxRate = 18.0;
  const taxAmount = (subtotal * taxRate) / 100;
  const totalAmount = subtotal + taxAmount;

  await prisma.invoice.create({
    data: {
      invoiceNumber: 'INV-202609-0001',
      challanId: confirmedChallan.id,
      customerId: customer1.id,
      subtotal,
      taxRate,
      taxAmount,
      totalAmount,
      status: InvoiceStatus.ISSUED,
      createdById: accountsUser.id,
    },
  });

  // 9. Seed a Draft Challan ready for testing
  await prisma.challan.create({
    data: {
      challanNumber: 'SCH-202609-0002',
      customerId: customer2.id,
      customerSnapshot: {
        name: customer2.name,
        businessName: customer2.businessName,
        gstNumber: customer2.gstNumber,
        address: customer2.address,
        mobile: customer2.mobile,
      },
      totalQuantity: 20,
      totalAmount: 29000.0,
      status: ChallanStatus.DRAFT,
      notes: 'Draft awaiting customer PO confirmation.',
      createdById: salesUser.id,
      items: {
        create: [
          {
            productId: prod4.id,
            productName: prod4.name,
            sku: prod4.sku,
            unitPrice: prod4.unitPrice,
            quantity: 20,
            totalPrice: 20 * prod4.unitPrice,
          },
        ],
      },
    },
  });

  console.log('✅ Seed Challans & Invoices created');
  console.log('🎉 Seeding successfully completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
