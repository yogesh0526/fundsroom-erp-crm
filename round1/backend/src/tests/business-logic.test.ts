import prisma from '../config/prisma';
import { AuthService } from '../services/auth.service';
import { ChallanService } from '../services/challan.service';
import { InventoryService } from '../services/inventory.service';
import { InvoiceService } from '../services/invoice.service';
import { ChallanStatus, MovementType, Role } from '@prisma/client';

async function runTests() {
  console.log('🧪 Starting Business Logic & Integrity Verification Tests...\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failed++;
    }
  }

  try {
    // 1. Test Authentication
    console.log('--- Test 1: Authentication & Role Resolution ---');
    const adminLogin = await AuthService.login('admin@erp.com', 'Admin@123');
    assert(adminLogin.user.role === Role.ADMIN, 'Admin logs in with correct role');
    assert(Boolean(adminLogin.token), 'JWT token generated on login');

    const salesLogin = await AuthService.login('sales@erp.com', 'Sales@123');
    assert(salesLogin.user.role === Role.SALES, 'Sales user logs in successfully');

    let authFailedProperly = false;
    try {
      await AuthService.login('admin@erp.com', 'WrongPassword');
    } catch (e: any) {
      authFailedProperly = e.statusCode === 401;
    }
    assert(authFailedProperly, 'Invalid password rejected with 401 Unauthorized');

    // 2. Test Stock Invariant: Insufficient Stock Rejection
    console.log('\n--- Test 2: Stock Invariant & Insufficient Stock Protection ---');
    const customer = await prisma.customer.findFirst();
    // Pick the product with critical low stock (e.g., prod7 or prod5)
    const lowStockProd = await prisma.product.findFirst({
      where: { currentStock: { lte: 5 } },
    });

    if (customer && lowStockProd) {
      let insufficientStockRejected = false;
      let initialStock = lowStockProd.currentStock;

      try {
        await ChallanService.create({
          customerId: customer.id,
          userId: salesLogin.user.id,
          status: ChallanStatus.CONFIRMED,
          items: [
            {
              productId: lowStockProd.id,
              quantity: initialStock + 9999, // Exceeds available stock
            },
          ],
        });
      } catch (e: any) {
        insufficientStockRejected = e.statusCode === 400 && e.message.includes('Insufficient stock');
      }

      assert(insufficientStockRejected, 'Challan confirmation exceeding stock rejected with 400 Insufficient Stock');

      // Verify stock was not deducted
      const refreshedProd = await prisma.product.findUnique({
        where: { id: lowStockProd.id },
      });
      assert(
        refreshedProd?.currentStock === initialStock,
        `Stock remains unchanged after rejected transaction (Stock = ${initialStock})`
      );
    }

    // 3. Test Successful Challan Confirmation & Stock Reduction
    console.log('\n--- Test 3: Successful Challan Confirmation & Atomic Stock Deduction ---');
    const highStockProd = await prisma.product.findFirst({
      where: { currentStock: { gte: 20 } },
    });

    if (customer && highStockProd) {
      const stockBefore = highStockProd.currentStock;
      const orderQty = 4;

      const confirmedChallan = await ChallanService.create({
        customerId: customer.id,
        userId: salesLogin.user.id,
        status: ChallanStatus.CONFIRMED,
        items: [
          {
            productId: highStockProd.id,
            quantity: orderQty,
          },
        ],
      });

      assert(confirmedChallan.status === ChallanStatus.CONFIRMED, 'Challan created directly in CONFIRMED status');

      const stockAfter = (
        await prisma.product.findUnique({ where: { id: highStockProd.id } })
      )?.currentStock;

      assert(
        stockAfter === stockBefore - orderQty,
        `Stock accurately decremented by ${orderQty} units (From ${stockBefore} to ${stockAfter})`
      );

      // Verify Stock Movement Log created
      const movement = await prisma.stockMovement.findFirst({
        where: {
          referenceId: confirmedChallan.challanNumber,
          productId: highStockProd.id,
        },
      });

      assert(
        movement?.movementType === MovementType.OUT && movement.quantity === orderQty,
        'StockMovement ledger recorded OUT movement for Challan dispatch'
      );

      // Verify Snapshot Data
      const itemSnapshot = confirmedChallan.items[0];
      assert(
        itemSnapshot.productName === highStockProd.name &&
          itemSnapshot.sku === highStockProd.sku &&
          itemSnapshot.unitPrice === highStockProd.unitPrice,
        'Product snapshot (name, SKU, unitPrice) preserved immutably in Challan line item'
      );

      // 4. Test Invoice Generation from Confirmed Challan
      console.log('\n--- Test 4: Invoice Generation & GST Tax Math ---');
      const accountsLogin = await AuthService.login('accounts@erp.com', 'Accounts@123');
      const invoice = await InvoiceService.generateFromChallan(
        confirmedChallan.id,
        accountsLogin.user.id
      );

      assert(Boolean(invoice.invoiceNumber), `Generated Invoice Number: ${invoice.invoiceNumber}`);
      assert(invoice.subtotal === confirmedChallan.totalAmount, 'Invoice subtotal matches Challan total');
      const expectedTax = (confirmedChallan.totalAmount * 18.0) / 100;
      assert(
        Math.abs(invoice.taxAmount - expectedTax) < 0.01,
        `Invoice 18% GST correctly computed (INR ${invoice.taxAmount})`
      );
      assert(
        Math.abs(invoice.totalAmount - (invoice.subtotal + invoice.taxAmount)) < 0.01,
        'Invoice grand total matches subtotal + tax'
      );
    }

    // 5. Test Warehouse Manual Stock Adjustment
    console.log('\n--- Test 5: Warehouse Manual Stock Adjustment ---');
    const warehouseLogin = await AuthService.login('warehouse@erp.com', 'Warehouse@123');
    if (highStockProd) {
      const adjustment = await InventoryService.adjustStock({
        productId: highStockProd.id,
        quantity: 10,
        movementType: MovementType.IN,
        reason: 'Supplier replenishment batch #99',
        createdById: warehouseLogin.user.id,
      });

      assert(
        adjustment.movement.movementType === MovementType.IN,
        'Warehouse successfully added stock with reason logged'
      );
    }

    console.log(`\n========================================`);
    console.log(`🎯 Test Summary: ${passed} Passed, ${failed} Failed`);
    console.log(`========================================\n`);

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('💥 Test suite encountered an unexpected error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
