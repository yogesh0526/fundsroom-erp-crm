import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { inventoryApi, productApi } from '../services/api';
import { StockMovement, Product, MovementType } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  Search,
  PlusCircle,
  MinusCircle,
  ArrowUpRight,
  ArrowDownLeft,
  Boxes,
  Calendar,
  User,
  SlidersHorizontal,
} from 'lucide-react';

export const Inventory: React.FC = () => {
  const { hasRole } = useAuth();

  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [productFilter, setProductFilter] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Adjustment Form Data
  const [adjustmentData, setAdjustmentData] = useState({
    productId: '',
    quantity: 10,
    movementType: 'IN' as MovementType,
    reason: 'Purchase Inward Consignment',
  });

  const loadMovements = async () => {
    try {
      setLoading(true);
      const res = await inventoryApi.listMovements({
        search: search || undefined,
        movementType: typeFilter || undefined,
        productId: productFilter || undefined,
        limit: 50,
      });
      setMovements(res.data.data);
    } catch (err) {
      console.error('Failed to load inventory movements', err);
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const res = await productApi.list({ limit: 100 });
      setProducts(res.data.data);
      if (res.data.data.length > 0 && !adjustmentData.productId) {
        setAdjustmentData((prev) => ({ ...prev, productId: res.data.data[0].id }));
      }
    } catch (err) {
      console.error('Failed to load product list', err);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadMovements();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, typeFilter, productFilter]);

  const handleOpenAdjustmentModal = (type: MovementType) => {
    setAdjustmentData({
      productId: products[0]?.id || '',
      quantity: 5,
      movementType: type,
      reason: type === 'IN' ? 'Purchase Order Inward' : 'Stock Audit Correction',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handlePerformAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);

    try {
      await inventoryApi.adjust({
        productId: adjustmentData.productId,
        quantity: Number(adjustmentData.quantity),
        movementType: adjustmentData.movementType,
        reason: adjustmentData.reason,
      });
      setIsModalOpen(false);
      loadMovements();
      loadProducts(); // refresh products stock count
    } catch (err: any) {
      setFormError(
        err.response?.data?.message || 'Failed to perform stock adjustment'
      );
    } finally {
      setFormLoading(false);
    }
  };

  const canAdjust = hasRole('WAREHOUSE', 'ADMIN');

  return (
    <Layout
      title="Stock Ledger & Warehouse Movements"
      subtitle="Complete audit trail of stock inward, sales dispatches, and warehouse manual adjustments"
    >
      {/* Top Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex flex-wrap items-center gap-3 flex-1 max-w-2xl">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by reason, reference ID, product..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-sm"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-sm text-xs">
            <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-transparent text-xs text-slate-700 font-medium focus:outline-none"
            >
              <option value="">All Movement Types</option>
              <option value="IN">IN (Stock Added)</option>
              <option value="OUT">OUT (Stock Deducted)</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-sm text-xs">
            <select
              value={productFilter}
              onChange={(e) => setProductFilter(e.target.value)}
              className="bg-transparent text-xs text-slate-700 font-medium focus:outline-none max-w-[180px] truncate"
            >
              <option value="">All Products</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.sku} - {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {canAdjust && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleOpenAdjustmentModal('IN')}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-sm transition"
            >
              <PlusCircle className="h-4 w-4" />
              <span>+ Stock In (Receive)</span>
            </button>
            <button
              onClick={() => handleOpenAdjustmentModal('OUT')}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold shadow-sm transition"
            >
              <MinusCircle className="h-4 w-4" />
              <span>- Stock Out (Write-off)</span>
            </button>
          </div>
        )}
      </div>

      {/* Movements Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200/80 uppercase">
              <tr>
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-4">Product Details & SKU</th>
                <th className="py-3.5 px-4">Movement Type</th>
                <th className="py-3.5 px-4">Quantity Changed</th>
                <th className="py-3.5 px-4">Movement Reason</th>
                <th className="py-3.5 px-4">Reference ID / Challan</th>
                <th className="py-3.5 px-4 text-right">Logged By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Loading stock movements ledger...
                  </td>
                </tr>
              ) : movements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No stock movements found matching filters.
                  </td>
                </tr>
              ) : (
                movements.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4 text-slate-500 font-medium">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        {new Date(m.createdAt).toLocaleString()}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900">{m.product?.name}</p>
                      <p className="font-mono text-slate-500 text-[11px]">{m.product?.sku}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                          m.movementType === 'IN'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {m.movementType === 'IN' ? (
                          <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <ArrowUpRight className="h-3.5 w-3.5 text-rose-600" />
                        )}
                        <span>{m.movementType}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-sm">
                      <span
                        className={
                          m.movementType === 'IN' ? 'text-emerald-700' : 'text-rose-700'
                        }
                      >
                        {m.movementType === 'IN' ? '+' : '-'}
                        {m.quantity} units
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-700">{m.reason}</td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-sky-700 font-semibold">
                      {m.referenceId || 'Manual Adjustment'}
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-600">
                      <span className="flex items-center justify-end gap-1 font-medium">
                        <User className="h-3 w-3 text-slate-400" />
                        {m.createdBy?.name}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stock Adjustment Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`Manual Stock ${adjustmentData.movementType === 'IN' ? 'Inward (+)' : 'Deduction (-)'}`}
        maxWidth="md"
      >
        {formError && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
            {formError}
          </div>
        )}

        <form onSubmit={handlePerformAdjustment} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Select Product *</label>
            <select
              required
              value={adjustmentData.productId}
              onChange={(e) => setAdjustmentData({ ...adjustmentData, productId: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:bg-white font-medium"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  [{p.sku}] {p.name} (Current: {p.currentStock} units)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Movement Type</label>
              <input
                type="text"
                disabled
                value={adjustmentData.movementType === 'IN' ? 'IN (Increase Stock)' : 'OUT (Reduce Stock)'}
                className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl font-bold text-slate-700"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Quantity (Units) *</label>
              <input
                type="number"
                min="1"
                required
                value={adjustmentData.quantity}
                onChange={(e) =>
                  setAdjustmentData({ ...adjustmentData, quantity: Number(e.target.value) })
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:bg-white font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Adjustment Reason / Note *
            </label>
            <input
              type="text"
              required
              value={adjustmentData.reason}
              onChange={(e) => setAdjustmentData({ ...adjustmentData, reason: e.target.value })}
              placeholder="e.g. Inward PO-884, Stock cycle count, Defective batch scrap..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:bg-white"
            />
          </div>

          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800">
            <strong>Business Invariant:</strong> If deducting stock (OUT), the system strictly prevents negative inventory. The transaction will be aborted if quantity exceeds available warehouse units.
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formLoading}
              className={`px-5 py-2 rounded-xl text-white font-semibold transition disabled:opacity-50 ${
                adjustmentData.movementType === 'IN'
                  ? 'bg-emerald-600 hover:bg-emerald-500'
                  : 'bg-rose-600 hover:bg-rose-500'
              }`}
            >
              {formLoading ? 'Recording...' : `Confirm Stock ${adjustmentData.movementType}`}
            </button>
          </div>
        </form>
      </Modal>
    </Layout>
  );
};
