import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Modal } from '../components/Modal';
import { productApi } from '../services/api';
import { Product } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  Search,
  Plus,
  Package,
  AlertTriangle,
  Edit2,
  UploadCloud,
  CheckCircle2,
  Filter,
} from 'lucide-react';

export const Products: React.FC = () => {
  const { hasRole } = useAuth();
  const location = useLocation();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);

  // Check URL query parameters (e.g. ?filter=lowStock)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('filter') === 'lowStock') {
      setLowStockOnly(true);
    }
  }, [location.search]);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Image upload modal state
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedProductForImage, setSelectedProductForImage] = useState<Product | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Product Form Data
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: 'Power Tools',
    unitPrice: 1000,
    currentStock: 10,
    minStockAlert: 5,
    location: 'Warehouse A - Bay 1',
  });

  const loadProducts = async () => {
    try {
      setLoading(true);
      const res = await productApi.list({
        search: search || undefined,
        category: categoryFilter || undefined,
        lowStock: lowStockOnly ? true : undefined,
        limit: 100,
      });
      setProducts(res.data.data);
    } catch (err) {
      console.error('Failed to load products', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadProducts();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, categoryFilter, lowStockOnly]);

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      sku: '',
      category: 'Power Tools',
      unitPrice: 1000,
      currentStock: 10,
      minStockAlert: 5,
      location: 'Warehouse A - Bay 1',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (p: Product) => {
    setEditingProduct(p);
    setFormData({
      name: p.name,
      sku: p.sku,
      category: p.category,
      unitPrice: p.unitPrice,
      currentStock: p.currentStock,
      minStockAlert: p.minStockAlert,
      location: p.location,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);

    try {
      if (editingProduct) {
        await productApi.update(editingProduct.id, {
          name: formData.name,
          sku: formData.sku,
          category: formData.category,
          unitPrice: Number(formData.unitPrice),
          minStockAlert: Number(formData.minStockAlert),
          location: formData.location,
        });
      } else {
        await productApi.create({
          ...formData,
          unitPrice: Number(formData.unitPrice),
          currentStock: Number(formData.currentStock),
          minStockAlert: Number(formData.minStockAlert),
        });
      }
      setIsModalOpen(false);
      loadProducts();
    } catch (err: any) {
      setFormError(
        err.response?.data?.message ||
          (err.response?.data?.errors
            ? err.response.data.errors.map((x: any) => x.message).join(', ')
            : 'Failed to save product')
      );
    } finally {
      setFormLoading(false);
    }
  };

  const handleUploadImage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductForImage || !imageFile) return;

    setUploadingImage(true);
    const fd = new FormData();
    fd.append('image', imageFile);

    try {
      await productApi.uploadImage(selectedProductForImage.id, fd);
      setImageModalOpen(false);
      setImageFile(null);
      loadProducts();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const canManageProducts = hasRole('WAREHOUSE', 'ADMIN');

  return (
    <Layout
      title="Product & Stock Inventory Catalog"
      subtitle="SKU management, warehouse bin locations, pricing, and automated threshold alerts"
    >
      {/* Search & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex flex-wrap items-center gap-3 flex-1 max-w-2xl">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by product name, SKU code, category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-sm"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-sm text-xs">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-transparent text-xs text-slate-700 font-medium focus:outline-none"
            >
              <option value="">All Categories</option>
              <option value="Power Tools">Power Tools</option>
              <option value="Electrical & Cables">Electrical & Cables</option>
              <option value="Warehouse Equipment">Warehouse Equipment</option>
              <option value="Safety & PPE">Safety & PPE</option>
              <option value="Precision Tools">Precision Tools</option>
            </select>
          </div>

          <button
            onClick={() => setLowStockOnly(!lowStockOnly)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
              lowStockOnly
                ? 'bg-rose-100 border-rose-300 text-rose-800'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
            <span>Low Stock Alert Filter</span>
          </button>
        </div>

        {canManageProducts && (
          <button
            onClick={handleOpenAddModal}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold shadow-sm transition shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Add New Product SKU</span>
          </button>
        )}
      </div>

      {/* Product Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200/80 uppercase">
              <tr>
                <th className="py-3.5 px-4">Product Info & SKU</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Unit Price</th>
                <th className="py-3.5 px-4">Current Stock</th>
                <th className="py-3.5 px-4">Min Alert Threshold</th>
                <th className="py-3.5 px-4">Location / Bay</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Loading inventory catalog...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No products found matching the criteria.
                  </td>
                </tr>
              ) : (
                products.map((p) => {
                  const isLow = p.currentStock <= p.minStockAlert;
                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-slate-50/80 transition ${
                        isLow ? 'bg-rose-50/20' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          {p.imageUrl ? (
                            <img
                              src={p.imageUrl}
                              alt={p.name}
                              className="h-10 w-10 rounded-xl object-cover border border-slate-200"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                              <Package className="h-5 w-5" />
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-slate-900">{p.name}</p>
                            <p className="font-mono text-sky-700 text-[11px] font-semibold mt-0.5">
                              {p.sku}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                          {p.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        ₹{p.unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-1 rounded-full font-bold text-xs ${
                              isLow
                                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {p.currentStock} units
                          </span>
                          {isLow && (
                            <span className="text-[10px] font-bold text-rose-600 uppercase flex items-center gap-0.5">
                              <AlertTriangle className="h-3 w-3" /> Low
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 font-medium">
                        {p.minStockAlert} units
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 font-medium">
                        {p.location}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {canManageProducts && (
                            <>
                              <button
                                onClick={() => {
                                  setSelectedProductForImage(p);
                                  setImageModalOpen(true);
                                }}
                                title="Upload Product Photo (AWS S3 / Local)"
                                className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition"
                              >
                                <UploadCloud className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleOpenEditModal(p)}
                                title="Edit Product Specs"
                                className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProduct ? `Edit SKU: ${editingProduct.sku}` : 'Register New Product in Catalog'}
        maxWidth="lg"
      >
        {formError && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
            {formError}
          </div>
        )}

        <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Product Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Industrial Drill 750W"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">SKU / Code *</label>
              <input
                type="text"
                required
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                placeholder="TL-DRL-750"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono uppercase focus:ring-2 focus:ring-sky-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Category *</label>
              <input
                type="text"
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="e.g. Power Tools"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Unit Wholesale Price (₹) *</label>
              <input
                type="number"
                step="0.01"
                min="1"
                required
                value={formData.unitPrice}
                onChange={(e) => setFormData({ ...formData, unitPrice: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:bg-white font-semibold"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Min Stock Alert Quantity *</label>
              <input
                type="number"
                min="0"
                required
                value={formData.minStockAlert}
                onChange={(e) => setFormData({ ...formData, minStockAlert: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:bg-white"
              />
            </div>
          </div>

          {!editingProduct && (
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Initial Stock (Units) *</label>
              <input
                type="number"
                min="0"
                required
                value={formData.currentStock}
                onChange={(e) => setFormData({ ...formData, currentStock: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:bg-white"
              />
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Warehouse Location / Shelf / Bay *</label>
            <input
              type="text"
              required
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="e.g. Warehouse A - Bay 3"
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
              {formLoading ? 'Saving...' : editingProduct ? 'Update Product' : 'Register Product'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Image Upload Modal */}
      <Modal
        isOpen={imageModalOpen}
        onClose={() => setImageModalOpen(false)}
        title={`Upload Photo for ${selectedProductForImage?.name}`}
        maxWidth="md"
      >
        <form onSubmit={handleUploadImage} className="space-y-4 text-xs">
          <p className="text-slate-500">
            Upload product image. If AWS S3 credentials are configured in .env, the image will be uploaded to AWS S3; otherwise it is safely stored locally.
          </p>

          <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:border-sky-400 transition bg-slate-50/50">
            <UploadCloud className="mx-auto h-8 w-8 text-slate-400 mb-2" />
            <label className="block cursor-pointer">
              <span className="px-3 py-1.5 rounded-lg bg-sky-600 text-white font-semibold hover:bg-sky-500 transition">
                Choose Image File
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
              />
            </label>
            {imageFile && (
              <p className="mt-3 text-xs text-emerald-700 font-semibold flex items-center justify-center gap-1">
                <CheckCircle2 className="h-4 w-4" /> Selected: {imageFile.name}
              </p>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setImageModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!imageFile || uploadingImage}
              className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold disabled:opacity-50"
            >
              {uploadingImage ? 'Uploading...' : 'Upload Image'}
            </button>
          </div>
        </form>
      </Modal>
    </Layout>
  );
};
