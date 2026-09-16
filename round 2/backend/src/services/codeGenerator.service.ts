import { prisma } from '../config/prisma';

export class CodeGeneratorService {
  static async generateEnquiryNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await prisma.enquiry.count();
    return `ENQ-${year}-${String(count + 1).padStart(4, '0')}`;
  }

  static async generateQuotationNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await prisma.quotation.count();
    return `QT-${year}-${String(count + 1).padStart(4, '0')}`;
  }

  static async generateOrderNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await prisma.salesOrder.count();
    return `SO-${year}-${String(count + 1).padStart(4, '0')}`;
  }

  static async generateDispatchNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await prisma.dispatch.count();
    return `DSP-${year}-${String(count + 1).padStart(4, '0')}`;
  }
}
