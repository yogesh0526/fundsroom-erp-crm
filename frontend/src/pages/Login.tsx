import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Role } from '../types';
import { Building2, Lock, Mail, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';

export const Login: React.FC = () => {
  const { login, quickLogin } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleQuickLogin = async (role: Role) => {
    setError(null);
    setLoading(true);
    try {
      await quickLogin(role);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to login with test account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="mx-auto h-14 w-14 rounded-2xl bg-sky-500 flex items-center justify-center text-white shadow-xl shadow-sky-500/25">
          <Building2 className="h-8 w-8" />
        </div>
        <h2 className="mt-5 text-3xl font-extrabold text-white tracking-tight">
          FUNDSROOM
        </h2>
        <p className="mt-1 text-sm text-sky-400 font-medium tracking-wide">
          Mini ERP + CRM Operations Portal
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-2xl rounded-3xl sm:px-10 border border-slate-100">
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
              {error}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Work Email Address
              </label>
              <div className="mt-1 relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@erp.com"
                  className="block w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Password
              </label>
              <div className="mt-1 relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-sky-600 hover:bg-sky-500 active:bg-sky-700 shadow-md shadow-sky-600/30 transition disabled:opacity-50"
            >
              <span>{loading ? 'Authenticating...' : 'Sign in to Portal'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {/* 1-Click Role Testing Preset Buttons */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <div className="flex items-center gap-1.5 mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span>1-Click Test Role Logins</span>
            </div>
            <p className="text-[11px] text-slate-500 mb-3">
              Click any role to auto-authenticate with pre-seeded test credentials:
            </p>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleRoleQuickLogin('ADMIN')}
                className="p-2.5 rounded-xl border border-purple-200 bg-purple-50/70 hover:bg-purple-100 text-purple-900 text-left transition"
              >
                <p className="text-xs font-bold flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-purple-600" /> Admin
                </p>
                <p className="text-[10px] text-purple-700">admin@erp.com</p>
              </button>

              <button
                type="button"
                onClick={() => handleRoleQuickLogin('SALES')}
                className="p-2.5 rounded-xl border border-sky-200 bg-sky-50/70 hover:bg-sky-100 text-sky-900 text-left transition"
              >
                <p className="text-xs font-bold flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-sky-600" /> Sales
                </p>
                <p className="text-[10px] text-sky-700">sales@erp.com</p>
              </button>

              <button
                type="button"
                onClick={() => handleRoleQuickLogin('WAREHOUSE')}
                className="p-2.5 rounded-xl border border-amber-200 bg-amber-50/70 hover:bg-amber-100 text-amber-900 text-left transition"
              >
                <p className="text-xs font-bold flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-amber-600" /> Warehouse
                </p>
                <p className="text-[10px] text-amber-700">warehouse@erp.com</p>
              </button>

              <button
                type="button"
                onClick={() => handleRoleQuickLogin('ACCOUNTS')}
                className="p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100 text-emerald-900 text-left transition"
              >
                <p className="text-xs font-bold flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Accounts
                </p>
                <p className="text-[10px] text-emerald-700">accounts@erp.com</p>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
