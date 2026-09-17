import React, { useState, useEffect } from 'react';
import { Enquiry, Customer, Product, EnquiryStatus } from '../types';
import { apiService } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import {
  Plus,
  Search,
  Filter,
  Trash2,
  Calendar,
  ArrowRight,
  RefreshCw,
  UserPlus,
} from 'lucide-react';

interface EnquiriesProps {
  onNavigateToQuote?: (enquiryId: string) => void;
}

export const Enquiries: React.FC<EnquiriesProps> = ({ onNavigateToQuote }) => {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState<boolean>(false);
  const [selectedEnquiry, setSelectedEnquiry] = useState<Enquiry | null>(null);

  // New Enquiry Form State
  const [customerId, setCustomerId] = useState<string>('');
  const [requiredDate, setRequiredDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [items, setItems] = useState<{ productId: string; quantity: number; notes: string }[]>([
    { productId: '', quantity: 10, notes: '' },
  ]);
  const [formError, setFormError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // New Customer Form State
  const [companyName, setCompanyName] = useState<string>('');
  const [contactPerson, setContactPerson] = useState<string>('');
  const [mobile, setMobile] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [city, setCity] = useState<string>('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [enqRes, custRes, prodRes] = await Promise.all([
        apiService.getEnquiries(),
        apiService.getCustomers(),
        apiService.getProducts(),
      ]);

      if (enqRes.data?.success) setEnquiries(enqRes.data.data);
      if (custRes.data?.success) setCustomers(custRes.data.data);
      if (prodRes.data?.success) setProducts(prodRes.data.data);
    } catch (err) {
      console.error('Failed to load enquiries data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Default required date to 14 days from now
    const future = new Date();
    future.setDate(future.getDate() + 14);
    setRequiredDate(future.toISOString().split('T')[0]);
  }, []);

  const handleAddItemRow = () => {
    setItems([...items, { productId: '', quantity: 1, notes: '' }]);
  };

  const handleRemoveItemRow = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const updated = [...items];
    (updated[index] as any)[field] = value;
    setItems(updated);
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiService.createCustomer({
        companyName,
        contactPerson,
        mobile,
        email,
        city,
      });
      if (res.data?.success) {
        setCustomers([...customers, res.data.data]);
        setCustomerId(res.data.data.id);
        setIsCustomerModalOpen(false);
        setCompanyName('');
        setContactPerson('');
        setMobile('');
        setEmail('');
        setCity('');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create customer');
    }
  };

  const handleCreateEnquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) {
      setFormError('Please select a customer.');
      return;
    }

    const validItems = items.filter((i) => i.productId && i.quantity > 0);
    if (validItems.length === 0) {
      setFormError('Please add at least one product with quantity.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');
    try {
      await apiService.createEnquiry({
        customerId,
        requiredDate: new Date(requiredDate).toISOString(),
        notes,
        items: validItems.map((i) => ({
          productId: i.productId,
          quantity: Number(i.quantity),
          notes: i.notes,
        })),
      });

      setIsCreateModalOpen(false);
      setNotes('');
      setItems([{ productId: '', quantity: 10, notes: '' }]);
      await loadData();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to create enquiry');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (enquiryId: string, newStatus: EnquiryStatus) => {
    try {
      await apiService.updateEnquiryStatus(enquiryId, newStatus);
      await loadData();
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const filteredEnquiries = enquiries.filter((enq) => {
    const matchesStatus = statusFilter === 'ALL' || enq.status === statusFilter;
    const matchesSearch =
      enq.enquiryNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      enq.customer?.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      enq.customer?.city.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Customer Enquiries</h2>
          <p className="text-xs text-slate-500 mt-1">
            Capture prospective business leads with multi-product specifications and target fulfillment dates.
          </p>
        </div>
        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => setIsCustomerModalOpen(true)}
            className="inline-flex items-center px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
          >
            <UserPlus className="w-3.5 h-3.5 mr-1.5" />
            Add Customer
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm shadow-blue-500/20 transition"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            New Enquiry
          </button>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by Enquiry #, Customer, City..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center space-x-2 w-full md:w-auto overflow-x-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          {['ALL', 'NEW', 'QUOTED', 'WON', 'LOST'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                statusFilter === status
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {status}
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

      {/* Enquiries Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">Enquiry Number</th>
                <th className="px-4 py-3">Customer Details</th>
                <th className="px-4 py-3">Enquiry / Required Date</th>
                <th className="px-4 py-3">Products & Quantities</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEnquiries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400 text-xs">
                    No enquiries found. Click "+ New Enquiry" to create one.
                  </td>
                </tr>
              ) : (
                filteredEnquiries.map((enq) => (
                  <tr key={enq.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-xs">
                        {enq.enquiryNumber}
                      </span>
                      <div className="text-[10px] text-slate-400 mt-1">
                        By {enq.createdBy?.name || 'Sales User'}
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <div className="font-semibold text-slate-900">{enq.customer?.companyName}</div>
                      <div className="text-xs text-slate-500">
                        {enq.customer?.contactPerson} • {enq.customer?.city}
                      </div>
                      <div className="text-[10px] text-slate-400">{enq.customer?.mobile}</div>
                    </td>

                    <td className="px-4 py-4">
                      <div className="text-xs text-slate-700 flex items-center">
                        <Calendar className="w-3 h-3 text-slate-400 mr-1" />
                        {new Date(enq.enquiryDate).toLocaleDateString()}
                      </div>
                      <div className="text-[11px] text-amber-700 font-medium mt-0.5">
                        Due: {new Date(enq.requiredDate).toLocaleDateString()}
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <div className="space-y-1">
                        {enq.items?.slice(0, 2).map((item) => (
                          <div key={item.id} className="text-xs flex items-center space-x-1">
                            <span className="font-bold text-slate-800">{item.quantity}×</span>
                            <span className="text-slate-600 truncate max-w-[180px]">
                              {item.product?.productName}
                            </span>
                          </div>
                        ))}
                        {enq.items?.length > 2 && (
                          <span className="text-[10px] font-medium text-blue-600">
                            +{enq.items.length - 2} more products
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <StatusBadge status={enq.status} />
                    </td>

                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => setSelectedEnquiry(enq)}
                        className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded transition"
                      >
                        View
                      </button>

                      {onNavigateToQuote && (
                        <button
                          onClick={() => onNavigateToQuote(enq.id)}
                          className="px-3 py-1 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded transition inline-flex items-center"
                        >
                          <span>Quote</span>
                          <ArrowRight className="w-3 h-3 ml-1" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Enquiry Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Customer Enquiry"
        subtitle="Specify business customer, products, and required delivery timeline"
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleCreateEnquiry} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">Customer</label>
                <button
                  type="button"
                  onClick={() => setIsCustomerModalOpen(true)}
                  className="text-[11px] text-blue-600 hover:underline flex items-center"
                >
                  <Plus className="w-3 h-3 mr-0.5" /> New Customer
                </button>
              </div>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              >
                <option value="">-- Select Customer --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.companyName} ({c.city}) - {c.contactPerson}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Required Delivery Date
              </label>
              <input
                type="date"
                value={requiredDate}
                onChange={(e) => setRequiredDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>
          </div>

          {/* Product Items Section */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Requested Industrial Products
              </label>
              <button
                type="button"
                onClick={handleAddItemRow}
                className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 border border-blue-200 rounded-md transition flex items-center"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Product Row
              </button>
            </div>

            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
              {items.map((row, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                >
                  <div className="flex-1">
                    <select
                      value={row.productId}
                      onChange={(e) => handleItemChange(idx, 'productId', e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md bg-white focus:ring-1 focus:ring-blue-500"
                      required
                    >
                      <option value="">-- Select Product --</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.productCode} - {p.productName} ({p.unit})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="w-24">
                    <input
                      type="number"
                      min="1"
                      placeholder="Qty"
                      value={row.quantity}
                      onChange={(e) =>
                        handleItemChange(idx, 'quantity', parseInt(e.target.value, 10) || 1)
                      }
                      className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-md bg-white focus:ring-1 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div className="w-36">
                    <input
                      type="text"
                      placeholder="Specifications / Notes"
                      value={row.notes}
                      onChange={(e) => handleItemChange(idx, 'notes', e.target.value)}
                      className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-md bg-white focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveItemRow(idx)}
                    disabled={items.length === 1}
                    className="p-1.5 text-slate-400 hover:text-rose-600 disabled:opacity-30 rounded transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Enquiry Notes</label>
            <textarea
              rows={2}
              placeholder="Commercial or delivery conditions, plant location, etc."
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
              {isSubmitting ? 'Saving Enquiry...' : 'Save Enquiry'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Quick Add Customer Modal */}
      <Modal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        title="Add Business Customer"
        subtitle="Create customer master profile for enquiries and billing"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateCustomer} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Company Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Bharat Heavy Industries Ltd."
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Person</label>
            <input
              type="text"
              required
              placeholder="e.g. Ramesh Chandra"
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile</label>
              <input
                type="text"
                required
                placeholder="e.g. 9822012345"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
              <input
                type="text"
                required
                placeholder="e.g. Pune"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
            <input
              type="email"
              required
              placeholder="e.g. procurement@bharathindustries.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCustomerModalOpen(false)}
              className="px-3 py-1.5 text-xs text-slate-600 bg-white border border-slate-300 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              Save Customer
            </button>
          </div>
        </form>
      </Modal>

      {/* View Enquiry Details Modal */}
      {selectedEnquiry && (
        <Modal
          isOpen={!!selectedEnquiry}
          onClose={() => setSelectedEnquiry(null)}
          title={`Enquiry ${selectedEnquiry.enquiryNumber}`}
          subtitle={`Created on ${new Date(selectedEnquiry.enquiryDate).toLocaleDateString()}`}
        >
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">Customer</span>
                <span className="font-bold text-slate-900 text-sm block">
                  {selectedEnquiry.customer?.companyName}
                </span>
                <span className="text-slate-600">
                  {selectedEnquiry.customer?.contactPerson} ({selectedEnquiry.customer?.city})
                </span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 block mb-0.5">Status</span>
                <StatusBadge status={selectedEnquiry.status} />
                <span className="text-amber-700 font-medium block mt-1">
                  Required By: {new Date(selectedEnquiry.requiredDate).toLocaleDateString()}
                </span>
              </div>
            </div>

            {selectedEnquiry.notes && (
              <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-lg text-xs text-slate-700">
                <span className="font-bold text-blue-900">Notes: </span>
                {selectedEnquiry.notes}
              </div>
            )}

            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Enquiry Line Items ({selectedEnquiry.items?.length})
              </h4>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                    <tr>
                      <th className="px-4 py-2">Product Code & Name</th>
                      <th className="px-4 py-2 text-right">Quantity</th>
                      <th className="px-4 py-2">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedEnquiry.items?.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-2 font-medium text-slate-900">
                          {item.product?.productCode} - {item.product?.productName}
                        </td>
                        <td className="px-4 py-2 text-right font-bold text-slate-800">
                          {item.quantity} {item.product?.unit}
                        </td>
                        <td className="px-4 py-2 text-slate-500">{item.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
              <div className="flex items-center space-x-1.5">
                <span className="text-slate-500 font-semibold">Change Status:</span>
                {(['NEW', 'QUOTED', 'WON', 'LOST'] as EnquiryStatus[]).map((st) => (
                  <button
                    key={st}
                    onClick={() => {
                      handleStatusChange(selectedEnquiry.id, st);
                      setSelectedEnquiry(null);
                    }}
                    disabled={selectedEnquiry.status === st}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      selectedEnquiry.status === st
                        ? 'bg-slate-300 text-slate-700 cursor-default'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>

              {onNavigateToQuote && (
                <button
                  onClick={() => {
                    const id = selectedEnquiry.id;
                    setSelectedEnquiry(null);
                    onNavigateToQuote(id);
                  }}
                  className="px-4 py-1.5 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition"
                >
                  Generate Quotation
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
