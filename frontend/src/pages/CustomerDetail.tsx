import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { StatusBadge } from '../components/StatusBadge';
import { customerApi } from '../services/api';
import { Customer } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  ArrowLeft,
  Building2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  PlusCircle,
  FileSpreadsheet,
  MessageSquare,
  User,
} from 'lucide-react';

export const CustomerDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasRole } = useAuth();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  // Follow-up form state
  const [newNote, setNewNote] = useState('');
  const [nextFollowUpDate, setNextFollowUpDate] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);

  const loadCustomer = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await customerApi.getById(id);
      setCustomer(res.data.data);
    } catch (err) {
      console.error('Failed to fetch customer profile', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomer();
  }, [id]);

  const handleAddFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !newNote.trim()) return;

    setSubmittingNote(true);
    setNoteError(null);
    try {
      await customerApi.addFollowUp(id, {
        note: newNote.trim(),
        nextFollowUpDate: nextFollowUpDate ? new Date(nextFollowUpDate).toISOString() : null,
      });
      setNewNote('');
      setNextFollowUpDate('');
      loadCustomer();
    } catch (err: any) {
      setNoteError(err.response?.data?.message || 'Failed to record follow-up note');
    } finally {
      setSubmittingNote(false);
    }
  };

  if (loading) {
    return (
      <Layout title="Customer Detail">
        <div className="p-12 text-center text-slate-400">Loading customer profile...</div>
      </Layout>
    );
  }

  if (!customer) {
    return (
      <Layout title="Customer Not Found">
        <div className="p-12 text-center text-slate-500">
          <p>The requested customer profile does not exist.</p>
          <button
            onClick={() => navigate('/customers')}
            className="mt-4 px-4 py-2 bg-sky-600 text-white rounded-xl text-xs font-semibold"
          >
            Back to Directory
          </button>
        </div>
      </Layout>
    );
  }

  const canAddNote = hasRole('SALES', 'ADMIN');

  return (
    <Layout
      title={customer.name}
      subtitle={`CRM Account Profile - ${customer.businessName}`}
    >
      {/* Back button */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/customers')}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Customers</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Customer Details Card */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {customer.customerType} CLIENT
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-0.5">{customer.name}</h3>
              </div>
              <StatusBadge status={customer.status} />
            </div>

            <div className="mt-5 space-y-3.5 text-xs">
              <div className="flex items-start gap-3">
                <Building2 className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-700">Business / Entity</p>
                  <p className="text-slate-600">{customer.businessName}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-700">Mobile Contact</p>
                  <p className="text-slate-600">{customer.mobile}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-700">Email Address</p>
                  <p className="text-slate-600">{customer.email}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-700">Address</p>
                  <p className="text-slate-600 leading-relaxed">{customer.address}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="h-4 w-4 flex items-center justify-center font-mono text-[10px] font-bold text-slate-400 shrink-0 mt-0.5">
                  GST
                </div>
                <div>
                  <p className="font-semibold text-slate-700">GST Identification</p>
                  <p className="text-slate-600 font-mono">{customer.gstNumber || 'Unregistered'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-700">Next Scheduled Follow-up</p>
                  <p className="text-slate-600 font-medium">
                    {customer.followUpDate
                      ? new Date(customer.followUpDate).toLocaleDateString()
                      : 'No pending follow-up date'}
                  </p>
                </div>
              </div>
            </div>

            {customer.notes && (
              <div className="mt-5 p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600">
                <p className="font-bold text-slate-700 mb-1">Account Notes:</p>
                <p className="italic">{customer.notes}</p>
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-slate-100">
              <button
                onClick={() => navigate(`/challans/create?customer=${customer.id}`)}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-sm transition"
              >
                <PlusCircle className="h-4 w-4" />
                <span>Create Sales Challan for Client</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column (2 Cols): Follow-up Timeline & Challan History */}
        <div className="lg:col-span-2 space-y-8">
          {/* Add Follow-Up Note Card */}
          {canAddNote && (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="h-4 w-4 text-sky-600" />
                <h4 className="font-bold text-slate-900 text-sm">Add CRM Follow-Up Note</h4>
              </div>

              {noteError && (
                <div className="mb-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
                  {noteError}
                </div>
              )}

              <form onSubmit={handleAddFollowUp} className="space-y-3 text-xs">
                <textarea
                  rows={2}
                  required
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Record customer communication, inquiry, quotation feedback, or discussion points..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:bg-white"
                />

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <label className="font-medium text-slate-600">Next Follow-Up Date:</label>
                    <input
                      type="date"
                      value={nextFollowUpDate}
                      onChange={(e) => setNextFollowUpDate(e.target.value)}
                      className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submittingNote}
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-xl text-xs shadow-sm transition disabled:opacity-50"
                  >
                    {submittingNote ? 'Saving...' : 'Post Follow-Up Note'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Follow-up Notes Timeline */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
            <h4 className="font-bold text-slate-900 text-sm mb-4 flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-500" />
              <span>Follow-Up Interaction History</span>
            </h4>

            {(!customer.followUps || customer.followUps.length === 0) ? (
              <p className="text-xs text-slate-400 italic py-4">
                No follow-up notes logged for this customer yet.
              </p>
            ) : (
              <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {customer.followUps.map((fu) => (
                  <div key={fu.id} className="relative text-xs">
                    <div className="absolute -left-6 top-1 h-3 w-3 rounded-full border-2 border-white bg-sky-500 ring-2 ring-sky-100" />
                    <div className="flex items-center gap-2 text-slate-400 text-[11px] mb-1">
                      <span className="font-semibold text-slate-700 flex items-center gap-1">
                        <User className="h-3 w-3 text-slate-400" />
                        {fu.createdBy?.name || 'Sales Rep'}
                      </span>
                      <span>•</span>
                      <span>{new Date(fu.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-slate-700 leading-relaxed">
                      {fu.note}
                    </div>
                    {fu.nextFollowUpDate && (
                      <p className="mt-1 text-[11px] text-sky-600 font-medium">
                        Next action scheduled for:{' '}
                        {new Date(fu.nextFollowUpDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Order / Challan History Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
            <h4 className="font-bold text-slate-900 text-sm mb-4 flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-slate-500" />
              <span>Sales Challan History</span>
            </h4>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase font-semibold">
                  <tr>
                    <th className="py-2.5 px-3 rounded-l-lg">Challan #</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Total Qty</th>
                    <th className="py-2.5 px-3">Value</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right rounded-r-lg">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(!customer.challans || customer.challans.length === 0) ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-400">
                        No sales challans created for this customer yet.
                      </td>
                    </tr>
                  ) : (
                    customer.challans.map((ch: any) => (
                      <tr key={ch.id} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-3 font-mono font-semibold text-sky-700">
                          {ch.challanNumber}
                        </td>
                        <td className="py-3 px-3 text-slate-500">
                          {new Date(ch.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-3 text-slate-700 font-medium">
                          {ch.totalQuantity} pcs
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-900">
                          ₹{ch.totalAmount.toLocaleString()}
                        </td>
                        <td className="py-3 px-3">
                          <StatusBadge status={ch.status} />
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => navigate(`/challans/${ch.id}`)}
                            className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 font-medium text-[11px]"
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};
