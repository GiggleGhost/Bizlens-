import React from 'react';
import { DollarSign, Hash, TrendingUp, Layers } from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  iconType?: 'currency' | 'number' | 'trend' | 'default';
}

export const KpiCard: React.FC<KpiCardProps> = ({ title, value, subtitle, iconType = 'default' }) => {
  const formatValue = (val: string | number) => {
    if (typeof val === 'number') {
      if (Math.abs(val) >= 1000000) {
        return `${(val / 1000000).toFixed(2)}M`;
      }
      if (Math.abs(val) >= 1000) {
        return val.toLocaleString(undefined, { maximumFractionDigits: 2 });
      }
      return val % 1 === 0 ? val.toString() : val.toFixed(2);
    }
    return String(val);
  };

  const renderIcon = () => {
    switch (iconType) {
      case 'currency':
        return <DollarSign className="w-4 h-4 text-[#3578D4]" />;
      case 'number':
        return <Hash className="w-4 h-4 text-[#12A88A]" />;
      case 'trend':
        return <TrendingUp className="w-4 h-4 text-emerald-600" />;
      default:
        return <Layers className="w-4 h-4 text-[#3578D4]" />;
    }
  };

  return (
    <div className="rounded-xl bg-white border border-[#E2E8F0] p-4 shadow-xs hover:border-[#3578D4]/40 transition-all">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold uppercase tracking-wider text-[#68778D] truncate">
          {title.replace(/_/g, ' ')}
        </span>
        <div className="p-1.5 rounded-md bg-[#F7F9FC] border border-[#E2E8F0]">
          {renderIcon()}
        </div>
      </div>

      <div className="text-2xl font-bold text-[#263449] tracking-tight">
        {formatValue(value)}
      </div>

      {subtitle && (
        <p className="text-xs text-[#68778D] mt-1">
          {subtitle}
        </p>
      )}
    </div>
  );
};
