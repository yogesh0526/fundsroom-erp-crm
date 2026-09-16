import PDFDocument from 'pdfkit';
import prisma from '../config/prisma';

export class PdfService {
  static async generateInvoicePdf(invoiceId: string): Promise<Buffer> {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        challan: {
          include: {
            customer: true,
            items: true,
          },
        },
        createdBy: {
          select: { name: true, email: true },
        },
      },
    });

    if (!invoice) {
      const err: any = new Error('Invoice not found');
      err.statusCode = 404;
      throw err;
    }

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      const customerSnap = (invoice.challan.customerSnapshot as any) || invoice.challan.customer;

      // Header Banner
      doc
        .fillColor('#1e293b')
        .fontSize(22)
        .text('TAX INVOICE', { align: 'right' })
        .fontSize(10)
        .fillColor('#64748b')
        .text(`Invoice No: ${invoice.invoiceNumber}`, { align: 'right' })
        .text(`Date: ${new Date(invoice.createdAt).toLocaleDateString()}`, { align: 'right' })
        .text(`Ref Challan: ${invoice.challan.challanNumber}`, { align: 'right' });

      // Company Info (Seller)
      doc
        .fontSize(16)
        .fillColor('#0f172a')
        .text('FUNDSROOM ENTERPRISES LTD', 50, 50)
        .fontSize(9)
        .fillColor('#475569')
        .text('Industrial & Commercial Wholesale Distribution')
        .text('GSTIN: 27AAAAF1234E1Z9')
        .text('402, Apex Business Tower, Ring Road')
        .text('Email: billing@fundsroom-erp.internal | Tel: +91 20 6700 8800');

      doc.moveDown(2);
      doc.strokeColor('#cbd5e1').lineWidth(1).moveTo(50, 140).lineTo(545, 140).stroke();

      // Billed To Info
      doc.fontSize(11).fillColor('#0f172a').text('Billed To (Customer Details):', 50, 155);
      doc
        .fontSize(10)
        .fillColor('#1e293b')
        .text(customerSnap.name || customerSnap.businessName, 50, 172)
        .fontSize(9)
        .fillColor('#475569')
        .text(`Company: ${customerSnap.businessName || 'N/A'}`)
        .text(`Address: ${customerSnap.address || 'N/A'}`)
        .text(`GSTIN: ${customerSnap.gstNumber || 'Unregistered / Consumer'}`)
        .text(`Mobile: ${customerSnap.mobile} | Email: ${customerSnap.email}`);

      // Table Header
      const tableTop = 250;
      doc.rect(50, tableTop, 495, 24).fill('#f1f5f9');
      doc
        .fillColor('#0f172a')
        .fontSize(9)
        .font('Helvetica-Bold')
        .text('Sr.', 55, tableTop + 7)
        .text('Product Description / SKU', 80, tableTop + 7)
        .text('Qty', 320, tableTop + 7, { width: 40, align: 'right' })
        .text('Unit Price (INR)', 370, tableTop + 7, { width: 80, align: 'right' })
        .text('Amount (INR)', 460, tableTop + 7, { width: 80, align: 'right' });

      doc.font('Helvetica');

      // Table Rows
      let y = tableTop + 30;
      let index = 1;

      invoice.challan.items.forEach((item) => {
        doc
          .fontSize(9)
          .fillColor('#334155')
          .text(String(index++), 55, y)
          .text(`${item.productName} [${item.sku}]`, 80, y, { width: 230 })
          .text(String(item.quantity), 320, y, { width: 40, align: 'right' })
          .text(item.unitPrice.toFixed(2), 370, y, { width: 80, align: 'right' })
          .text(item.totalPrice.toFixed(2), 460, y, { width: 80, align: 'right' });

        y += 24;
      });

      doc.strokeColor('#e2e8f0').lineWidth(0.8).moveTo(50, y).lineTo(545, y).stroke();
      y += 15;

      // Summary Totals Box
      const subtotal = invoice.subtotal;
      const cgst = invoice.taxAmount / 2;
      const sgst = invoice.taxAmount / 2;

      doc
        .fontSize(9)
        .fillColor('#475569')
        .text('Subtotal (Excl. Tax):', 340, y, { width: 110, align: 'right' })
        .text(`INR ${subtotal.toFixed(2)}`, 460, y, { width: 80, align: 'right' });
      y += 18;

      doc
        .text(`CGST (9.0%):`, 340, y, { width: 110, align: 'right' })
        .text(`INR ${cgst.toFixed(2)}`, 460, y, { width: 80, align: 'right' });
      y += 18;

      doc
        .text(`SGST (9.0%):`, 340, y, { width: 110, align: 'right' })
        .text(`INR ${sgst.toFixed(2)}`, 460, y, { width: 80, align: 'right' });
      y += 22;

      doc.rect(340, y - 4, 205, 26).fill('#f8fafc');
      doc
        .font('Helvetica-Bold')
        .fontSize(11)
        .fillColor('#0f172a')
        .text('Total (Incl. Tax):', 345, y + 3, { width: 105, align: 'right' })
        .text(`INR ${invoice.totalAmount.toFixed(2)}`, 460, y + 3, { width: 80, align: 'right' });

      // Footer & Notes
      doc.font('Helvetica').fontSize(8).fillColor('#94a3b8');
      doc.text(
        'Terms & Conditions: Payment due within 30 days of invoice date. Goods once dispatched are subject to standard company warranty.',
        50,
        740,
        { width: 495, align: 'center' }
      );
      doc.text(`Generated by: ${invoice.createdBy.name} on ${new Date().toLocaleString()}`, 50, 755, {
        width: 495,
        align: 'center',
      });

      doc.end();
    });
  }

  static async generateChallanPdf(challanId: string): Promise<Buffer> {
    const challan = await prisma.challan.findUnique({
      where: { id: challanId },
      include: {
        customer: true,
        items: true,
        createdBy: {
          select: { name: true, email: true },
        },
      },
    });

    if (!challan) {
      const err: any = new Error('Sales Challan not found');
      err.statusCode = 404;
      throw err;
    }

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      const customerSnap = (challan.customerSnapshot as any) || challan.customer;

      // Header Banner
      doc
        .fillColor('#1e293b')
        .fontSize(22)
        .text('SALES DELIVERY CHALLAN', { align: 'right' })
        .fontSize(10)
        .fillColor('#64748b')
        .text(`Challan No: ${challan.challanNumber}`, { align: 'right' })
        .text(`Status: ${challan.status}`, { align: 'right' })
        .text(`Date: ${new Date(challan.createdAt).toLocaleDateString()}`, { align: 'right' });

      // Company Info (Seller)
      doc
        .fontSize(16)
        .fillColor('#0f172a')
        .text('FUNDSROOM ENTERPRISES LTD', 50, 50)
        .fontSize(9)
        .fillColor('#475569')
        .text('Industrial & Commercial Wholesale Distribution')
        .text('GSTIN: 27AAAAF1234E1Z9')
        .text('Central Warehouse Dispatch Terminal 4')
        .text('Email: dispatch@fundsroom-erp.internal');

      doc.moveDown(2);
      doc.strokeColor('#cbd5e1').lineWidth(1).moveTo(50, 140).lineTo(545, 140).stroke();

      // Consignee Info
      doc.fontSize(11).fillColor('#0f172a').text('Consignee / Deliver To:', 50, 155);
      doc
        .fontSize(10)
        .fillColor('#1e293b')
        .text(customerSnap.name || customerSnap.businessName, 50, 172)
        .fontSize(9)
        .fillColor('#475569')
        .text(`Business Name: ${customerSnap.businessName || 'N/A'}`)
        .text(`Delivery Address: ${customerSnap.address || 'N/A'}`)
        .text(`Contact: ${customerSnap.mobile} | ${customerSnap.email}`);

      // Table Header
      const tableTop = 250;
      doc.rect(50, tableTop, 495, 24).fill('#f1f5f9');
      doc
        .fillColor('#0f172a')
        .fontSize(9)
        .font('Helvetica-Bold')
        .text('Sr.', 55, tableTop + 7)
        .text('Product Name & SKU', 85, tableTop + 7)
        .text('Unit Price', 330, tableTop + 7, { width: 70, align: 'right' })
        .text('Dispatched Qty', 410, tableTop + 7, { width: 60, align: 'right' })
        .text('Total (INR)', 480, tableTop + 7, { width: 60, align: 'right' });

      doc.font('Helvetica');

      // Table Rows
      let y = tableTop + 30;
      let index = 1;

      challan.items.forEach((item) => {
        doc
          .fontSize(9)
          .fillColor('#334155')
          .text(String(index++), 55, y)
          .text(`${item.productName} (${item.sku})`, 85, y, { width: 240 })
          .text(item.unitPrice.toFixed(2), 330, y, { width: 70, align: 'right' })
          .text(String(item.quantity), 410, y, { width: 60, align: 'right' })
          .text(item.totalPrice.toFixed(2), 480, y, { width: 60, align: 'right' });

        y += 24;
      });

      doc.strokeColor('#e2e8f0').lineWidth(0.8).moveTo(50, y).lineTo(545, y).stroke();
      y += 15;

      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .fillColor('#0f172a')
        .text(`Total Dispatched Items: ${challan.totalQuantity} units`, 50, y)
        .text(`Total Value: INR ${challan.totalAmount.toFixed(2)}`, 350, y, { width: 190, align: 'right' });

      if (challan.notes) {
        y += 30;
        doc
          .font('Helvetica')
          .fontSize(9)
          .fillColor('#64748b')
          .text(`Notes: ${challan.notes}`, 50, y, { width: 495 });
      }

      // Signatures
      doc.font('Helvetica').fontSize(9).fillColor('#334155');
      doc.text('Prepared By: ' + challan.createdBy.name, 50, 700);
      doc.text('Authorized Warehouse Signatory: _________________', 300, 700);
      doc.text('Received in Good Condition (Receiver Sign): _________________', 50, 740);

      doc.end();
    });
  }
}
