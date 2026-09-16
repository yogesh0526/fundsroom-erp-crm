import request from 'supertest';
import app from '../app';
import { prisma } from '../config/prisma';
import { CalculationService } from '../services/calculation.service';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { Role, QuotationStatus } from '@prisma/client';

describe('Full-Stack ERP Workflow & Business Logic Tests', () => {
  let adminToken: string;
  let salesToken: string;
  let adminUser: any;
  let salesUser: any;
  let testCustomer: any;
  let testProduct1: any;
  let testProduct2: any;

  beforeAll(async () => {
    // Clean and seed fresh test records
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

    // Create Admin and Sales users
    adminUser = await prisma.user.create({
      data: {
        name: 'Test Admin',
        email: 'admin.test@erp.com',
        password: 'hashedpassword',
        role: Role.ADMIN,
      },
    });

    salesUser = await prisma.user.create({
      data: {
        name: 'Test Sales',
        email: 'sales.test@erp.com',
        password: 'hashedpassword',
        role: Role.SALES,
      },
    });

    adminToken = jwt.sign(
      { id: adminUser.id, name: adminUser.name, email: adminUser.email, role: adminUser.role },
      config.JWT_SECRET,
      { expiresIn: '1h' }
    );

    salesToken = jwt.sign(
      { id: salesUser.id, name: salesUser.name, email: salesUser.email, role: salesUser.role },
      config.JWT_SECRET,
      { expiresIn: '1h' }
    );

    testCustomer = await prisma.customer.create({
      data: {
        companyName: 'Test Corp Ltd.',
        contactPerson: 'Suresh Raina',
        mobile: '9876543210',
        email: 'suresh@testcorp.com',
        city: 'Mumbai',
      },
    });

    // Product 1: Stock = 100
    testProduct1 = await prisma.product.create({
      data: {
        productCode: 'TST-001',
        productName: 'Hydraulic Cylinder 100mm',
        category: 'Hydraulics',
        unit: 'PCS',
        basePrice: 1000.0,
        inventory: {
          create: {
            physicalQuantity: 100,
            reservedQuantity: 0,
            damagedQuantity: 0,
          },
        },
      },
    });

    // Product 2: Stock = 20
    testProduct2 = await prisma.product.create({
      data: {
        productCode: 'TST-002',
        productName: 'Pneumatic Solenoid Valve',
        category: 'Pneumatics',
        unit: 'NOS',
        basePrice: 500.0,
        inventory: {
          create: {
            physicalQuantity: 20,
            reservedQuantity: 0,
            damagedQuantity: 0,
          },
        },
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  /**
   * TEST 1: Quotation total is calculated correctly.
   *
   * Example:
   * Item 1: Qty 10 @ 1000 = 10,000. Discount 10% = 1,000. Taxable = 9,000. GST 18% = 1,620. Line = 10,620.
   * Item 2: Qty 4 @ 500 = 2,000. Discount 5% = 100. Taxable = 1,900. GST 18% = 342. Line = 2,242.
   * Grand Total = 10,620 + 2,242 = 12,862.
   */
  test('Test 1: Quotation total is calculated correctly by the backend', async () => {
    // 1. Pure service logic test
    const calculation = CalculationService.calculateQuotation([
      { productId: testProduct1.id, quantity: 10, unitPrice: 1000, discountPercent: 10, gstPercent: 18 },
      { productId: testProduct2.id, quantity: 4, unitPrice: 500, discountPercent: 5, gstPercent: 18 },
    ]);

    expect(calculation.subtotal).toBe(12000);
    expect(calculation.totalDiscount).toBe(1100);
    expect(calculation.totalGst).toBe(1962);
    expect(calculation.grandTotal).toBe(12862);

    // 2. API integration test: Create an enquiry and then generate quotation
    const enqRes = await request(app)
      .post('/api/enquiries')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        customerId: testCustomer.id,
        requiredDate: new Date(Date.now() + 86400000).toISOString(),
        items: [{ productId: testProduct1.id, quantity: 10 }],
      });

    expect(enqRes.status).toBe(201);
    const enquiryId = enqRes.body.data.id;

    // Send quotation with client payload trying to pass manipulated lower total
    const quoteRes = await request(app)
      .post('/api/quotations')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        enquiryId,
        validUntil: new Date(Date.now() + 86400000 * 7).toISOString(),
        items: [
          {
            productId: testProduct1.id,
            quantity: 10,
            unitPrice: 1000,
            discountPercent: 10,
            gstPercent: 18,
          },
        ],
        // Manipulated client value that must be rejected/overridden by backend
        grandTotal: 100,
      });

    expect(quoteRes.status).toBe(201);
    expect(quoteRes.body.data.subtotal).toBe(10000);
    expect(quoteRes.body.data.totalDiscount).toBe(1000);
    expect(quoteRes.body.data.totalGst).toBe(1620);
    expect(quoteRes.body.data.grandTotal).toBe(10620); // 9000 + 1620 = 10620
  });

  /**
   * TEST 2: Rejected/Draft quotation cannot create a Sales Order.
   */
  test('Test 2: Rejected/Draft quotation cannot create a Sales Order', async () => {
    // Create enquiry
    const enqRes = await request(app)
      .post('/api/enquiries')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        customerId: testCustomer.id,
        requiredDate: new Date(Date.now() + 86400000).toISOString(),
        items: [{ productId: testProduct1.id, quantity: 5 }],
      });

    // Create quotation (default status: DRAFT)
    const quoteRes = await request(app)
      .post('/api/quotations')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        enquiryId: enqRes.body.data.id,
        validUntil: new Date(Date.now() + 86400000 * 7).toISOString(),
        items: [{ productId: testProduct1.id, quantity: 5, unitPrice: 1000 }],
      });

    const quotationId = quoteRes.body.data.id;

    // 1. Attempt to convert DRAFT quotation -> must fail
    const draftConvertRes = await request(app)
      .post(`/api/quotations/${quotationId}/convert`)
      .set('Authorization', `Bearer ${salesToken}`);

    expect(draftConvertRes.status).toBe(400);
    expect(draftConvertRes.body.message).toContain('Only ACCEPTED quotations can be converted');

    // 2. Update status to REJECTED
    await request(app)
      .patch(`/api/quotations/${quotationId}/status`)
      .set('Authorization', `Bearer ${salesToken}`)
      .send({ status: QuotationStatus.REJECTED });

    // 3. Attempt to convert REJECTED quotation -> must fail
    const rejectedConvertRes = await request(app)
      .post(`/api/quotations/${quotationId}/convert`)
      .set('Authorization', `Bearer ${salesToken}`);

    expect(rejectedConvertRes.status).toBe(400);
    expect(rejectedConvertRes.body.message).toContain('Only ACCEPTED quotations can be converted');
  });

  /**
   * TEST 3: Same quotation cannot generate duplicate Sales Orders.
   */
  test('Test 3: Same quotation cannot generate duplicate Sales Orders', async () => {
    const enqRes = await request(app)
      .post('/api/enquiries')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        customerId: testCustomer.id,
        requiredDate: new Date(Date.now() + 86400000).toISOString(),
        items: [{ productId: testProduct1.id, quantity: 15 }],
      });

    const quoteRes = await request(app)
      .post('/api/quotations')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        enquiryId: enqRes.body.data.id,
        validUntil: new Date(Date.now() + 86400000 * 7).toISOString(),
        items: [{ productId: testProduct1.id, quantity: 15, unitPrice: 1000 }],
      });

    const quotationId = quoteRes.body.data.id;

    // Set to ACCEPTED
    await request(app)
      .patch(`/api/quotations/${quotationId}/status`)
      .set('Authorization', `Bearer ${salesToken}`)
      .send({ status: QuotationStatus.ACCEPTED });

    // First conversion: Must succeed (201 Created)
    const firstConversion = await request(app)
      .post(`/api/quotations/${quotationId}/convert`)
      .set('Authorization', `Bearer ${salesToken}`);

    expect(firstConversion.status).toBe(201);
    expect(firstConversion.body.data.orderNumber).toBeDefined();

    // Second conversion: Must fail with 409 Conflict
    const secondConversion = await request(app)
      .post(`/api/quotations/${quotationId}/convert`)
      .set('Authorization', `Bearer ${salesToken}`);

    expect(secondConversion.status).toBe(409);
    expect(secondConversion.body.message).toContain('already been generated');
  });

  /**
   * TEST 4: Cannot reserve more than available inventory.
   * Product 2 has physical 20, reserved 0 -> available 20.
   * Requesting 50 units must be rejected.
   */
  test('Test 4: Cannot reserve more than available inventory', async () => {
    // Create enquiry requesting 50 units of Product 2 (available is only 20)
    const enqRes = await request(app)
      .post('/api/enquiries')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        customerId: testCustomer.id,
        requiredDate: new Date(Date.now() + 86400000).toISOString(),
        items: [{ productId: testProduct2.id, quantity: 50 }],
      });

    const quoteRes = await request(app)
      .post('/api/quotations')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        enquiryId: enqRes.body.data.id,
        validUntil: new Date(Date.now() + 86400000 * 7).toISOString(),
        items: [{ productId: testProduct2.id, quantity: 50, unitPrice: 500 }],
      });

    const quotationId = quoteRes.body.data.id;

    // Accept quotation
    await request(app)
      .patch(`/api/quotations/${quotationId}/status`)
      .set('Authorization', `Bearer ${salesToken}`)
      .send({ status: QuotationStatus.ACCEPTED });

    // Convert to sales order
    const orderRes = await request(app)
      .post(`/api/quotations/${quotationId}/convert`)
      .set('Authorization', `Bearer ${salesToken}`);

    const salesOrderId = orderRes.body.data.id;

    // Admin attempts to confirm sales order (requires 50 units, but only 20 available)
    const confirmRes = await request(app)
      .post(`/api/sales-orders/${salesOrderId}/confirm`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(confirmRes.status).toBe(400);
    expect(confirmRes.body.message).toContain('Insufficient stock');
    expect(confirmRes.body.message).toContain('Required: 50');

    // Verify inventory reserved quantity remained 0
    const inv = await prisma.inventory.findUnique({
      where: { productId: testProduct2.id },
    });
    expect(inv?.reservedQuantity).toBe(0);
    expect(inv?.physicalQuantity).toBe(20);
  });

  /**
   * TEST 5: Unauthorized user cannot perform a restricted operation.
   * - Sales user cannot confirm Sales Order.
   * - Sales user cannot dispatch Sales Order.
   * - Sales user cannot update inventory stock.
   */
  test('Test 5: Unauthorized user cannot perform a restricted operation', async () => {
    // 1. Sales user tries to confirm sales order
    const unauthorizedConfirm = await request(app)
      .post(`/api/sales-orders/dummy-id/confirm`)
      .set('Authorization', `Bearer ${salesToken}`);

    expect(unauthorizedConfirm.status).toBe(403);
    expect(unauthorizedConfirm.body.message).toContain('Forbidden');

    // 2. Sales user tries to dispatch sales order
    const unauthorizedDispatch = await request(app)
      .post(`/api/sales-orders/dummy-id/dispatch`)
      .set('Authorization', `Bearer ${salesToken}`)
      .send({ vehicleNumber: 'MH-12-1234', driverName: 'Ramesh' });

    expect(unauthorizedDispatch.status).toBe(403);
    expect(unauthorizedDispatch.body.message).toContain('Forbidden');

    // 3. Sales user tries to update inventory
    const unauthorizedInventory = await request(app)
      .patch(`/api/inventory/dummy-id`)
      .set('Authorization', `Bearer ${salesToken}`)
      .send({ physicalQuantity: 500 });

    expect(unauthorizedInventory.status).toBe(403);
    expect(unauthorizedInventory.body.message).toContain('Forbidden');
  });

  /**
   * BONUS TEST: Simultaneous inventory reservations.
   *
   * Scenario from Case Study page 5:
   * Available inventory = 100
   * Two requests arrive almost simultaneously:
   * User A -> Reserve 80
   * User B -> Reserve 50
   * Total requested = 130 > 100.
   * Both reservations CANNOT succeed. Exactly one must succeed and one must fail!
   */
  test('Bonus Test: Simultaneous inventory reservations with concurrency row locking', async () => {
    // Reset testProduct1 inventory to exactly 100 physical, 0 reserved
    await prisma.inventory.update({
      where: { productId: testProduct1.id },
      data: { physicalQuantity: 100, reservedQuantity: 0, damagedQuantity: 0 },
    });

    // Create Order A requiring 80 units
    const enqA = await prisma.enquiry.create({
      data: {
        enquiryNumber: 'ENQ-CONCUR-A',
        customerId: testCustomer.id,
        requiredDate: new Date(),
        createdById: salesUser.id,
      },
    });
    const quoteA = await prisma.quotation.create({
      data: {
        quotationNumber: 'QT-CONCUR-A',
        enquiryId: enqA.id,
        customerId: testCustomer.id,
        validUntil: new Date(),
        subtotal: 80000,
        totalDiscount: 0,
        totalGst: 0,
        grandTotal: 80000,
        status: QuotationStatus.ACCEPTED,
        createdById: salesUser.id,
        items: {
          create: {
            productId: testProduct1.id,
            quantity: 80,
            unitPrice: 1000,
            baseAmount: 80000,
            discountAmount: 0,
            taxableAmount: 80000,
            gstAmount: 0,
            lineAmount: 80000,
          },
        },
      },
    });
    const orderA = await prisma.salesOrder.create({
      data: {
        orderNumber: 'SO-CONCUR-A',
        customerId: testCustomer.id,
        quotationId: quoteA.id,
        totalAmount: 80000,
        createdById: salesUser.id,
        items: {
          create: {
            productId: testProduct1.id,
            quantity: 80,
            unitPrice: 1000,
            lineAmount: 80000,
          },
        },
      },
    });

    // Create Order B requiring 50 units
    const enqB = await prisma.enquiry.create({
      data: {
        enquiryNumber: 'ENQ-CONCUR-B',
        customerId: testCustomer.id,
        requiredDate: new Date(),
        createdById: salesUser.id,
      },
    });
    const quoteB = await prisma.quotation.create({
      data: {
        quotationNumber: 'QT-CONCUR-B',
        enquiryId: enqB.id,
        customerId: testCustomer.id,
        validUntil: new Date(),
        subtotal: 50000,
        totalDiscount: 0,
        totalGst: 0,
        grandTotal: 50000,
        status: QuotationStatus.ACCEPTED,
        createdById: salesUser.id,
        items: {
          create: {
            productId: testProduct1.id,
            quantity: 50,
            unitPrice: 1000,
            baseAmount: 50000,
            discountAmount: 0,
            taxableAmount: 50000,
            gstAmount: 0,
            lineAmount: 50000,
          },
        },
      },
    });
    const orderB = await prisma.salesOrder.create({
      data: {
        orderNumber: 'SO-CONCUR-B',
        customerId: testCustomer.id,
        quotationId: quoteB.id,
        totalAmount: 50000,
        createdById: salesUser.id,
        items: {
          create: {
            productId: testProduct1.id,
            quantity: 50,
            unitPrice: 1000,
            lineAmount: 50000,
          },
        },
      },
    });

    // Fire both reservation confirmation requests simultaneously with Promise.all
    const [resA, resB] = await Promise.all([
      request(app)
        .post(`/api/sales-orders/${orderA.id}/confirm`)
        .set('Authorization', `Bearer ${adminToken}`),
      request(app)
        .post(`/api/sales-orders/${orderB.id}/confirm`)
        .set('Authorization', `Bearer ${adminToken}`),
    ]);

    const statuses = [resA.status, resB.status];
    // Exactly one must be 200 (Success) and one must be 400 (Insufficient stock)
    expect(statuses).toContain(200);
    expect(statuses).toContain(400);

    const successfulRes = resA.status === 200 ? resA : resB;
    const failedRes = resA.status === 400 ? resA : resB;

    expect(successfulRes.body.success).toBe(true);
    expect(failedRes.body.success).toBe(false);
    expect(failedRes.body.message).toContain('Insufficient stock');

    // Verify inventory state
    const finalInv = await prisma.inventory.findUnique({
      where: { productId: testProduct1.id },
    });

    // If A won: reserved is 80, available is 20. If B won: reserved is 50, available is 50.
    // Under no circumstances should reserved be 130!
    expect([80, 50]).toContain(finalInv?.reservedQuantity);
    expect(finalInv?.physicalQuantity).toBe(100);
  });
});
