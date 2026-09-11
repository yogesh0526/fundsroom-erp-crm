import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Package,
  Boxes,
  FileSpreadsheet,
  Receipt,
  FileCode,
  LogOut,
  Building2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: ('ADMIN' | 'SALES' | 'WAREHOUSE' | 'ACCOUNTS')[];
  external?: boolean;
}

export const Sidebar: React.FC = () => {
  const { user, logout, hasRole } = useAuth();

  const navItems: NavItem[] = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Customers CRM', path: '/customers', icon: Users, roles: ['ADMIN', 'SALES', 'ACCOUNTS'] },
    { name: 'Products Catalog', path: '/products', icon: Package },
    { name: 'Stock Movements', path: '/inventory', icon: Boxes, roles: ['ADMIN', 'WAREHOUSE'] },
    { name: 'Sales Challans', path: '/challans', icon: FileSpreadsheet },
    { name: 'Invoices & Billing', path: '/invoices', icon: Receipt, roles: ['ADMIN', 'ACCOUNTS'] },
    { name: 'Swagger API Docs', path: '/api/docs', icon: FileCode, external: true },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 h-screen sticky top-0 border-r border-slate-800">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 gap-3 border-b border-slate-800/80 bg-slate-950/40">
        <div className="h-10 w-10 rounded-xl bg-sky-500 flex items-center justify-center text-white shadow-lg shadow-sky-500/20">
          <Building2 className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-bold text-white text-base tracking-tight leading-none">FUNDSROOM</h1>
          <p className="text-[11px] text-sky-400 font-medium tracking-wider uppercase mt-1">
            ERP + CRM Portal
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Operations Modules
        </div>
        {navItems.map((item) => {
          if (item.roles && !hasRole(...item.roles)) {
            return null;
          }

          if (item.external) {
            return (
              <a
                key={item.name}
                href={item.path}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800/60 transition group"
              >
                <item.icon className="h-4 w-4 text-slate-400 group-hover:text-sky-400 transition" />
                <span>{item.name}</span>
                <span className="ml-auto text-[10px] bg-slate-800 text-sky-400 px-1.5 py-0.5 rounded font-mono">
                  EXT
                </span>
              </a>
            );
          }

          return (
            <NavLink
              key={item.name}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                  isActive
                    ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`
              }
            >
              <item.icon className="h-4 w-4" />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* User Footer Profile */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-sm font-bold text-sky-400 shrink-0">
              {user?.name ? user.name[0].toUpperCase() : 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white truncate">{user?.name || 'User'}</p>
              <span className="inline-block text-[10px] font-bold px-1.5 py-0.2 rounded bg-sky-950 text-sky-400 border border-sky-800/60">
                {user?.role}
              </span>
            </div>
          </div>
          <button
            onClick={logout}
            title="Sign out"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
