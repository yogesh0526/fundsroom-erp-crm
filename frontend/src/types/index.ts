export type Role = 'ADMIN' | 'SALES' | 'WAREHOUSE' | 'ACCOUNTS';

export type CustomerType = 'RETAIL' | 'WHOLESALE' | 'DISTRIBUTOR';
export type CustomerStatus = 'LEAD' | 'ACTIVE' | 'INACTIVE';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface CustomerFollowUp {
  id: string;
  customerId: string;
  note: string;
  nextFollowUpDate: string | null;
  createdById: string;
  createdAt: string;
  createdBy?: {
    id: string;
    name: string;
    role: Role;
  };
}

export interface Customer {
  id: string;
  name: string;
  mobile: string;
  email: string;
  businessName: string;
  gstNumber: string | null;
  customerType: CustomerType;
  address: string;
  status: CustomerStatus;
  followUpDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  followUps?: CustomerFollowUp[];
  challans?: any[];
  _count?: {
    challans: number;
    followUps: number;
  };
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  unitPrice: number;
  currentStock: number;
  minStockAlert: number;
  location: string;
  imageUrl: string | null;
  isLowStock?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type MovementType = 'IN' | 'OUT';

export interface StockMovement {
  id: string;
  productId: string;
  quantity: number;
  movementType: MovementType;
  reason: string;
  referenceId: string | null;
  createdById: string;
  createdAt: string;
  product?: {
    id: string;
    name: string;
    sku: string;
    category: string;
  };
  createdBy?: {
    id: string;
    name: string;
    role: Role;
  };
}

export type ChallanStatus = 'DRAFT' | 'CONFIRMED' | 'CANCELLED';

export interface ChallanItem {
  id: string;
  challanId: string;
  productId: string;
  productName: string;
  sku: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  product?: Product;
}

export interface Challan {
  id: string;
  challanNumber: string;
  customerId: string;
  customerSnapshot: {
    name: string;
    businessName: string;
    gstNumber?: string;
    customerType: CustomerType;
    address: string;
    mobile: string;
    email: string;
  };
  totalQuantity: number;
  totalAmount: number;
  status: ChallanStatus;
  notes: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  customer?: Customer;
  items?: ChallanItem[];
  createdBy?: {
    id: string;
    name: string;
    role: Role;
  };
  invoice?: {
    id: string;
    invoiceNumber: string;
    status: string;
    totalAmount: number;
  };
}

export type InvoiceStatus = 'ISSUED' | 'PAID' | 'CANCELLED';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  challanId: string;
  customerId: string;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  status: InvoiceStatus;
  createdById: string;
  createdAt: string;
  challan?: Challan;
  createdBy?: {
    id: string;
    name: string;
    role: Role;
  };
}
