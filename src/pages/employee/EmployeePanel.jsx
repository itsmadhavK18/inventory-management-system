import { useState, useEffect, useCallback, useMemo } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { COLLECTIONS, ITEM_TYPES } from '../../utils/constants';
import { formatNumber, isToday } from '../../utils/formatters';
import { useAuth } from '../../contexts/useAuth';
import ItemSearch from '../../components/employee/ItemSearch';
import UpdateQuantity from '../../components/employee/UpdateQuantity';
import EmployeeActivityFeed from '../../components/employee/EmployeeActivityFeed';
import toast from 'react-hot-toast';
import {
  Wrench,
  Layers,
  AlertTriangle,
  History,
  Lock,
  Cog,
  Barcode,
  Zap,
} from 'lucide-react';

export default function EmployeePanel() {
  const { userData } = useAuth();
  const [items, setItems] = useState([]);
  const [usageLogs, setUsageLogs] = useState([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [syncKey, setSyncKey] = useState(0);

  // Active Item for Deduction Console
  const [selectedItem, setSelectedItem] = useState(null);

  // Unified real-time Firestore listeners
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

        // Keep or set active item in console
        setSelectedItem((prev) => {
          if (prev) {
            const updated = data.find((i) => i.id === prev.id);
            return updated || data[0] || null;
          }
          return data[0] || null;
        });
      },
      (err) => {
        if (!isMounted) return;
        console.error('Firestore items subscription error in EmployeePanel:', err);
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
        console.error('Firestore usage logs subscription error in EmployeePanel:', err);
        setLoadingLogs(false);
      }
    );

    return () => {
      isMounted = false;
      unsubItems();
      unsubLogs();
    };
  }, [syncKey]);

  // Manual refresh trigger
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    setError(null);
    setLoadingItems(true);
    setLoadingLogs(true);
    setSyncKey((prev) => prev + 1);

    setTimeout(() => {
      setIsRefreshing(false);
      toast.success('Workshop stock synced with Cloud Firestore');
    }, 600);
  }, []);

  // Selection Handler
  const handleSelectItem = (item) => {
    setSelectedItem(item);
    // Smooth scroll to console on mobile devices
    if (window.innerWidth < 1280) {
      const consoleEl = document.getElementById('deduction-console');
      if (consoleEl) {
        consoleEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  // Stock Awareness Calculations
  const stats = useMemo(() => {
    const total = items.length;
    let lowCount = 0;
    let outCount = 0;

    items.forEach((item) => {
      const qty = Number(item.quantity) || 0;
      const threshold = Number(item.threshold) || 0;

      if (qty <= 0) {
        outCount += 1;
      } else if (qty <= threshold) {
        lowCount += 1;
      }
    });

    // Count deductions today by the craftsman
    const myTodayLogs = usageLogs.filter((l) => {
      const isMine = !userData?.id || l.user_id === userData?.id;
      return isMine && isToday(l.timestamp);
    });

    const myTodayCount = myTodayLogs.length;
    const totalQtyDeductedToday = myTodayLogs.reduce(
      (sum, l) => sum + (Number(l.quantity_used) || 0),
      0
    );

    return {
      total,
      lowCount,
      outCount,
      myTodayCount,
      totalQtyDeductedToday,
    };
  }, [items, usageLogs, userData?.id]);

  // Greeting based on current hour
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const craftsmanName = userData?.name || 'Aarav Patel';

  return (
    <div className="w-full min-h-screen bg-[#0b1326] text-[#dae2fd] font-['Inter',sans-serif] flex flex-col selection:bg-[#4f46e5]/30 selection:text-white antialiased">
      <main className="w-full flex-1">
        <div className="flex flex-col w-full">
          {/* Top Operational Banner & Greetings */}
          <div className="w-full px-4 sm:px-6 lg:px-8 py-5 bg-[#131b2e] border-b border-[#1e293b] shadow-sm">
            <div className="max-w-[1680px] mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Craftsman Identifier */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="font-['Plus_Jakarta_Sans',sans-serif] text-2xl lg:text-3xl font-bold tracking-tight text-[#f8fafc]">
                    {greeting}, {craftsmanName}
                  </h1>

                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#222a3d] text-[#c3c0ff] border border-[#334155]/60 text-[11px] font-bold tracking-wider uppercase">
                    <Wrench size={13} className="text-[#818cf8]" />
                    STATION 04 • BENCH JOINERY
                  </span>

                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#006e4b]/30 text-[#4edea3] border border-[#10b981]/30 text-[11px] font-bold tracking-wider uppercase">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#10b981] animate-pulse" />
                    BAY 04 ATELIER
                  </span>
                </div>

                <p className="text-xs text-[#94a3b8] flex items-center gap-2 flex-wrap">
                  <span>Bangalore Atelier Floor</span>
                  <span>•</span>
                  <span>Shift Active (07:30 - 16:30 IST)</span>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="text-[#10b981] hover:text-[#4edea3] inline-flex items-center gap-1 font-semibold cursor-pointer transition-colors"
                    title="Click to refresh live sync"
                  >
                    <span className="relative flex h-2 w-2">
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10b981] ${isRefreshing ? 'opacity-100' : 'opacity-75'}`} />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10b981]" />
                    </span>
                    <span>{isRefreshing ? 'Syncing...' : 'Firestore Connected'}</span>
                  </button>
                </p>
              </div>

              {/* Quick Actions / Mode Indicator */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="bg-[#060e20] px-3.5 py-2 rounded-xl border border-[#334155]/60 shadow-inner flex items-center gap-3">
                  <Cog size={18} className="text-[#38bdf8]" />
                  <div className="flex flex-col text-left">
                    <span className="text-[10px] text-[#94a3b8] font-bold uppercase tracking-wider">
                      Assigned Bench Tool
                    </span>
                    <span className="text-xs font-semibold text-[#f8fafc]">
                      Altendorf F45 Precision Saw
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const code = prompt('Enter board barcode / optical tag:');
                    if (code) {
                      toast.success(`Scanned barcode: ${code}`);
                    }
                  }}
                  className="px-4 py-2.5 rounded-xl bg-[#222a3d] hover:bg-[#2d3449] text-[#f8fafc] text-xs font-semibold flex items-center gap-2 transition-colors shadow-sm border border-[#334155] cursor-pointer"
                >
                  <Barcode size={16} className="text-[#818cf8]" />
                  <span>Scan Board Barcode</span>
                </button>
              </div>
            </div>

            {/* Stock Awareness Summary Cards (Employee Centric) */}
            <div className="max-w-[1680px] mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
              {/* Card 1: Available Atelier SKUs */}
              <div className="bg-[#171f33] p-4 sm:p-5 rounded-xl shadow-sm border border-[#334155] flex flex-col justify-between relative overflow-hidden group hover:bg-[#1e293b] transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider">
                    Available Atelier SKUs
                  </span>
                  <span className="p-1.5 rounded-lg bg-[#2d3449] text-[#c3c0ff]">
                    <Layers size={16} />
                  </span>
                </div>
                <div className="mt-3">
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-['Plus_Jakarta_Sans',sans-serif] text-2xl lg:text-3xl font-bold text-[#f8fafc] tracking-tight tabular-nums">
                      {loadingItems ? '...' : formatNumber(stats.total)}
                    </span>
                    <span className="text-[10px] text-[#94a3b8] font-bold uppercase tracking-wider">
                      Monitored
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 text-[#10b981] text-xs font-semibold">
                    <Zap size={13} />
                    <span>Floor Quick-Access Active</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Low Stock Near Station */}
              <div className="bg-[#171f33] p-4 sm:p-5 rounded-xl shadow-sm border border-[#334155] flex flex-col justify-between relative overflow-hidden group hover:bg-[#1e293b] transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider">
                    Low Stock Near Station
                  </span>
                  <span className="p-1.5 rounded-lg bg-amber-500/15 text-amber-300">
                    <AlertTriangle size={16} />
                  </span>
                </div>
                <div className="mt-3">
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-['Plus_Jakarta_Sans',sans-serif] text-2xl lg:text-3xl font-bold text-amber-300 tracking-tight tabular-nums">
                      {loadingItems ? '...' : stats.lowCount + stats.outCount}
                    </span>
                    <span className="text-[10px] text-amber-200 font-bold uppercase tracking-wider">
                      Items Flagged
                    </span>
                  </div>
                  <p className="text-xs text-[#94a3b8] mt-1">Check threshold before cutting</p>
                </div>
              </div>

              {/* Card 3: My Deductions Today */}
              <div className="bg-[#171f33] p-4 sm:p-5 rounded-xl shadow-sm border border-[#334155] flex flex-col justify-between relative overflow-hidden group hover:bg-[#1e293b] transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider">
                    My Deductions Today
                  </span>
                  <span className="p-1.5 rounded-lg bg-[#2d3449] text-[#7bd0ff]">
                    <History size={16} />
                  </span>
                </div>
                <div className="mt-3">
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-['Plus_Jakarta_Sans',sans-serif] text-2xl lg:text-3xl font-bold text-[#f8fafc] tracking-tight tabular-nums">
                      {loadingLogs ? '...' : stats.myTodayCount}
                    </span>
                    <span className="text-[10px] text-[#94a3b8] font-bold uppercase tracking-wider">
                      Batches Recorded
                    </span>
                  </div>
                  <p className="text-xs text-[#94a3b8] mt-1">
                    {stats.totalQtyDeductedToday > 0
                      ? `${formatNumber(stats.totalQtyDeductedToday)} Total Units Deducted`
                      : '32 Bd Ft Timber • 12 Hinges'}
                  </p>
                </div>
              </div>

              {/* Card 4: Active Work Order */}
              <div className="bg-[#171f33] p-4 sm:p-5 rounded-xl shadow-sm border border-[#334155] flex flex-col justify-between relative overflow-hidden group hover:bg-[#1e293b] transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider">
                    Active Work Order
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#4f46e5]/20 text-[#c3c0ff] border border-[#4f46e5]/40 text-[10px] font-bold uppercase tracking-wider">
                    <Lock size={10} />
                    LOCKED
                  </span>
                </div>
                <div className="mt-3">
                  <div className="font-mono text-sm sm:text-base font-bold text-[#f8fafc] truncate">
                    #FF-882
                  </div>
                  <p className="text-xs text-[#94a3b8] truncate mt-0.5">Custom Teak Dining Table</p>
                </div>
              </div>
            </div>
          </div>

          {/* Main Workstation Layout (Split 65% Catalog Discovery / 35% Active Deduction Terminal) */}
          <div className="w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-[1680px] mx-auto flex-1">
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 lg:gap-8 items-start">
              {/* LEFT COLUMN: Inventory Discovery & Fast Filter (approx 65% / 8 cols) */}
              <div className="xl:col-span-8 flex flex-col gap-6">
                <ItemSearch
                  items={items}
                  loading={loadingItems}
                  error={error}
                  selectedItem={selectedItem}
                  onSelect={handleSelectItem}
                  onRetry={handleRefresh}
                />
              </div>

              {/* RIGHT COLUMN: Active Material Deduction Console (approx 35% / 4 cols, Sticky) */}
              <div className="xl:col-span-4">
                <UpdateQuantity
                  item={selectedItem}
                  onResetItem={() => setSelectedItem(items[0] || null)}
                  onDeductSuccess={handleRefresh}
                />
              </div>
            </div>
          </div>

          {/* BOTTOM SECTION: Recent Employee Usage History (Shift Audit Feed) */}
          <div className="w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-10 bg-[#060e20] border-t border-[#1e293b]">
            <div className="max-w-[1680px] mx-auto">
              <EmployeeActivityFeed
                logs={usageLogs}
                loading={loadingLogs}
                currentUserId={userData?.id}
                onSelectMaterial={(name) => {
                  const match = items.find((i) => i.name?.toLowerCase() === name?.toLowerCase());
                  if (match) handleSelectItem(match);
                }}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full bg-[#060e20] py-5 border-t border-[#1e293b] shadow-[0_-1px_8px_rgba(0,0,0,0.25)]">
        <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#94a3b8]">
          <span className="font-medium text-[#cbd5e1]">
            © FurnTrack OS • Workshop Division • Station 04 Timber Terminal
          </span>
          <span className="text-[10px] uppercase font-bold tracking-wider text-[#94a3b8]">
            High-Precision Joinery • Real-time Stock Sync
          </span>
        </div>
      </footer>
    </div>
  );
}
