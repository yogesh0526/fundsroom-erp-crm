import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Login } from './pages/Login';
import { Enquiries } from './pages/Enquiries';
import { Quotations } from './pages/Quotations';
import { SalesOrders } from './pages/SalesOrders';

const AppContent: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('orders');
  const [selectedEnquiryForQuote, setSelectedEnquiryForQuote] = useState<string | undefined>(undefined);
  const [selectedOrderForView, setSelectedOrderForView] = useState<string | undefined>(undefined);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  const handleNavigateToQuote = (enquiryId: string) => {
    setSelectedEnquiryForQuote(enquiryId);
    setCurrentTab('quotations');
  };

  const handleNavigateToOrders = (orderId?: string) => {
    setSelectedOrderForView(orderId);
    setCurrentTab('orders');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Navbar currentTab={currentTab} setCurrentTab={setCurrentTab} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {currentTab === 'enquiries' && (
          <Enquiries onNavigateToQuote={handleNavigateToQuote} />
        )}

        {currentTab === 'quotations' && (
          <Quotations
            initialEnquiryId={selectedEnquiryForQuote}
            onNavigateToOrders={handleNavigateToOrders}
          />
        )}

        {currentTab === 'orders' && (
          <SalesOrders initialOrderId={selectedOrderForView} />
        )}
      </main>

      <footer className="bg-white border-t border-slate-200 py-3 text-center text-xs text-slate-400">
        SupplyPro ERP • PERN Stack Technical Case Study • Customer Enquiry → Quotation → Sales Order → Inventory Reservation → Dispatch
      </footer>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
