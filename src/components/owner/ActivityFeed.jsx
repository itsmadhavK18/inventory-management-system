import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { COLLECTIONS } from '../../utils/constants';
import { timeAgo } from '../../utils/formatters';
import { Activity, ArrowRight } from 'lucide-react';
import EmptyState from '../common/EmptyState';

export default function ActivityFeed() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const q = query(
      collection(db, COLLECTIONS.USAGE_LOGS),
      orderBy('timestamp', 'desc'),
      limit(20)
    );

    const unsub = onSnapshot(q, (snap) => {
      setLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => unsub();
  }, []);

  return (
    <div className="glass rounded-2xl p-4 animate-fade-in">
      <h3 className="text-sm font-semibold text-text flex items-center gap-2 mb-4">
        <Activity size={16} className="text-success" />
        Activity Feed
      </h3>

      {logs.length === 0 ? (
        <EmptyState title="No activity" message="Activity will appear here" />
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto stagger-children">
          {logs.map((log) => (
            <div
              key={log.id}
              className="p-3 rounded-xl bg-primary/50 hover:bg-primary/80 transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-text">
                    <span className="font-semibold text-accent-light">{log.user_name}</span>
                    {' used '}
                    <span className="font-medium">{log.quantity_used}</span>
                    {' of '}
                    <span className="font-medium">{log.item_name}</span>
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-xs text-text-dim">{log.old_quantity}</span>
                    <ArrowRight size={10} className="text-text-dim" />
                    <span className="text-xs text-warning-light font-medium">{log.new_quantity}</span>
                  </div>
                </div>
                <span className="text-[10px] text-text-dim flex-shrink-0 ml-2 mt-0.5">
                  {timeAgo(log.timestamp)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
