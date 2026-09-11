import React from 'react';

interface StatusBadgeProps {
  status: string;
  type?: 'challan' | 'customer' | 'invoice' | 'stock' | 'movement';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, type = 'challan' }) => {
  let colorClass = 'bg-slate-100 text-slate-700 border-slate-200';

  const s = status.toUpperCase();

  if (s === 'CONFIRMED' || s === 'ACTIVE' || s === 'PAID' || s === 'IN') {
    colorClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  } else if (s === 'DRAFT' || s === 'LEAD') {
    colorClass = 'bg-amber-50 text-amber-700 border-amber-200';
  } else if (s === 'CANCELLED' || s === 'INACTIVE' || s === 'OUT') {
    colorClass = 'bg-rose-50 text-rose-700 border-rose-200';
  } else if (s === 'ISSUED') {
    colorClass = 'bg-sky-50 text-sky-700 border-sky-200';
  } else if (s === 'LOW_STOCK') {
    colorClass = 'bg-red-100 text-red-800 border-red-300 font-semibold';
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorClass}`}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-75" />
      {status}
    </span>
  );
};
