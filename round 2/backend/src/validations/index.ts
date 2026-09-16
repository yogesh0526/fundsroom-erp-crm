import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address format'),
  password: z.string().min(1, 'Password is required'),
});

export const customerSchema = z.object({
  companyName: z.string().min(2, 'Company name must be at least 2 characters'),
  contactPerson: z.string().min(2, 'Contact person is required'),
  mobile: z.string().min(7, 'Valid mobile number is required'),
  email: z.string().email('Valid email address is required'),
  city: z.string().min(2, 'City is required'),
});

export const enquiryItemSchema = z.object({
  productId: z.string().uuid('Valid product ID is required'),
  quantity: z.number().int().positive('Quantity must be a positive integer'),
  notes: z.string().optional(),
});

export const enquirySchema = z.object({
  customerId: z.string().uuid('Customer ID is required'),
  requiredDate: z.string().or(z.date()).refine((d) => !isNaN(new Date(d).getTime()), {
    message: 'Valid required date is required',
  }),
  notes: z.string().optional(),
  items: z.array(enquiryItemSchema).min(1, 'Enquiry must contain at least one product'),
});

export const enquiryStatusSchema = z.object({
  status: z.enum(['NEW', 'QUOTED', 'WON', 'LOST'], {
    errorMap: () => ({ message: 'Status must be NEW, QUOTED, WON, or LOST' }),
  }),
});

export const quotationItemSchema = z.object({
  productId: z.string().uuid('Product ID is required'),
  quantity: z.number().int().positive('Quantity must be a positive integer'),
  unitPrice: z.number().positive('Unit price must be positive'),
  discountPercent: z.number().min(0).max(100).optional().default(0),
  gstPercent: z.number().min(0).optional().default(18),
});

export const quotationSchema = z.object({
  enquiryId: z.string().uuid('Enquiry ID is required'),
  validUntil: z.string().or(z.date()).refine((d) => !isNaN(new Date(d).getTime()), {
    message: 'Valid expiry date is required',
  }),
  notes: z.string().optional(),
  items: z.array(quotationItemSchema).min(1, 'Quotation must have at least one product item'),
});

export const quotationStatusSchema = z.object({
  status: z.enum(['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED'], {
    errorMap: () => ({ message: 'Status must be DRAFT, SENT, ACCEPTED, or REJECTED' }),
  }),
});

export const dispatchSchema = z.object({
  vehicleNumber: z.string().min(2, 'Vehicle number is required (e.g. MH-12-AB-1234)'),
  driverName: z.string().min(2, 'Driver name is required'),
  notes: z.string().optional(),
});

export const inventoryUpdateSchema = z.object({
  physicalQuantity: z.number().int().min(0).optional(),
  damagedQuantity: z.number().int().min(0).optional(),
});
