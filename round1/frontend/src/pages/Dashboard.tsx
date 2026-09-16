import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { StatCard } from '../components/StatCard';
import { StatusBadge } from '../components/StatusBadge';
import { customerApi, productApi, challanApi, invoiceApi } from '../services/api';
import { Product, Challan } from '../types';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Package,
  AlertTriangle,
  FileSpreadsheet,
  Receipt,
  PlusCircle,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  const [customerCount, setCustomerCount] = useState(0);
  const [productCount, setProductCount] = useState(0);
  const [totalStockUnits, setTotalStockUnits] = useState(0);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [recentChallans, setRecentChallans] = useState<Challan[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [custRes, prodRes, lowStockRes, challanRes, invoiceRes] = await Promise.all([
          customerApi.list({ limit: 1 }).catch(() => ({ data: { meta: { total: 0 } } })),
          productApi.list({ limit: 100 }),
          productApi.list({ lowStock: true }),
          challanApi.list({ limit: 5 }),
          invoiceApi.list({ limit: 100 }).catch(() => ({ data: { data: [] } })),
        ]);

        setCustomerCount(custRes.data.meta?.total || 0);
        setProductCount(prodRes.data.meta?.total || 0);

        const allProducts: Product[] = prodRes.data.data || [];
        const units = allProducts.reduce((acc, p) => acc + p.currentStock, 0);
        setTotalStockUnits(units);

        setLowStockProducts(lowStockRes.data.data || []);
        setRecentChallans(challanRes.data.data || []);

        const invoices = invoiceRes.data.data || [];
        const revenue = invoices.reduce((acc: number, inv: any) => acc + inv.totalAmount, 0);
        setTotalRevenue(revenue);
      } catch (err) {
        console.error('Error loading dashboard data', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <Layout
      title="Operations Dashboard"
      subtitle="Overview of Wholesale Distribution, Inventory Alerts & Billing"
    >
      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5">
        <StatCard
          title="Active Customers"
          value={loading ? '...' : customerCount}
          icon={Users}
          color="blue"
          onClick={() => navigate('/customers')}
        />
        <StatCard
          title="Catalog SKUs"
          value={loading ? '...' : productCount}
          icon={Package}
          color="purple"
          onClick={() => navigate('/products')}
        />
        <StatCard
          title="Stock In Warehouse"
          value={loading ? '...' : `${totalStockUnits} pcs`}
          icon={TrendingUp}
          color="emerald"
          onClick={() => navigate('/inventory')}
        />
        <StatCard
          title="Low Stock Alerts"
          value={loading ? '...' : lowStockProducts.length}
          icon={AlertTriangle}
          color="rose"
          onClick={() => navigate('/products?filter=lowStock')}
        />
        <StatCard
          title="Recent Challans"
          value={loading ? '...' : recentChallans.length}
          icon={FileSpreadsheet}
          color="amber"
          onClick={() => navigate('/challans')}
        />
        <StatCard
          title="Invoiced Total"
          value={loading ? '...' : `₹${Math.round(totalRevenue).toLocaleString()}`}
          icon={Receipt}
          color="emerald"
          onClick={() => navigate('/invoices')}
        />
      </div>

      {/* Low Stock Warning Banner & Table */}
      {lowStockProducts.length > 0 && (
        <div className="mt-8 rounded-2xl border border-rose-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-rose-100">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-rose-100 text-rose-700">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  Critical Inventory Alerts ({lowStockProducts.length} items below minimum threshold)
                </h3>
                <p className="text-xs text-slate-500">
                  Stock levels have breached threshold. Replenishment recommended.
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/inventory')}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1.5"
            >
              <span>Manage Inward Stock</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left text-xs">
              <thead className="bg-rose-50/50 text-slate-600 uppercase font-semibold">
                <tr>
                  <th className="py-2.5 px-4 rounded-l-lg">Product Name</th>
                  <th className="py-2.5 px-4">SKU</th>
                  <th className="py-2.5 px-4">Category</th>
                  <th className="py-2.5 px-4">Current Stock</th>
                  <th className="py-2.5 px-4">Min Alert Threshold</th>
                  <th className="py-2.5 px-4">Warehouse Location</th>
                  <th className="py-2.5 px-4 rounded-r-lg text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lowStockProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-semibold text-slate-900">{p.name}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{p.sku}</td>
                    <td className="py-3 px-4 text-slate-500">{p.category}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold">
                        {p.currentStock} units
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{p.minStockAlert} units</td>
                    <td className="py-3 px-4 text-slate-500">{p.location}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => navigate('/inventory')}
                        className="px-2.5 py-1 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 font-medium text-[11px] transition"
                      >
                        Adjust Stock
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Two-Column Section: Recent Challans & Quick Operations */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Challans (2 Cols) */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Recent Sales Challans</h3>
              <p className="text-xs text-slate-500">Latest dispatched orders and draft requests</p>
            </div>
            <button
              onClick={() => navigate('/challans')}
              className="text-xs font-semibold text-sky-600 hover:text-sky-700 flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-semibold">
                <tr>
                  <th className="py-2.5 px-3 rounded-l-lg">Challan #</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3">Qty</th>
                  <th className="py-2.5 px-3">Total (₹)</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 rounded-r-lg text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentChallans.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No recent sales challans recorded.
                    </td>
                  </tr>
                ) : (
                  recentChallans.map((ch) => (
                    <tr key={ch.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-3 font-mono font-semibold text-sky-700">
                        {ch.challanNumber}
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-800">
                        {ch.customer?.name || ch.customerSnapshot?.name}
                      </td>
                      <td className="py-3 px-3 text-slate-600">{ch.totalQuantity}</td>
                      <td className="py-3 px-3 font-semibold text-slate-900">
                        ₹{ch.totalAmount.toLocaleString()}
                      </td>
                      <td className="py-3 px-3">
                        <StatusBadge status={ch.status} />
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => navigate(`/challans/${ch.id}`)}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 font-medium text-[11px] transition"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Operations Actions (1 Col) */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-base mb-1">Quick Actions</h3>
            <p className="text-xs text-slate-500 mb-6">Frequently used operational workflows</p>

            <div className="space-y-3">
              <button
                onClick={() => navigate('/challans/create')}
                className="w-full flex items-center justify-between p-3.5 rounded-xl border border-sky-200 bg-sky-50/60 hover:bg-sky-100 text-sky-950 transition text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-sky-600 text-white">
                    <PlusCircle className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold">New Sales Challan</p>
                    <p className="text-[11px] text-sky-700">Dispatch stock to customer</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-sky-600 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => navigate('/customers')}
                className="w-full flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-100 text-slate-900 transition text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-slate-700 text-white">
                    <Users className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold">Add New Customer</p>
                    <p className="text-[11px] text-slate-500">Record CRM lead or client</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => navigate('/inventory')}
                className="w-full flex items-center justify-between p-3.5 rounded-xl border border-amber-200 bg-amber-50/60 hover:bg-amber-100 text-amber-950 transition text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-600 text-white">
                    <Package className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold">Stock Inward / Adjustment</p>
                    <p className="text-[11px] text-amber-700">Receive goods from supplier</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-amber-600 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          <div className="mt-8 p-4 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 text-white">
            <p className="text-xs font-bold flex items-center gap-1 text-sky-400">
              <span>Interactive REST API Ready</span>
            </p>
            <p className="text-[11px] text-slate-300 mt-1">
              Explore OpenAPI Swagger endpoints directly in the browser.
            </p>
            <a
              href="/api/docs"
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-block px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold transition"
            >
              Open Swagger Docs &rarr;
            </a>
          </div>
        </div>
      </div>
    </Layout>
  );
};
