import React from 'react';

interface StatusBadgeProps {
  status: string;
  type?: 'enquiry' | 'quotation' | 'order' | 'general';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  let badgeStyle = 'bg-slate-100 text-slate-700 border-slate-300';

  switch (status.toUpperCase()) {
    // Enquiry & Order New/Pending
    case 'NEW':
    case 'PENDING':
      badgeStyle = 'bg-amber-50 text-amber-700 border-amber-200 ring-1 ring-amber-400/20';
      break;

    // Quotation States
    case 'DRAFT':
      badgeStyle = 'bg-slate-100 text-slate-700 border-slate-200';
      break;
    case 'SENT':
    case 'QUOTED':
      badgeStyle = 'bg-blue-50 text-blue-700 border-blue-200 ring-1 ring-blue-400/20';
      break;
    case 'ACCEPTED':
    case 'WON':
    case 'CONFIRMED':
      badgeStyle = 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-1 ring-emerald-400/20';
      break;

    // Dispatched
    case 'DISPATCHED':
      badgeStyle = 'bg-purple-50 text-purple-700 border-purple-200 ring-1 ring-purple-400/20';
      break;

    // Rejections / Cancellations
    case 'REJECTED':
    case 'CANCELLED':
    case 'LOST':
      badgeStyle = 'bg-rose-50 text-rose-700 border-rose-200 ring-1 ring-rose-400/20';
      break;

    default:
      badgeStyle = 'bg-slate-100 text-slate-700 border-slate-200';
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider border ${badgeStyle}`}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-70"></span>
      {status}
    </span>
  );
};
