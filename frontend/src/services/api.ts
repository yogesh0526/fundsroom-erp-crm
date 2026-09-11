import axios from 'axios';
import { Customer, Product, StockMovement, Challan, Invoice, User } from '../types';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('erp_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 unauthorized
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear token if expired
      if (!window.location.pathname.includes('/login')) {
        localStorage.removeItem('erp_token');
        localStorage.removeItem('erp_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: (credentials: { email: string; password: string }) =>
    api.post<{ success: boolean; data: { token: string; user: User } }>('/auth/login', credentials),
  getMe: () => api.get<{ success: boolean; data: User }>('/auth/me'),
};

export const customerApi = {
  list: (params?: { search?: string; type?: string; status?: string; page?: number; limit?: number }) =>
    api.get<{ success: boolean; data: Customer[]; meta: any }>('/customers', { params }),
  getById: (id: string) =>
    api.get<{ success: boolean; data: Customer }>('/customers/' + id),
  create: (data: any) =>
    api.post<{ success: boolean; data: Customer }>('/customers', data),
  update: (id: string, data: any) =>
    api.put<{ success: boolean; data: Customer }>('/customers/' + id, data),
  addFollowUp: (id: string, data: { note: string; nextFollowUpDate?: string | null }) =>
    api.post<{ success: boolean; data: any }>(`/customers/${id}/follow-ups`, data),
};

export const productApi = {
  list: (params?: { search?: string; category?: string; lowStock?: boolean; page?: number; limit?: number }) =>
    api.get<{ success: boolean; data: Product[]; meta: any }>('/products', { params }),
  getById: (id: string) =>
    api.get<{ success: boolean; data: Product }>('/products/' + id),
  create: (data: any) =>
    api.post<{ success: boolean; data: Product }>('/products', data),
  update: (id: string, data: any) =>
    api.put<{ success: boolean; data: Product }>('/products/' + id, data),
  uploadImage: (id: string, formData: FormData) =>
    api.post<{ success: boolean; data: { imageUrl: string; product: Product } }>(
      `/products/${id}/image`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    ),
};

export const inventoryApi = {
  adjust: (data: { productId: string; quantity: number; movementType: 'IN' | 'OUT'; reason: string }) =>
    api.post<{ success: boolean; message: string; data: any }>('/inventory/adjust', data),
  listMovements: (params?: { productId?: string; movementType?: string; search?: string; page?: number; limit?: number }) =>
    api.get<{ success: boolean; data: StockMovement[]; meta: any }>('/inventory/movements', { params }),
};

export const challanApi = {
  list: (params?: { search?: string; status?: string; customerId?: string; page?: number; limit?: number }) =>
    api.get<{ success: boolean; data: Challan[]; meta: any }>('/challans', { params }),
  getById: (id: string) =>
    api.get<{ success: boolean; data: Challan }>('/challans/' + id),
  create: (data: { customerId: string; items: { productId: string; quantity: number }[]; status: 'DRAFT' | 'CONFIRMED'; notes?: string }) =>
    api.post<{ success: boolean; message: string; data: Challan }>('/challans', data),
  updateStatus: (id: string, status: 'CONFIRMED' | 'CANCELLED') =>
    api.patch<{ success: boolean; message: string; data: Challan }>(`/challans/${id}/status`, { status }),
  downloadPdfUrl: (id: string) => `/api/challans/${id}/pdf`,
};

export const invoiceApi = {
  list: (params?: { search?: string; status?: string; page?: number; limit?: number }) =>
    api.get<{ success: boolean; data: Invoice[]; meta: any }>('/invoices', { params }),
  getById: (id: string) =>
    api.get<{ success: boolean; data: Invoice }>('/invoices/' + id),
  generate: (challanId: string) =>
    api.post<{ success: boolean; message: string; data: Invoice }>(`/invoices/generate/${challanId}`),
  downloadPdfUrl: (id: string) => `/api/invoices/${id}/pdf`,
};

export default api;
