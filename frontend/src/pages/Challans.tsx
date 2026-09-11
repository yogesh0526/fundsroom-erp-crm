import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { StatusBadge } from '../components/StatusBadge';
import { challanApi } from '../services/api';
import { Challan, ChallanStatus } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  Search,
  Plus,
  FileSpreadsheet,
  Download,
  Eye,
  Calendar,
  Layers,
  ArrowRight,
} from 'lucide-react';

export const Challans: React.FC = () => {
  const navigate = useNavigate();
  const { hasRole } = useAuth();

  const [challans, setChallans] = useState<Challan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const loadChallans = async () => {
    try {
      setLoading(true);
      const res = await challanApi.list({
        search: search || undefined,
        status: (statusFilter as ChallanStatus) || undefined,
        limit: 50,
      });
      setChallans(res.data.data);
    } catch (err) {
      console.error('Failed to load sales challans', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadChallans();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, statusFilter]);

  const canCreate = hasRole('SALES', 'ADMIN');

  return (
    <Layout
      title="Sales Challans & Dispatch Operations"
      subtitle="Track customer order dispatches, manage drafts, and confirm inventory deduction"
    >
      {/* Top Search & Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex flex-wrap items-center gap-3 flex-1 max-w-2xl">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by challan #, customer name, business..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-sm"
            />
          </div>

          <div className="flex items-center gap-1 bg-white border border-slate-200 p-1 rounded-xl shadow-sm text-xs">
            {['', 'DRAFT', 'CONFIRMED', 'CANCELLED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-lg font-medium transition ${
                  statusFilter === st
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {st === '' ? 'All Challans' : st}
              </button>
            ))}
          </div>
        </div>

        {canCreate && (
          <button
            onClick={() => navigate('/challans/create')}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold shadow-sm transition shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Create Sales Challan</span>
          </button>
        )}
      </div>

      {/* Challans Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200/80 uppercase">
              <tr>
                <th className="py-3.5 px-4">Challan #</th>
                <th className="py-3.5 px-4">Customer Entity</th>
                <th className="py-3.5 px-4">Dispatched Items</th>
                <th className="py-3.5 px-4">Total Qty</th>
                <th className="py-3.5 px-4">Total Amount (₹)</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Created Date</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Loading sales challans...
                  </td>
                </tr>
              ) : challans.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No sales challans found.
                  </td>
                </tr>
              ) : (
                challans.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => navigate(`/challans/${c.id}`)}
                    className="hover:bg-slate-50/80 cursor-pointer transition"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-sky-700">
                      {c.challanNumber}
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900">
                        {c.customer?.name || c.customerSnapshot?.name}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {c.customer?.businessName || c.customerSnapshot?.businessName}
                      </p>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      <span className="flex items-center gap-1">
                        <Layers className="h-3.5 w-3.5 text-slate-400" />
                        {c.items?.length || 0} product line(s)
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-800">
                      {c.totalQuantity} units
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      ₹{c.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        {new Date(c.createdAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <a
                          href={challanApi.downloadPdfUrl(c.id)}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          title="Download Challan PDF"
                          className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/challans/${c.id}`);
                          }}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 font-medium text-[11px] flex items-center gap-1"
                        >
                          <span>Manage</span>
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      </div>
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
