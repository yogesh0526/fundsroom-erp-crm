import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { customerApi } from '../services/api';
import { Customer, CustomerType, CustomerStatus } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  Search,
  Plus,
  Building,
  Phone,
  Mail,
  Edit2,
  Eye,
  Calendar,
  Filter,
} from 'lucide-react';

export const Customers: React.FC = () => {
  const navigate = useNavigate();
  const { hasRole } = useAuth();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form Fields
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    email: '',
    businessName: '',
    gstNumber: '',
    customerType: 'WHOLESALE' as CustomerType,
    address: '',
    status: 'ACTIVE' as CustomerStatus,
    followUpDate: '',
    notes: '',
  });

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const res = await customerApi.list({
        search: search || undefined,
        status: statusFilter || undefined,
        type: typeFilter || undefined,
        limit: 50,
      });
      setCustomers(res.data.data);
    } catch (err) {
      console.error('Failed to load customers', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      loadCustomers();
    }, 250);
    return () => clearTimeout(timeout);
  }, [search, statusFilter, typeFilter]);

  const handleOpenAddModal = () => {
    setEditingCustomer(null);
    setFormData({
      name: '',
      mobile: '',
      email: '',
      businessName: '',
      gstNumber: '',
      customerType: 'WHOLESALE',
      address: '',
      status: 'LEAD',
      followUpDate: '',
      notes: '',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (c: Customer, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCustomer(c);
    setFormData({
      name: c.name,
      mobile: c.mobile,
      email: c.email,
      businessName: c.businessName,
      gstNumber: c.gstNumber || '',
      customerType: c.customerType,
      address: c.address,
      status: c.status,
      followUpDate: c.followUpDate ? c.followUpDate.split('T')[0] : '',
      notes: c.notes || '',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);

    const payload = {
      ...formData,
      gstNumber: formData.gstNumber || null,
      followUpDate: formData.followUpDate ? new Date(formData.followUpDate).toISOString() : null,
      notes: formData.notes || null,
    };

    try {
      if (editingCustomer) {
        await customerApi.update(editingCustomer.id, payload);
      } else {
        await customerApi.create(payload);
      }
      setIsModalOpen(false);
      loadCustomers();
    } catch (err: any) {
      setFormError(
        err.response?.data?.message ||
          (err.response?.data?.errors
            ? err.response.data.errors.map((x: any) => x.message).join(', ')
            : 'Failed to save customer')
      );
    } finally {
      setFormLoading(false);
    }
  };

  const canEdit = hasRole('SALES', 'ADMIN');

  return (
    <Layout
      title="Customer Relationship Management (CRM)"
      subtitle="Manage wholesale buyers, distributors, GST profiles, and sales follow-ups"
    >
      {/* Search & Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex flex-wrap items-center gap-3 flex-1 max-w-2xl">
          {/* Search */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by customer name, company, email, mobile..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-sm"
            />
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-sm text-xs">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-transparent text-xs text-slate-700 font-medium focus:outline-none"
            >
              <option value="">All Types</option>
              <option value="RETAIL">Retail</option>
              <option value="WHOLESALE">Wholesale</option>
              <option value="DISTRIBUTOR">Distributor</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-sm text-xs">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-xs text-slate-700 font-medium focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="LEAD">Lead</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        </div>

        {canEdit && (
          <button
            onClick={handleOpenAddModal}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold shadow-sm transition shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Add Customer</span>
          </button>
        )}
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200/80 uppercase">
              <tr>
                <th className="py-3.5 px-4">Customer / Contact</th>
                <th className="py-3.5 px-4">Business & GSTIN</th>
                <th className="py-3.5 px-4">Customer Type</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Follow-Up Date</th>
                <th className="py-3.5 px-4">Challans</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Loading customer directory...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No customers found matching the search criteria.
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => navigate(`/customers/${c.id}`)}
                    className="hover:bg-slate-50/80 cursor-pointer transition"
                  >
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900">{c.name}</p>
                      <div className="flex items-center gap-3 mt-1 text-slate-500 text-[11px]">
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3 text-slate-400" /> {c.mobile}
                        </span>
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3 text-slate-400" /> {c.email}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-medium text-slate-800 flex items-center gap-1.5">
                        <Building className="h-3.5 w-3.5 text-slate-400" />
                        {c.businessName}
                      </p>
                      <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                        GST: {c.gstNumber || 'None (Consumer)'}
                      </p>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px]">
                        {c.customerType}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="py-3.5 px-4">
                      {c.followUpDate ? (
                        <span className="flex items-center gap-1 text-slate-700 font-medium">
                          <Calendar className="h-3.5 w-3.5 text-sky-500" />
                          {new Date(c.followUpDate).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">None set</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-700">
                      {c._count?.challans || 0}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/customers/${c.id}`);
                          }}
                          title="View Customer Profile"
                          className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {canEdit && (
                          <button
                            onClick={(e) => handleOpenEditModal(c, e)}
                            title="Edit Customer"
                            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Customer Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCustomer ? 'Edit Customer Information' : 'Add New Wholesale / Retail Customer'}
        maxWidth="2xl"
      >
        {formError && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
            {formError}
          </div>
        )}

        <form onSubmit={handleSaveCustomer} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Contact Person / Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Ramesh Patel"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Business / Company Name *
              </label>
              <input
                type="text"
                required
                value={formData.businessName}
                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                placeholder="e.g. Patel Industrial Supplies"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Mobile Number *
              </label>
              <input
                type="text"
                required
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                placeholder="+91 98234 56789"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="contact@company.com"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                GST Number (Optional)
              </label>
              <input
                type="text"
                value={formData.gstNumber}
                onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value.toUpperCase() })}
                placeholder="27AABCA1234F1Z5"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono uppercase focus:ring-2 focus:ring-sky-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Customer Type *
              </label>
              <select
                value={formData.customerType}
                onChange={(e) => setFormData({ ...formData, customerType: e.target.value as CustomerType })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:bg-white font-medium"
              >
                <option value="RETAIL">Retail</option>
                <option value="WHOLESALE">Wholesale</option>
                <option value="DISTRIBUTOR">Distributor</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Lead / Account Status *
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as CustomerStatus })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:bg-white font-medium"
              >
                <option value="LEAD">Lead (Prospect)</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Next Follow-Up Date (Optional)
              </label>
              <input
                type="date"
                value={formData.followUpDate}
                onChange={(e) => setFormData({ ...formData, followUpDate: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Billing & Delivery Address *
            </label>
            <textarea
              rows={2}
              required
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Building, Street, Industrial Area, City, State, PIN..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:bg-white"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              General Internal Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Commercial terms, special freight notes, contact preferences..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:bg-white"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formLoading}
              className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold transition disabled:opacity-50"
            >
              {formLoading ? 'Saving...' : editingCustomer ? 'Update Customer' : 'Create Customer'}
            </button>
          </div>
        </form>
      </Modal>
    </Layout>
  );
};
