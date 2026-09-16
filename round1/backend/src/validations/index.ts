import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
});

export const customerSchema = z.object({
  name: z.string().min(2, 'Customer name must be at least 2 characters'),
  mobile: z.string().min(7, 'Mobile number must be at least 7 characters'),
  email: z.string().email('Invalid email address'),
  businessName: z.string().min(2, 'Business name must be at least 2 characters'),
  gstNumber: z.string().optional().nullable(),
  customerType: z.enum(['RETAIL', 'WHOLESALE', 'DISTRIBUTOR'], {
    errorMap: () => ({ message: 'Customer type must be RETAIL, WHOLESALE, or DISTRIBUTOR' }),
  }),
  address: z.string().min(3, 'Address is required'),
  status: z.enum(['LEAD', 'ACTIVE', 'INACTIVE']).default('LEAD'),
  followUpDate: z.string().datetime().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const customerUpdateSchema = customerSchema.partial();

export const followUpSchema = z.object({
  note: z.string().min(1, 'Follow-up note cannot be empty'),
  nextFollowUpDate: z.string().datetime().optional().nullable(),
});

export const productSchema = z.object({
  name: z.string().min(2, 'Product name must be at least 2 characters'),
  sku: z.string().min(2, 'SKU must be at least 2 characters').toUpperCase(),
  category: z.string().min(2, 'Category is required'),
  unitPrice: z.number().positive('Unit price must be greater than 0'),
  currentStock: z.number().int().nonnegative('Stock cannot be negative').default(0),
  minStockAlert: z.number().int().nonnegative('Min stock alert must be 0 or more').default(5),
  location: z.string().min(1, 'Location/Warehouse is required'),
  imageUrl: z.string().optional().nullable(),
});

export const productUpdateSchema = productSchema.partial();

export const stockAdjustmentSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  quantity: z.number().int().positive('Quantity must be a positive integer'),
  movementType: z.enum(['IN', 'OUT'], {
    errorMap: () => ({ message: 'Movement type must be IN or OUT' }),
  }),
  reason: z.string().min(3, 'Reason is required (min 3 characters)'),
});

export const challanItemSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  quantity: z.number().int().positive('Quantity must be at least 1'),
});

export const createChallanSchema = z.object({
  customerId: z.string().uuid('Invalid customer ID'),
  items: z.array(challanItemSchema).min(1, 'At least one product item is required'),
  status: z.enum(['DRAFT', 'CONFIRMED']).default('DRAFT'),
  notes: z.string().optional().nullable(),
});

export const updateChallanStatusSchema = z.object({
  status: z.enum(['CONFIRMED', 'CANCELLED']),
});
