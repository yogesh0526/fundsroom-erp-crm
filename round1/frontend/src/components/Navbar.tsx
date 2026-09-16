import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Role } from '../types';
import { ShieldAlert, ChevronDown, Check, UserCircle2 } from 'lucide-react';

export const Navbar: React.FC<{ title: string; subtitle?: string }> = ({ title, subtitle }) => {
  const { user, quickLogin } = useAuth();
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  const roles: { role: Role; label: string; desc: string }[] = [
    { role: 'ADMIN', label: 'Admin', desc: 'Full System Access' },
    { role: 'SALES', label: 'Sales Executive', desc: 'CRM & Challan Dispatch' },
    { role: 'WAREHOUSE', label: 'Warehouse Manager', desc: 'Inventory & Stock In/Out' },
    { role: 'ACCOUNTS', label: 'Accounts Officer', desc: 'Billing & Invoice PDF' },
  ];

  const handleRoleChange = async (targetRole: Role) => {
    try {
      setSwitching(true);
      await quickLogin(targetRole);
      setRoleDropdownOpen(false);
    } catch (e) {
      console.error('Failed to switch role', e);
    } finally {
      setSwitching(false);
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-8 flex items-center justify-between sticky top-0 z-30 shadow-sm">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight leading-tight">{title}</h2>
        {subtitle && <p className="text-xs text-slate-500 font-medium">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-4">
        {/* System Health indicator */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/60 text-xs font-medium text-emerald-700">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          PostgreSQL Connected
        </div>

        {/* Quick Role Switcher Demo Toolbar */}
        <div className="relative">
          <button
            onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
            disabled={switching}
            className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl border border-sky-200 bg-sky-50 text-sky-900 hover:bg-sky-100 transition shadow-sm text-xs font-semibold"
          >
            <ShieldAlert className="h-4 w-4 text-sky-600" />
            <span>Role: <span className="text-sky-700 font-bold">{user?.role}</span></span>
            <ChevronDown className={`h-3.5 w-3.5 text-sky-600 transition-transform ${roleDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {roleDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setRoleDropdownOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white p-2 shadow-2xl border border-slate-100 z-50 animate-in fade-in zoom-in-95">
                <div className="px-3 py-2 border-b border-slate-100">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Switch Test Persona
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Test role-based access instantly
                  </p>
                </div>
                <div className="py-1 space-y-1">
                  {roles.map((r) => {
                    const isCurrent = user?.role === r.role;
                    return (
                      <button
                        key={r.role}
                        onClick={() => handleRoleChange(r.role)}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs transition flex items-center justify-between ${
                          isCurrent
                            ? 'bg-sky-50 text-sky-900 font-bold'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div>
                          <p className="font-semibold">{r.label}</p>
                          <p className="text-[10px] text-slate-400">{r.desc}</p>
                        </div>
                        {isCurrent && <Check className="h-4 w-4 text-sky-600" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* User Avatar */}
        <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
          <UserCircle2 className="h-7 w-7 text-slate-400" />
          <div className="hidden lg:block text-left">
            <p className="text-xs font-semibold text-slate-800 leading-none">{user?.name}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{user?.email}</p>
          </div>
        </div>
      </div>
    </header>
  );
};
