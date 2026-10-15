import { useState, useEffect, useMemo } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { COLLECTIONS } from '../../utils/constants';
import { timeAgo, formatTime, formatDateTime, isToday, getStartOfMonth } from '../../utils/formatters';
import { Activity, ArrowRight, User, Package, Calendar } from 'lucide-react';
import EmptyState from '../common/EmptyState';

export default function ActivityFeed({ logs: propLogs, loading: propLoading }) {
  const [internalLogs, setInternalLogs] = useState([]);
  const [internalLoading, setInternalLoading] = useState(propLogs === undefined);
  const [activeTab, setActiveTab] = useState('live'); // 'live' | 'today' | 'month'

  useEffect(() => {
    if (propLogs !== undefined) return;

    const q = query(
      collection(db, COLLECTIONS.USAGE_LOGS),
      orderBy('timestamp', 'desc'),
      limit(30)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        setInternalLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setInternalLoading(false);
      },
      (err) => {
        console.error('Failed to subscribe to usage logs in ActivityFeed:', err);
        setInternalLoading(false);
      }
    );

    return () => unsub();
  }, [propLogs]);

  const allLogs = propLogs !== undefined ? propLogs : internalLogs;
  const loading = propLoading !== undefined ? propLoading : internalLoading;

  const todayCount = useMemo(() => allLogs.filter((l) => isToday(l.timestamp)).length, [allLogs]);
  const monthCount = useMemo(() => {
    const startOfMonth = getStartOfMonth();
    return allLogs.filter((l) => {
      if (!l.timestamp) return false;
      const d = l.timestamp?.toDate ? l.timestamp.toDate() : new Date(l.timestamp);
      return d >= startOfMonth;
    }).length;
  }, [allLogs]);

  const filteredLogs = useMemo(() => {
    if (activeTab === 'today') {
      return allLogs.filter((log) => isToday(log.timestamp));
    }
    if (activeTab === 'month') {
      const startOfMonth = getStartOfMonth();
      return allLogs.filter((log) => {
        if (!log.timestamp) return false;
        const d = log.timestamp?.toDate ? log.timestamp.toDate() : new Date(log.timestamp);
        return d >= startOfMonth;
      });
    }
    return allLogs;
  }, [allLogs, activeTab]);

  return (
    <section className="p-5 sm:p-6 rounded-2xl bg-[#131b2e] border border-[#334155] shadow-lg flex flex-col justify-between">
      <div>
        {/* Header & Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-100 font-['Plus_Jakarta_Sans',sans-serif] tracking-tight">
                Atelier Activity Stream
              </h2>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Direct log from craftsman handheld terminals & stock deduction events.
            </p>
          </div>

          {/* Time Filter Segmented Tabs */}
          <div className="flex items-center gap-1 bg-[#060e20] p-1 rounded-lg border border-[#334155]/60 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setActiveTab('live')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                activeTab === 'live'
                  ? 'bg-[#222a3d] text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Live
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('today')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                activeTab === 'today'
                  ? 'bg-[#222a3d] text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Today ({todayCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('month')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                activeTab === 'month'
                  ? 'bg-[#222a3d] text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Month ({monthCount})
            </button>
          </div>
        </div>

        {/* Stream List */}
        {loading ? (
          <div className="space-y-3 py-3">
            {[1, 2, 3, 4].map((idx) => (
              <div key={idx} className="h-14 rounded-xl bg-[#171f33] animate-pulse border border-[#334155]/40" />
            ))}
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-8">
            <EmptyState
              title={`No activity ${activeTab === 'today' ? 'today' : activeTab === 'month' ? 'this month' : 'recorded yet'}`}
              message="Stock deductions recorded by workshop craftsmen will appear here instantly."
            />
          </div>
        ) : (
          <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
            {filteredLogs.map((log) => {
              const userName = log.user_name || 'Craftsman';
              const itemName = log.item_name || 'Inventory item';
              const qtyUsed = log.quantity_used != null ? log.quantity_used : '—';
              const hasOld = log.old_quantity != null;
              const hasNew = log.new_quantity != null;

              return (
                <div
                  key={log.id}
                  className="p-3.5 rounded-xl bg-[#171f33] hover:bg-[#222a3d]/80 border border-[#334155]/60 transition-all group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center shrink-0 mt-0.5 border border-indigo-500/30">
                        <Package size={15} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-200 truncate">
                            {userName}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {formatTime(log.timestamp)}
                          </span>
                        </div>

                        <p className="text-xs text-slate-300 mt-0.5 leading-snug">
                          Deducted <strong className="text-rose-400 font-bold font-mono tabular-nums">-{qtyUsed}</strong> of{' '}
                          <span className="font-semibold text-slate-100">{itemName}</span>
                        </p>

                        {hasOld && hasNew && (
                          <div className="flex items-center gap-1.5 mt-1.5 font-mono text-[10px] text-slate-400">
                            <span>Balance:</span>
                            <span className="text-slate-300">{log.old_quantity}</span>
                            <ArrowRight size={10} className="text-slate-500" />
                            <span className="text-amber-400 font-semibold">{log.new_quantity}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0" title={formatDateTime(log.timestamp)}>
                      <span className="text-[10px] font-mono text-slate-400 font-medium">
                        {timeAgo(log.timestamp)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-5 pt-3.5 border-t border-[#334155]/60 flex items-center justify-between text-xs text-slate-400">
        <span className="flex items-center gap-1.5">
          <Calendar size={13} className="text-slate-400" />
          <span>Showing {filteredLogs.length} activity {filteredLogs.length === 1 ? 'event' : 'events'}</span>
        </span>
        <span className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" /> Live Stream Active
        </span>
      </div>
    </section>
  );
}
