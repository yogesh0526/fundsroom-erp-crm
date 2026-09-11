import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { StatusBadge } from '../components/StatusBadge';
import { invoiceApi } from '../services/api';
import { Invoice } from '../types';
import {
  Search,
  Download,
  Receipt,
  FileSpreadsheet,
  Calendar,
  Filter,
} from 'lucide-react';

export const Invoices: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const res = await invoiceApi.list({
        search: search || undefined,
        status: statusFilter || undefined,
        limit: 50,
      });
      setInvoices(res.data.data);
    } catch (err) {
      console.error('Failed to load invoices', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadInvoices();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, statusFilter]);

  return (
    <Layout
      title="Invoices & Commercial Billing (GST)"
      subtitle="Issue GST tax invoices from confirmed sales challans, track payment statuses, and export PDFs"
    >
      {/* Top Search & Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex flex-wrap items-center gap-3 flex-1 max-w-2xl">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by invoice #, ref challan #..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-sm"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-sm text-xs">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-xs text-slate-700 font-medium focus:outline-none"
            >
              <option value="">All Invoices</option>
              <option value="ISSUED">Issued</option>
              <option value="PAID">Paid</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200/80 uppercase">
              <tr>
                <th className="py-3.5 px-4">Invoice #</th>
                <th className="py-3.5 px-4">Ref Challan #</th>
                <th className="py-3.5 px-4">Customer Entity</th>
                <th className="py-3.5 px-4 text-right">Subtotal (₹)</th>
                <th className="py-3.5 px-4 text-right">GST (18%)</th>
                <th className="py-3.5 px-4 text-right">Grand Total (₹)</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Invoice Date</th>
                <th className="py-3.5 px-4 text-right">Download</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Loading commercial invoices...
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No invoices found. Generate an invoice from any Confirmed Sales Challan.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-sky-700">
                      {inv.invoiceNumber}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">
                      {inv.challan?.challanNumber}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      {inv.challan?.customer?.name || inv.challan?.customerSnapshot?.name}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-600">
                      ₹{inv.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-amber-700 font-medium">
                      ₹{inv.taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 text-sm">
                      ₹{inv.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={inv.status} />
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        {new Date(inv.createdAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <a
                        href={invoiceApi.downloadPdfUrl(inv.id)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 font-semibold text-xs transition"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>PDF</span>
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
};
