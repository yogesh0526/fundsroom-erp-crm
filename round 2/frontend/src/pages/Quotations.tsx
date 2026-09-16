import React, { useState, useEffect } from 'react';
import { Quotation, Enquiry, QuotationStatus } from '../types';
import { apiService } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import {
  Plus,
  Search,
  Filter,
  Calendar,
  CheckCircle,
  RefreshCw,
  AlertCircle,
  ShoppingCart,
} from 'lucide-react';

interface QuotationsProps {
  initialEnquiryId?: string;
  onNavigateToOrders?: (orderId?: string) => void;
}

export const Quotations: React.FC<QuotationsProps> = ({
  initialEnquiryId,
  onNavigateToOrders,
}) => {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals & Details
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);

  // Create Form State
  const [enquiryId, setEnquiryId] = useState<string>('');
  const [validUntil, setValidUntil] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [formItems, setFormItems] = useState<
    {
      productId: string;
      productName: string;
      unit: string;
      quantity: number;
      unitPrice: number;
      discountPercent: number;
      gstPercent: number;
    }[]
  >([]);
  const [formError, setFormError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [quoteRes, enqRes] = await Promise.all([
        apiService.getQuotations(),
        apiService.getEnquiries(),
      ]);
      if (quoteRes.data?.success) setQuotations(quoteRes.data.data);
      if (enqRes.data?.success) setEnquiries(enqRes.data.data);
    } catch (err) {
      console.error('Failed to load quotations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const future = new Date();
    future.setDate(future.getDate() + 15);
    setValidUntil(future.toISOString().split('T')[0]);

    if (initialEnquiryId) {
      setEnquiryId(initialEnquiryId);
      setIsCreateModalOpen(true);
    }
  }, [initialEnquiryId]);

  // Auto-fill items when an enquiry is selected in the creation modal
  useEffect(() => {
    if (!enquiryId) {
      setFormItems([]);
      return;
    }
    const found = enquiries.find((e) => e.id === enquiryId);
    if (found && found.items) {
      const mapped = found.items.map((it) => ({
        productId: it.productId,
        productName: it.product?.productName || 'Industrial Product',
        unit: it.product?.unit || 'PCS',
        quantity: it.quantity,
        unitPrice: it.product?.basePrice || 1000,
        discountPercent: 0,
        gstPercent: 18,
      }));
      setFormItems(mapped);
    }
  }, [enquiryId, enquiries]);

  const handleItemValueChange = (index: number, field: string, val: number) => {
    const updated = [...formItems];
    (updated[index] as any)[field] = val;
    setFormItems(updated);
  };

  // Live client calculation preview for user convenience
  const livePreview = formItems.reduce(
    (acc, it) => {
      const base = it.quantity * it.unitPrice;
      const disc = (base * (it.discountPercent || 0)) / 100;
      const taxable = base - disc;
      const gst = (taxable * (it.gstPercent || 0)) / 100;
      const lineTotal = taxable + gst;

      acc.subtotal += base;
      acc.discount += disc;
      acc.gst += gst;
      acc.grandTotal += lineTotal;
      return acc;
    },
    { subtotal: 0, discount: 0, gst: 0, grandTotal: 0 }
  );

  const handleCreateQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enquiryId) {
      setFormError('Please choose an enquiry reference.');
      return;
    }
    if (formItems.length === 0) {
      setFormError('The quotation must contain at least one item.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');
    try {
      await apiService.createQuotation({
        enquiryId,
        validUntil: new Date(validUntil).toISOString(),
        notes,
        items: formItems.map((it) => ({
          productId: it.productId,
          quantity: Number(it.quantity),
          unitPrice: Number(it.unitPrice),
          discountPercent: Number(it.discountPercent || 0),
          gstPercent: Number(it.gstPercent || 18),
        })),
      });

      setIsCreateModalOpen(false);
      setEnquiryId('');
      setNotes('');
      await loadData();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to create quotation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusUpdate = async (quoteId: string, newStatus: QuotationStatus) => {
    try {
      await apiService.updateQuotationStatus(quoteId, newStatus);
      await loadData();
      if (selectedQuotation && selectedQuotation.id === quoteId) {
        setSelectedQuotation({ ...selectedQuotation, status: newStatus });
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update quotation status');
    }
  };

  const handleConvertToOrder = async (quote: Quotation) => {
    if (quote.status !== 'ACCEPTED') {
      alert('Only ACCEPTED quotations can be converted to a Sales Order.');
      return;
    }

    if (quote.salesOrder) {
      alert(`Quotation is already converted to Sales Order ${quote.salesOrder.orderNumber}.`);
      return;
    }

    try {
      const res = await apiService.convertToSalesOrder(quote.id);
      if (res.data?.success) {
        alert(
          `Success! Quotation ${quote.quotationNumber} converted to Sales Order ${res.data.data.orderNumber}.`
        );
        await loadData();
        if (onNavigateToOrders) {
          onNavigateToOrders(res.data.data.id);
        }
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to convert quotation into Sales Order');
    }
  };

  const filteredQuotations = quotations.filter((q) => {
    const matchesStatus = statusFilter === 'ALL' || q.status === statusFilter;
    const matchesSearch =
      q.quotationNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.customer?.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.enquiry?.enquiryNumber.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Commercial Quotations</h2>
          <p className="text-xs text-slate-500 mt-1">
            Compute itemized line amounts, discount tiers, and GST calculations with deterministic backend validation.
          </p>
        </div>
        <button
          onClick={() => {
            setEnquiryId('');
            setIsCreateModalOpen(true);
          }}
          className="inline-flex items-center px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm shadow-blue-500/20 transition"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Create Quotation
        </button>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by Quotation #, Customer, Enquiry #..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center space-x-2 w-full md:w-auto overflow-x-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          {['ALL', 'DRAFT', 'SENT', 'ACCEPTED', 'REJECTED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                statusFilter === st
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
          <button
            onClick={loadData}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition"
            title="Refresh List"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Quotations Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">Quotation Number</th>
                <th className="px-4 py-3">Customer & Enquiry Ref</th>
                <th className="px-4 py-3">Valid Until</th>
                <th className="px-4 py-3 text-right">Pricing (Base / GST / Total)</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Conversion Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredQuotations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400 text-xs">
                    No quotations found. Create one against an existing enquiry.
                  </td>
                </tr>
              ) : (
                filteredQuotations.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-xs">
                        {q.quotationNumber}
                      </span>
                      <div className="text-[10px] text-slate-400 mt-1">
                        By {q.createdBy?.name || 'Sales User'}
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <div className="font-semibold text-slate-900">{q.customer?.companyName}</div>
                      <div className="text-xs text-blue-600 font-mono">
                        Ref: {q.enquiry?.enquiryNumber || 'Direct'}
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <div className="text-xs text-slate-700 flex items-center">
                        <Calendar className="w-3 h-3 text-slate-400 mr-1" />
                        {new Date(q.validUntil).toLocaleDateString()}
                      </div>
                    </td>

                    <td className="px-4 py-4 text-right">
                      <div className="font-black text-slate-900 text-sm">
                        ₹{q.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Sub: ₹{q.subtotal.toLocaleString('en-IN')} | GST: ₹{q.totalGst.toLocaleString('en-IN')}
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <StatusBadge status={q.status} />
                    </td>

                    <td className="px-4 py-4">
                      {q.salesOrder ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                          <CheckCircle className="w-3 h-3 mr-1 text-emerald-500" />
                          {q.salesOrder.orderNumber}
                        </span>
                      ) : q.status === 'ACCEPTED' ? (
                        <button
                          onClick={() => handleConvertToOrder(q)}
                          className="inline-flex items-center px-2.5 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md shadow-xs transition"
                        >
                          <ShoppingCart className="w-3 h-3 mr-1" />
                          Convert to Order
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">
                          Needs ACCEPTED status
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-right space-x-1.5">
                      <button
                        onClick={() => setSelectedQuotation(q)}
                        className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded transition"
                      >
                        View
                      </button>

                      {/* Quick Status Changers */}
                      {q.status === 'DRAFT' && (
                        <button
                          onClick={() => handleStatusUpdate(q.id, 'SENT')}
                          className="px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded transition"
                          title="Mark as Sent to Customer"
                        >
                          Send
                        </button>
                      )}

                      {q.status === 'SENT' && (
                        <>
                          <button
                            onClick={() => handleStatusUpdate(q.id, 'ACCEPTED')}
                            className="px-2 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded transition"
                            title="Customer Accepted"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleStatusUpdate(q.id, 'REJECTED')}
                            className="px-2 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded transition"
                            title="Customer Rejected"
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Quotation Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Commercial Quotation"
        subtitle="Specify unit prices, discount percentage, and GST rates"
        maxWidth="max-w-4xl"
      >
        <form onSubmit={handleCreateQuotation} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Select Enquiry Reference
              </label>
              <select
                value={enquiryId}
                onChange={(e) => setEnquiryId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              >
                <option value="">-- Choose Enquiry --</option>
                {enquiries.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.enquiryNumber} - {e.customer?.companyName} ({e.items?.length} items)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Quotation Validity Expiry
              </label>
              <input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>
          </div>

          {/* Line Items Pricing Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Product Line Item Pricing
              </label>
              <span className="text-[11px] text-blue-600 font-medium">
                Base Amount = Qty × Price | Taxable = Base − Disc | Final = Taxable + GST
              </span>
            </div>

            {formItems.length === 0 ? (
              <div className="p-8 border border-dashed border-slate-300 rounded-lg text-center text-xs text-slate-400">
                Please select an enquiry above to load requested products.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-lg overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                    <tr>
                      <th className="px-3 py-2">Product</th>
                      <th className="px-2 py-2 w-16 text-right">Qty</th>
                      <th className="px-2 py-2 w-28 text-right">Unit Price (₹)</th>
                      <th className="px-2 py-2 w-20 text-right">Disc %</th>
                      <th className="px-2 py-2 w-20 text-right">GST %</th>
                      <th className="px-3 py-2 w-28 text-right">Line Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {formItems.map((item, idx) => {
                      const base = item.quantity * item.unitPrice;
                      const disc = (base * (item.discountPercent || 0)) / 100;
                      const taxable = base - disc;
                      const gst = (taxable * (item.gstPercent || 0)) / 100;
                      const lineTotal = taxable + gst;

                      return (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-3 py-2 font-medium text-slate-800">
                            {item.productName}
                            <span className="text-slate-400 block text-[10px]">
                              Unit: {item.unit}
                            </span>
                          </td>

                          <td className="px-2 py-2">
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) =>
                                handleItemValueChange(
                                  idx,
                                  'quantity',
                                  parseInt(e.target.value, 10) || 1
                                )
                              }
                              className="w-full px-2 py-1 text-right border border-slate-300 rounded bg-white"
                              required
                            />
                          </td>

                          <td className="px-2 py-2">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unitPrice}
                              onChange={(e) =>
                                handleItemValueChange(
                                  idx,
                                  'unitPrice',
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="w-full px-2 py-1 text-right border border-slate-300 rounded bg-white font-medium"
                              required
                            />
                          </td>

                          <td className="px-2 py-2">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.1"
                              value={item.discountPercent}
                              onChange={(e) =>
                                handleItemValueChange(
                                  idx,
                                  'discountPercent',
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="w-full px-2 py-1 text-right border border-slate-300 rounded bg-white text-rose-600"
                            />
                          </td>

                          <td className="px-2 py-2">
                            <input
                              type="number"
                              min="0"
                              step="0.5"
                              value={item.gstPercent}
                              onChange={(e) =>
                                handleItemValueChange(
                                  idx,
                                  'gstPercent',
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="w-full px-2 py-1 text-right border border-slate-300 rounded bg-white text-blue-600"
                            />
                          </td>

                          <td className="px-3 py-2 text-right font-bold text-slate-900">
                            ₹{lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pricing Totals Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center space-x-2 text-xs text-slate-500">
              <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <span>
                Backend will recalculate and validate all line totals, discounts, and GST before saving.
              </span>
            </div>

            <div className="w-full md:w-64 space-y-1 text-xs text-right">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal (Base):</span>
                <span>₹{livePreview.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-rose-600">
                <span>Total Discount:</span>
                <span>−₹{livePreview.discount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-blue-600">
                <span>GST Tax:</span>
                <span>+₹{livePreview.gst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-slate-900 font-black text-sm pt-1 border-t border-slate-200">
                <span>Grand Total:</span>
                <span>₹{livePreview.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Commercial Terms / Notes</label>
            <textarea
              rows={2}
              placeholder="Payment terms, warranty clauses, freight terms, etc."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            ></textarea>
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Generating Quotation...' : 'Create Quotation'}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Quotation Modal */}
      {selectedQuotation && (
        <Modal
          isOpen={!!selectedQuotation}
          onClose={() => setSelectedQuotation(null)}
          title={`Quotation ${selectedQuotation.quotationNumber}`}
          subtitle={`Customer: ${selectedQuotation.customer?.companyName} | Ref: ${selectedQuotation.enquiry?.enquiryNumber}`}
          maxWidth="max-w-3xl"
        >
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">Customer & City</span>
                <span className="font-bold text-slate-900 text-sm block">
                  {selectedQuotation.customer?.companyName}
                </span>
                <span className="text-slate-600">
                  {selectedQuotation.customer?.contactPerson} ({selectedQuotation.customer?.city})
                </span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 block mb-0.5">Status</span>
                <StatusBadge status={selectedQuotation.status} />
                <span className="text-slate-500 block text-[11px] mt-1">
                  Valid Until: {new Date(selectedQuotation.validUntil).toLocaleDateString()}
                </span>
              </div>
            </div>

            {selectedQuotation.salesOrder && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-xs text-emerald-800">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>
                    Converted to Sales Order <strong>{selectedQuotation.salesOrder.orderNumber}</strong> (Status: {selectedQuotation.salesOrder.status})
                  </span>
                </div>
                {onNavigateToOrders && (
                  <button
                    onClick={() => {
                      const id = selectedQuotation.salesOrder?.id;
                      setSelectedQuotation(null);
                      onNavigateToOrders(id);
                    }}
                    className="font-bold underline hover:text-emerald-900"
                  >
                    View Order →
                  </button>
                )}
              </div>
            )}

            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Itemized Breakdown
              </h4>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                    <tr>
                      <th className="px-4 py-2">Product</th>
                      <th className="px-2 py-2 text-right">Qty</th>
                      <th className="px-2 py-2 text-right">Unit Price</th>
                      <th className="px-2 py-2 text-right">Disc %</th>
                      <th className="px-2 py-2 text-right">GST %</th>
                      <th className="px-4 py-2 text-right">Line Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedQuotation.items?.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-2 font-medium text-slate-900">
                          {item.product?.productName}
                        </td>
                        <td className="px-2 py-2 text-right">{item.quantity}</td>
                        <td className="px-2 py-2 text-right">₹{item.unitPrice.toLocaleString('en-IN')}</td>
                        <td className="px-2 py-2 text-right text-rose-600">{item.discountPercent}%</td>
                        <td className="px-2 py-2 text-right text-blue-600">{item.gstPercent}%</td>
                        <td className="px-4 py-2 text-right font-bold text-slate-900">
                          ₹{item.lineAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 font-bold border-t border-slate-200 text-xs">
                    <tr>
                      <td colSpan={5} className="px-4 py-2 text-right text-slate-600">
                        Subtotal (Base):
                      </td>
                      <td className="px-4 py-2 text-right">
                        ₹{selectedQuotation.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={5} className="px-4 py-1 text-right text-rose-600">
                        Discount Deducted:
                      </td>
                      <td className="px-4 py-1 text-right text-rose-600">
                        −₹{selectedQuotation.totalDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={5} className="px-4 py-1 text-right text-blue-600">
                        Total GST:
                      </td>
                      <td className="px-4 py-1 text-right text-blue-600">
                        +₹{selectedQuotation.totalGst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr className="text-sm text-slate-900 bg-slate-100/80">
                      <td colSpan={5} className="px-4 py-2 text-right">
                        Grand Total:
                      </td>
                      <td className="px-4 py-2 text-right font-black">
                        ₹{selectedQuotation.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Actions Toolbar */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
              <div className="flex items-center space-x-2">
                <span className="text-slate-500 font-semibold">Change Status:</span>
                {(['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED'] as QuotationStatus[]).map((st) => (
                  <button
                    key={st}
                    onClick={() => handleStatusUpdate(selectedQuotation.id, st)}
                    disabled={selectedQuotation.status === st}
                    className={`px-2.5 py-1 rounded text-[10px] font-bold ${
                      selectedQuotation.status === st
                        ? 'bg-slate-300 text-slate-700 cursor-default'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>

              {!selectedQuotation.salesOrder && (
                <button
                  onClick={() => {
                    handleConvertToOrder(selectedQuotation);
                    setSelectedQuotation(null);
                  }}
                  disabled={selectedQuotation.status !== 'ACCEPTED'}
                  className="px-4 py-1.5 font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:hover:bg-emerald-600 rounded-lg transition inline-flex items-center"
                >
                  <ShoppingCart className="w-3.5 h-3.5 mr-1" />
                  Convert to Sales Order
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
