import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { COLLECTIONS, ITEM_TYPES } from '../../utils/constants';
import { formatCurrency, formatNumber, getStartOfMonth } from '../../utils/formatters';
import { Flame, TrendingUp, Package, Layers } from 'lucide-react';

export default function MonthlyExpense({ items: propItems, logs: propLogs }) {
  const [internalItems, setInternalItems] = useState({});
  const [internalLogs, setInternalLogs] = useState([]);

  useEffect(() => {
    if (propItems !== undefined) return;

    const unsub = onSnapshot(collection(db, COLLECTIONS.ITEMS), (snap) => {
      const map = {};
      snap.docs.forEach((d) => {
        map[d.id] = d.data();
      });
      setInternalItems(map);
    });
    return () => unsub();
  }, [propItems]);

  useEffect(() => {
    if (propLogs !== undefined) return;

    const startOfMonth = getStartOfMonth();
    const q = query(
      collection(db, COLLECTIONS.USAGE_LOGS),
      where('timestamp', '>=', Timestamp.fromDate(startOfMonth)),
      orderBy('timestamp', 'desc')
    );

    const unsub = onSnapshot(q, (snap) => {
      setInternalLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => unsub();
  }, [propLogs]);

  const itemsMap = useMemo(() => {
    if (propItems !== undefined) {
      return Array.isArray(propItems)
        ? propItems.reduce((acc, it) => {
            acc[it.id] = it;
            return acc;
          }, {})
        : propItems;
    }
    return internalItems;
  }, [propItems, internalItems]);

  const monthlyLogs = useMemo(() => {
    const startOfMonth = getStartOfMonth();
    const sourceLogs = propLogs !== undefined ? propLogs : internalLogs;
    return sourceLogs.filter((log) => {
      if (!log.timestamp) return false;
      const d = log.timestamp?.toDate ? log.timestamp.toDate() : new Date(log.timestamp);
      return d >= startOfMonth;
    });
  }, [propLogs, internalLogs]);

  // Aggregate monthly consumption metrics by item
  const consumption = useMemo(() => {
    let totalCost = 0;
    const itemAgg = {};
    let rawCost = 0;
    let finishedCost = 0;

    monthlyLogs.forEach((log) => {
      const item = itemsMap[log.item_id];
      const qtyUsed = Number(log.quantity_used) || 0;
      const unitCost = Number(item?.cost_per_unit) || 0;
      const cost = qtyUsed * unitCost;

      totalCost += cost;

      if (item?.type === ITEM_TYPES.RAW) {
        rawCost += cost;
      } else {
        finishedCost += cost;
      }

      const key = log.item_name || item?.name || 'Unknown Item';
      if (!itemAgg[key]) {
        itemAgg[key] = {
          name: key,
          quantity: 0,
          unit: item?.unit || 'units',
          cost: 0,
          type: item?.type || 'standard',
        };
      }
      itemAgg[key].quantity += qtyUsed;
      itemAgg[key].cost += cost;
    });

    // Top consumed materials sorted by cost
    const topMaterials = Object.values(itemAgg)
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 3);

    return {
      totalCost,
      rawCost,
      finishedCost,
      topMaterials,
      entriesCount: monthlyLogs.length,
    };
  }, [monthlyLogs, itemsMap]);

  const currentMonthName = new Date().toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <section className="p-5 sm:p-6 rounded-2xl bg-[#131b2e] border border-[#334155] shadow-lg flex flex-col justify-between">
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-100 font-['Plus_Jakarta_Sans',sans-serif] tracking-tight">
                Monthly Material Consumption
              </h2>
              <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono uppercase text-[10px] font-bold border border-indigo-500/30">
                {currentMonthName}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Material burn rate and shop-floor usage volume derived from actual usage logs.
            </p>
          </div>

          <div className="text-left sm:text-right shrink-0">
            <span className="text-2xl font-bold font-mono tabular-nums text-slate-100">
              {formatCurrency(consumption.totalCost)}
            </span>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
              Month-to-Date Burn
            </p>
          </div>
        </div>

        {/* 3 Primary Metric Bars or Empty State */}
        {consumption.topMaterials.length === 0 ? (
          <div className="py-8 text-center p-6 rounded-xl bg-[#060e20] border border-[#334155]/60">
            <Flame size={28} className="text-slate-500 mx-auto mb-2 opacity-60" />
            <p className="text-sm font-semibold text-slate-200">No usage logged for {currentMonthName}</p>
            <p className="text-xs text-slate-400 mt-1">
              Material deductions recorded by employees will calculate live expenditure here.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {consumption.topMaterials.map((mat, idx) => {
              const maxCost = consumption.topMaterials[0]?.cost || 1;
              const barPercent = Math.max(Math.round((mat.cost / maxCost) * 100), 15);

              return (
                <div
                  key={mat.name}
                  className="p-4 rounded-xl bg-[#171f33] border border-[#334155]/60 flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${
                          idx === 0
                            ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                            : idx === 1
                            ? 'bg-sky-500/20 text-sky-300 border-sky-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        }`}
                      >
                        <Package size={14} />
                      </div>
                      <span className="font-semibold text-slate-200 truncate">{mat.name}</span>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-semibold text-slate-300 font-mono tabular-nums">
                        {formatNumber(mat.quantity)} {mat.unit}
                      </span>
                      <span className="font-bold text-indigo-400 font-mono tabular-nums">
                        {formatCurrency(mat.cost)}
                      </span>
                    </div>
                  </div>

                  {/* Scaled Sparkline Bar */}
                  <div className="w-full h-2 rounded-full bg-[#2d3449] overflow-hidden mt-1">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        idx === 0
                          ? 'bg-gradient-to-r from-indigo-500 to-indigo-400'
                          : idx === 1
                          ? 'bg-gradient-to-r from-sky-500 to-sky-400'
                          : 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                      }`}
                      style={{ width: `${barPercent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-5 p-3.5 rounded-xl bg-[#060e20] border border-[#334155]/60 flex items-center justify-between flex-wrap gap-2 text-xs">
        <div className="flex items-center gap-2 text-slate-400">
          <TrendingUp size={15} className="text-indigo-400 shrink-0" />
          <span>
            Logged <strong className="text-slate-200 font-semibold">{consumption.entriesCount} usage actions</strong> this month
          </span>
        </div>
        <div className="flex items-center gap-3 text-slate-400 text-[11px] font-mono">
          <span>Raw: <strong className="text-slate-200">{formatCurrency(consumption.rawCost)}</strong></span>
          <span>•</span>
          <span>Finished: <strong className="text-slate-200">{formatCurrency(consumption.finishedCost)}</strong></span>
        </div>
      </div>
    </section>
  );
}
