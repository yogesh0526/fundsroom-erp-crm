import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Layers,
  FileQuestion,
  FileSpreadsheet,
  ShoppingCart,
  LogOut,
  ShieldCheck,
  UserCheck,
  Truck,
  ArrowRight,
} from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, setCurrentTab }) => {
  const { user, role, logout } = useAuth();

  const navItems = [
    { id: 'enquiries', label: '1. Enquiries', icon: FileQuestion },
    { id: 'quotations', label: '2. Quotations', icon: FileSpreadsheet },
    { id: 'orders', label: '3. Sales Orders & Stock', icon: ShoppingCart },
  ];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
      {/* Top Workflow Tracker Bar */}
      <div className="bg-slate-900 text-slate-300 px-6 py-1.5 text-xs flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <Layers className="w-4 h-4 text-blue-400" />
          <span className="font-semibold tracking-wide text-white">INDUSTRIAL ERP WORKFLOW:</span>
          <div className="hidden md:flex items-center space-x-1 text-[11px]">
            <span className="text-amber-400 font-medium">Customer Enquiry</span>
            <ArrowRight className="w-3 h-3 text-slate-500" />
            <span className="text-blue-400 font-medium">Quotation</span>
            <ArrowRight className="w-3 h-3 text-slate-500" />
            <span className="text-emerald-400 font-medium">Sales Order</span>
            <ArrowRight className="w-3 h-3 text-slate-500" />
            <span className="text-indigo-400 font-medium">Inventory Reservation</span>
            <ArrowRight className="w-3 h-3 text-slate-500" />
            <span className="text-purple-400 font-medium">Dispatch</span>
          </div>
        </div>
        <div className="flex items-center space-x-3 text-xs">
          <span className="text-slate-400">PostgreSQL + Express + React + Node</span>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-8">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black shadow-md shadow-blue-500/20">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-slate-900 text-base leading-tight">SupplyPro ERP</h1>
              <p className="text-[11px] text-slate-500 font-medium">Industrial Products & Distribution</p>
            </div>
          </div>

          <nav className="hidden md:flex space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentTab(item.id)}
                  className={`flex items-center px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 shadow-xs border border-blue-200'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className={`w-4 h-4 mr-2 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Role Badge & Actions */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-right">
            <div>
              <div className="text-xs font-bold text-slate-800">{user?.name}</div>
              <div className="text-[10px] text-slate-400">{user?.email}</div>
            </div>
            <div
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider flex items-center space-x-1 ${
                role === 'ADMIN'
                  ? 'bg-purple-100 text-purple-800 border border-purple-200'
                  : 'bg-blue-100 text-blue-800 border border-blue-200'
              }`}
            >
              {role === 'ADMIN' ? (
                <ShieldCheck className="w-3.5 h-3.5 text-purple-600 mr-1" />
              ) : (
                <UserCheck className="w-3.5 h-3.5 text-blue-600 mr-1" />
              )}
              {role}
            </div>
          </div>

          <button
            onClick={logout}
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
