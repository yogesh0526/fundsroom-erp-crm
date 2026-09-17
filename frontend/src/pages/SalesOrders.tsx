import React, { useState, useEffect } from 'react';
import { SalesOrder, Product } from '../types';
import { apiService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/StatusBadge';
import { InventoryPanel } from '../components/InventoryPanel';
import { Modal } from '../components/Modal';
import {
  Search,
  Filter,
  CheckCircle,
  Truck,
  XCircle,
  Clock,
  RefreshCw,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

interface SalesOrdersProps {
  initialOrderId?: string;
}

export const SalesOrders: React.FC<SalesOrdersProps> = ({ initialOrderId }) => {
  const { isAdmin } = useAuth();
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);
  const [dispatchOrder, setDispatchOrder] = useState<SalesOrder | null>(null);

  // Dispatch Form State
  const [vehicleNumber, setVehicleNumber] = useState<string>('MH-12-AB-5432');
  const [driverName, setDriverName] = useState<string>('Sanjay Patil');
  const [dispatchNotes, setDispatchNotes] = useState<string>('Dispatched via express freight');
  const [dispatchError, setDispatchError] = useState<string>('');
  const [isDispatching, setIsDispatching] = useState<boolean>(false);

  // General Action State
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ordRes, prodRes] = await Promise.all([
        apiService.getSalesOrders(),
        apiService.getProducts(),
      ]);
      if (ordRes.data?.success) setOrders(ordRes.data.data);
      if (prodRes.data?.success) setProducts(prodRes.data.data);
    } catch (err) {
      console.error('Failed to load sales orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (initialOrderId && orders.length > 0) {
      const found = orders.find((o) => o.id === initialOrderId);
      if (found) setSelectedOrder(found);
    }
  }, [initialOrderId, orders]);

  // Section 6: Order Confirmation & Inventory Reservation (Admin only)
  const handleConfirmOrder = async (order: SalesOrder) => {
    if (!isAdmin) {
      alert('Unauthorized: Only users with the ADMIN role can confirm orders and reserve inventory.');
      return;
    }

    if (order.status !== 'PENDING') {
      alert(`Cannot confirm order: Current status is ${order.status}.`);
      return;
    }

    setActionLoadingId(order.id);
    try {
      const res = await apiService.confirmSalesOrder(order.id);
      if (res.data?.success) {
        alert(`Order ${order.orderNumber} confirmed! Inventory reserved with PostgreSQL row locking.`);
        await loadData();
        if (selectedOrder?.id === order.id) {
          setSelectedOrder(res.data.data);
        }
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to confirm order and reserve inventory.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Section 7: Process Dispatch (Admin only)
  const handleOpenDispatchModal = (order: SalesOrder) => {
    if (!isAdmin) {
      alert('Unauthorized: Only ADMIN users can process dispatch.');
      return;
    }
    setDispatchOrder(order);
    setDispatchError('');
  };

  const handleProcessDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispatchOrder) return;

    setIsDispatching(true);
    setDispatchError('');
    try {
      const res = await apiService.dispatchSalesOrder(dispatchOrder.id, {
        vehicleNumber,
        driverName,
        notes: dispatchNotes,
      });

      if (res.data?.success) {
        alert(`Dispatched! Order ${dispatchOrder.orderNumber} dispatched under #${res.data.data.dispatchNumber}. Both physical and reserved stock decremented.`);
        setDispatchOrder(null);
        await loadData();
      }
    } catch (err: any) {
      setDispatchError(err.response?.data?.message || 'Failed to process dispatch.');
    } finally {
      setIsDispatching(false);
    }
  };

  // Page 11 Bonus: Order Cancellation & Stock Release
  const handleCancelOrder = async (order: SalesOrder) => {
    const isConfirmed = order.status === 'CONFIRMED';
    const confirmMessage = isConfirmed
      ? `Are you sure you want to cancel ${order.orderNumber}? This will release the ${order.items?.reduce((s, i) => s + i.quantity, 0)} reserved units back to available inventory.`
      : `Cancel pending order ${order.orderNumber}?`;

    if (!window.confirm(confirmMessage)) return;

    setActionLoadingId(order.id);
    try {
      const res = await apiService.cancelSalesOrder(order.id);
      if (res.data?.success) {
        alert(res.data.message);
        await loadData();
        if (selectedOrder?.id === order.id) {
          setSelectedOrder(res.data.data);
        }
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to cancel sales order.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredOrders = orders.filter((o) => {
    const matchesStatus = statusFilter === 'ALL' || o.status === statusFilter;
    const matchesSearch =
      o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customer?.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.quotation?.quotationNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.dispatch?.dispatchNumber || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Real-time Inventory Ledger & Stock Availability Table */}
      <InventoryPanel />

      {/* Sales Orders Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-slate-900">Sales Orders & Fulfillment</h2>
            {!isAdmin && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                <ShieldAlert className="w-3 h-3 mr-1 text-amber-600" />
                Sales View (Read-Only Confirmation/Dispatch)
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Confirm pending orders to lock warehouse inventory via PostgreSQL row-level locks, then execute dispatches with carrier tracking.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={loadData}
            className="inline-flex items-center px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-xs transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Orders
          </button>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search Order #, Customer, Quotation Ref..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center space-x-2 w-full md:w-auto overflow-x-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          {['ALL', 'PENDING', 'CONFIRMED', 'DISPATCHED', 'CANCELLED'].map((st) => (
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
        </div>
      </div>

      {/* Sales Orders Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">Order Number</th>
                <th className="px-4 py-3">Customer & Quote Link</th>
                <th className="px-4 py-3">Ordered Items</th>
                <th className="px-4 py-3 text-right">Total Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Dispatch Details</th>
                <th className="px-6 py-3 text-right">Fulfillment Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400 text-xs">
                    No sales orders found. Convert an ACCEPTED quotation to create an order.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((ord) => {
                  const isProcessing = actionLoadingId === ord.id;

                  return (
                    <tr key={ord.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-300 text-xs">
                          {ord.orderNumber}
                        </span>
                        <div className="text-[10px] text-slate-400 mt-1">
                          {new Date(ord.orderDate).toLocaleDateString()}
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="font-semibold text-slate-900">{ord.customer?.companyName}</div>
                        <div className="text-xs text-slate-500 font-mono">
                          Quote: {ord.quotation?.quotationNumber}
                        </div>
                        {ord.quotation?.enquiry && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            Enq: {ord.quotation.enquiry.enquiryNumber}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          {ord.items?.map((item) => {
                            const prod = products.find((p) => p.id === item.productId);
                            const available = prod?.inventory?.availableQuantity ?? 0;
                            const hasSufficient = available >= item.quantity;

                            return (
                              <div key={item.id} className="text-xs flex items-center justify-between gap-2">
                                <div className="truncate max-w-[170px]">
                                  <span className="font-bold text-slate-900">{item.quantity}× </span>
                                  <span className="text-slate-700">{item.product?.productName}</span>
                                </div>
                                {ord.status === 'PENDING' && (
                                  <span
                                    className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                                      hasSufficient
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                                    }`}
                                    title={`Current Available: ${available} units`}
                                  >
                                    {hasSufficient ? `Stock OK (${available})` : `Short (${available})`}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </td>

                      <td className="px-4 py-4 text-right">
                        <span className="font-black text-slate-900 text-sm">
                          ₹{ord.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <StatusBadge status={ord.status} />
                      </td>

                      <td className="px-4 py-4">
                        {ord.dispatch ? (
                          <div className="text-xs">
                            <span className="font-mono font-bold text-purple-700 block">
                              {ord.dispatch.dispatchNumber}
                            </span>
                            <span className="text-slate-500 text-[11px] block">
                              Veh: {ord.dispatch.vehicleNumber}
                            </span>
                            <span className="text-slate-400 text-[10px] block">
                              Driver: {ord.dispatch.driverName}
                            </span>
                          </div>
                        ) : ord.status === 'CONFIRMED' ? (
                          <span className="text-xs text-amber-600 font-semibold flex items-center">
                            <Clock className="w-3.5 h-3.5 mr-1" />
                            Stock Reserved, Awaiting Dispatch
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Not dispatched</span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-right space-x-1.5">
                        <button
                          onClick={() => setSelectedOrder(ord)}
                          className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded transition"
                        >
                          View
                        </button>

                        {/* Step 1: Admin Confirms Order & Triggers Inventory Reservation */}
                        {ord.status === 'PENDING' && (
                          <button
                            onClick={() => handleConfirmOrder(ord)}
                            disabled={isProcessing || !isAdmin}
                            className="inline-flex items-center px-3 py-1 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 rounded shadow-xs transition"
                            title={
                              isAdmin
                                ? 'Confirm Sales Order & Reserve Inventory'
                                : 'Admin Role Required to Confirm & Reserve'
                            }
                          >
                            <CheckCircle className="w-3.5 h-3.5 mr-1" />
                            {isProcessing ? 'Locking...' : 'Confirm'}
                          </button>
                        )}

                        {/* Step 2: Admin Dispatches Confirmed Order */}
                        {ord.status === 'CONFIRMED' && (
                          <button
                            onClick={() => handleOpenDispatchModal(ord)}
                            disabled={!isAdmin}
                            className="inline-flex items-center px-3 py-1 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-40 rounded shadow-xs transition"
                            title={
                              isAdmin
                                ? 'Process Physical Dispatch'
                                : 'Admin Role Required to Dispatch'
                            }
                          >
                            <Truck className="w-3.5 h-3.5 mr-1" />
                            Dispatch
                          </button>
                        )}

                        {/* Order Cancellation (Releases Reserved Stock) */}
                        {(ord.status === 'PENDING' || ord.status === 'CONFIRMED') && (
                          <button
                            onClick={() => handleCancelOrder(ord)}
                            disabled={isProcessing}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                            title="Cancel Sales Order"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dispatch Modal */}
      {dispatchOrder && (
        <Modal
          isOpen={!!dispatchOrder}
          onClose={() => setDispatchOrder(null)}
          title={`Process Dispatch - ${dispatchOrder.orderNumber}`}
          subtitle={`Customer: ${dispatchOrder.customer?.companyName} | Total Units: ${dispatchOrder.items?.reduce((s, i) => s + i.quantity, 0)}`}
          maxWidth="max-w-md"
        >
          <form onSubmit={handleProcessDispatch} className="space-y-4">
            {dispatchError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
                {dispatchError}
              </div>
            )}

            <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-lg text-xs text-purple-900 space-y-1">
              <div className="font-bold flex items-center">
                <Truck className="w-4 h-4 mr-1.5 text-purple-600" />
                Physical Stock Decrement Notice
              </div>
              <p className="text-[11px] text-purple-700">
                Confirming dispatch will automatically decrement both <strong>Physical Quantity</strong> and <strong>Reserved Quantity</strong> for each product on the order.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Logistics Vehicle Number
              </label>
              <input
                type="text"
                required
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value)}
                placeholder="e.g. MH-12-AB-9876"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Authorized Driver Name
              </label>
              <input
                type="text"
                required
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                placeholder="e.g. Ramesh Kumar"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Dispatch / Gate Pass Notes
              </label>
              <textarea
                rows={2}
                value={dispatchNotes}
                onChange={(e) => setDispatchNotes(e.target.value)}
                placeholder="Gate pass number, carrier transit details..."
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              ></textarea>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDispatchOrder(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isDispatching}
                className="px-5 py-2 text-xs font-bold text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center"
              >
                <Truck className="w-3.5 h-3.5 mr-1.5" />
                {isDispatching ? 'Processing Dispatch...' : 'Confirm Dispatch'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* View Sales Order Details Modal */}
      {selectedOrder && (
        <Modal
          isOpen={!!selectedOrder}
          onClose={() => setSelectedOrder(null)}
          title={`Sales Order ${selectedOrder.orderNumber}`}
          subtitle={`Order Date: ${new Date(selectedOrder.orderDate).toLocaleDateString()}`}
          maxWidth="max-w-3xl"
        >
          <div className="space-y-4">
            {/* End-to-End Workflow Traceability Breadcrumb */}
            <div className="p-3 bg-slate-900 text-white rounded-xl text-xs flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-slate-400">Traceability:</span>
                <span className="text-amber-400 font-bold">{selectedOrder.customer?.companyName}</span>
                <ArrowRight className="w-3 h-3 text-slate-500" />
                <span className="text-blue-400 font-mono font-semibold">
                  {selectedOrder.quotation?.enquiry?.enquiryNumber || 'Enquiry'}
                </span>
                <ArrowRight className="w-3 h-3 text-slate-500" />
                <span className="text-emerald-400 font-mono font-semibold">
                  {selectedOrder.quotation?.quotationNumber}
                </span>
                <ArrowRight className="w-3 h-3 text-slate-500" />
                <span className="text-white font-mono font-bold">{selectedOrder.orderNumber}</span>
              </div>
              <StatusBadge status={selectedOrder.status} />
            </div>

            {/* Customer Details */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">Billing Customer</span>
                <span className="font-bold text-slate-900 text-sm block">
                  {selectedOrder.customer?.companyName}
                </span>
                <span className="text-slate-600 block">
                  {selectedOrder.customer?.contactPerson} • {selectedOrder.customer?.city}
                </span>
                <span className="text-slate-500 text-[11px] block">{selectedOrder.customer?.email}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 block mb-0.5">Order Status Info</span>
                {selectedOrder.confirmedAt && (
                  <span className="text-emerald-700 font-medium block">
                    Confirmed on: {new Date(selectedOrder.confirmedAt).toLocaleDateString()}
                  </span>
                )}
                {selectedOrder.confirmedBy && (
                  <span className="text-slate-500 text-[11px] block">
                    By Admin: {selectedOrder.confirmedBy.name}
                  </span>
                )}
              </div>
            </div>

            {/* Dispatched Info Banner */}
            {selectedOrder.dispatch && (
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-purple-900 flex items-center">
                    <Truck className="w-4 h-4 mr-1.5 text-purple-600" />
                    Dispatch Note #{selectedOrder.dispatch.dispatchNumber}
                  </span>
                  <span className="text-purple-700 font-semibold">
                    Date: {new Date(selectedOrder.dispatch.dispatchDate).toLocaleDateString()}
                  </span>
                </div>
                <div className="text-purple-800 flex space-x-4 pt-1">
                  <span>
                    Vehicle: <strong>{selectedOrder.dispatch.vehicleNumber}</strong>
                  </span>
                  <span>
                    Driver: <strong>{selectedOrder.dispatch.driverName}</strong>
                  </span>
                </div>
              </div>
            )}

            {/* Order Items */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Order Items & Inventory Reservation Status
              </h4>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                    <tr>
                      <th className="px-4 py-2">Product Code & Name</th>
                      <th className="px-3 py-2 text-right">Quantity</th>
                      <th className="px-3 py-2 text-right">Unit Price</th>
                      <th className="px-4 py-2 text-right">Line Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedOrder.items?.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-2 font-medium text-slate-900">
                          {item.product?.productCode} - {item.product?.productName}
                        </td>
                        <td className="px-3 py-2 text-right font-bold text-slate-800">
                          {item.quantity} {item.product?.unit}
                        </td>
                        <td className="px-3 py-2 text-right">₹{item.unitPrice.toLocaleString('en-IN')}</td>
                        <td className="px-4 py-2 text-right font-bold text-slate-900">
                          ₹{item.lineAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 font-bold border-t border-slate-200 text-xs">
                    <tr>
                      <td colSpan={3} className="px-4 py-2 text-right text-slate-600">
                        Total Order Value:
                      </td>
                      <td className="px-4 py-2 text-right text-base text-slate-900 font-black">
                        ₹{selectedOrder.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Actions Toolbar */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
              <div>
                {(selectedOrder.status === 'PENDING' || selectedOrder.status === 'CONFIRMED') && (
                  <button
                    onClick={() => {
                      const ord = selectedOrder;
                      setSelectedOrder(null);
                      handleCancelOrder(ord);
                    }}
                    className="text-rose-600 hover:text-rose-800 font-semibold"
                  >
                    Cancel Sales Order
                  </button>
                )}
              </div>

              <div className="flex items-center space-x-2">
                {selectedOrder.status === 'PENDING' && (
                  <button
                    onClick={() => {
                      const ord = selectedOrder;
                      setSelectedOrder(null);
                      handleConfirmOrder(ord);
                    }}
                    disabled={!isAdmin}
                    className="px-4 py-1.5 font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 rounded-lg transition inline-flex items-center"
                  >
                    <CheckCircle className="w-3.5 h-3.5 mr-1" />
                    Confirm & Reserve Stock
                  </button>
                )}

                {selectedOrder.status === 'CONFIRMED' && (
                  <button
                    onClick={() => {
                      const ord = selectedOrder;
                      setSelectedOrder(null);
                      handleOpenDispatchModal(ord);
                    }}
                    disabled={!isAdmin}
                    className="px-4 py-1.5 font-bold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-40 rounded-lg transition inline-flex items-center"
                  >
                    <Truck className="w-3.5 h-3.5 mr-1" />
                    Process Dispatch
                  </button>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
