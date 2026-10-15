import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { COLLECTIONS } from '../../utils/constants';
import { formatTime, isToday, isYesterday, getStartOfYesterday } from '../../utils/formatters';
import { Clock, User, Package } from 'lucide-react';
import EmptyState from '../common/EmptyState';

export default function DailyUsage() {
  const [logs, setLogs] = useState([]);
  const [tab, setTab] = useState('today');

  useEffect(() => {
    const startDate = getStartOfYesterday();
    const q = query(
      collection(db, COLLECTIONS.USAGE_LOGS),
      where('timestamp', '>=', Timestamp.fromDate(startDate)),
      orderBy('timestamp', 'desc')
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setLogs(data);
    });

    return () => unsub();
  }, []);

  const filtered = logs.filter((log) =>
    tab === 'today' ? isToday(log.timestamp) : isYesterday(log.timestamp)
  );

  return (
    <div className="glass rounded-2xl p-4 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-text flex items-center gap-2">
          <Clock size={16} className="text-accent-light" />
          Daily Usage
        </h3>
        <div className="flex gap-1 bg-primary rounded-lg p-0.5">
          {['today', 'yesterday'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer capitalize ${
                tab === t
                  ? 'bg-accent/20 text-accent-light'
                  : 'text-text-dim hover:text-text-muted'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No usage" message={`No items used ${tab}`} />
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto stagger-children">
          {filtered.map((log) => (
            <div
              key={log.id}
              className="flex items-center justify-between p-3 rounded-xl bg-primary/50 hover:bg-primary/80 transition-all"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <Package size={14} className="text-accent-light" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text truncate">{log.item_name}</p>
                  <div className="flex items-center gap-1.5">
                    <User size={10} className="text-text-dim" />
                    <span className="text-xs text-text-dim truncate">{log.user_name}</span>
                  </div>
                </div>
              </div>
              <div className="text-right flex-shrink-0 ml-3">
                <p className="text-sm font-bold text-danger-light">-{log.quantity_used}</p>
                <p className="text-[10px] text-text-dim">{formatTime(log.timestamp)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
