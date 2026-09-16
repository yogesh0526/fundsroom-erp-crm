import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { StatusBadge } from '../components/StatusBadge';
import { challanApi, invoiceApi } from '../services/api';
import { Challan } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  ArrowLeft,
  Download,
  Building2,
  Calendar,
  CheckCircle,
  XCircle,
  FileSpreadsheet,
  Receipt,
  AlertTriangle,
  User,
} from 'lucide-react';

export const ChallanDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasRole } = useAuth();

  const [challan, setChallan] = useState<Challan | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadChallan = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await challanApi.getById(id);
      setChallan(res.data.data);
    } catch (err) {
      console.error('Failed to load challan detail', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChallan();
  }, [id]);

  const handleUpdateStatus = async (newStatus: 'CONFIRMED' | 'CANCELLED') => {
    if (!id) return;
    const confirmMsg =
      newStatus === 'CONFIRMED'
        ? 'Confirming this challan will immediately deduct the items from warehouse inventory. Proceed?'
        : 'Cancelling this challan will return all dispatched items back into warehouse stock. Proceed?';

    if (!window.confirm(confirmMsg)) return;

    setActionLoading(true);
    setActionError(null);
    try {
      await challanApi.updateStatus(id, newStatus);
      loadChallan();
    } catch (err: any) {
      setActionError(
        err.response?.data?.message || 'Failed to update challan status'
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleGenerateInvoice = async () => {
    if (!id) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await invoiceApi.generate(id);
      navigate('/invoices');
    } catch (err: any) {
      setActionError(
        err.response?.data?.message || 'Failed to generate invoice'
      );
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout title="Challan Details">
        <div className="p-12 text-center text-slate-400">Loading sales challan...</div>
      </Layout>
    );
  }

  if (!challan) {
    return (
      <Layout title="Challan Not Found">
        <div className="p-12 text-center text-slate-500">
          <p>Sales challan not found.</p>
          <button
            onClick={() => navigate('/challans')}
            className="mt-4 px-4 py-2 bg-sky-600 text-white rounded-xl text-xs font-semibold"
          >
            Back to Challans
          </button>
        </div>
      </Layout>
    );
  }

  const customerSnap = challan.customerSnapshot || challan.customer;
  const canConfirm =
    challan.status === 'DRAFT' && hasRole('SALES', 'WAREHOUSE', 'ADMIN');
  const canCancel =
    challan.status !== 'CANCELLED' && hasRole('ADMIN', 'SALES');
  const canGenerateInvoice =
    challan.status === 'CONFIRMED' && !challan.invoice && hasRole('ACCOUNTS', 'ADMIN');

  return (
    <Layout
      title={`Sales Challan: ${challan.challanNumber}`}
      subtitle={`Created on ${new Date(challan.createdAt).toLocaleDateString()} by ${challan.createdBy?.name || 'Sales'}`}
    >
      {/* Top Back & Actions Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <button
          onClick={() => navigate('/challans')}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Sales Challans</span>
        </button>

        <div className="flex flex-wrap items-center gap-2.5">
          <a
            href={challanApi.downloadPdfUrl(challan.id)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold shadow-sm transition"
          >
            <Download className="h-4 w-4 text-sky-600" />
            <span>Download Challan PDF</span>
          </a>

          {canGenerateInvoice && (
            <button
              onClick={handleGenerateInvoice}
              disabled={actionLoading}
              className="flex items-center gap-2 px-3.5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold shadow-sm transition disabled:opacity-50"
            >
              <Receipt className="h-4 w-4" />
              <span>Generate Invoice</span>
            </button>
          )}

          {canConfirm && (
            <button
              onClick={() => handleUpdateStatus('CONFIRMED')}
              disabled={actionLoading}
              className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-sm transition disabled:opacity-50"
            >
              <CheckCircle className="h-4 w-4" />
              <span>Confirm & Deduct Stock</span>
            </button>
          )}

          {canCancel && (
            <button
              onClick={() => handleUpdateStatus('CANCELLED')}
              disabled={actionLoading}
              className="flex items-center gap-2 px-3.5 py-2 border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-semibold transition disabled:opacity-50"
            >
              <XCircle className="h-4 w-4" />
              <span>Cancel Challan</span>
            </button>
          )}
        </div>
      </div>

      {actionError && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Invoice Generated Alert Pill */}
      {challan.invoice && (
        <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-emerald-600" />
            <span>
              Invoice <strong>{challan.invoice.invoiceNumber}</strong> has been generated for this challan (Total: ₹{challan.invoice.totalAmount.toLocaleString()})
            </span>
          </div>
          <a
            href={invoiceApi.downloadPdfUrl(challan.invoice.id)}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-500 transition text-[11px]"
          >
            Download Tax Invoice PDF
          </a>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Product Snapshot Items Table */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Dispatched Items Snapshot</h3>
                <p className="text-xs text-slate-500">
                  Data frozen at creation time (immune to future catalog price changes)
                </p>
              </div>
              <StatusBadge status={challan.status} />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold uppercase">
                  <tr>
                    <th className="py-2.5 px-3 rounded-l-lg">Sr.</th>
                    <th className="py-2.5 px-3">Product Name & SKU</th>
                    <th className="py-2.5 px-3 text-right">Unit Price</th>
                    <th className="py-2.5 px-3 text-right">Dispatched Qty</th>
                    <th className="py-2.5 px-3 text-right rounded-r-lg">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {challan.items?.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-3 text-slate-400 font-mono">{idx + 1}</td>
                      <td className="py-3 px-3">
                        <p className="font-bold text-slate-900">{item.productName}</p>
                        <p className="font-mono text-[11px] text-sky-700">{item.sku}</p>
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-700">
                        ₹{item.unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-slate-900">
                        {item.quantity} units
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                        ₹{item.totalPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200">
                    <td colSpan={3} className="py-3 px-3 font-bold text-slate-800 text-right">
                      Grand Total ({challan.totalQuantity} units):
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900">
                      {challan.totalQuantity} units
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-sky-700 text-sm">
                      ₹{challan.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {challan.notes && (
              <div className="mt-6 p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600">
                <span className="font-bold text-slate-800">Dispatch Notes:</span> {challan.notes}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Customer & Audit Snapshot */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
            <h3 className="font-bold text-slate-900 text-sm mb-4 pb-3 border-b border-slate-100 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-sky-600" />
              <span>Consignee Details (Snapshot)</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <p className="font-bold text-slate-900 text-sm">{customerSnap?.name}</p>
                <p className="font-medium text-slate-600">{customerSnap?.businessName}</p>
              </div>

              <div>
                <p className="font-semibold text-slate-500">Delivery Address:</p>
                <p className="text-slate-700 mt-0.5 leading-relaxed">{customerSnap?.address}</p>
              </div>

              <div>
                <p className="font-semibold text-slate-500">GSTIN:</p>
                <p className="font-mono text-slate-800 font-semibold">
                  {customerSnap?.gstNumber || 'Consumer / Unregistered'}
                </p>
              </div>

              <div>
                <p className="font-semibold text-slate-500">Contact Details:</p>
                <p className="text-slate-700">{customerSnap?.mobile} | {customerSnap?.email}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
            <h3 className="font-bold text-slate-900 text-sm mb-3 pb-2 border-b border-slate-100">
              Challan Audit Info
            </h3>
            <div className="space-y-2 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Challan ID:</span>
                <span className="font-mono text-slate-800">{challan.id.slice(0, 8)}...</span>
              </div>
              <div className="flex justify-between">
                <span>Status:</span>
                <StatusBadge status={challan.status} />
              </div>
              <div className="flex justify-between">
                <span>Created By:</span>
                <span className="font-semibold text-slate-800">
                  {challan.createdBy?.name || 'Operations'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Created At:</span>
                <span>{new Date(challan.createdAt).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};
