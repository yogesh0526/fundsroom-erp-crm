import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';
import { Lock, Mail, ShieldCheck, UserCheck, Truck, ArrowRight, CheckCircle2 } from 'lucide-react';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState<string>('admin@erp.com');
  const [password, setPassword] = useState<string>('admin123');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await apiService.login({ email, password });
      if (res.data?.success) {
        login(res.data.data.token, res.data.data.user);
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const setDemoCredentials = (role: 'ADMIN' | 'SALES') => {
    if (role === 'ADMIN') {
      setEmail('admin@erp.com');
      setPassword('admin123');
    } else {
      setEmail('sales@erp.com');
      setPassword('sales123');
    }
    setErrorMsg('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full grid md:grid-cols-2 bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-700/50">
        {/* Left Side: Overview & Role Matrix */}
        <div className="p-8 bg-slate-900 text-white flex flex-col justify-between border-r border-slate-800">
          <div>
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/30">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-black tracking-tight">SupplyPro ERP</h2>
                <p className="text-xs text-blue-400 font-semibold uppercase tracking-wider">PERN Stack Architecture</p>
              </div>
            </div>

            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              End-to-end industrial supply workflow engine covering Customer Enquiry, Quotation Pricing,
              Sales Order Conversion, Concurrency-Safe Stock Reservation, and Order Dispatch.
            </p>

            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700">
                <div className="flex items-center text-purple-400 text-xs font-bold mb-2">
                  <ShieldCheck className="w-4 h-4 mr-1.5" />
                  ADMIN ROLE CAPABILITIES
                </div>
                <ul className="text-xs text-slate-300 space-y-1">
                  <li className="flex items-center"><CheckCircle2 className="w-3 h-3 mr-1.5 text-purple-400" /> View all ERP records & ledger</li>
                  <li className="flex items-center"><CheckCircle2 className="w-3 h-3 mr-1.5 text-purple-400" /> Manage warehouse inventory stock</li>
                  <li className="flex items-center"><CheckCircle2 className="w-3 h-3 mr-1.5 text-purple-400" /> Confirm Sales Orders (Triggers Reservation)</li>
                  <li className="flex items-center"><CheckCircle2 className="w-3 h-3 mr-1.5 text-purple-400" /> Process stock dispatch & vehicle assignment</li>
                </ul>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700">
                <div className="flex items-center text-blue-400 text-xs font-bold mb-2">
                  <UserCheck className="w-4 h-4 mr-1.5" />
                  SALES USER CAPABILITIES
                </div>
                <ul className="text-xs text-slate-300 space-y-1">
                  <li className="flex items-center"><CheckCircle2 className="w-3 h-3 mr-1.5 text-blue-400" /> Create customers & product enquiries</li>
                  <li className="flex items-center"><CheckCircle2 className="w-3 h-3 mr-1.5 text-blue-400" /> Generate quotations with GST & discounts</li>
                  <li className="flex items-center"><CheckCircle2 className="w-3 h-3 mr-1.5 text-blue-400" /> Convert accepted quotes into Sales Orders</li>
                  <li className="flex items-center"><CheckCircle2 className="w-3 h-3 mr-1.5 text-blue-400" /> Real-time inventory availability lookup</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="pt-6 text-[11px] text-slate-500 border-t border-slate-800">
            Enforced via backend RBAC middleware & PostgreSQL row-level locks.
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="p-8 flex flex-col justify-center">
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-slate-900">Sign in to ERP</h3>
            <p className="text-xs text-slate-500 mt-1">Select a demo persona or enter your credentials</p>
          </div>

          {/* Quick Demo Switchers */}
          <div className="grid grid-cols-2 gap-2.5 mb-6">
            <button
              type="button"
              onClick={() => setDemoCredentials('ADMIN')}
              className={`p-3 text-left rounded-xl border transition-all ${
                email === 'admin@erp.com'
                  ? 'border-purple-500 bg-purple-50/70 ring-1 ring-purple-500/30'
                  : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
              }`}
            >
              <div className="text-[11px] font-bold text-purple-700 flex items-center">
                <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                Demo Admin
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">admin@erp.com</div>
            </button>

            <button
              type="button"
              onClick={() => setDemoCredentials('SALES')}
              className={`p-3 text-left rounded-xl border transition-all ${
                email === 'sales@erp.com'
                  ? 'border-blue-500 bg-blue-50/70 ring-1 ring-blue-500/30'
                  : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
              }`}
            >
              <div className="text-[11px] font-bold text-blue-700 flex items-center">
                <UserCheck className="w-3.5 h-3.5 mr-1" />
                Demo Sales User
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">sales@erp.com</div>
            </button>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center space-x-1.5 shadow-md shadow-blue-500/20 disabled:opacity-50 transition"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
