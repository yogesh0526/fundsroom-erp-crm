export interface LineItemInput {
  productId: string;
  quantity: number;
  unitPrice: number;
  discountPercent?: number;
  gstPercent?: number;
}

export interface CalculatedLineItem {
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
}

export interface QuotationCalculationResult {
  items: CalculatedLineItem[];
  subtotal: number;
  totalDiscount: number;
  totalGst: number;
  grandTotal: number;
}

export class CalculationService {
  /**
   * Calculates deterministic pricing for quotation line items and totals
   * strictly on the backend to prevent frontend tampering.
   */
  static calculateQuotation(items: LineItemInput[]): QuotationCalculationResult {
    let subtotal = 0;
    let totalDiscount = 0;
    let totalGst = 0;
    let grandTotal = 0;

    const calculatedItems: CalculatedLineItem[] = items.map((item) => {
      const quantity = Math.max(1, Math.floor(Number(item.quantity)));
      const unitPrice = Number(Number(item.unitPrice).toFixed(2));
      const discountPercent = Math.min(100, Math.max(0, Number(item.discountPercent || 0)));
      const gstPercent = Math.max(0, Number(item.gstPercent ?? 18));

      // 1. Base Amount = Quantity * Unit Price
      const baseAmount = Number((quantity * unitPrice).toFixed(2));

      // 2. Discount Amount = Base Amount * (Discount % / 100)
      const discountAmount = Number(((baseAmount * discountPercent) / 100).toFixed(2));

      // 3. Taxable Amount = Base Amount - Discount Amount
      const taxableAmount = Number((baseAmount - discountAmount).toFixed(2));

      // 4. GST Amount = Taxable Amount * (GST % / 100)
      const gstAmount = Number(((taxableAmount * gstPercent) / 100).toFixed(2));

      // 5. Line Amount = Taxable Amount + GST Amount
      const lineAmount = Number((taxableAmount + gstAmount).toFixed(2));

      subtotal += baseAmount;
      totalDiscount += discountAmount;
      totalGst += gstAmount;
      grandTotal += lineAmount;

      return {
        productId: item.productId,
        quantity,
        unitPrice,
        discountPercent,
        gstPercent,
        baseAmount,
        discountAmount,
        taxableAmount,
        gstAmount,
        lineAmount,
      };
    });

    return {
      items: calculatedItems,
      subtotal: Number(subtotal.toFixed(2)),
      totalDiscount: Number(totalDiscount.toFixed(2)),
      totalGst: Number(totalGst.toFixed(2)),
      grandTotal: Number(grandTotal.toFixed(2)),
    };
  }
}
