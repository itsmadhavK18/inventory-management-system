import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/useAuth';
import { COLLECTIONS, ITEM_TYPES } from '../../utils/constants';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import toast from 'react-hot-toast';
import {
  Package,
  AlertTriangle,
  PackageX,
  IndianRupee,
  RefreshCw,
  Users,
  FileText,
  PackagePlus,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Calendar,
  MapPin,
  TrendingUp,
  Plus,
} from 'lucide-react';
import LowStockAlert from '../../components/owner/LowStockAlert';
import ActivityFeed from '../../components/owner/ActivityFeed';
import InventoryDistribution from '../../components/owner/InventoryDistribution';
import MonthlyExpense from '../../components/owner/MonthlyExpense';

export default function Dashboard() {
  const { userData } = useAuth();
  const navigate = useNavigate();

  // Coordinated Firestore states
  const [items, setItems] = useState([]);
  const [usageLogs, setUsageLogs] = useState([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [syncKey, setSyncKey] = useState(0);

  // Unified real-time Firestore subscriptions with proper cleanup
  useEffect(() => {
    let isMounted = true;

    // 1. Items Listener
    const unsubItems = onSnapshot(
      collection(db, COLLECTIONS.ITEMS),
      (snap) => {
        if (!isMounted) return;
        const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setItems(data);
        setLoadingItems(false);
      },
      (err) => {
        if (!isMounted) return;
        console.error('Firestore items subscription error:', err);
        setError('Failed to sync inventory items. Please check network connection.');
        setLoadingItems(false);
      }
    );

    // 2. Usage Logs Listener (latest 50 logs)
    const logsQuery = query(
      collection(db, COLLECTIONS.USAGE_LOGS),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    const unsubLogs = onSnapshot(
      logsQuery,
      (snap) => {
        if (!isMounted) return;
        const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setUsageLogs(data);
        setLoadingLogs(false);
      },
      (err) => {
        if (!isMounted) return;
        console.error('Firestore usage logs subscription error:', err);
        setLoadingLogs(false);
      }
    );

    return () => {
      isMounted = false;
      unsubItems();
      unsubLogs();
    };
  }, [syncKey]);

  // Safe manual refresh trigger
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    setError(null);
    setLoadingItems(true);
    setLoadingLogs(true);
    setSyncKey((prev) => prev + 1);

    setTimeout(() => {
      setIsRefreshing(false);
      toast.success('Dashboard synced with Cloud Firestore');
    }, 600);
  }, []);

  // Aggregated KPI calculations from real data
  const kpis = useMemo(() => {
    const totalItems = items.length;
    let outOfStockCount = 0;
    let lowStockCount = 0;
    let healthyCount = 0;
    let rawCount = 0;
    let finishedCount = 0;
    let totalValuation = 0;
    let rawValuation = 0;
    let finishedValuation = 0;

    items.forEach((item) => {
      const qty = Number(item.quantity) || 0;
      const cost = Number(item.cost_per_unit) || 0;
      const threshold = Number(item.threshold) || 0;
      const val = qty * cost;

      if (qty <= 0) {
        outOfStockCount += 1;
      } else if (qty <= threshold) {
        lowStockCount += 1;
      } else {
        healthyCount += 1;
      }

      if (item.type === ITEM_TYPES.RAW) {
        rawCount += 1;
        rawValuation += val;
      } else {
        finishedCount += 1;
        finishedValuation += val;
      }

      totalValuation += val;
    });

    return {
      totalItems,
      outOfStockCount,
      lowStockCount,
      healthyCount,
      rawCount,
      finishedCount,
      totalValuation,
      rawValuation,
      finishedValuation,
    };
  }, [items]);

  const isLoading = loadingItems || loadingLogs;

  const todayFormatted = useMemo(() => {
    return new Date().toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }, []);

  return (
    <div className="w-full min-h-screen pb-safe bg-[#0b1326] text-[#f8fafc] flex flex-col selection:bg-[#4f46e5]/30 selection:text-white">
      {/* 1. Owner Greeting & Atelier Operations Bar */}
      <section className="w-full bg-[#060e20] border-b border-[#1e293b] py-5 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1680px] mx-auto flex flex-col xl:flex-row xl:items-center justify-between gap-5">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="font-headline text-2xl sm:text-3xl font-bold text-[#f8fafc] tracking-tight">
                Welcome back, {userData?.name || 'Owner'}
              </h1>
              <span className="px-3 py-1 rounded-full bg-[#222a3d] text-[#c3c0ff] text-[11px] font-semibold uppercase tracking-wider border border-[#334155] shadow-sm">
                Owner Console
              </span>
            </div>
            <div className="flex items-center gap-3 text-[#94a3b8] text-xs flex-wrap font-medium">
              <span className="flex items-center gap-1.5">
                <Calendar size={14} className="text-[#94a3b8]" />
                {todayFormatted}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <MapPin size={14} className="text-[#94a3b8]" />
                Bangalore Atelier & Workshop Unit 01
              </span>
              <span>•</span>
              <span className="text-[#10b981] font-semibold">Shift Active (IST)</span>
            </div>
          </div>

          {/* Live Telemetry & Control Actions */}
          <div className="flex items-center gap-3 flex-wrap shrink-0">
            <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-[#131b2e] border border-[#334155] shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  isLoading ? 'bg-amber-400 animate-ping' : 'bg-[#10b981] animate-ping'
                }`} />
                <span className={`relative inline-flex rounded-full h-2 w-2 ${
                  isLoading ? 'bg-amber-400' : 'bg-[#10b981]'
                }`} />
              </span>
              <span className="text-xs font-semibold text-[#f8fafc]">
                {isLoading ? 'Syncing Firestore...' : 'Live Firestore: Connected'}
              </span>
            </div>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#171f33] hover:bg-[#222a3d] text-[#f8fafc] transition-all active:scale-[0.98] shadow-sm text-xs font-semibold border border-[#334155] cursor-pointer"
              title="Refresh dashboard metrics"
              aria-label="Refresh dashboard data"
            >
              <RefreshCw size={14} className={`text-[#c3c0ff] transition-transform duration-700 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Refresh Feed</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/owner/inventory')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-white transition-all font-semibold text-xs shadow-sm cursor-pointer"
            >
              <ShieldCheck size={14} />
              <span>Catalog Audit</span>
            </button>
          </div>
        </div>
      </section>

      {/* Main Content Canvas */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-[1680px] mx-auto flex flex-col gap-6 sm:gap-8 flex-1 animate-fade-in">
        {/* Error Alert Banner */}
        {error && (
          <div className="p-4 rounded-xl bg-[#ef4444]/15 border border-[#ef4444]/30 flex items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <AlertCircle size={20} className="text-[#ef4444] shrink-0" />
              <div>
                <p className="text-sm font-semibold text-[#f8fafc]">{error}</p>
                <p className="text-xs text-[#cbd5e1]">Metrics may be outdated until connection is restored.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleRefresh}
              className="px-3 py-1.5 rounded-lg bg-[#171f33] hover:bg-[#222a3d] text-[#f8fafc] border border-[#334155] text-xs font-medium cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* 2. KPI Metric Summary Tiles (4 Column High Density) */}
        <section aria-label="Key Performance Indicators" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
          {/* Tile 1: Total SKUs */}
          <div
            onClick={() => navigate('/owner/inventory')}
            className="p-5 sm:p-6 rounded-xl bg-[#131b2e] border border-[#334155] shadow-md flex flex-col justify-between group hover:bg-[#171f33] hover:border-[#475569] transition-all cursor-pointer min-h-[170px]"
          >
            <div>
              <div className="flex items-center justify-between gap-3 mb-4">
                <span className="text-xs uppercase tracking-wider text-[#94a3b8] font-semibold">
                  Total Inventory SKUs
                </span>
                <span className="px-2 py-0.5 rounded bg-[#222a3d] text-[#c3c0ff] text-[10px] uppercase font-bold border border-[#334155]">
                  Active Catalog
                </span>
              </div>
              <div className="flex items-baseline gap-2 mb-2">
                {loadingItems ? (
                  <div className="h-9 bg-[#1e293b] rounded w-28 animate-pulse" />
                ) : (
                  <>
                    <span className="font-headline text-3xl font-bold tracking-tight text-[#f8fafc] tabular-nums">
                      {formatNumber(kpis.totalItems)}
                    </span>
                    <span className="text-xs text-[#94a3b8] uppercase font-semibold">
                      Active SKUs
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-[#1e293b] text-xs mt-3">
              <span className="text-[#10b981] flex items-center gap-1 font-semibold">
                <TrendingUp size={13} />
                {kpis.rawCount} Raw • {kpis.finishedCount} Finished
              </span>
              <span className="text-[#94a3b8] text-[11px] group-hover:text-[#f8fafc] transition-colors">
                View Catalog →
              </span>
            </div>
          </div>

          {/* Tile 2: Low Stock Alerts */}
          <div
            onClick={() => navigate('/owner/inventory')}
            className="p-5 sm:p-6 rounded-xl bg-[#131b2e] border border-[#334155] shadow-md flex flex-col justify-between group hover:bg-[#171f33] hover:border-amber-500/40 transition-all cursor-pointer min-h-[170px]"
          >
            <div>
              <div className="flex items-center justify-between gap-3 mb-4">
                <span className="text-xs uppercase tracking-wider text-[#94a3b8] font-semibold">
                  Low Stock Alerts
                </span>
                <span className="px-2 py-0.5 rounded bg-[#222a3d] text-amber-300 text-[10px] flex items-center gap-1 border border-amber-500/30">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                  Needs Attention
                </span>
              </div>
              <div className="flex items-baseline gap-2 mb-2">
                {loadingItems ? (
                  <div className="h-9 bg-[#1e293b] rounded w-20 animate-pulse" />
                ) : (
                  <>
                    <span className="font-headline text-3xl font-bold tracking-tight text-amber-300 tabular-nums">
                      {formatNumber(kpis.lowStockCount)}
                    </span>
                    <span className="text-xs text-[#94a3b8] uppercase font-semibold">
                      SKUs Flagged
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-[#1e293b] text-xs mt-3">
              <span className="text-[#38bdf8] flex items-center gap-1 font-semibold">
                <AlertTriangle size={13} className="text-amber-400" />
                {kpis.lowStockCount > 0 ? `${kpis.lowStockCount} below minimum buffer` : 'All buffers nominal'}
              </span>
              <span className="text-[#94a3b8] text-[11px] group-hover:text-[#f8fafc] transition-colors">
                Inspect →
              </span>
            </div>
          </div>

          {/* Tile 3: Out of Stock */}
          <div
            onClick={() => navigate('/owner/inventory')}
            className="p-5 sm:p-6 rounded-xl bg-[#131b2e] border border-[#334155] shadow-md flex flex-col justify-between group hover:bg-[#171f33] hover:border-rose-500/40 transition-all cursor-pointer min-h-[170px]"
          >
            <div>
              <div className="flex items-center justify-between gap-3 mb-4">
                <span className="text-xs uppercase tracking-wider text-[#94a3b8] font-semibold">
                  Stockout Depletion
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] flex items-center gap-1 border ${
                  kpis.outOfStockCount > 0
                    ? 'bg-[#93000a] text-[#ffdad6] border-[#ef4444]/40 font-bold'
                    : 'bg-[#10b981]/15 text-[#10b981] border-[#10b981]/30 font-semibold'
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${kpis.outOfStockCount > 0 ? 'bg-[#ef4444] animate-ping' : 'bg-[#10b981]'}`} />
                  {kpis.outOfStockCount > 0 ? 'Immediate Action' : 'Optimal'}
                </span>
              </div>
              <div className="flex items-baseline gap-2 mb-2">
                {loadingItems ? (
                  <div className="h-9 bg-[#1e293b] rounded w-16 animate-pulse" />
                ) : (
                  <>
                    <span className={`font-headline text-3xl font-bold tracking-tight tabular-nums ${
                      kpis.outOfStockCount > 0 ? 'text-[#ef4444]' : 'text-[#f8fafc]'
                    }`}>
                      {formatNumber(kpis.outOfStockCount)}
                    </span>
                    <span className="text-xs text-[#94a3b8] uppercase font-semibold">
                      Zero Balance
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-[#1e293b] text-xs mt-3">
              <span className={`flex items-center gap-1 font-semibold ${
                kpis.outOfStockCount > 0 ? 'text-rose-400' : 'text-[#10b981]'
              }`}>
                <PackageX size={13} />
                {kpis.outOfStockCount > 0 ? 'Production halt risk' : 'Zero items depleted'}
              </span>
              <span className="text-[#94a3b8] text-[11px] group-hover:text-[#f8fafc] transition-colors">
                Details →
              </span>
            </div>
          </div>

          {/* Tile 4: Stock Valuation */}
          <div className="p-5 sm:p-6 rounded-xl bg-[#131b2e] border border-[#334155] shadow-md flex flex-col justify-between min-h-[170px]">
            <div>
              <div className="flex items-center justify-between gap-3 mb-4">
                <span className="text-xs uppercase tracking-wider text-[#94a3b8] font-semibold">
                  Audited Stock Valuation
                </span>
                <span className="px-2 py-0.5 rounded bg-[#222a3d] text-[#10b981] text-[10px] uppercase font-bold border border-[#334155]">
                  INR (₹)
                </span>
              </div>
              <div className="flex items-baseline gap-2 mb-2">
                {loadingItems ? (
                  <div className="h-9 bg-[#1e293b] rounded w-36 animate-pulse" />
                ) : (
                  <span className="font-headline text-2xl sm:text-3xl font-bold text-[#f8fafc] tracking-tight tabular-nums">
                    {formatCurrency(kpis.totalValuation)}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-[#1e293b] text-xs mt-3">
              <span className="text-[#10b981] flex items-center gap-1 font-semibold">
                <IndianRupee size={13} />
                Capital in Stock
              </span>
              <span className="text-[#94a3b8] text-[11px] truncate">
                Raw: {formatCurrency(kpis.rawValuation)}
              </span>
            </div>
          </div>
        </section>

        {/* 3. Bento Quick Operations Toolbar */}
        <section aria-label="Quick Actions" className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
          {/* Action Bento 1: Inventory Control */}
          <div className="p-5 sm:p-6 rounded-xl bg-[#131b2e] border border-[#334155] shadow-md flex flex-col justify-between min-h-[180px]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#171f33] border border-[#334155] flex items-center justify-center text-[#c3c0ff] shrink-0 shadow-sm">
                  <PackagePlus size={20} />
                </div>
                <div>
                  <h2 className="font-headline text-base font-semibold text-[#f8fafc]">Manage Inventory</h2>
                  <p className="text-xs text-[#94a3b8] mt-0.5">Materials, lumber batches & stock audits</p>
                </div>
              </div>
              <ArrowRight size={16} className="text-[#94a3b8]" />
            </div>
            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-[#1e293b]">
              <button
                type="button"
                onClick={() => navigate('/owner/inventory')}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-[#4f46e5] hover:bg-[#4338ca] text-white font-semibold text-xs transition-all cursor-pointer shadow-sm"
              >
                <Plus size={14} />
                <span>+ Add Item</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('/owner/inventory')}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-[#222a3d] hover:bg-[#2d3449] text-[#f8fafc] font-semibold text-xs transition-all cursor-pointer border border-[#334155]"
              >
                <span>View Catalog</span>
              </button>
            </div>
          </div>

          {/* Action Bento 2: Craftsmen & Floor Roster */}
          <div className="p-5 sm:p-6 rounded-xl bg-[#131b2e] border border-[#334155] shadow-md flex flex-col justify-between min-h-[180px]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#171f33] border border-[#334155] flex items-center justify-center text-[#10b981] shrink-0 shadow-sm">
                  <Users size={20} />
                </div>
                <div>
                  <h2 className="font-headline text-base font-semibold text-[#f8fafc]">Team Management</h2>
                  <p className="text-xs text-[#94a3b8] mt-0.5">Craftsmen & workshop credentials</p>
                </div>
              </div>
              <ArrowRight size={16} className="text-[#94a3b8]" />
            </div>
            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-[#1e293b]">
              <button
                type="button"
                onClick={() => navigate('/owner/employees')}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-[#222a3d] hover:bg-[#2d3449] text-[#f8fafc] font-semibold text-xs transition-all cursor-pointer border border-[#334155]"
              >
                <span>Manage Staff</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('/owner/employees')}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-[#222a3d] hover:bg-[#2d3449] text-[#f8fafc] font-semibold text-xs transition-all cursor-pointer border border-[#334155]"
              >
                <span>Access Roster</span>
              </button>
            </div>
          </div>

          {/* Action Bento 3: Quotations */}
          <div className="p-5 sm:p-6 rounded-xl bg-[#131b2e] border border-[#334155] shadow-md flex flex-col justify-between min-h-[180px]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#171f33] border border-[#334155] flex items-center justify-center text-[#38bdf8] shrink-0 shadow-sm">
                  <FileText size={20} />
                </div>
                <div>
                  <h2 className="font-headline text-base font-semibold text-[#f8fafc]">Custom Quotations</h2>
                  <p className="text-xs text-[#94a3b8] mt-0.5">Customer proposals & branded PDFs</p>
                </div>
              </div>
              <ArrowRight size={16} className="text-[#94a3b8]" />
            </div>
            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-[#1e293b]">
              <button
                type="button"
                onClick={() => navigate('/owner/quotations')}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-[#222a3d] hover:bg-[#2d3449] text-[#f8fafc] font-semibold text-xs transition-all cursor-pointer border border-[#334155]"
              >
                <Plus size={14} />
                <span>New Estimate</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('/owner/quotations')}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-[#222a3d] hover:bg-[#2d3449] text-[#f8fafc] font-semibold text-xs transition-all cursor-pointer border border-[#334155]"
              >
                <span>Review Quotes</span>
              </button>
            </div>
          </div>
        </section>

        {/* 4. Restock Priorities Matrix & Active Urgency Table */}
        <LowStockAlert items={items} loading={loadingItems} />

        {/* 5. Mid-Section Grid: Inventory Breakdown & Stock Telemetry */}
        <InventoryDistribution items={items} loading={loadingItems} />

        {/* 6. Monthly Material Consumption & Atelier Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7">
            <MonthlyExpense items={items} logs={usageLogs} />
          </div>
          <div className="lg:col-span-5">
            <ActivityFeed logs={usageLogs} loading={loadingLogs} />
          </div>
        </div>

        {/* 7. Atelier Production Floor Visual Atmosphere */}
        <section className="w-full rounded-xl overflow-hidden bg-[#131b2e] border border-[#334155] shadow-md">
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[#334155]/60">
            {/* Visual 1 */}
            <div className="relative h-44 overflow-hidden group">
              <img
                alt="Woodworking Atelier Bench Joinery"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBOKrHfRiQz3xEMRQWUDGqIzGbc0auQOo25GoNOXruH7fER16GUUtYTCm5LK5O1dB_OLCzki95MiVxeRW8vYbtMQBWggl8TQSvDzcwWI5cnV7j9K0cnUcV6cMaD7c6wGupL5ndzknheLwziR8bgUengqt4osU0dHeBu-gx5zHmMyLtLaoLxbDct-3gyiFJvV4PoJ1G4fqdRJrfRlZMyTMycNRijEtMtkFg4yICMAR9xLgh9q4m9tyY"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0b111e] via-[#0b111e]/50 to-transparent flex items-end p-5">
                <div>
                  <span className="text-[#c3c0ff] uppercase tracking-wider text-[10px] font-bold">
                    Bay 01 · Bench Joinery
                  </span>
                  <div className="text-[#f8fafc] font-semibold text-xs mt-0.5">
                    Artisanal Teak & Hardwood Construction
                  </div>
                </div>
              </div>
            </div>

            {/* Visual 2 */}
            <div className="relative h-44 overflow-hidden group">
              <img
                alt="Raw Timber Hardwood Vault"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuA6vBO1F40_ic17ydaHgJNTCSIJjt2sYOpdUhawFyemVKB8x3PvQG0la7QRpQl-7Hjqpgt_ifp8_3WiXHz0h5mddCyLXwwcdcQnI9o6lpBa1Pfnl05AdpnQuTleu-n3a8_CkDFtI5suES3bMZCb_AOJlc3jCZ7MpwVviYi_POkYBs5WoFTrPulDh21wLaKtuec5MQrEjQEvO4Cu3KYEBlfbS2NnrUqXluJ5O0KiuAjKChjObaJm-Wc"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0b111e] via-[#0b111e]/50 to-transparent flex items-end p-5">
                <div>
                  <span className="text-[#10b981] uppercase tracking-wider text-[10px] font-bold">
                    Vault C · Timber Stock Reserve
                  </span>
                  <div className="text-[#f8fafc] font-semibold text-xs mt-0.5">
                    Kiln-Dried Slabs & Moisture Curing
                  </div>
                </div>
              </div>
            </div>

            {/* Visual 3 */}
            <div className="relative h-44 overflow-hidden group">
              <img
                alt="Precision Architectural Hardware Booth"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCkzVSECHRXDzrdu4vl3vTnqsmHMN1unupXmaZR0U_MsZiP2FlJ2DxWxec9nleOFicwxh7d-1iP17jn7tTk5RdxIbqjehqj7IQFVFOXwuBUDlRTeRyxjKJW8_BlBtDRVLmrW3zHH7w3zAGRytwiMBgpTR5697ETtK4c9O23qQWiEa8IV_rqnAC19PpcJ7lfDGUPNTD1MD4_j4tiBFW8Hg5lW7RS-N8MHaMb_EMaLJlJKK7cIXtZP0o"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0b111e] via-[#0b111e]/50 to-transparent flex items-end p-5">
                <div>
                  <span className="text-[#38bdf8] uppercase tracking-wider text-[10px] font-bold">
                    Assembly 04 · Hardware QC
                  </span>
                  <div className="text-[#f8fafc] font-semibold text-xs mt-0.5">
                    Solid Cast Pulls & Soft-Close Runners
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="w-full bg-[#060e20] py-5 border-t border-[#1e293b] mt-auto">
        <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-3 text-[#94a3b8] text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#f8fafc]">FurnTrack OS</span>
            <span>•</span>
            <span>High-Precision Bespoke Production & Timber Management</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] uppercase tracking-wider font-semibold">
            <span>Currency: INR (₹)</span>
            <span>•</span>
            <span>Secure Workshop Node 01</span>
            <span>•</span>
            <span>© 2026 FurnTrack</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
