import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  color?: 'blue' | 'emerald' | 'amber' | 'purple' | 'rose';
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  change,
  changeType = 'neutral',
  color = 'blue',
  onClick,
}) => {
  const colorMap = {
    blue: { bg: 'bg-sky-50 text-sky-600', border: 'hover:border-sky-300' },
    emerald: { bg: 'bg-emerald-50 text-emerald-600', border: 'hover:border-emerald-300' },
    amber: { bg: 'bg-amber-50 text-amber-600', border: 'hover:border-amber-300' },
    purple: { bg: 'bg-purple-50 text-purple-600', border: 'hover:border-purple-300' },
    rose: { bg: 'bg-rose-50 text-rose-600', border: 'hover:border-rose-300' },
  }[color];

  return (
    <div
      onClick={onClick}
      className={`rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:shadow-md ' + colorMap.border : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
        </div>
        <div className={`rounded-2xl p-3 ${colorMap.bg}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
      {change && (
        <div className="mt-4 flex items-center text-xs font-medium">
          <span
            className={
              changeType === 'positive'
                ? 'text-emerald-600'
                : changeType === 'negative'
                ? 'text-rose-600'
                : 'text-slate-500'
            }
          >
            {change}
          </span>
        </div>
      )}
    </div>
  );
};
