import React, { useState, useEffect } from 'react';
import { InventoryItem } from '../types';
import { apiService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Layers, AlertTriangle, CheckCircle, Package, RefreshCw, Edit3 } from 'lucide-react';
import { Modal } from './Modal';

interface InventoryPanelProps {
  compact?: boolean;
}

export const InventoryPanel: React.FC<InventoryPanelProps> = ({ compact = false }) => {
  const { isAdmin } = useAuth();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [physicalInput, setPhysicalInput] = useState<number>(0);
  const [damagedInput, setDamagedInput] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const res = await apiService.getInventory();
      if (res.data?.success) {
        setInventory(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const openEditModal = (item: InventoryItem) => {
    setSelectedItem(item);
    setPhysicalInput(item.physicalQuantity);
    setDamagedInput(item.damagedQuantity);
    setErrorMsg('');
    setIsEditModalOpen(true);
  };

  const handleUpdateStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    if (physicalInput < 0 || damagedInput < 0) {
      setErrorMsg('Quantities cannot be negative');
      return;
    }

    if (selectedItem.reservedQuantity + damagedInput > physicalInput) {
      setErrorMsg(
        `Invalid update: Reserved (${selectedItem.reservedQuantity}) + Damaged (${damagedInput}) exceeds Physical (${physicalInput}).`
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      await apiService.updateInventory(selectedItem.id, {
        physicalQuantity: physicalInput,
        damagedQuantity: damagedInput,
      });
      setIsEditModalOpen(false);
      await fetchInventory();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to update inventory');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (compact) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Package className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-slate-800 text-sm">Stock Availability Quick View</h3>
          </div>
          <button
            onClick={fetchInventory}
            className="p-1 text-slate-400 hover:text-slate-600 rounded transition"
            title="Refresh Stock"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="space-y-3">
          {inventory.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs"
            >
              <div>
                <div className="font-semibold text-slate-800">{item.productName}</div>
                <div className="text-slate-400">{item.productCode} • {item.unit}</div>
              </div>
              <div className="text-right">
                <div className="font-bold text-slate-900 text-sm">
                  <span className={item.availableQuantity > 0 ? 'text-emerald-600' : 'text-rose-600'}>
                    {item.availableQuantity}
                  </span>
                  <span className="text-slate-400 font-normal"> / {item.physicalQuantity}</span>
                </div>
                <div className="text-[10px] text-slate-500">
                  Res: {item.reservedQuantity} | Dam: {item.damagedQuantity}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div>
          <div className="flex items-center space-x-2">
            <Layers className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-slate-900 text-base">Real-Time Inventory Stock Master</h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Formula: Available Quantity = Physical Stock − Reserved Stock − Damaged Stock
          </p>
        </div>
        <button
          onClick={fetchInventory}
          className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-sm transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Stock
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3">Product</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3 text-right">Physical</th>
              <th className="px-4 py-3 text-right">Reserved</th>
              <th className="px-4 py-3 text-right">Damaged</th>
              <th className="px-4 py-3 text-right">Available</th>
              <th className="px-4 py-3 text-center">Status</th>
              {isAdmin && <th className="px-4 py-3 text-right">Action</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {inventory.map((item) => {
              const isStockHealthy = item.availableQuantity > 20;
              const isStockLow = item.availableQuantity > 0 && item.availableQuantity <= 20;
              const isOutOfStock = item.availableQuantity === 0;

              return (
                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-3.5">
                    <div className="font-semibold text-slate-900">{item.productName}</div>
                    <div className="text-xs font-mono text-slate-400">
                      {item.productCode} • {item.unit}
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-700">
                      {item.category}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right font-medium text-slate-800">
                    {item.physicalQuantity}
                  </td>
                  <td className="px-4 py-3.5 text-right font-medium text-amber-600">
                    {item.reservedQuantity > 0 ? `+${item.reservedQuantity}` : '0'}
                  </td>
                  <td className="px-4 py-3.5 text-right font-medium text-rose-600">
                    {item.damagedQuantity > 0 ? item.damagedQuantity : '0'}
                  </td>
                  <td className="px-4 py-3.5 text-right font-bold text-base">
                    <span
                      className={
                        isOutOfStock
                          ? 'text-rose-600'
                          : isStockLow
                          ? 'text-amber-600'
                          : 'text-emerald-600'
                      }
                    >
                      {item.availableQuantity}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    {isStockHealthy && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle className="w-3 h-3 mr-1 text-emerald-500" />
                        In Stock
                      </span>
                    )}
                    {isStockLow && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                        <AlertTriangle className="w-3 h-3 mr-1 text-amber-500" />
                        Low Stock
                      </span>
                    )}
                    {isOutOfStock && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
                        <AlertTriangle className="w-3 h-3 mr-1 text-rose-500" />
                        Out of Stock
                      </span>
                    )}
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={() => openEditModal(item)}
                        className="inline-flex items-center px-2.5 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-md transition"
                      >
                        <Edit3 className="w-3.5 h-3.5 mr-1" />
                        Adjust
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Adjust Inventory Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Adjust Stock - ${selectedItem?.productName}`}
        subtitle={`Product Code: ${selectedItem?.productCode} | Unit: ${selectedItem?.unit}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleUpdateStock} className="space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
              {errorMsg}
            </div>
          )}

          <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Currently Reserved:</span>
              <span className="font-bold text-amber-600">{selectedItem?.reservedQuantity} units</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Projected Available:</span>
              <span className="font-bold text-emerald-600">
                {Math.max(0, physicalInput - (selectedItem?.reservedQuantity || 0) - damagedInput)} units
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Physical Warehouse Stock
            </label>
            <input
              type="number"
              min="0"
              value={physicalInput}
              onChange={(e) => setPhysicalInput(parseInt(e.target.value, 10) || 0)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              required
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Total physical items present on warehouse shelves.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Damaged / Quarantined Stock (Page 11 Verification Feature)
            </label>
            <input
              type="number"
              min="0"
              value={damagedInput}
              onChange={(e) => setDamagedInput(parseInt(e.target.value, 10) || 0)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              required
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Damaged stock is automatically deducted from available stock.
            </p>
          </div>

          <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save Stock Changes'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
