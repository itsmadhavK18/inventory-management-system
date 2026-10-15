import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { db } from '../../firebase';
import { COLLECTIONS, ITEM_TYPES } from '../../utils/constants';
import { formatNumber } from '../../utils/formatters';
import { AlertTriangle, PackageX, ExternalLink, CheckCircle2, Package, Layers } from 'lucide-react';
import EmptyState from '../common/EmptyState';

export default function LowStockAlert({ items: propItems, loading: propLoading }) {
  const navigate = useNavigate();
  const [internalItems, setInternalItems] = useState([]);
  const [internalLoading, setInternalLoading] = useState(propItems === undefined);
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'critical' | 'warning'

  useEffect(() => {
    if (propItems !== undefined) return;

    const unsub = onSnapshot(
      collection(db, COLLECTIONS.ITEMS),
      (snap) => {
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setInternalItems(data);
        setInternalLoading(false);
      },
      (err) => {
        console.error('Failed to subscribe to items in LowStockAlert:', err);
        setInternalLoading(false);
      }
    );

    return () => unsub();
  }, [propItems]);

  const allItems = propItems !== undefined ? propItems : internalItems;
  const loading = propLoading !== undefined ? propLoading : internalLoading;

  // Items requiring attention: quantity <= threshold
  const alertItems = allItems.filter((item) => {
    const qty = Number(item.quantity) || 0;
    const thresh = Number(item.threshold) || 0;
    return qty <= thresh;
  });

  // Sort: Critical (quantity <= 0) first, then by lowest stock-to-threshold ratio
  alertItems.sort((a, b) => {
    const aQty = Number(a.quantity) || 0;
    const bQty = Number(b.quantity) || 0;
    const aThresh = Number(a.threshold) || 1;
    const bThresh = Number(b.threshold) || 1;

    if (aQty <= 0 && bQty > 0) return -1;
    if (bQty <= 0 && aQty > 0) return 1;
    return aQty / aThresh - bQty / bThresh;
  });

  const criticalItems = alertItems.filter((item) => (Number(item.quantity) || 0) <= 0);
  const warningItems = alertItems.filter((item) => (Number(item.quantity) || 0) > 0);

  const displayedItems =
    filterTab === 'critical'
      ? criticalItems
      : filterTab === 'warning'
      ? warningItems
      : alertItems;

  return (
    <section className="p-6 rounded-xl bg-[#131b2e] border border-[#334155] shadow-md flex flex-col gap-6">
      {/* Header & Filter Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="font-headline text-xl font-bold text-[#f8fafc] tracking-tight">
              Restock Priorities Matrix
            </h2>
            {alertItems.length > 0 && (
              <span className="px-2.5 py-0.5 rounded bg-[#93000a] text-[#ffdad6] uppercase font-bold text-[10px] tracking-wider border border-[#ef4444]/40">
                {alertItems.length} SKUs Threshold Warning
              </span>
            )}
          </div>
          <p className="text-xs text-[#94a3b8] mt-1">
            Automated reorder triggers calculated from current stock levels and minimum safety thresholds.
          </p>
        </div>

        {/* Filter Segmented Tabs */}
        {alertItems.length > 0 && (
          <div className="flex items-center gap-1.5 bg-[#060e20] p-1.5 rounded-xl self-start lg:self-auto border border-[#1e293b]">
            <button
              type="button"
              onClick={() => setFilterTab('all')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                filterTab === 'all'
                  ? 'bg-[#222a3d] text-[#f8fafc] shadow-sm border border-[#334155]'
                  : 'text-[#94a3b8] hover:text-[#f8fafc]'
              }`}
            >
              All ({alertItems.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('critical')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                filterTab === 'critical'
                  ? 'bg-[#93000a] text-[#ffdad6] shadow-sm border border-[#ef4444]/40 font-bold'
                  : 'text-[#94a3b8] hover:text-[#f8fafc]'
              }`}
            >
              Critical ({criticalItems.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('warning')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                filterTab === 'warning'
                  ? 'bg-amber-500/20 text-amber-300 shadow-sm border border-amber-500/40'
                  : 'text-[#94a3b8] hover:text-[#f8fafc]'
              }`}
            >
              Warning ({warningItems.length})
            </button>
          </div>
        )}
      </div>

      {/* Restock Table Canvas */}
      {loading ? (
        <div className="space-y-3 py-4">
          {[1, 2, 3, 4].map((idx) => (
            <div key={idx} className="h-16 rounded-lg bg-[#171f33] animate-pulse border border-[#1e293b]" />
          ))}
        </div>
      ) : alertItems.length === 0 ? (
        <div className="py-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto">
            <CheckCircle2 size={24} />
          </div>
          <h3 className="font-headline text-base font-semibold text-[#f8fafc]">All Stock Levels Healthy</h3>
          <p className="text-xs text-[#94a3b8] max-w-md mx-auto">
            All inventory items are currently stocked above their minimum safety thresholds.
          </p>
        </div>
      ) : displayedItems.length === 0 ? (
        <EmptyState
          title={`No ${filterTab === 'critical' ? 'critical' : 'warning'} items`}
          message="Switch tabs to inspect other priority stock items."
        />
      ) : (
        <div className="overflow-x-auto w-full rounded-xl border border-[#1e293b] shadow-inner">
          <table className="w-full text-left border-collapse min-w-[840px]">
            <thead>
              <tr className="bg-[#060e20] text-[#94a3b8] text-[11px] font-semibold uppercase tracking-wider border-b border-[#1e293b]">
                <th className="py-3.5 px-4">Material Description / SKU</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Current Stock</th>
                <th className="py-3.5 px-4">Safety Threshold</th>
                <th className="py-3.5 px-4">Reserve Capacity</th>
                <th className="py-3.5 px-4">Severity Status</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#171f33] text-xs">
              {displayedItems.map((item) => {
                const qty = Number(item.quantity) || 0;
                const thresh = Number(item.threshold) || 0;
                const isCritical = qty <= 0;
                const percent = thresh > 0 ? Math.min(Math.round((qty / thresh) * 100), 100) : 0;

                return (
                  <tr
                    key={item.id}
                    className={`group hover:bg-[#171f33]/60 transition-colors ${
                      isCritical ? 'bg-rose-500/[0.04]' : ''
                    }`}
                  >
                    {/* Material Name & Unit */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                            isCritical
                              ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                              : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                          }`}
                        >
                          {isCritical ? <PackageX size={16} /> : <Package size={16} />}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-sm text-[#f8fafc] truncate max-w-xs">{item.name}</div>
                          <div className="text-[10px] text-[#94a3b8] font-mono mt-0.5">
                            Unit: {item.unit} • Threshold: {formatNumber(thresh)} {item.unit}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span
                        className={`badge text-[9px] py-0.5 px-2 font-semibold ${
                          item.type === ITEM_TYPES.RAW ? 'badge-raw' : 'badge-finished'
                        }`}
                      >
                        {item.type === ITEM_TYPES.RAW ? 'Raw Material' : 'Finished Good'}
                      </span>
                    </td>

                    {/* Current Stock */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span
                        className={`font-bold tabular-nums text-sm ${
                          isCritical ? 'text-[#ef4444]' : 'text-amber-300'
                        }`}
                      >
                        {formatNumber(qty)} {item.unit}
                      </span>
                    </td>

                    {/* Safety Threshold */}
                    <td className="py-4 px-4 whitespace-nowrap text-[#94a3b8] font-medium tabular-nums">
                      {formatNumber(thresh)} {item.unit}
                    </td>

                    {/* Reserve Capacity */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="w-28 flex flex-col gap-1.5">
                        <div className="flex justify-between text-[10px] font-semibold">
                          <span className={isCritical ? 'text-rose-400 font-bold' : 'text-amber-300 font-bold'}>
                            {percent}%
                          </span>
                          <span className="text-[#94a3b8]">
                            {isCritical ? 'Depleted' : 'Low Buffer'}
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-[#2d3449] overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              isCritical ? 'bg-[#ef4444]' : 'bg-amber-400'
                            }`}
                            style={{ width: `${Math.max(percent, isCritical ? 0 : 4)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Severity Status */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      {isCritical ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-[#93000a] text-[#ffdad6] border border-[#ef4444]/40">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#ef4444] animate-ping" />
                          CRITICAL DEPLETION
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-semibold uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                          WARNING BUFFER
                        </span>
                      )}
                    </td>

                    {/* Procurement Action */}
                    <td className="py-4 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => navigate('/owner/inventory')}
                        className="px-3.5 py-2 rounded-lg bg-[#171f33] hover:bg-[#4f46e5] hover:text-white text-[#cbd5e1] border border-[#334155] text-xs font-semibold transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <span>Manage Stock</span>
                        <ExternalLink size={12} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer navigation */}
      <div className="pt-3 flex items-center justify-between text-xs text-[#94a3b8] border-t border-[#1e293b]">
        <span className="flex items-center gap-1.5 font-medium">
          <Layers size={13} className="text-[#94a3b8]" />
          <span>Showing {displayedItems.length} of {alertItems.length} restock flags</span>
        </span>
        <button
          type="button"
          onClick={() => navigate('/owner/inventory')}
          className="text-xs font-semibold text-[#818cf8] hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <span>Open Full Inventory Catalog</span>
          <ExternalLink size={13} />
        </button>
      </div>
    </section>
  );
}
