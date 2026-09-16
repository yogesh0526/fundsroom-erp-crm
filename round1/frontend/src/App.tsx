import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Customers } from './pages/Customers';
import { CustomerDetail } from './pages/CustomerDetail';
import { Products } from './pages/Products';
import { Inventory } from './pages/Inventory';
import { Challans } from './pages/Challans';
import { ChallanCreate } from './pages/ChallanCreate';
import { ChallanDetail } from './pages/ChallanDetail';
import { Invoices } from './pages/Invoices';
import { Role } from './types';

const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  allowedRoles?: Role[];
}> = ({ children, allowedRoles }) => {
  const { user, loading, hasRole } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white text-sm">
        Authenticating ERP session...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !hasRole(...allowedRoles)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/customers"
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'SALES', 'ACCOUNTS']}>
                <Customers />
              </ProtectedRoute>
            }
          />

          <Route
            path="/customers/:id"
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'SALES', 'ACCOUNTS']}>
                <CustomerDetail />
              </ProtectedRoute>
            }
          />

          <Route
            path="/products"
            element={
              <ProtectedRoute>
                <Products />
              </ProtectedRoute>
            }
          />

          <Route
            path="/inventory"
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'WAREHOUSE']}>
                <Inventory />
              </ProtectedRoute>
            }
          />

          <Route
            path="/challans"
            element={
              <ProtectedRoute>
                <Challans />
              </ProtectedRoute>
            }
          />

          <Route
            path="/challans/create"
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'SALES']}>
                <ChallanCreate />
              </ProtectedRoute>
            }
          />

          <Route
            path="/challans/:id"
            element={
              <ProtectedRoute>
                <ChallanDetail />
              </ProtectedRoute>
            }
          />

          <Route
            path="/invoices"
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'ACCOUNTS']}>
                <Invoices />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
