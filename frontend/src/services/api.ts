import axios from 'axios';

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (reqConfig) => {
    const token = localStorage.getItem('erp_token');
    if (token) {
      reqConfig.headers.Authorization = `Bearer ${token}`;
    }
    return reqConfig;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('erp_token');
      localStorage.removeItem('erp_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const apiService = {
  // Auth
  login: (data: any) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),

  // Products & Inventory
  getProducts: () => api.get('/products'),
  getInventory: () => api.get('/inventory'),
  updateInventory: (id: string, data: any) => api.patch(`/inventory/${id}`, data),

  // Customers
  getCustomers: () => api.get('/customers'),
  createCustomer: (data: any) => api.post('/customers', data),

  // Enquiries
  getEnquiries: (params?: any) => api.get('/enquiries', { params }),
  getEnquiryById: (id: string) => api.get(`/enquiries/${id}`),
  createEnquiry: (data: any) => api.post('/enquiries', data),
  updateEnquiryStatus: (id: string, status: string) => api.patch(`/enquiries/${id}/status`, { status }),

  // Quotations
  getQuotations: (params?: any) => api.get('/quotations', { params }),
  getQuotationById: (id: string) => api.get(`/quotations/${id}`),
  createQuotation: (data: any) => api.post('/quotations', data),
  updateQuotationStatus: (id: string, status: string) => api.patch(`/quotations/${id}/status`, { status }),
  convertToSalesOrder: (id: string) => api.post(`/quotations/${id}/convert`),

  // Sales Orders
  getSalesOrders: (params?: any) => api.get('/sales-orders', { params }),
  getSalesOrderById: (id: string) => api.get(`/sales-orders/${id}`),
  confirmSalesOrder: (id: string) => api.post(`/sales-orders/${id}/confirm`),
  dispatchSalesOrder: (id: string, data: { vehicleNumber: string; driverName: string; notes?: string }) =>
    api.post(`/sales-orders/${id}/dispatch`, data),
  cancelSalesOrder: (id: string) => api.post(`/sales-orders/${id}/cancel`),

  // Dispatches
  getDispatches: () => api.get('/dispatches'),
  getDispatchById: (id: string) => api.get(`/dispatches/${id}`),
};
