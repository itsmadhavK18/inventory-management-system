import { useMemo } from 'react';
import { ITEM_TYPES } from '../../utils/constants';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import { Sparkles, Layers, ShieldCheck, Warehouse } from 'lucide-react';

export default function InventoryDistribution({ items = [], loading = false }) {
  const stats = useMemo(() => {
    if (!items.length) {
      return {
        total: 0,
        rawCount: 0,
        finishedCount: 0,
        rawPercent: 0,
        finishedPercent: 0,
        rawValue: 0,
        finishedValue: 0,
        totalValue: 0,
        healthyCount: 0,
        lowCount: 0,
        outCount: 0,
        healthyPercent: 0,
        lowPercent: 0,
        outPercent: 0,
      };
    }

    const total = items.length;
    let rawCount = 0;
    let finishedCount = 0;
    let rawValue = 0;
    let finishedValue = 0;
    let healthyCount = 0;
    let lowCount = 0;
    let outCount = 0;

    items.forEach((item) => {
      const qty = Number(item.quantity) || 0;
      const cost = Number(item.cost_per_unit) || 0;
      const val = qty * cost;
      const threshold = Number(item.threshold) || 0;

      if (item.type === ITEM_TYPES.RAW) {
        rawCount += 1;
        rawValue += val;
      } else {
        finishedCount += 1;
        finishedValue += val;
      }

      if (qty <= 0) {
        outCount += 1;
      } else if (qty <= threshold) {
        lowCount += 1;
      } else {
        healthyCount += 1;
      }
    });

    const totalVal = rawValue + finishedValue;

    return {
      total,
      rawCount,
      finishedCount,
      rawPercent: total > 0 ? Math.round((rawCount / total) * 100) : 0,
      finishedPercent: total > 0 ? Math.round((finishedCount / total) * 100) : 0,
      rawValue,
      finishedValue,
      totalValue: totalVal,
      healthyCount,
      lowCount,
      outCount,
      healthyPercent: total > 0 ? Math.round((healthyCount / total) * 100) : 0,
      lowPercent: total > 0 ? Math.round((lowCount / total) * 100) : 0,
      outPercent: total > 0 ? Math.round((outCount / total) * 100) : 0,
    };
  }, [items]);

  // Circumference of SVG circle with r=48 is 2 * Math.PI * 48 ≈ 301.59
  const circumference = 301.59;
  const healthyDash = (stats.healthyPercent / 100) * circumference;
  const lowDash = (stats.lowPercent / 100) * circumference;
  const outDash = (stats.outPercent / 100) * circumference;

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 p-6 rounded-xl bg-[#131b2e] border border-[#334155] animate-pulse h-80" />
        <div className="lg:col-span-5 p-6 rounded-xl bg-[#131b2e] border border-[#334155] animate-pulse h-80" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left 7 Columns: Inventory Valuation Breakdown */}
      <section className="lg:col-span-7 p-6 rounded-xl bg-[#131b2e] border border-[#334155] shadow-md flex flex-col justify-between gap-6">
        <div>
          <div className="flex flex-col gap-2 mb-6">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="font-headline text-xl font-bold text-[#f8fafc] tracking-tight">
                Inventory Valuation Breakdown
              </h2>
              <span className="font-headline text-sm font-bold text-[#10b981] tabular-nums px-3 py-1.5 rounded-lg bg-[#10b981]/15 border border-[#10b981]/30">
                {formatCurrency(stats.totalValue)} Total
              </span>
            </div>
            <p className="text-xs text-[#94a3b8]">
              Distinct allocation across unprocessed workshop raw materials versus completed bespoke furniture commissions.
            </p>
          </div>

          {/* Split Progress Bar */}
          <div className="w-full flex flex-col gap-2 mb-6">
            <div className="w-full h-4 rounded-full bg-[#060e20] flex overflow-hidden p-0.5 border border-[#1e293b]">
              <div
                className="h-full bg-[#4f46e5] rounded-l-full transition-all duration-500"
                style={{ width: `${Math.max(stats.rawPercent, stats.rawCount > 0 ? 3 : 0)}%` }}
                title={`Raw Materials: ${stats.rawPercent}%`}
              />
              <div
                className="h-full bg-[#38bdf8] rounded-r-full transition-all duration-500"
                style={{ width: `${Math.max(stats.finishedPercent, stats.finishedCount > 0 ? 3 : 0)}%` }}
                title={`Finished Goods: ${stats.finishedPercent}%`}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-[#94a3b8] font-medium">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#4f46e5]" />
                Raw Materials ({stats.rawPercent}%)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#38bdf8]" />
                Finished Goods ({stats.finishedPercent}%)
              </span>
            </div>
          </div>

          {/* Detail Cards for Raw Materials & Finished Goods */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            {/* Card 1: Raw Materials */}
            <div className="p-4 rounded-xl bg-[#171f33] border border-[#334155] flex flex-col justify-between gap-3 shadow-sm">
              <div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-xs font-semibold text-[#c3c0ff]">
                    <span className="h-2 w-2 rounded-full bg-[#4f46e5]" />
                    Raw Materials
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#222a3d] text-[#94a3b8] border border-[#334155]">
                    {stats.rawCount} SKUs
                  </span>
                </div>
                <div className="font-headline text-2xl font-bold tabular-nums text-[#f8fafc] mt-2.5">
                  {formatCurrency(stats.rawValue)}
                </div>
                <p className="text-xs text-[#94a3b8] mt-1 line-clamp-2">
                  Hardwood timber, veneers, metal hardware, structural fasteners & lacquer.
                </p>
              </div>
              <div className="mt-2 pt-2 text-[#10b981] text-[11px] font-semibold flex items-center gap-1.5 border-t border-[#1e293b]">
                <Sparkles size={12} className="text-[#10b981]" />
                <span>{stats.rawPercent}% Allocated Atelier Working Capital</span>
              </div>
            </div>

            {/* Card 2: Finished Goods */}
            <div className="p-4 rounded-xl bg-[#171f33] border border-[#334155] flex flex-col justify-between gap-3 shadow-sm">
              <div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-xs font-semibold text-[#38bdf8]">
                    <span className="h-2 w-2 rounded-full bg-[#38bdf8]" />
                    Finished Goods
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#222a3d] text-[#94a3b8] border border-[#334155]">
                    {stats.finishedCount} SKUs
                  </span>
                </div>
                <div className="font-headline text-2xl font-bold tabular-nums text-[#f8fafc] mt-2.5">
                  {formatCurrency(stats.finishedValue)}
                </div>
                <p className="text-xs text-[#94a3b8] mt-1 line-clamp-2">
                  Completed bespoke dining tables, modular credenzas & client commissions.
                </p>
              </div>
              <div className="mt-2 pt-2 text-[#38bdf8] text-[11px] font-semibold flex items-center gap-1.5 border-t border-[#1e293b]">
                <Layers size={12} className="text-[#38bdf8]" />
                <span>{stats.finishedPercent}% Value Scheduled for Client Dispatch</span>
              </div>
            </div>
          </div>
        </div>

        {/* Facility Metric Footer */}
        <div className="p-3.5 rounded-xl bg-[#060e20] border border-[#1e293b] flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-2.5">
            <Warehouse size={18} className="text-[#94a3b8] shrink-0" />
            <div>
              <div className="font-semibold text-[#f8fafc]">Active Atelier Catalog Coverage</div>
              <div className="text-[#94a3b8] text-[11px]">
                {stats.total} total inventory items monitored across raw stock and finished goods
              </div>
            </div>
          </div>
          <span className="px-3 py-1 rounded-lg bg-[#222a3d] text-[#f8fafc] font-semibold tabular-nums text-xs border border-[#334155]">
            {stats.rawCount} Raw : {stats.finishedCount} Finished
          </span>
        </div>
      </section>

      {/* Right 5 Columns: Stock Health Overview */}
      <section className="lg:col-span-5 p-6 rounded-xl bg-[#131b2e] border border-[#334155] shadow-md flex flex-col justify-between gap-6">
        <div>
          <div className="flex flex-col gap-2 mb-5">
            <div className="flex items-center justify-between">
              <h2 className="font-headline text-xl font-bold text-[#f8fafc] tracking-tight">
                Stock Health Overview
              </h2>
              <span className="px-2.5 py-0.5 rounded bg-[#006e4b] text-[#67f4b7] text-[10px] uppercase font-bold border border-[#10b981]/30">
                Live Audit
              </span>
            </div>
            <p className="text-xs text-[#94a3b8]">
              Aggregate health distribution across entire operational catalog of {stats.total} monitored items.
            </p>
          </div>

          {/* Inline SVG Radial / Gauge Chart */}
          <div className="flex items-center justify-center py-4 relative">
            <svg className="w-44 h-44 transform -rotate-90" viewBox="0 0 120 120">
              {/* Background Ring */}
              <circle
                className="text-[#2d3449]"
                cx="60"
                cy="60"
                fill="none"
                r="48"
                stroke="currentColor"
                strokeWidth="10"
              />
              {/* Healthy Segment (emerald) */}
              {stats.healthyCount > 0 && (
                <circle
                  className="text-[#10b981] transition-all duration-700"
                  cx="60"
                  cy="60"
                  fill="none"
                  r="48"
                  stroke="currentColor"
                  strokeWidth="10"
                  strokeDasharray={`${healthyDash} ${circumference}`}
                  strokeDashoffset="0"
                  strokeLinecap="round"
                />
              )}
              {/* Low Stock Segment (secondary / azure) */}
              {stats.lowCount > 0 && (
                <circle
                  className="text-[#38bdf8] transition-all duration-700"
                  cx="60"
                  cy="60"
                  fill="none"
                  r="48"
                  stroke="currentColor"
                  strokeWidth="10"
                  strokeDasharray={`${lowDash} ${circumference}`}
                  strokeDashoffset={-(healthyDash)}
                />
              )}
              {/* Critical Segment (error / rose) */}
              {stats.outCount > 0 && (
                <circle
                  className="text-[#ef4444] transition-all duration-700"
                  cx="60"
                  cy="60"
                  fill="none"
                  r="48"
                  stroke="currentColor"
                  strokeWidth="10"
                  strokeDasharray={`${outDash} ${circumference}`}
                  strokeDashoffset={-(healthyDash + lowDash)}
                />
              )}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="font-headline text-3xl font-bold tracking-tight text-[#f8fafc] tabular-nums">
                {stats.healthyPercent}%
              </span>
              <span className="text-[11px] text-[#10b981] uppercase font-bold tracking-wider mt-0.5">
                Healthy Yield
              </span>
            </div>
          </div>

          {/* Telemetry Legend List */}
          <div className="flex flex-col gap-2.5 pt-2">
            <div className="flex items-center justify-between p-3 px-3.5 rounded-lg bg-[#171f33] border border-[#334155]/60 shadow-sm">
              <div className="flex items-center gap-2.5">
                <span className="h-2 w-2 rounded-full bg-[#10b981]" />
                <span className="text-xs text-[#f8fafc] font-medium">Adequate Inventory</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-semibold tabular-nums text-[#f8fafc]">
                  {formatNumber(stats.healthyCount)} SKUs
                </span>
                <span className="text-[11px] font-bold text-[#10b981]">
                  {stats.healthyPercent}%
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 px-3.5 rounded-lg bg-[#171f33] border border-[#334155]/60 shadow-sm">
              <div className="flex items-center gap-2.5">
                <span className="h-2 w-2 rounded-full bg-[#38bdf8]" />
                <span className="text-xs text-[#f8fafc] font-medium">Low Stock / Buffering</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-semibold tabular-nums text-[#f8fafc]">
                  {formatNumber(stats.lowCount)} SKUs
                </span>
                <span className="text-[11px] font-bold text-[#38bdf8]">
                  {stats.lowPercent}%
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 px-3.5 rounded-lg bg-[#171f33] border border-[#334155]/60 shadow-sm">
              <div className="flex items-center gap-2.5">
                <span className="h-2 w-2 rounded-full bg-[#ef4444] animate-pulse" />
                <span className="text-xs text-[#f8fafc] font-medium">Depleted / Zero Stock</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-semibold tabular-nums text-[#ef4444]">
                  {formatNumber(stats.outCount)} SKUs
                </span>
                <span className="text-[11px] font-bold text-[#ef4444]">
                  {stats.outPercent}%
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-3 p-3 rounded-lg bg-[#060e20] text-[#94a3b8] text-xs flex items-center gap-2 border border-[#1e293b]">
          <ShieldCheck size={16} className="text-[#10b981] shrink-0" />
          <span>
            {stats.outCount === 0
              ? 'Zero production halts: All inventory lines currently have stock on hand.'
              : `${stats.outCount} depleted ${stats.outCount === 1 ? 'item requires' : 'items require'} immediate reorder.`}
          </span>
        </div>
      </section>
    </div>
  );
}
