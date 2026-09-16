export type Role = 'ADMIN' | 'SALES';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface Customer {
  id: string;
  companyName: string;
  contactPerson: string;
  mobile: string;
  email: string;
  city: string;
  createdAt: string;
}

export interface ProductInventory {
  physicalQuantity: number;
  reservedQuantity: number;
  damagedQuantity: number;
  availableQuantity: number;
}

export interface Product {
  id: string;
  productCode: string;
  productName: string;
  category: string;
  unit: string;
  basePrice: number;
  inventory?: ProductInventory;
}

export interface InventoryItem {
  id: string;
  productId: string;
  productCode: string;
  productName: string;
  category: string;
  unit: string;
  physicalQuantity: number;
  reservedQuantity: number;
  damagedQuantity: number;
  availableQuantity: number;
  updatedAt: string;
}

export type EnquiryStatus = 'NEW' | 'QUOTED' | 'WON' | 'LOST';

export interface EnquiryItem {
  id: string;
  productId: string;
  quantity: number;
  notes?: string;
  product: Product;
}

export interface Enquiry {
  id: string;
  enquiryNumber: string;
  customerId: string;
  enquiryDate: string;
  requiredDate: string;
  notes?: string;
  status: EnquiryStatus;
  customer: Customer;
  items: EnquiryItem[];
  quotations?: {
    id: string;
    quotationNumber: string;
    status: QuotationStatus;
    grandTotal: number;
  }[];
  createdBy: User;
  createdAt: string;
}

export type QuotationStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED';

export interface QuotationItem {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  gstPercent: number;
  baseAmount: number;
  discountAmount: number;
  taxableAmount: number;
  gstAmount: number;
  lineAmount: number;
  product: Product;
}

export interface Quotation {
  id: string;
  quotationNumber: string;
  enquiryId: string;
  customerId: string;
  validUntil: string;
  subtotal: number;
  totalDiscount: number;
  totalGst: number;
  grandTotal: number;
  status: QuotationStatus;
  notes?: string;
  customer: Customer;
  enquiry: {
    enquiryNumber: string;
    status: EnquiryStatus;
  };
  items: QuotationItem[];
  salesOrder?: {
    id: string;
    orderNumber: string;
    status: OrderStatus;
  };
  createdBy: User;
  createdAt: string;
}

export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'DISPATCHED' | 'CANCELLED';

export interface SalesOrderItem {
  id: string;
  salesOrderId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  lineAmount: number;
  product: Product;
}

export interface SalesOrder {
  id: string;
  orderNumber: string;
  customerId: string;
  quotationId: string;
  orderDate: string;
  totalAmount: number;
  status: OrderStatus;
  confirmedAt?: string;
  notes?: string;
  customer: Customer;
  quotation: {
    id: string;
    quotationNumber: string;
    enquiry?: {
      id: string;
      enquiryNumber: string;
    };
  };
  items: SalesOrderItem[];
  confirmedBy?: User;
  createdBy: User;
  dispatch?: {
    id: string;
    dispatchNumber: string;
    dispatchDate: string;
    vehicleNumber: string;
    driverName: string;
  };
  createdAt: string;
}

export interface Dispatch {
  id: string;
  dispatchNumber: string;
  salesOrderId: string;
  dispatchDate: string;
  vehicleNumber: string;
  driverName: string;
  notes?: string;
  salesOrder: SalesOrder;
  items: {
    id: string;
    productId: string;
    quantity: number;
    product: Product;
  }[];
  createdBy: User;
  createdAt: string;
}
