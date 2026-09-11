import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { customerApi, productApi, challanApi } from '../services/api';
import { Customer, Product } from '../types';
import {
  ArrowLeft,
  Plus,
  Trash2,
  AlertCircle,
  Building2,
  Package,
  CheckCircle2,
  Save,
  Send,
} from 'lucide-react';

interface ChallanRow {
  productId: string;
  quantity: number;
}

export const ChallanCreate: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [notes, setNotes] = useState('');
  const [rows, setRows] = useState<ChallanRow[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    const initData = async () => {
      try {
        setLoading(true);
        const [custRes, prodRes] = await Promise.all([
          customerApi.list({ limit: 100 }),
          productApi.list({ limit: 100 }),
        ]);

        setCustomers(custRes.data.data);
        setProducts(prodRes.data.data);

        // Pre-select customer if passed in URL (e.g. ?customer=uuid)
        const params = new URLSearchParams(location.search);
        const urlCust = params.get('customer');
        if (urlCust) {
          setSelectedCustomerId(urlCust);
        } else if (custRes.data.data.length > 0) {
          setSelectedCustomerId(custRes.data.data[0].id);
        }

        // Initialize with 1 empty row
        if (prodRes.data.data.length > 0) {
          setRows([{ productId: prodRes.data.data[0].id, quantity: 1 }]);
        }
      } catch (err) {
        console.error('Failed to load initial form data', err);
      } finally {
        setLoading(false);
      }
    };

    initData();
  }, [location.search]);

  const handleAddRow = () => {
    if (products.length === 0) return;
    setRows([...rows, { productId: products[0].id, quantity: 1 }]);
  };

  const handleRemoveRow = (index: number) => {
    if (rows.length === 1) return;
    setRows(rows.filter((_, i) => i !== index));
  };

  const handleUpdateRow = (index: number, field: keyof ChallanRow, value: any) => {
    const updated = [...rows];
    updated[index] = { ...updated[index], [field]: value };
    setRows(updated);
  };

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  // Calculations
  const lineDetails = rows.map((row) => {
    const product = products.find((p) => p.id === row.productId);
    const unitPrice = product?.unitPrice || 0;
    const currentStock = product?.currentStock ?? 0;
    const isInsufficient = row.quantity > currentStock;
    const lineTotal = unitPrice * row.quantity;

    return {
      ...row,
      product,
      unitPrice,
      currentStock,
      isInsufficient,
      lineTotal,
    };
  });

  const totalQuantity = lineDetails.reduce((acc, row) => acc + (row.quantity || 0), 0);
  const totalAmount = lineDetails.reduce((acc, row) => acc + row.lineTotal, 0);
  const hasInsufficientStock = lineDetails.some((row) => row.isInsufficient);

  const handleSubmit = async (status: 'DRAFT' | 'CONFIRMED') => {
    setSubmitError(null);
    if (!selectedCustomerId) {
      setSubmitError('Please select a customer');
      return;
    }

    if (rows.length === 0) {
      setSubmitError('Please add at least one product line item');
      return;
    }

    // If confirming, check client side as well
    if (status === 'CONFIRMED' && hasInsufficientStock) {
      setSubmitError(
        'Cannot confirm challan: One or more products exceed warehouse stock on hand.'
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await challanApi.create({
        customerId: selectedCustomerId,
        items: rows.map((r) => ({ productId: r.productId, quantity: Number(r.quantity) })),
        status,
        notes: notes || undefined,
      });

      navigate(`/challans/${res.data.data.id}`);
    } catch (err: any) {
      setSubmitError(
        err.response?.data?.message || 'Failed to create sales challan'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Layout title="Create Sales Challan">
        <div className="p-12 text-center text-slate-400">Preparing challan editor...</div>
      </Layout>
    );
  }

  return (
    <Layout
      title="Create Sales Delivery Challan"
      subtitle="Issue dispatch challan, verify warehouse stock availability, and record inventory movements"
    >
      <div className="mb-6">
        <button
          onClick={() => navigate('/challans')}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Sales Challans</span>
        </button>
      </div>

      {submitError && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-xs font-semibold text-rose-800">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Transaction Aborted</p>
            <p className="mt-0.5">{submitError}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Challan Items Builder */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Dispatched Line Items</h3>
                <p className="text-xs text-slate-500">
                  Select products, quantities, and verify live warehouse stock levels
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddRow}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-50 text-sky-700 hover:bg-sky-100 font-semibold text-xs transition"
              >
                <Plus className="h-4 w-4" />
                <span>Add Product Line</span>
              </button>
            </div>

            <div className="space-y-4">
              {lineDetails.map((row, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-xl border transition ${
                    row.isInsufficient
                      ? 'border-rose-300 bg-rose-50/40'
                      : 'border-slate-200 bg-slate-50/50'
                  }`}
                >
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end text-xs">
                    {/* Product Selector (6 cols) */}
                    <div className="md:col-span-6">
                      <label className="block font-semibold text-slate-700 mb-1">
                        Item #{idx + 1} - Product SKU *
                      </label>
                      <select
                        value={row.productId}
                        onChange={(e) => handleUpdateRow(idx, 'productId', e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 font-medium"
                      >
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            [{p.sku}] {p.name} (₹{p.unitPrice})
                          </option>
                        ))}
                      </select>
                      <div className="flex items-center justify-between mt-1 text-[11px]">
                        <span className="text-slate-500">
                          Warehouse Stock: <strong>{row.currentStock} units</strong>
                        </span>
                        {row.isInsufficient && (
                          <span className="text-rose-600 font-bold flex items-center gap-0.5">
                            <AlertCircle className="h-3 w-3" /> Insufficient stock
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Quantity (2 cols) */}
                    <div className="md:col-span-2">
                      <label className="block font-semibold text-slate-700 mb-1">
                        Quantity *
                      </label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={row.quantity}
                        onChange={(e) =>
                          handleUpdateRow(idx, 'quantity', Math.max(1, parseInt(e.target.value) || 1))
                        }
                        className={`w-full px-3 py-2 border rounded-xl font-bold ${
                          row.isInsufficient
                            ? 'border-rose-400 bg-rose-50 text-rose-900 focus:ring-rose-500'
                            : 'border-slate-200 bg-white focus:ring-sky-500'
                        }`}
                      />
                    </div>

                    {/* Unit Price (2 cols) */}
                    <div className="md:col-span-2">
                      <label className="block font-semibold text-slate-500 mb-1">
                        Unit Rate (₹)
                      </label>
                      <div className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl font-mono text-slate-700 font-semibold">
                        ₹{row.unitPrice.toLocaleString()}
                      </div>
                    </div>

                    {/* Line Total & Remove (2 cols) */}
                    <div className="md:col-span-2 flex items-center justify-between gap-2">
                      <div>
                        <label className="block font-semibold text-slate-500 mb-1">Total</label>
                        <div className="font-bold text-slate-900 font-mono">
                          ₹{row.lineTotal.toLocaleString()}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(idx)}
                        disabled={rows.length === 1}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition disabled:opacity-25"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100">
              <label className="block font-semibold text-slate-700 text-xs mb-1">
                Internal Dispatch Notes (Optional)
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Logistics carrier, vehicle plate number, delivery gate instructions..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-sky-500 focus:bg-white"
              />
            </div>
          </div>
        </div>

        {/* Right 1 Col: Customer Card & Action Summary */}
        <div className="space-y-6">
          {/* Customer Selection Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
            <h3 className="font-bold text-slate-900 text-sm mb-3 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-sky-600" />
              <span>Consignee / Customer</span>
            </h3>

            <div>
              <label className="block font-semibold text-slate-600 text-xs mb-1">
                Select Customer Account *
              </label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-sky-500 focus:bg-white"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} - {c.businessName} ({c.customerType})
                  </option>
                ))}
              </select>
            </div>

            {selectedCustomer && (
              <div className="mt-4 p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1.5">
                <p className="font-bold text-slate-800">{selectedCustomer.businessName}</p>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  {selectedCustomer.address}
                </p>
                <p className="font-mono text-[11px] text-slate-500">
                  GSTIN: {selectedCustomer.gstNumber || 'Unregistered Consumer'}
                </p>
                <p className="text-[11px] text-slate-500">
                  Contact: {selectedCustomer.mobile} | {selectedCustomer.email}
                </p>
              </div>
            )}
          </div>

          {/* Challan Summary Box */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
            <h3 className="font-bold text-slate-900 text-sm pb-3 border-b border-slate-100 mb-4">
              Dispatch Summary
            </h3>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Total Items:</span>
                <span className="font-bold text-slate-900">{totalQuantity} units</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Unique SKUs:</span>
                <span className="font-bold text-slate-900">{rows.length} product(s)</span>
              </div>
              <div className="pt-2 border-t border-slate-100 flex justify-between text-slate-900 font-bold text-base">
                <span>Estimated Value:</span>
                <span className="font-mono text-sky-700">₹{totalAmount.toLocaleString()}</span>
              </div>
            </div>

            {hasInsufficientStock && (
              <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-[11px] text-rose-700 font-medium">
                <strong>Cannot Confirm:</strong> One or more items exceed inventory. You can still save as <strong>Draft</strong>, or adjust warehouse stock first.
              </div>
            )}

            <div className="mt-6 space-y-2.5">
              <button
                type="button"
                disabled={submitting || hasInsufficientStock}
                onClick={() => handleSubmit('CONFIRMED')}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                <span>Confirm Challan & Reduce Stock</span>
              </button>

              <button
                type="button"
                disabled={submitting}
                onClick={() => handleSubmit('DRAFT')}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                <span>Save as Draft (No Stock Change)</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};
